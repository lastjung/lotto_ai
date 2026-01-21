"""
로또 데이터 로더 및 전처리
"""

import json
import torch
from torch.utils.data import Dataset, DataLoader
from typing import Tuple, List
import os


class LottoDataset(Dataset):
    """로또 시퀀스 데이터셋"""
    
    def __init__(self, data_path: str, seq_len: int = 20, include_bonus: bool = False):
        """
        Args:
            data_path: draws.json 파일 경로
            seq_len: 입력 시퀀스 길이 (과거 몇 회차를 볼지)
            include_bonus: 보너스 번호 포함 여부
        """
        self.seq_len = seq_len
        self.include_bonus = include_bonus
        
        # 데이터 로드
        with open(data_path, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        
        self.draws = raw_data['draws']
        self.total_draws = len(self.draws)
        
        # 데이터 정렬 (회차순)
        self.draws.sort(key=lambda x: x['draw_no'])
        
        # 시퀀스 데이터 생성
        self.sequences = []
        self.targets = []
        
        for i in range(seq_len, self.total_draws):
            # 입력: 과거 seq_len 회차
            seq = []
            for j in range(i - seq_len, i):
                draw = self.draws[j]
                numbers = draw['numbers']  # [6개 번호]
                if include_bonus:
                    numbers = numbers + [draw['bonus']]
                seq.append(numbers)
            
            # 타겟: 현재 회차 번호 (6개)
            target = self.draws[i]['numbers']
            
            self.sequences.append(seq)
            self.targets.append(target)
    
    def __len__(self) -> int:
        return len(self.sequences)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        seq = torch.tensor(self.sequences[idx], dtype=torch.long)  # (seq_len, 6 or 7)
        target = torch.tensor(self.targets[idx], dtype=torch.long)  # (6,)
        # 타겟을 0-indexed로 변환 (1~45 -> 0~44)
        target = target - 1
        return seq, target


def create_dataloaders(
    data_path: str,
    seq_len: int = 20,
    batch_size: int = 32,
    train_ratio: float = 0.8,
    include_bonus: bool = False
) -> Tuple[DataLoader, DataLoader]:
    """
    학습/검증 데이터로더 생성
    
    Returns:
        (train_loader, val_loader)
    """
    dataset = LottoDataset(data_path, seq_len, include_bonus)
    
    # 시간순으로 분할 (나중 데이터를 검증용으로)
    total = len(dataset)
    train_size = int(total * train_ratio)
    
    train_indices = list(range(train_size))
    val_indices = list(range(train_size, total))
    
    train_subset = torch.utils.data.Subset(dataset, train_indices)
    val_subset = torch.utils.data.Subset(dataset, val_indices)
    
    train_loader = DataLoader(train_subset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_subset, batch_size=batch_size, shuffle=False)
    
    return train_loader, val_loader


def get_latest_sequence(data_path: str, seq_len: int = 20, include_bonus: bool = False) -> torch.Tensor:
    """
    최신 seq_len 회차 데이터 가져오기 (추론용)
    
    Returns:
        (1, seq_len, 6 or 7) 텐서
    """
    with open(data_path, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
    
    draws = raw_data['draws']
    draws.sort(key=lambda x: x['draw_no'])
    
    # 최신 seq_len 회차
    latest = draws[-seq_len:]
    
    seq = []
    for draw in latest:
        numbers = draw['numbers']
        if include_bonus:
            numbers = numbers + [draw['bonus']]
        seq.append(numbers)
    
    return torch.tensor([seq], dtype=torch.long)
