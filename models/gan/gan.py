"""
GAN 기반 로또 번호 생성 모델

Generator: 노이즈 → 로또 번호 6개
Discriminator: 로또 번호 6개 → 진짜/가짜 판별
"""

import torch
import torch.nn as nn


class Generator(nn.Module):
    """
    생성기: 랜덤 노이즈로부터 로또 번호 생성
    
    입력: (batch_size, latent_dim) 노이즈
    출력: (batch_size, 6, 45) 각 위치별 번호 확률
    """
    
    def __init__(
        self,
        latent_dim: int = 64,
        hidden_dim: int = 256,
        num_balls: int = 45,
        output_nums: int = 6,
        dropout: float = 0.3
    ):
        super().__init__()
        
        self.latent_dim = latent_dim
        self.num_balls = num_balls
        self.output_nums = output_nums
        
        # 노이즈 → 은닉층
        self.fc = nn.Sequential(
            nn.Linear(latent_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(dropout),
            
            nn.Linear(hidden_dim, hidden_dim * 2),
            nn.BatchNorm1d(hidden_dim * 2),
            nn.LeakyReLU(0.2),
            nn.Dropout(dropout),
            
            nn.Linear(hidden_dim * 2, hidden_dim * 2),
            nn.BatchNorm1d(hidden_dim * 2),
            nn.LeakyReLU(0.2),
        )
        
        # 각 번호 위치별 출력 헤드
        self.output_heads = nn.ModuleList([
            nn.Sequential(
                nn.Linear(hidden_dim * 2, hidden_dim),
                nn.LeakyReLU(0.2),
                nn.Linear(hidden_dim, num_balls)
            ) for _ in range(output_nums)
        ])
    
    def forward(self, z: torch.Tensor) -> torch.Tensor:
        """
        Args:
            z: (batch_size, latent_dim) 노이즈
        Returns:
            (batch_size, 6, 45) 각 위치별 번호 확률 (logits)
        """
        h = self.fc(z)
        
        outputs = []
        for head in self.output_heads:
            out = head(h)  # (batch, 45)
            outputs.append(out)
        
        return torch.stack(outputs, dim=1)  # (batch, 6, 45)
    
    def generate(self, num_samples: int = 1, device: str = 'cpu') -> torch.Tensor:
        """
        번호 생성 (중복 없이)
        
        Returns:
            (num_samples, 6) 생성된 번호
        """
        self.eval()
        with torch.no_grad():
            z = torch.randn(num_samples, self.latent_dim, device=device)
            logits = self.forward(z)  # (batch, 6, 45)
            
            generated = []
            used_mask = torch.zeros(num_samples, self.num_balls, device=device)
            
            for i in range(self.output_nums):
                curr_logits = logits[:, i, :]
                curr_logits = curr_logits - used_mask * 1e9
                
                probs = torch.softmax(curr_logits, dim=-1)
                selected = torch.multinomial(probs, 1).squeeze(-1)  # (batch,)
                
                generated.append(selected + 1)  # 1~45로 변환
                used_mask.scatter_(1, selected.unsqueeze(-1), 1.0)
            
            result = torch.stack(generated, dim=1)  # (batch, 6)
            result, _ = torch.sort(result, dim=1)
            return result


class Discriminator(nn.Module):
    """
    판별기: 로또 번호가 진짜인지 가짜인지 판별
    
    입력: (batch_size, 6) 로또 번호 (1~45)
    출력: (batch_size, 1) 진짜일 확률
    """
    
    def __init__(
        self,
        num_balls: int = 45,
        hidden_dim: int = 256,
        output_nums: int = 6,
        dropout: float = 0.3
    ):
        super().__init__()
        
        self.num_balls = num_balls
        self.output_nums = output_nums
        
        # 번호 임베딩
        self.embedding = nn.Embedding(num_balls + 1, 32)
        
        self.fc = nn.Sequential(
            nn.Linear(32 * output_nums, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(dropout),
            
            nn.Linear(hidden_dim, hidden_dim),
            nn.LeakyReLU(0.2),
            nn.Dropout(dropout),
            
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LeakyReLU(0.2),
            nn.Dropout(dropout),
            
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch_size, 6) 로또 번호
        Returns:
            (batch_size, 1) 진짜일 확률
        """
        # 임베딩
        embedded = self.embedding(x)  # (batch, 6, 32)
        embedded = embedded.view(x.size(0), -1)  # (batch, 192)
        
        return self.fc(embedded)


def create_generator(config: dict = None) -> Generator:
    """Generator 생성"""
    default_config = {
        'latent_dim': 64,
        'hidden_dim': 256,
        'num_balls': 45,
        'output_nums': 6,
        'dropout': 0.3
    }
    if config:
        default_config.update(config)
    return Generator(**default_config)


def create_discriminator(config: dict = None) -> Discriminator:
    """Discriminator 생성"""
    default_config = {
        'num_balls': 45,
        'hidden_dim': 256,
        'output_nums': 6,
        'dropout': 0.3
    }
    if config:
        # Discriminator에 해당하는 파라미터만 추출
        for key in default_config.keys():
            if key in config:
                default_config[key] = config[key]
    return Discriminator(**default_config)
