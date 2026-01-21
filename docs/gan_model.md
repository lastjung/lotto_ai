# GAN 로또 번호 생성 모델

## 개요

GAN (Generative Adversarial Network) 기반의 로또 번호 생성 모델입니다. Generator와 Discriminator가 경쟁적으로 학습하여 실제 당첨번호와 유사한 번호 조합을 생성합니다.

> ⚠️ **주의**: 로또는 완전한 무작위 추첨이므로, AI 예측은 재미용이며 당첨을 보장하지 않습니다.

---

## 모델 아키텍처

```
┌─────────────────────────────────────────────────┐
│              Random Noise (z)                    │
│              (latent_dim = 64)                   │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│               GENERATOR                          │
│    FC → BatchNorm → LeakyReLU → Dropout          │
│              × 3 layers                          │
│    → 6개 Output Heads (각 45개 클래스)            │
└─────────────────┬───────────────────────────────┘
                  ▼
          ┌──────────────┐
          │ 생성된 번호   │
          │ (batch, 6)   │
          └──────┬───────┘
                 │
     ┌───────────┴───────────┐
     ▼                       ▼
┌─────────┐           ┌──────────────┐
│ 진짜    │           │ DISCRIMINATOR │
│ 데이터  │──────────▶│ Embedding     │
└─────────┘           │ FC → LeakyReLU│
                      │ → Sigmoid     │
                      └──────┬────────┘
                             ▼
                      ┌──────────────┐
                      │ Real/Fake    │
                      │ (0~1 확률)   │
                      └──────────────┘
```

---

## 모델 파라미터

### Generator 설정

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `latent_dim` | 64 | 입력 노이즈 차원 |
| `hidden_dim` | 256 | 은닉층 차원 |
| `num_balls` | 45 | 로또 공 개수 (1~45) |
| `output_nums` | 6 | 출력 번호 개수 |
| `dropout` | 0.3 | 드롭아웃 비율 |

### Discriminator 설정

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `num_balls` | 45 | 로또 공 개수 |
| `hidden_dim` | 256 | 은닉층 차원 |
| `output_nums` | 6 | 입력 번호 개수 |
| `dropout` | 0.3 | 드롭아웃 비율 |

### 파라미터 수

| 네트워크 | 파라미터 수 |
|----------|------------|
| Generator | **1,270,798** |
| Discriminator | **149,697** |
| **합계** | **1,420,495** |

---

## 학습 설정

### 학습 파라미터

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `epochs` | 200 | 학습 에폭 수 |
| `batch_size` | 64 | 배치 크기 |
| `lr_generator` | 0.0002 | Generator 학습률 |
| `lr_discriminator` | 0.0002 | Discriminator 학습률 |
| `beta1` | 0.5 | Adam beta1 |
| `beta2` | 0.999 | Adam beta2 |

### 학습 과정

```
1. Discriminator 학습:
   - 진짜 데이터 → Real Label (1.0)
   - 가짜 데이터 → Fake Label (0.0)
   - BCE Loss 최소화

2. Generator 학습:
   - 생성된 데이터가 Discriminator를 속이도록
   - 가짜 데이터 → Real Label (1.0) 목표
   - BCE Loss 최소화
```

---

## 데이터 구조

### Generator 입력
```
Shape: (batch_size, latent_dim)
- latent_dim: 64 (랜덤 노이즈)
```

### Generator 출력
```
Shape: (batch_size, 6, 45)
- 6: 번호 위치
- 45: 각 번호(1~45)의 로짓
```

### Discriminator 입력
```
Shape: (batch_size, 6)
- 6개의 로또 번호 (1~45)
```

### Discriminator 출력
```
Shape: (batch_size, 1)
- 진짜일 확률 (0~1)
```

---

## 생성 알고리즘

### 중복 없는 샘플링

1. 랜덤 노이즈 z 생성
2. Generator로 각 위치별 확률 분포 계산
3. 순차적으로 번호 샘플링 (이미 선택된 번호 마스킹)
4. 6개 번호 오름차순 정렬

```python
for i in range(6):
    curr_logits = logits[:, i, :]
    curr_logits = curr_logits - used_mask * 1e9  # 마스킹
    probs = softmax(curr_logits)
    selected = multinomial(probs, 1)
```

---

## 보너스 번호 생성 (Hybrid Approach)

GAN 모델은 6개의 메인 번호 생성에 특화되어 있습니다. 보너스 번호 생성을 위해 **Transformer 기반의 보너스 모델**을 결합하여 사용합니다.

### 하이브리드 방식 동작 원리
1. **GAN**: 6개의 메인 번호 생성
2. **Transformer Bonus Model**: 보너스 번호 예측 확률 분포 계산
3. **Filtering**: GAN이 생성한 6개 번호를 제외한 나머지 번호 중에서 보너스 번호 샘플링 (중복 방지)
4. **Result**: `[GAN 6개] + [Transformer 1개]` 조합 반환

---

## 사용법

### 학습
```bash
# GAN 모델 학습
source venv/bin/activate
python train_gan.py --epochs 200

# (참고) 보너스 모델은 Transformer 쪽에서 학습 (`train_bonus.py`)
```

### 번호 생성
```bash
# GAN 메인 + Transformer 보너스 통합 생성
python generate_gan.py --sets 5
```

---

## 파일 구조

```
models/gan/
├── config.json      # 모델 설정
├── gan.py           # Generator, Discriminator 정의
├── dataloader.py    # 데이터 로더
├── train.py         # 학습 스크립트
├── generate.py      # 생성 스크립트
├── generator.pt     # 학습된 모델
└── __init__.py
```

---

## Transformer vs GAN 비교

| 항목 | Transformer | GAN |
|------|-------------|-----|
| 입력 | 과거 20회차 시퀀스 | 랜덤 노이즈 |
| 학습 방식 | 다음 번호 예측 | 적대적 학습 |
| 파라미터 수 | 1.3M | 1.4M |
| 장점 | 시계열 패턴 학습 | 다양한 조합 생성 |
| 단점 | 과적합 가능 | Mode Collapse 가능 |

---

## 향후 개선 방향

1. **Wasserstein GAN**: 학습 안정성 향상
2. **Conditional GAN**: 조건부 생성 (특정 패턴 지정)
3. **더 깊은 네트워크**: 복잡한 패턴 학습
4. **정규화 기법**: Spectral Normalization 등
