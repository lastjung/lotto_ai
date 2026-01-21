# AI 해몽 기능 문서

## 📋 개요

사용자가 꿈 내용을 입력하면 한국 전통 해몽을 기반으로 로또 번호를 생성하는 기능입니다.

**2026-01-04 업데이트**: Kiwi 형태소 분석기 적용으로 "물려서" → "물리다" 원형 변환 지원

---

## 🔮 작동 방식

```
사용자 입력             →    형태소 분석    →    상징 DB 검색    →    결과 반환
"뱀에 물려서 부었어요"    →    [뱀, 물리, 붓]  →    3개 상징 매칭    →    해석 + 번호
```

---

## 📁 관련 파일

| 파일 | 역할 |
|------|------|
| `api/dream.py` | 해몽 로직 + Kiwi 형태소 분석 |
| `data/dream_symbols.json` | 해몽 상징 DB (**50개**) |
| `server.py` | `/dream` API 엔드포인트 |
| `web/index.html` | 프론트엔드 UI |

---

## 📡 API 스펙

### POST `/dream`

**Request:**
```json
{
  "dream": "뱀에 물려서 다리가 부었어요",
  "sets": 5,
  "use_llm": false
}
```

**Response:**
```json
{
  "success": true,
  "interpretation": "🌙 해몽 결과: 길몽, 금전운 => ...\n\n📖 상세 해석:\n• 뱀: ...",
  "symbols_found": [
    {"keyword": "뱀", "meaning": "금전운과 재물을 상징"},
    {"keyword": "물리다", "meaning": "재물이 달라붙음"},
    {"keyword": "붓다", "meaning": "재산 증식"}
  ],
  "numbers": [[1, 10, 17, 20, 32, 41, 7]],
  "fortune": "금전운",
  "morphemes": [{"word": "뱀", "pos": "NNG"}, {"word": "물리", "pos": "VV"}]
}
```

---

## 🧠 형태소 분석 (Kiwi)

**2026-01-04 추가됨**

```python
# 설치
pip install kiwipiepy

# 사용
from kiwipiepy import Kiwi
kiwi = Kiwi()
result = kiwi.analyze("뱀에게 물려서")
# → [("뱀", "NNG"), ("물리", "VV")]  # 명사, 동사 원형 추출
```

### 해결된 문제
- ❌ 이전: "물려서" 안에서 "물"(water) 잘못 인식
- ✅ 현재: "물려서" → "물리다" 원형 변환 → 정확한 매칭

---

## 🗄️ 상징 DB (50개)

### 주요 상징

| 상징 | 숫자 | 운세 |
|------|------|------|
| 뱀 | 1, 32, 41, 6, 16 | 금전운 |
| 돼지 | 2, 8, 12, 17, 28, 39 | 대박 |
| 용 | 4, 5, 7, 18, 28, 38 | 대박 |
| 호랑이 | 3, 6, 13, 23, 33, 36 | 성공 |
| 물리다 | 10, 20, 30 | 금전운 |
| 붓다 | 7, 17, 27, 37 | 재물 |

→ 전체 50개 상징 (동물, 자연, 동사, 상황 포함)

---

## 🔄 프로그램 흐름

```
1. 클릭: web/index.html → dreamSubmitBtn.click
   ↓
2. API 호출: fetch('/dream', {dream: "..."})
   ↓
3. 라우터: server.py → dream_interpret()
   ↓
4. 로직: api/dream.py → generate_dream_numbers()
   ↓
5. 형태소 분석: Kiwi → extract_morphemes()  ← NEW
   ↓
6. DB 검색: find_symbols_in_dream() (원형으로 검색)
   ↓
7. 번호 생성: 상징 숫자 + 랜덤 보충
   ↓
8. 응답: JSON 반환 → UI 렌더링
```

---

## ✅ 완료 사항 (2026-01-04)

- [x] Kiwi 형태소 분석기 적용
- [x] 상징 DB 20개 → 50개 확장
- [x] 해석 출력 형식 개선 (결론 + 상세)
- [x] 운세 타입별 메시지 추가
- [x] 줄바꿈 HTML 변환 처리

---

## 🚀 향후 개선 (TODO)

### 1. LLM 연동 (우선순위 높음)
- [ ] Gemini API 키 설정 (`GEMINI_API_KEY` 환경변수)
- [ ] `use_llm: true` 옵션으로 맥락 분석 활성화
- [ ] 비용: 무료 60 QPM (분당 쿼리)

### 2. DB 확장
- [ ] 상징 200개 이상으로 확장
- [ ] 한국 전통 해몽서 기반 데이터 추가

### 3. 외부 API 연동 옵션

| API | 특징 | 비용 |
|-----|------|------|
| Gemini | 한국어 우수, 무료 티어 | 무료 60 QPM |
| Claude | 최고 품질 | $3/1M 토큰 |
| RapidAPI Dream | 심볼 분석 | 유료 |

---

## 📝 테스트 방법

```bash
# 1. 서버 실행
source venv/bin/activate
python3 server.py

# 2. API 직접 테스트
curl -X POST http://localhost:8000/dream \
  -H "Content-Type: application/json" \
  -d '{"dream": "뱀에 물려서 다리가 부었어요", "sets": 1}'

# 3. 프론트엔드 테스트
open web/index.html
```

---

## 📦 의존성

```bash
pip install kiwipiepy  # 형태소 분석기 (79MB)
pip install fastapi uvicorn pydantic  # API 서버
pip install google-generativeai  # Gemini (선택)
```
