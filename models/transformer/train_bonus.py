"""
보너스 모델 학습 스크립트
같은 Transformer 아키텍처, 다른 config
"""

import torch
import torch.nn as nn
import torch.optim as optim
from pathlib import Path
import argparse
import json

from models.transformer.transformer import create_model
from models.transformer.dataloader_bonus import create_bonus_dataloaders

CONFIG_PATH = Path(__file__).parent / 'config_bonus.json'

def load_config():
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)


def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0
    
    for seq, target in loader:
        seq = seq.to(device)
        target = target.to(device)
        
        optimizer.zero_grad()
        output = model(seq)  # (batch, 1, 45)
        
        loss = criterion(output[:, 0, :], target[:, 0])
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        
        total_loss += loss.item()
    
    return total_loss / len(loader)


def validate(model, loader, criterion, device):
    model.eval()
    total_loss = 0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for seq, target in loader:
            seq = seq.to(device)
            target = target.to(device)
            
            output = model(seq)
            loss = criterion(output[:, 0, :], target[:, 0])
            total_loss += loss.item()
            
            # Top-5 정확도
            top5 = output[:, 0, :].topk(5, dim=1).indices
            for b in range(target.size(0)):
                if target[b, 0] in top5[b]:
                    correct += 1
                total += 1
    
    return total_loss / len(loader), correct / total if total > 0 else 0


def main():
    config = load_config()
    model_cfg = config['model']
    train_cfg = config['training']
    paths_cfg = config['paths']
    
    parser = argparse.ArgumentParser(description='보너스 모델 학습')
    parser.add_argument('--epochs', type=int, default=train_cfg['epochs'], help='에폭 수')
    args = parser.parse_args()
    
    # 디바이스
    if torch.backends.mps.is_available():
        device = torch.device('mps')
        print('🍎 Using Apple MPS')
    elif torch.cuda.is_available():
        device = torch.device('cuda')
        print('🎮 Using CUDA')
    else:
        device = torch.device('cpu')
        print('💻 Using CPU')
    
    # 데이터 로더
    print(f'\n📊 보너스 데이터 로딩: {paths_cfg["data"]}')
    train_loader, val_loader = create_bonus_dataloaders(
        paths_cfg['data'],
        seq_len=model_cfg['seq_len'],
        batch_size=train_cfg['batch_size']
    )
    print(f'   학습 샘플: {len(train_loader.dataset)}')
    print(f'   검증 샘플: {len(val_loader.dataset)}')
    
    # 모델
    model = create_model(model_cfg).to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f'\n🎱 보너스 모델 파라미터: {total_params:,}')
    
    # 옵티마이저
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=train_cfg['learning_rate'], weight_decay=train_cfg['weight_decay'])
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    
    print(f'\n🚀 보너스 모델 학습 시작 (에폭: {args.epochs})')
    print('-' * 50)
    
    best_val_loss = float('inf')
    
    for epoch in range(1, args.epochs + 1):
        train_loss = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        scheduler.step()
        
        if epoch % 10 == 0 or epoch == 1:
            print(f'Epoch {epoch:3d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Top-5 Acc: {val_acc:.2%}')
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'val_loss': val_loss,
                'config': model_cfg
            }, paths_cfg['checkpoint'])
            if epoch % 10 == 0 or epoch == 1:
                print(f'   ✅ Best model saved!')
    
    print('-' * 50)
    print('🎉 보너스 모델 학습 완료!')
    print(f'   저장: {paths_cfg["checkpoint"]}')


if __name__ == '__main__':
    main()
