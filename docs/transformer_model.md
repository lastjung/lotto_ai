# Transformer 로또 번호 생성 모델

## 개요

Transformer 아키텍처 기반의 로또 번호 예측 모델입니다. 과거 당첨번호 시퀀스를 학습하여 다음 회차의 번호 조합을 생성합니다.

> ⚠️ **주의**: 로또는 완전한 무작위 추첨이므로, AI 예측은 통계적 패턴 학습일 뿐 당첨을 보장하지 않습니다.

---

## 모델 아키텍처

```
┌─────────────────────────────────────────────────┐
│                 Input Sequence                   │
│         (seq_len × input_nums)                   │
│         기본값: 20회차 × 6개                      │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│              Number Embedding                    │
│         (1~45 번호 → d_model 차원)               │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│           Positional Encoding                    │
│         (시퀀스 위치 정보 추가)                   │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│         Transformer Encoder Layers               │
│    (Multi-Head Attention + Feed Forward)         │
│              × num_layers                        │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│           Global Average Pooling                 │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│           6개 Output Heads                       │
│     (각 위치별 1~45 확률 분포)                    │
└─────────────────────────────────────────────────┘
```

---

## 모델 파라미터

### 기본 설정값

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `num_balls` | 45 | 로또 공 개수 (1~45) |
| `d_model` | 128 | 임베딩 차원 |
| `nhead` | 8 | Multi-Head Attention 헤드 수 |
| `num_layers` | 4 | Transformer Encoder 레이어 수 |
| `dim_feedforward` | 512 | Feed Forward 은닉층 차원 |
| `dropout` | 0.1 | 드롭아웃 비율 |
| `seq_len` | 20 | 입력 시퀀스 길이 (과거 회차 수) |
| `input_nums` | 6 | 회차당 입력 번호 개수 (보너스 제외) |
| `output_nums` | 6 | 출력 번호 개수 |

### 파라미터 수 계산

현재 설정 기준 **총 1,333,774개** 파라미터:

```
Embedding Layer:    46 × 128 = 5,888
Positional Enc:     (학습 파라미터 없음)
Transformer Enc:    4 × (Self-Attn + FFN + LayerNorm) ≈ 1,320,000
Output Heads:       6 × (128 → 512 → 45) ≈ 7,886
```

---

## 학습 설정

### 학습 파라미터

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `--epochs` | 100 | 학습 에폭 수 |
| `--batch-size` | 32 | 배치 크기 |
| `--lr` | 0.001 | 학습률 (AdamW) |
| `--seq-len` | 20 | 입력 시퀀스 길이 |

### 최적화

- **Optimizer**: AdamW (weight_decay=0.01)
- **Scheduler**: Cosine Annealing LR
- **Loss**: CrossEntropyLoss (각 위치별 평균)
- **Gradient Clipping**: max_norm=1.0

---

## 데이터 구조

### 입력 형식
```
Shape: (batch_size, seq_len, 6)
- seq_len: 과거 회차 수 (기본 20)
- 6: 당첨번호 6개 (보너스 제외)
```

### 출력 형식
```
Shape: (batch_size, 6, 45)
- 6: 예측할 번호 위치
- 45: 각 번호(1~45)의 확률
```

---

## 생성 알고리즘

### Top-K 샘플링 with 중복 제거

1. 각 위치별 로짓에 temperature 적용
2. 이미 선택된 번호 마스킹 (-∞)
3. 상위 K개 후보에서 확률적 샘플링
4. 최종 6개 번호 오름차순 정렬

### 생성 파라미터

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `--temperature` | 1.0 | 높을수록 다양성 증가, 낮을수록 확정적 |
| `--top-k` | 15 | 상위 K개 후보에서만 샘플링 |
| `--sets` | 5 | 생성할 번호 세트 수 |

---

## 학습 결과 (50 에폭)

| 메트릭 | 값 |
|--------|-----|
| Train Loss | 3.14 |
| Val Loss | 3.20 |
| Top-10 Accuracy | 59% |

> Top-10 Accuracy: 각 위치에서 정답 번호가 상위 10개 예측 내에 포함된 비율

---

---

## 보너스 번호 예측 (Bonus Model)

Transformer 모델은 6개의 메인 번호만 예측하도록 최적화되었습니다 (입력 시퀀스에서도 보너스 제외).
보너스 번호는 별도의 **Bonus Model**을 사용하여 예측합니다.

### 보너스 모델 특징
- **아키텍처**: 메인 모델과 동일한 Transformer 구조 사용
- **설정**: `input_nums=1`, `output_nums=1` (보너스 번호 1개만 처리)
- **학습 데이터**: 과거 보너스 번호 시퀀스 → 다음 보너스 번호
- **파일**: `config_bonus.json`, `bonus_model.pt`

---

## 사용법

### 학습
```bash
# 1. 메인 모델 (6개 번호) 학습
source venv/bin/activate
python train_transformer.py --epochs 100

# 2. 보너스 모델 (1개 번호) 학습
python train_bonus.py --epochs 100
```

### 번호 생성
```bash
# 메인 6개 + 보너스 1개 통합 생성
python generate_full.py --sets 5 --temperature 1.0

# (옵션) 메인 6개만 생성
python generate_transformer.py --sets 5
```

---

## 파일 구조

```
models/transformer/
├── transformer.py      # 모델 정의
├── dataloader.py       # 메인 데이터 로더
├── dataloader_bonus.py # 보너스 데이터 로더 (NEW)
├── train.py            # 메인 학습
├── train_bonus.py      # 보너스 학습 (NEW)
├── generate.py         # 메인 생성
├── generate_full.py    # 통합 생성 (Main + Bonus) (NEW)
├── config.json         # 메인 설정
├── config_bonus.json   # 보너스 설정 (NEW)
└── best_model.pt       # 메인 모델 가중치
└── bonus_model.pt      # 보너스 모델 가중치 (NEW)
```

---

## 향후 개선 방향

1. **데이터 증강**: 번호 셔플링, 노이즈 추가
2. **모델 앙상블**: 여러 모델 조합
3. **통계 특성 추가**: 홀짝/고저 비율, 합계 범위
4. **더 긴 시퀀스**: 50~100회차 입력
