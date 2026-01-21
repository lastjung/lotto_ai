"""
로또 번호 생성 스크립트
config.json에서 파라미터를 로드합니다.
"""

import torch
import argparse
from pathlib import Path
import json

from models.transformer.transformer import create_model
from models.transformer.dataloader import get_latest_sequence

# Config 로드
CONFIG_PATH = Path(__file__).parent / 'config.json'

def load_config():
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)


def generate_numbers(config, num_sets: int = None, temperature: float = None, top_k: int = None):
    """
    로또 번호 생성
    """
    model_cfg = config['model']
    gen_cfg = config['generation']
    paths_cfg = config['paths']
    
    # 파라미터 (인자 > config)
    num_sets = num_sets or gen_cfg['sets']
    temperature = temperature or gen_cfg['temperature']
    top_k = top_k or gen_cfg['top_k']
    
    # 디바이스 설정
    if torch.backends.mps.is_available():
        device = torch.device('mps')
    elif torch.cuda.is_available():
        device = torch.device('cuda')
    else:
        device = torch.device('cpu')
    
    # 모델 로드
    checkpoint = torch.load(paths_cfg['checkpoint'], map_location=device, weights_only=False)
    saved_config = checkpoint.get('config', model_cfg)
    
    model = create_model(saved_config).to(device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # 최신 시퀀스 로드
    seq_len = saved_config.get('seq_len', model_cfg['seq_len'])
    input_seq = get_latest_sequence(paths_cfg['data'], seq_len=seq_len).to(device)
    
    # 번호 생성
    print('=' * 50)
    print('🎱 AI 로또 번호 생성기 (Transformer)')
    print('=' * 50)
    print(f'   모델: {paths_cfg["checkpoint"]}')
    print(f'   온도: {temperature}, Top-K: {top_k}')
    print('=' * 50)
    
    input_batch = input_seq.repeat(num_sets, 1, 1)
    generated = model.generate(input_batch, temperature=temperature, top_k=top_k)
    
    print('\n📌 생성된 번호:')
    print('-' * 50)
    
    for i, nums in enumerate(generated):
        nums_list = nums.cpu().tolist()
        nums_str = ', '.join([f'{n:2d}' for n in nums_list])
        print(f'   세트 {i+1}: [ {nums_str} ]')
    
    print('-' * 50)
    print('\n💡 참고: AI 예측은 재미용이며 당첨을 보장하지 않습니다.')
    
    return generated.cpu().tolist()


def main():
    config = load_config()
    gen_cfg = config['generation']
    
    parser = argparse.ArgumentParser(description='로또 번호 생성')
    parser.add_argument('--sets', type=int, default=gen_cfg['sets'], help='생성할 세트 수')
    parser.add_argument('--temperature', type=float, default=gen_cfg['temperature'], help='샘플링 온도')
    parser.add_argument('--top-k', type=int, default=gen_cfg['top_k'], help='Top-K 샘플링')
    args = parser.parse_args()
    
    generate_numbers(
        config,
        num_sets=args.sets,
        temperature=args.temperature,
        top_k=args.top_k
    )


if __name__ == '__main__':
    main()
