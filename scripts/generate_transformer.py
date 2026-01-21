#!/usr/bin/env python
"""Transformer 모델로 번호 생성"""
import sys
from pathlib import Path

# 프로젝트 루트를 path에 추가
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from models.transformer.generate import main

if __name__ == '__main__':
    main()
