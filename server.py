
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import torch
import sys
from pathlib import Path

# 루트 경로 추가
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from models.transformer.generate_full import generate_with_bonus, load_configs as load_trans_configs
from models.gan.generate import generate_numbers, load_config as load_gan_config
from api.dream import generate_dream_numbers, generate_dream_numbers_with_llm

# Request 모델
class DreamRequest(BaseModel):
    dream: str
    sets: int = 1
    use_llm: bool = False

app = FastAPI(title="AI Lotto Server", description="AI 기반 로또 번호 생성 + 해몽")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용 (개발용)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 설정 로드
print("⏳ Loading Configurations...")
trans_main_cfg, trans_bonus_cfg = load_trans_configs()
gan_config = load_gan_config()
print("✅ Configuration Loaded")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Lotto Generator API is running"}

@app.get("/generate")
def generate(model: str = 'transformer', sets: int = 5):
    """
    로또 번호 생성 API
    :param model: 'transformer' | 'gan' | 'random'
    :param sets: 생성할 세트 수 (1~100)
    :return: {'results': [[1,2,3,4,5,6,7], ...]}
    """
    
    # 세트 수 제한
    if sets < 1: sets = 1
    if sets > 100: sets = 100
    
    try:
        results = []
        
        if model == 'transformer':
            # 메인 + 보너스 (튜플 리스트: ([Main], Bonus))
            raw_results = generate_with_bonus(trans_main_cfg, trans_bonus_cfg, num_sets=sets)
            # 포맷 변환: [[Main..., Bonus], ...]
            results = [ main + [bonus] for main, bonus in raw_results ]
            
        elif model == 'gan':
            # 메인 + 보너스 (리스트 튜플: ([Main], Bonus))
            raw_results = generate_numbers(gan_config, num_sets=sets)
            results = [ main + [bonus] for main, bonus in raw_results ]
            
        elif model == 'random':
            import random
            results = []
            for _ in range(sets):
                # 7개 뽑기 (6개 메인 + 1개 보너스)
                # 실제 로또처럼 45개 중 7개 비복원 추출
                nums = random.sample(range(1, 46), 7)
                main = sorted(nums[:6])
                bonus = nums[6]
                results.append(main + [bonus])
                
        else:
            raise HTTPException(status_code=400, detail="Unknown model type")
            
        return {"results": results, "model": model}
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/dream")
async def dream_interpret(request: DreamRequest):
    """
    AI 해몽 API - 꿈 텍스트를 분석하여 로또 번호 추천
    
    :param request: {"dream": "꿈 내용", "sets": 1, "use_llm": false}
    :return: {
        "interpretation": "해석",
        "symbols_found": [...],
        "numbers": [[1,2,3,4,5,6,7], ...],
        "fortune": "대박/금전운/..."
    }
    """
    if not request.dream or len(request.dream.strip()) < 2:
        raise HTTPException(status_code=400, detail="꿈 내용을 입력해주세요")
    
    sets = max(1, min(10, request.sets))  # 1-10 제한
    
    try:
        if request.use_llm:
            # LLM 사용 (Gemini API 키 필요)
            result = await generate_dream_numbers_with_llm(request.dream, sets)
        else:
            # 규칙 기반
            result = generate_dream_numbers(request.dream, sets)
        
        return {
            "success": True,
            "model": "llm" if request.use_llm else "rule-based",
            **result
        }
        
    except Exception as e:
        print(f"❌ Dream API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

