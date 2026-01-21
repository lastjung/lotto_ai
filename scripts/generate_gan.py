#!/usr/bin/env python
"""GAN 모델로 번호 생성"""
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from models.gan.generate import main

if __name__ == '__main__':
    main()
