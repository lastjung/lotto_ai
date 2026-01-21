"""
GAN 로또 모델 학습 스크립트
"""

import torch
import torch.nn as nn
import torch.optim as optim
from pathlib import Path
import argparse
import json

from models.gan.gan import create_generator, create_discriminator
from models.gan.dataloader import create_dataloader

CONFIG_PATH = Path(__file__).parent / 'config.json'

def load_config():
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)


def sample_from_generator(generator, batch_size, device):
    """Generator에서 소프트맥스 샘플링하여 번호 생성"""
    z = torch.randn(batch_size, generator.latent_dim, device=device)
    logits = generator(z)  # (batch, 6, 45)
    
    # Gumbel-Softmax로 미분 가능한 샘플링
    probs = torch.softmax(logits, dim=-1)
    
    # argmax로 번호 선택 (학습 시에는 soft 버전 사용)
    selected = torch.argmax(probs, dim=-1) + 1  # (batch, 6), 1~45
    
    return selected, logits


def main():
    config = load_config()
    model_cfg = config['model']
    train_cfg = config['training']
    paths_cfg = config['paths']
    
    parser = argparse.ArgumentParser(description='GAN Lotto 학습')
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
    print(f'\n📊 데이터 로딩: {paths_cfg["data"]}')
    dataloader = create_dataloader(paths_cfg['data'], train_cfg['batch_size'])
    print(f'   총 샘플: {len(dataloader.dataset)}')
    
    # 모델 생성
    generator = create_generator(model_cfg).to(device)
    discriminator = create_discriminator(model_cfg).to(device)
    
    g_params = sum(p.numel() for p in generator.parameters())
    d_params = sum(p.numel() for p in discriminator.parameters())
    print(f'\n🤖 Generator 파라미터: {g_params:,}')
    print(f'🤖 Discriminator 파라미터: {d_params:,}')
    
    # 손실 함수 및 옵티마이저
    criterion = nn.BCELoss()
    
    optimizer_g = optim.Adam(
        generator.parameters(),
        lr=train_cfg['lr_generator'],
        betas=(train_cfg['beta1'], train_cfg['beta2'])
    )
    optimizer_d = optim.Adam(
        discriminator.parameters(),
        lr=train_cfg['lr_discriminator'],
        betas=(train_cfg['beta1'], train_cfg['beta2'])
    )
    
    # 레이블
    real_label = 1.0
    fake_label = 0.0
    
    print(f'\n🚀 학습 시작 (에폭: {args.epochs})')
    print('-' * 60)
    
    for epoch in range(1, args.epochs + 1):
        g_loss_total = 0
        d_loss_total = 0
        
        for real_numbers in dataloader:
            real_numbers = real_numbers.to(device)
            batch_size = real_numbers.size(0)
            
            # === Discriminator 학습 ===
            discriminator.zero_grad()
            
            # 진짜 데이터
            real_labels = torch.full((batch_size, 1), real_label, device=device)
            real_output = discriminator(real_numbers)
            d_loss_real = criterion(real_output, real_labels)
            
            # 가짜 데이터
            fake_numbers, _ = sample_from_generator(generator, batch_size, device)
            fake_labels = torch.full((batch_size, 1), fake_label, device=device)
            fake_output = discriminator(fake_numbers.detach())
            d_loss_fake = criterion(fake_output, fake_labels)
            
            d_loss = d_loss_real + d_loss_fake
            d_loss.backward()
            optimizer_d.step()
            
            # === Generator 학습 ===
            generator.zero_grad()
            
            fake_numbers, _ = sample_from_generator(generator, batch_size, device)
            fake_output = discriminator(fake_numbers)
            g_loss = criterion(fake_output, real_labels)  # 진짜로 속이려고
            
            g_loss.backward()
            optimizer_g.step()
            
            g_loss_total += g_loss.item()
            d_loss_total += d_loss.item()
        
        avg_g_loss = g_loss_total / len(dataloader)
        avg_d_loss = d_loss_total / len(dataloader)
        
        if epoch % 10 == 0 or epoch == 1:
            print(f'Epoch {epoch:3d} | G Loss: {avg_g_loss:.4f} | D Loss: {avg_d_loss:.4f}')
            
            # 샘플 생성
            sample = generator.generate(3, device)
            print(f'   샘플: {sample.cpu().tolist()}')
    
    print('-' * 60)
    print('🎉 학습 완료!')
    
    # 모델 저장
    torch.save({
        'generator_state_dict': generator.state_dict(),
        'discriminator_state_dict': discriminator.state_dict(),
        'config': model_cfg
    }, paths_cfg['checkpoint_g'])
    print(f'   저장: {paths_cfg["checkpoint_g"]}')


if __name__ == '__main__':
    main()
