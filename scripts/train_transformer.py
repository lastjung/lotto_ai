#!/usr/bin/env python
"""Transformer 모델 학습 실행"""
import sys
from pathlib import Path

# 프로젝트 루트를 path에 추가
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from models.transformer.train import main

if __name__ == '__main__':
    main()
