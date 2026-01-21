"""
GAN 데이터 로더
로또 번호를 Discriminator 학습용으로 준비
"""

import json
import torch
from torch.utils.data import Dataset, DataLoader
from typing import Tuple


class LottoGANDataset(Dataset):
    """로또 번호 데이터셋 (GAN용)"""
    
    def __init__(self, data_path: str):
        with open(data_path, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        
        self.draws = raw_data['draws']
        
        # 번호만 추출
        self.numbers = []
        for draw in self.draws:
            nums = draw['numbers']  # [6개]
            self.numbers.append(nums)
    
    def __len__(self) -> int:
        return len(self.numbers)
    
    def __getitem__(self, idx: int) -> torch.Tensor:
        return torch.tensor(self.numbers[idx], dtype=torch.long)


def create_dataloader(data_path: str, batch_size: int = 64) -> DataLoader:
    """학습용 DataLoader 생성"""
    dataset = LottoGANDataset(data_path)
    return DataLoader(dataset, batch_size=batch_size, shuffle=True, drop_last=True)
