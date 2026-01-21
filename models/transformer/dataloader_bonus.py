"""
보너스 번호 전용 데이터 로더
과거 보너스 시퀀스 → 다음 보너스 예측
"""

import json
import torch
from torch.utils.data import Dataset, DataLoader
from typing import Tuple


class BonusDataset(Dataset):
    """보너스 번호 시퀀스 데이터셋"""
    
    def __init__(self, data_path: str, seq_len: int = 20):
        self.seq_len = seq_len
        
        with open(data_path, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        
        self.draws = raw_data['draws']
        self.draws.sort(key=lambda x: x['draw_no'])
        
        # 보너스 번호만 추출
        self.bonuses = [draw['bonus'] for draw in self.draws]
        
        # 시퀀스 생성
        self.sequences = []
        self.targets = []
        
        for i in range(seq_len, len(self.bonuses)):
            seq = self.bonuses[i - seq_len:i]
            target = self.bonuses[i]
            self.sequences.append(seq)
            self.targets.append(target)
    
    def __len__(self) -> int:
        return len(self.sequences)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        # (seq_len, 1) 형태로 reshape
        seq = torch.tensor(self.sequences[idx], dtype=torch.long).unsqueeze(-1)
        target = torch.tensor([self.targets[idx] - 1], dtype=torch.long)  # 0-indexed
        return seq, target


def create_bonus_dataloaders(
    data_path: str,
    seq_len: int = 20,
    batch_size: int = 32,
    train_ratio: float = 0.8
) -> Tuple[DataLoader, DataLoader]:
    """보너스 학습/검증 데이터로더"""
    dataset = BonusDataset(data_path, seq_len)
    
    total = len(dataset)
    train_size = int(total * train_ratio)
    
    train_indices = list(range(train_size))
    val_indices = list(range(train_size, total))
    
    train_subset = torch.utils.data.Subset(dataset, train_indices)
    val_subset = torch.utils.data.Subset(dataset, val_indices)
    
    train_loader = DataLoader(train_subset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_subset, batch_size=batch_size, shuffle=False)
    
    return train_loader, val_loader


def get_latest_bonus_sequence(data_path: str, seq_len: int = 20) -> torch.Tensor:
    """최신 보너스 시퀀스 (추론용)"""
    with open(data_path, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
    
    draws = raw_data['draws']
    draws.sort(key=lambda x: x['draw_no'])
    
    bonuses = [draw['bonus'] for draw in draws[-seq_len:]]
    
    # (1, seq_len, 1) 형태
    return torch.tensor(bonuses, dtype=torch.long).unsqueeze(0).unsqueeze(-1)
