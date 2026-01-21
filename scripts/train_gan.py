#!/usr/bin/env python
"""GAN 모델 학습 실행"""
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from models.gan.train import main

if __name__ == '__main__':
    main()
