"""
통합 로또 번호 생성 스크립트
메인 6개 + 보너스 1개 (중복 체크)
"""

import torch
import argparse
from pathlib import Path
import json

from models.transformer.transformer import create_model
from models.transformer.dataloader import get_latest_sequence
from models.transformer.dataloader_bonus import get_latest_bonus_sequence

CONFIG_PATH = Path(__file__).parent / 'config.json'
BONUS_CONFIG_PATH = Path(__file__).parent / 'config_bonus.json'


def load_configs():
    with open(CONFIG_PATH, 'r') as f:
        main_config = json.load(f)
    with open(BONUS_CONFIG_PATH, 'r') as f:
        bonus_config = json.load(f)
    return main_config, bonus_config


def generate_with_bonus(main_config, bonus_config, num_sets=5, temperature=1.0, top_k=15):
    """메인 6개 + 보너스 1개 생성"""
    
    # 디바이스
    if torch.backends.mps.is_available():
        device = torch.device('mps')
    elif torch.cuda.is_available():
        device = torch.device('cuda')
    else:
        device = torch.device('cpu')
    
    main_paths = main_config['paths']
    bonus_paths = bonus_config['paths']
    
    # 메인 모델 로드
    main_ckpt = torch.load(main_paths['checkpoint'], map_location=device, weights_only=False)
    main_model = create_model(main_ckpt.get('config', main_config['model'])).to(device)
    main_model.load_state_dict(main_ckpt['model_state_dict'])
    main_model.eval()
    
    # 보너스 모델 로드
    bonus_ckpt = torch.load(bonus_paths['checkpoint'], map_location=device, weights_only=False)
    bonus_model = create_model(bonus_ckpt.get('config', bonus_config['model'])).to(device)
    bonus_model.load_state_dict(bonus_ckpt['model_state_dict'])
    bonus_model.eval()
    
    # 입력 시퀀스
    main_seq = get_latest_sequence(main_paths['data'], main_config['model']['seq_len']).to(device)
    bonus_seq = get_latest_bonus_sequence(bonus_paths['data'], bonus_config['model']['seq_len']).to(device)
    
    print('=' * 60)
    print('🎱 AI 로또 번호 생성기 (메인 + 보너스)')
    print('=' * 60)
    print(f'   메인 모델: {main_paths["checkpoint"]}')
    print(f'   보너스 모델: {bonus_paths["checkpoint"]}')
    print(f'   온도: {temperature}, Top-K: {top_k}')
    print('=' * 60)
    
    results = []
    
    for i in range(num_sets):
        # 메인 6개 생성
        main_input = main_seq.repeat(1, 1, 1)
        main_numbers = main_model.generate(main_input, temperature=temperature, top_k=top_k)
        main_list = main_numbers[0].cpu().tolist()
        
        # 보너스 생성 (메인과 중복 시 재시도)
        bonus_input = bonus_seq.repeat(1, 1, 1)
        
        with torch.no_grad():
            bonus_logits = bonus_model.forward(bonus_input)  # (1, 1, 45)
            bonus_probs = bonus_logits[0, 0, :] / temperature
            
            # 메인 번호 마스킹
            for num in main_list:
                bonus_probs[num - 1] = -float('inf')
            
            probs = torch.softmax(bonus_probs, dim=-1)
            bonus_idx = torch.multinomial(probs, 1).item()
            bonus = bonus_idx + 1
        
        results.append((main_list, bonus))
    
    print('\n📌 생성된 번호:')
    print('-' * 60)
    
    for i, (main_nums, bonus) in enumerate(results):
        nums_str = ', '.join([f'{n:2d}' for n in main_nums])
        print(f'   세트 {i+1}: [ {nums_str} ] + 보너스 🔵 {bonus}')
    
    print('-' * 60)
    print('\n💡 참고: AI 예측은 재미용이며 당첨을 보장하지 않습니다.')
    
    return results


def main():
    main_config, bonus_config = load_configs()
    
    parser = argparse.ArgumentParser(description='로또 번호 생성 (메인 + 보너스)')
    parser.add_argument('--sets', type=int, default=5, help='생성할 세트 수')
    parser.add_argument('--temperature', type=float, default=1.0, help='샘플링 온도')
    parser.add_argument('--top-k', type=int, default=15, help='Top-K')
    args = parser.parse_args()
    
    generate_with_bonus(
        main_config, bonus_config,
        num_sets=args.sets,
        temperature=args.temperature,
        top_k=args.top_k
    )


if __name__ == '__main__':
    main()
