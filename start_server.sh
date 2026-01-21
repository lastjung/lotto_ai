#!/bin/bash

# 색상 코드
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎱 AI 로또 생성기 서버를 시작합니다...${NC}"

# 1. 가상환경 활성화
if [ -d "venv" ]; then
    echo "Using venv environment..."
    source venv/bin/activate
else
    echo "❌ 가상환경(venv)을 찾을 수 없습니다. 설치가 필요할 수 있습니다."
fi

# 2. 프로세스 종료 처리 (Ctrl+C)
trap "kill 0" EXIT

# 3. 서버 백그라운드 실행
echo -e "${GREEN}🚀 Starting FastAPI Server...${NC}"
uvicorn server:app --reload &
SERVER_PID=$!

# 4. 서버가 뜰 때까지 잠시 대기
sleep 3

# 5. 브라우저 열기 (Mac)
echo -e "${BLUE}🌍 Opening Web Browser...${NC}"
open "file://$(pwd)/web/index.html"

# 6. 프로세스 유지
echo -e "${GREEN}✅ 서버가 실행 중입니다. 종료하려면 Ctrl+C를 누르세요.${NC}"
wait $SERVER_PID
