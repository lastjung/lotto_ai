"""
Transformer 로또 모델 학습 스크립트
config.json에서 파라미터를 로드합니다.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from pathlib import Path
import argparse
import json

from models.transformer.transformer import create_model
from models.transformer.dataloader import create_dataloaders

# Config 로드
CONFIG_PATH = Path(__file__).parent / 'config.json'

def load_config():
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)


def train_epoch(model, loader, criterion, optimizer, device):
    """한 에폭 학습"""
    model.train()
    total_loss = 0
    
    for batch_idx, (seq, target) in enumerate(loader):
        seq = seq.to(device)
        target = target.to(device)
        
        optimizer.zero_grad()
        output = model(seq)
        
        loss = 0
        for i in range(6):
            loss += criterion(output[:, i, :], target[:, i])
        loss /= 6
        
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        
        total_loss += loss.item()
    
    return total_loss / len(loader)


def validate(model, loader, criterion, device):
    """검증"""
    model.eval()
    total_loss = 0
    correct_nums = 0
    total_nums = 0
    
    with torch.no_grad():
        for seq, target in loader:
            seq = seq.to(device)
            target = target.to(device)
            
            output = model(seq)
            
            loss = 0
            for i in range(6):
                loss += criterion(output[:, i, :], target[:, i])
                top10 = output[:, i, :].topk(10, dim=1).indices
                for b in range(target.size(0)):
                    if target[b, i] in top10[b]:
                        correct_nums += 1
                    total_nums += 1
            loss /= 6
            
            total_loss += loss.item()
    
    return total_loss / len(loader), correct_nums / total_nums if total_nums > 0 else 0


def main():
    # Config 로드
    config = load_config()
    model_cfg = config['model']
    train_cfg = config['training']
    paths_cfg = config['paths']
    
    parser = argparse.ArgumentParser(description='Lotto Transformer 학습')
    parser.add_argument('--epochs', type=int, default=train_cfg['epochs'], help='에폭 수')
    parser.add_argument('--batch-size', type=int, default=train_cfg['batch_size'], help='배치 크기')
    parser.add_argument('--lr', type=float, default=train_cfg['learning_rate'], help='학습률')
    args = parser.parse_args()
    
    # 디바이스 설정
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
    print(f'\n📊 데이터 로딩: {paths_cfg["data"]}')
    train_loader, val_loader = create_dataloaders(
        paths_cfg['data'],
        seq_len=model_cfg['seq_len'],
        batch_size=args.batch_size,
        train_ratio=train_cfg['train_ratio']
    )
    print(f'   학습 샘플: {len(train_loader.dataset)}')
    print(f'   검증 샘플: {len(val_loader.dataset)}')
    
    # 모델 생성 (config에서 파라미터 로드)
    model = create_model(model_cfg).to(device)
    
    total_params = sum(p.numel() for p in model.parameters())
    print(f'\n🤖 모델 파라미터: {total_params:,}')
    
    # 손실 함수 및 옵티마이저
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=train_cfg['weight_decay'])
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    
    # 체크포인트 디렉토리
    checkpoint_dir = Path(paths_cfg['checkpoint']).parent
    checkpoint_dir.mkdir(exist_ok=True, parents=True)
    
    # 학습
    print(f'\n🚀 학습 시작 (에폭: {args.epochs})')
    print('-' * 50)
    
    best_val_loss = float('inf')
    
    for epoch in range(1, args.epochs + 1):
        train_loss = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        scheduler.step()
        
        print(f'Epoch {epoch:3d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Top-10 Acc: {val_acc:.2%}')
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'config': model_cfg
            }, paths_cfg['checkpoint'])
            print(f'   ✅ Best model saved!')
    
    print('-' * 50)
    print('🎉 학습 완료!')
    print(f'   최고 검증 손실: {best_val_loss:.4f}')
    print(f'   체크포인트: {paths_cfg["checkpoint"]}')


if __name__ == '__main__':
    main()
