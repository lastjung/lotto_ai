"""
GAN 로또 번호 생성 스크립트
"""

import torch
import argparse
from pathlib import Path
import json

from models.gan.gan import create_generator

CONFIG_PATH = Path(__file__).parent / 'config.json'

def load_config():
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)



from models.transformer.transformer import create_model as create_transformer
from models.transformer.dataloader_bonus import get_latest_bonus_sequence

def generate_numbers(config, num_sets: int = None):
    model_cfg = config['model']
    gen_cfg = config['generation']
    paths_cfg = config['paths']
    
    num_sets = num_sets or gen_cfg['sets']
    
    # 디바이스
    if torch.backends.mps.is_available():
        device = torch.device('mps')
    elif torch.cuda.is_available():
        device = torch.device('cuda')
    else:
        device = torch.device('cpu')
    
    # GAN 모델 로드
    checkpoint = torch.load(paths_cfg['checkpoint_g'], map_location=device, weights_only=False)
    saved_config = checkpoint.get('config', model_cfg)
    
    generator = create_generator(saved_config).to(device)
    generator.load_state_dict(checkpoint['generator_state_dict'])
    generator.eval()
    
    # 보너스 모델 로드 (Transformer)
    bonus_config_path = Path(__file__).parent.parent / 'transformer' / 'config_bonus.json'
    with open(bonus_config_path, 'r') as f:
        bonus_cfg = json.load(f)
    
    bonus_model_path = bonus_cfg['paths']['checkpoint']
    bonus_ckpt = torch.load(bonus_model_path, map_location=device, weights_only=False)
    bonus_model = create_transformer(bonus_ckpt.get('config', bonus_cfg['model'])).to(device)
    bonus_model.load_state_dict(bonus_ckpt['model_state_dict'])
    bonus_model.eval()
    
    # 보너스 입력 시퀀스
    bonus_data_path = bonus_cfg['paths']['data']
    bonus_seq = get_latest_bonus_sequence(bonus_data_path, bonus_cfg['model']['seq_len']).to(device)
    
    print('=' * 60)
    print('🎱 AI 로또 번호 생성기 (GAN + Bonus Transformer)')
    print('=' * 60)
    print(f'   GAN 모델: {paths_cfg["checkpoint_g"]}')
    print(f'   보너스 모델: {bonus_model_path}')
    print('=' * 60)
    
    generated = generator.generate(num_sets, device)
    results = []
    
    # 보너스 번호 생성 (하이브리드)
    for i in range(num_sets):
        main_nums = generated[i]
        main_list = main_nums.cpu().tolist()
        
        # 보너스 예측
        bonus_input = bonus_seq.repeat(1, 1, 1)
        with torch.no_grad():
            bonus_logits = bonus_model.forward(bonus_input)
            bonus_probs = bonus_logits[0, 0, :]
            
            # 메인 번호 마스킹 (1e9 뺄셈으로 확률 0 만듦)
            for num in main_list:
                bonus_probs[num - 1] = -float('inf')
                
            probs = torch.softmax(bonus_probs, dim=-1)
            bonus_idx = torch.multinomial(probs, 1).item()
            bonus = bonus_idx + 1
            
        results.append((main_list, bonus))
    
    print('\n📌 생성된 번호:')
    print('-' * 60)
    
    for i, (nums, bonus) in enumerate(results):
        nums_str = ', '.join([f'{n:2d}' for n in nums])
        print(f'   세트 {i+1}: [ {nums_str} ] + 보너스 🔵 {bonus}')
    
    print('-' * 60)
    print('\n💡 참고: AI 예측은 재미용이며 당첨을 보장하지 않습니다.')
    
    return results


def main():
    config = load_config()
    gen_cfg = config['generation']
    
    parser = argparse.ArgumentParser(description='GAN 로또 번호 생성')
    parser.add_argument('--sets', type=int, default=gen_cfg['sets'], help='생성할 세트 수')
    args = parser.parse_args()
    
    generate_numbers(config, num_sets=args.sets)


if __name__ == '__main__':
    main()
