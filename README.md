# loto_ai

AI 기반 로또 번호 생성 시스템

## 📁 폴더 구조

```
loto_ai/
├── server.py              # FastAPI 메인 서버
├── start_server.sh        # 서버 실행 스크립트
├── requirements.txt       # Python 의존성
│
├── api/                   # API 엔드포인트 (신규)
│   ├── __init__.py
│   ├── generate.py        # 번호 생성 API
│   └── dream.py           # AI 해몽 API
│
├── data/                  # 데이터 파일
│   ├── draws.json         # 역대 당첨 번호
│   └── dream_symbols.json # 해몽 상징 DB (신규)
│
├── models/                # AI 모델
│   ├── transformer/       # Transformer 모델
│   └── gan/               # GAN 모델
│
├── scripts/               # 유틸리티 스크립트
│   ├── fetch_lotto_data.js
│   └── train_*.py
│
├── web/                   # 프론트엔드
│   └── index.html
│
└── docs/                  # 문서
    ├── IMPLEMENTATION_PLAN.md
    └── *.md
```

## 🚀 실행 방법

```bash
# 가상환경 활성화
source venv/bin/activate

# 서버 실행
python server.py
# 또는
./start_server.sh

# 브라우저에서 확인
open http://localhost:8000
open web/index.html
```

## 📡 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|-------|------|
| `/` | GET | 서버 상태 확인 |
| `/generate` | GET | 번호 생성 (model, sets 파라미터) |
| `/dream` | POST | AI 해몽 → 번호 생성 (신규) |

## 🎯 기능

- **Transformer 모델**: 시퀀스 패턴 학습 기반 번호 생성
- **GAN 모델**: 적대적 생성 네트워크 기반 번호 생성
- **AI 해몽**: 꿈 해석 + LLM 기반 번호 추천 (개발 중)
