"""
Transformer 기반 로또 번호 생성 모델
- 과거 당첨번호 시퀀스를 학습
- 다음 번호 조합 예측
"""

import torch
import torch.nn as nn
import math


class PositionalEncoding(nn.Module):
    """위치 인코딩"""
    def __init__(self, d_model: int, max_len: int = 500, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))
        pe = torch.zeros(max_len, 1, d_model)
        pe[:, 0, 0::2] = torch.sin(position * div_term)
        pe[:, 0, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.pe[:x.size(0)]
        return self.dropout(x)


class LottoTransformer(nn.Module):
    """
    로또 번호 예측 Transformer 모델
    
    입력: 과거 N회차의 당첨번호 시퀀스 (각 회차 6개 번호 + 보너스)
    출력: 다음 회차 6개 번호의 확률 분포
    """
    
    def __init__(
        self,
        num_balls: int = 45,      # 로또 공 개수 (1~45)
        d_model: int = 128,       # 임베딩 차원
        nhead: int = 8,           # 어텐션 헤드 수
        num_layers: int = 4,      # Transformer 레이어 수
        dim_feedforward: int = 512,
        dropout: float = 0.1,
        seq_len: int = 20,        # 입력 시퀀스 길이 (과거 N회차)
        output_nums: int = 6      # 출력 번호 개수
    ):
        super().__init__()
        
        self.num_balls = num_balls
        self.d_model = d_model
        self.seq_len = seq_len
        self.output_nums = output_nums
        
        # 번호 임베딩 (1~45 + 패딩 0 = 46개)
        self.embedding = nn.Embedding(num_balls + 1, d_model, padding_idx=0)
        
        # 위치 인코딩
        self.pos_encoder = PositionalEncoding(d_model, max_len=seq_len * 7, dropout=dropout)
        
        # Transformer 인코더
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        # 출력 레이어: 각 번호 위치에 대한 확률 분포
        self.output_heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(d_model, dim_feedforward),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(dim_feedforward, num_balls)  # 1~45 확률
            ) for _ in range(output_nums)
        ])
        
        self._init_weights()
    
    def _init_weights(self):
        """가중치 초기화"""
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch_size, seq_len, 7) - 과거 N회차의 번호 (6개 + 보너스)
        
        Returns:
            (batch_size, 6, 45) - 각 위치별 번호 확률
        """
        batch_size = x.size(0)
        
        # 시퀀스 평탄화: (batch, seq_len, 7) -> (batch, seq_len * 7)
        x = x.view(batch_size, -1)
        
        # 임베딩 + 위치 인코딩
        x = self.embedding(x) * math.sqrt(self.d_model)  # (batch, seq_len*7, d_model)
        x = self.pos_encoder(x.transpose(0, 1)).transpose(0, 1)
        
        # Transformer 인코딩
        encoded = self.transformer_encoder(x)  # (batch, seq_len*7, d_model)
        
        # Global Average Pooling
        pooled = encoded.mean(dim=1)  # (batch, d_model)
        
        # 6개 번호 각각에 대한 확률 분포 생성
        outputs = []
        for head in self.output_heads:
            out = head(pooled)  # (batch, 45)
            outputs.append(out)
        
        # (batch, 6, 45)
        return torch.stack(outputs, dim=1)
    
    def generate(self, x: torch.Tensor, temperature: float = 1.0, top_k: int = 10) -> torch.Tensor:
        """
        번호 생성 (중복 없이)
        
        Args:
            x: 입력 시퀀스
            temperature: 샘플링 온도 (높을수록 다양성 증가)
            top_k: 상위 k개 후보에서 샘플링
        
        Returns:
            (batch_size, 6) - 생성된 번호
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)  # (batch, 6, 45)
            batch_size = logits.size(0)
            
            generated = []
            used_mask = torch.zeros(batch_size, self.num_balls, device=logits.device)
            
            for i in range(self.output_nums):
                # 현재 위치의 로짓
                curr_logits = logits[:, i, :] / temperature  # (batch, 45)
                
                # 이미 선택된 번호 마스킹
                curr_logits = curr_logits - used_mask * 1e9
                
                # Top-k 샘플링
                top_k_logits, top_k_indices = torch.topk(curr_logits, top_k, dim=-1)
                probs = torch.softmax(top_k_logits, dim=-1)
                
                # 샘플링
                sampled_idx = torch.multinomial(probs, 1).squeeze(-1)  # (batch,)
                selected = top_k_indices.gather(1, sampled_idx.unsqueeze(-1)).squeeze(-1)  # (batch,)
                
                # 선택된 번호 기록
                generated.append(selected + 1)  # 1~45로 변환
                used_mask.scatter_(1, selected.unsqueeze(-1), 1.0)
            
            result = torch.stack(generated, dim=1)  # (batch, 6)
            # 오름차순 정렬
            result, _ = torch.sort(result, dim=1)
            return result


def create_model(config: dict = None) -> LottoTransformer:
    """모델 생성 헬퍼"""
    default_config = {
        'num_balls': 45,
        'd_model': 128,
        'nhead': 8,
        'num_layers': 4,
        'dim_feedforward': 512,
        'dropout': 0.1,
        'seq_len': 20,
        'output_nums': 6
    }
    
    if config:
        # LottoTransformer에서 지원하는 파라미터만 추출
        for key in default_config.keys():
            if key in config:
                default_config[key] = config[key]
    
    return LottoTransformer(**default_config)
