"""
AI 해몽 모듈 - 꿈을 분석하여 로또 번호 추천

형태소 분석:
  - Kiwi 라이브러리를 사용하여 한국어 형태소 분석
  - "물려서" → "물리다" (동사 원형)
  - "뱀에게" → "뱀" (명사)
"""

import json
import re
import random
from pathlib import Path
from typing import Optional, List, Tuple
import os

# Kiwi 한국어 형태소 분석기
try:
    from kiwipiepy import Kiwi
    kiwi = Kiwi()
    KIWI_AVAILABLE = True
except ImportError:
    KIWI_AVAILABLE = False
    print("⚠️ Kiwi not installed. Using simple keyword matching.")

# 해몽 DB 로드
DATA_DIR = Path(__file__).parent.parent / "data"


def extract_morphemes(text: str) -> List[Tuple[str, str]]:
    """
    텍스트에서 형태소 추출 (Kiwi 사용)
    
    Returns:
        List of (원형, 품사) 튜플
        예: "뱀에게 물려서" → [("뱀", "NNG"), ("물리다", "VV")]
    
    품사 태그:
        NNG: 일반명사, NNP: 고유명사
        VV: 동사, VA: 형용사
        MM: 관형사, MAG: 부사
    """
    if not KIWI_AVAILABLE:
        return []
    
    result = kiwi.analyze(text)
    if not result:
        return []
    
    # 첫 번째 분석 결과 사용
    tokens = result[0][0]
    
    morphemes = []
    for token in tokens:
        form = token.form      # 원형
        tag = token.tag        # 품사 태그
        
        # 명사, 동사, 형용사만 추출
        if tag.startswith(('NN', 'VV', 'VA')):
            morphemes.append((form, tag))
    
    return morphemes


def load_dream_symbols():
    """해몽 상징 DB 로드"""
    symbols_path = DATA_DIR / "dream_symbols.json"
    if symbols_path.exists():
        with open(symbols_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"symbols": [], "fortune_types": {}}


def find_symbols_in_dream(dream_text: str) -> Tuple[list, list]:
    """
    꿈 텍스트에서 해몽 상징 찾기 (형태소 분석 기반)
    
    처리 흐름:
      1. Kiwi로 형태소 분석 → 원형 추출
      2. "물려서" → "물리다", "뱀에게" → "뱀"
      3. 원형으로 DB 검색
    
    Returns:
        (found_symbols, morphemes): 발견된 상징 리스트, 분석된 형태소 리스트
    """
    db = load_dream_symbols()
    found_symbols = []
    found_ids = set()
    
    # 형태소 분석
    morphemes = extract_morphemes(dream_text)
    extracted_words = [form for form, tag in morphemes]
    
    # 1. 형태소 원형으로 DB 검색
    if morphemes:
        for symbol in db["symbols"]:
            if symbol["id"] in found_ids:
                continue
            
            keywords = [symbol["keyword"]] + symbol.get("variants", [])
            for kw in keywords:
                if kw in extracted_words:
                    found_symbols.append(symbol)
                    found_ids.add(symbol["id"])
                    break
    
    # 2. 형태소 분석이 안되거나 결과가 적으면 키워드 직접 검색도 수행
    if len(found_symbols) < 2:
        for symbol in db["symbols"]:
            if symbol["id"] in found_ids:
                continue
            
            keywords = [symbol["keyword"]] + symbol.get("variants", [])
            for kw in keywords:
                # 2글자 이상인 키워드만 직접 검색 (오탐 방지)
                if len(kw) >= 2 and kw in dream_text:
                    found_symbols.append(symbol)
                    found_ids.add(symbol["id"])
                    break
    
    return found_symbols, morphemes


def extract_numbers_from_dream(dream_text: str) -> list:
    """
    꿈 텍스트에서 숫자 직접 추출 (1-45 범위)
    """
    numbers = re.findall(r'\d+', dream_text)
    valid_numbers = [int(n) for n in numbers if 1 <= int(n) <= 45]
    return list(set(valid_numbers))


def generate_dream_numbers(dream_text: str, num_sets: int = 1) -> dict:
    """
    꿈 텍스트 기반 로또 번호 생성 (형태소 분석 + 규칙 기반)
    
    Args:
        dream_text: 사용자가 입력한 꿈 내용
        num_sets: 생성할 세트 수
    
    Returns:
        dict: {
            "interpretation": 해석 텍스트,
            "symbols_found": 발견된 상징들,
            "numbers": [[메인6개, 보너스], ...],
            "fortune": 운세 타입,
            "morphemes": 분석된 형태소 (디버그용)
        }
    """
    # 1. 상징 찾기 (형태소 분석 포함)
    symbols, morphemes = find_symbols_in_dream(dream_text)
    
    # 2. 꿈에서 직접 언급된 숫자 추출
    direct_numbers = extract_numbers_from_dream(dream_text)
    
    # 3. 상징에서 숫자 수집
    symbol_numbers = []
    for symbol in symbols:
        symbol_numbers.extend(symbol.get("numbers", []))
    
    # 4. 모든 숫자 합치기 (중복 제거, 1-45 범위만)
    all_candidate_numbers = list(set([n for n in (direct_numbers + symbol_numbers) if 1 <= n <= 45]))
    
    # 5. 번호 세트 생성
    results = []
    for _ in range(num_sets):
        # 후보 숫자가 7개 이상이면 그 중에서 선택
        if len(all_candidate_numbers) >= 7:
            selected = random.sample(all_candidate_numbers, 7)
        else:
            # 부족하면 1-45에서 추가
            remaining = [n for n in range(1, 46) if n not in all_candidate_numbers]
            needed = 7 - len(all_candidate_numbers)
            selected = list(all_candidate_numbers) + random.sample(remaining, needed)
        
        main_nums = sorted(selected[:6])
        bonus = selected[6]
        
        results.append(main_nums + [bonus])
    
    # 6. 해석 생성 (결론 요약 + 상세 해석)
    if symbols:
        symbol_names = [s["keyword"] for s in symbols]
        fortunes = [s.get("fortune", "행운") for s in symbols]
        main_fortune = max(set(fortunes), key=fortunes.count)
        
        # 운세 타입별 메시지
        fortune_messages = {
            "대박": "대박의 기운이 감지됩니다! 로또 구매를 강력 추천합니다! 🎉",
            "금전운": "금전운이 있습니다. 당신의 행운을 믿어보세요! 💰",
            "재물": "재물운이 좋습니다. 재정적 이익이 기대됩니다.",
            "성공": "성공의 기운이 있습니다. 도전해보세요! ⭐",
            "행운": "전반적인 행운이 따릅니다. 좋은 일이 생길 거예요.",
            "시작": "새로운 시작에 좋은 기운입니다.",
            "변화": "변화의 시기입니다. 과감한 결정이 필요해요."
        }
        
        # 길몽/흉몽 판정 (금전운, 대박, 재물, 성공 → 길몽)
        is_good = main_fortune in ["대박", "금전운", "재물", "성공", "행운"]
        dream_type = "길몽" if is_good else "보통"
        
        # 결론 요약
        summary = f"🌙 해몽 결과: {dream_type}, {main_fortune} => {fortune_messages.get(main_fortune, '행운이 따릅니다.')}"
        
        # 상세 해석
        details = "\n\n📖 상세 해석:\n"
        for s in symbols:
            details += f"• {s['keyword']}: {s.get('meaning', '')}\n"
        
        interpretation = summary + details
    else:
        interpretation = "🌙 해몽 결과: 특별한 상징이 발견되지 않았지만, 좋은 기운이 느껴집니다."
        main_fortune = "행운"
    
    return {
        "interpretation": interpretation,
        "symbols_found": [{"keyword": s["keyword"], "meaning": s.get("meaning", "")} for s in symbols],
        "numbers": results,
        "fortune": main_fortune,
        "direct_numbers": direct_numbers,
        "morphemes": [{"word": form, "pos": tag} for form, tag in morphemes]
    }


# LLM 연동 (Gemini API)
async def generate_dream_numbers_with_llm(
    dream_text: str, 
    num_sets: int = 1,
    api_key: Optional[str] = None
) -> dict:
    """
    LLM (Gemini)을 활용한 고급 해몽 분석
    
    API 키가 없으면 규칙 기반으로 fallback
    """
    # API 키 확인
    api_key = api_key or os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        # LLM 없이 규칙 기반으로 처리
        return generate_dream_numbers(dream_text, num_sets)
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # 해몽 DB 로드
        db = load_dream_symbols()
        symbols_str = json.dumps(db["symbols"], ensure_ascii=False, indent=2)
        
        prompt = f"""당신은 한국 전통 꿈 해몽 전문가입니다.

다음 해몽 상징 데이터베이스를 참조하세요:
{symbols_str}

사용자의 꿈: "{dream_text}"

위 꿈을 분석하여 다음 JSON 형식으로 응답하세요:
{{
    "interpretation": "꿈의 의미를 2-3문장으로 해석",
    "symbols": ["발견된 상징 키워드들"],
    "lucky_numbers": [1-45 사이의 숫자 7개, 마지막은 보너스],
    "fortune": "대박/금전운/재물/성공/행운 중 하나",
    "reasoning": "왜 이 숫자들을 선택했는지 간단히"
}}

반드시 유효한 JSON만 출력하세요."""

        response = model.generate_content(prompt)
        
        # JSON 파싱
        response_text = response.text
        # JSON 부분만 추출
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
            
            return {
                "interpretation": result.get("interpretation", ""),
                "symbols_found": [{"keyword": s} for s in result.get("symbols", [])],
                "numbers": [result.get("lucky_numbers", [])],
                "fortune": result.get("fortune", "행운"),
                "reasoning": result.get("reasoning", ""),
                "llm_used": True
            }
    
    except Exception as e:
        print(f"LLM 호출 실패: {e}, 규칙 기반으로 fallback")
    
    # Fallback to rule-based
    return generate_dream_numbers(dream_text, num_sets)
