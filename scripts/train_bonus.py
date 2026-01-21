#!/usr/bin/env python
"""보너스 모델 학습 래퍼"""
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from models.transformer.train_bonus import main

if __name__ == '__main__':
    main()
