# Neural Network Visualizer 기술 문서

## 📁 파일 구조

```
web/
├── index.html          # UI 구조
├── css/style.css       # 스타일
├── js/
│   ├── main.js         # 로또 머신 + 탭 로직
│   └── neural-viz.js   # 신경망 시각화 로직 ⭐
└── music.mp3           # 기본 음악 파일
```

---

## 🧠 neural-viz.js 핵심 함수

| 함수                          | 역할                                              |
| ----------------------------- | ------------------------------------------------- |
| `initNN()`                    | DOM 바인딩, 이벤트 리스너 설정                    |
| `renderNetwork()`             | 신경망 구조 렌더링 (노드 + 선)                    |
| `randomizeConnectionColors()` | 모든 선 색상 무작위 변경                          |
| `toggleAutoFlow()`            | 자동 흐름 애니메이션 시작/정지                    |
| `startMusicVisualizer(url)`   | 음악 로드 및 시각화 시작                          |
| `stopMusicVisualizer()`       | 음악 정지 및 스타일 초기화                        |
| `animateViz()`                | **핵심!** 매 프레임 주파수 분석 → 시각화 업데이트 |

---

## 🎵 음악 시각화 원리

### Web Audio API 활용

음악 시각화는 **미리 분석(Pre-analysis)**이 아니라, **재생하면서 실시간(Real-time)**으로 분석합니다.

```
🎵 MUSIC SYNC 클릭
      ↓
음악 파일 로드 (fetch → ArrayBuffer)
      ↓
AudioContext로 디코딩
      ↓
재생 시작 + AnalyserNode 연결
      ↓
[매 프레임마다 반복] ← 핵심!
   └─ analyser.getByteFrequencyData(dataArray)
   └─ 주파수 데이터 → 시각화 반영
      ↓
음악 끝날 때까지 계속...
```

### 주파수 → 시각화 매핑

- **AnalyserNode**: 음악을 **128개의 주파수 대역**으로 분석
- **각 대역의 볼륨**: 0~255 범위의 값

| 주파수 대역        | 담당 시각 요소 |
| ------------------ | -------------- |
| 저음역 (0~10)      | 노드 크기 펄스 |
| 중/고음역 (10~100) | 연결선 활성화  |

---

## ⚡ animateViz() 상세 흐름

```javascript
function animateViz() {
  // 1. 주파수 데이터 획득
  analyser.getByteFrequencyData(dataArray);

  // 2. 선(Line) 처리
  lines.forEach((line, idx) => {
    // 주파수 대역 할당 (전체 선 수 기준 균등 분배)
    const binIdx = 10 + Math.floor((idx / totalLines) * 90);
    const val = dataArray[binIdx];

    // 가중치 적용
    const weight = line.getAttribute("data-weight");
    const effectiveVal = val * weight;

    // 임계값 넘으면 활성화
    if (effectiveVal > 60) {
      // 색상, 두께, 투명도 변경
      // 목적지 노드에 활성화 정보 누적
    }
  });

  // 3. 노드(Node) 처리
  nodes.forEach((node) => {
    // 들어오는 선들의 활성화 합계 확인
    if (incoming.sum > 0) {
      // 노드 활성화 (색상, 글로우)
    }
  });

  // 4. 다음 프레임 반복
  requestAnimationFrame(animateViz);
}
```

---

## 🎯 신경망 시뮬레이션 원리

### 가중치(Weight) 시스템

각 선과 노드에 **랜덤 가중치**가 부여됩니다:

```javascript
// 선: 0.4 ~ 1.0
const weight = 0.4 + Math.random() * 0.6;
line.setAttribute("data-weight", weight);

// 노드: 0.3 ~ 1.0
const nodeWeight = 0.3 + Math.random() * 0.7;
circle.setAttribute("data-weight", nodeWeight);
```

### 효과

- 같은 순간에도 **선/노드마다 다른 강도**로 활성화
- 마치 실제 신경망의 **시냅스 가중치**처럼 보임
- 훨씬 **다이나믹하고 자연스러운** 시각화

### 노드 활성화 조건

노드는 **자신에게 들어오는 선이 활성화될 때**만 반응합니다:

```
21번 노드에서 신호 전송
    ↓
21→31 선이 활성화됨
    ↓
31번 노드가 반응!
```

이것이 진정한 **신경망 전파(Forward Propagation)** 시뮬레이션입니다.

---

## 🎮 UI 버튼 기능

| 버튼                | 기능                                 |
| ------------------- | ------------------------------------ |
| 🎨 **RANDOM COLOR** | 모든 선 색상 무작위 변경             |
| ⚡ **AUTO FLOW**    | 자동 흐름 애니메이션 (음악 없이)     |
| 🎵 **MUSIC SYNC**   | 음악(music.mp3) 재생 + 실시간 시각화 |

---

## 📝 주파수-레이어 매핑

레이어가 뒤로 갈수록(숫자가 높아질수록) 높은 주파수에 반응합니다:

| 레이어          | 주파수        | 특징                   |
| --------------- | ------------- | ---------------------- |
| 10번대 → 20번대 | 저음 (Bass)   | 킥 드럼, 베이스에 반응 |
| 20번대 → 30번대 | 중음 (Mid)    | 멜로디, 보컬에 반응    |
| 30번대 → 40번대 | 고음 (Treble) | 하이햇, 심벌에 반응    |

---

## 🎹 음악 특성에 따른 시각화

- **저음 위주 음악** (예: Q Train): 앞쪽 레이어가 활발하게 반응
- **고음 위주 음악** (예: EDM, 팝): 뒤쪽 레이어도 화려하게 반응

음악의 특성이 그대로 시각화에 반영됩니다!

---

_마지막 업데이트: 2026-01-21_
