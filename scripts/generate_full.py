#!/usr/bin/env python
"""메인 + 보너스 통합 생성 래퍼"""
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from models.transformer.generate_full import main

if __name__ == '__main__':
    main()
