#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/color-music-mate"
BACKEND_DIR="$ROOT_DIR/services/omr"

echo "=============================="
echo "  Color Music Mate 개발 서버"
echo "=============================="

# 터미널 앱 열어서 FastAPI 실행
echo "[1/2] FastAPI 백엔드 시작..."
osascript -e "
tell application \"Terminal\"
  do script \"cd '$BACKEND_DIR' && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000\"
  activate
end tell
" 2>/dev/null || {
  echo "  → 수동으로 실행하세요:"
  echo "    cd '$BACKEND_DIR'"
  echo "    source venv/bin/activate"
  echo "    uvicorn main:app --reload --port 8000"
}

sleep 2

# Next.js 프런트엔드 실행
echo "[2/2] Next.js 프런트엔드 시작..."
osascript -e "
tell application \"Terminal\"
  do script \"cd '$FRONTEND_DIR' && npm run dev\"
  activate
end tell
" 2>/dev/null || {
  echo "  → 수동으로 실행하세요:"
  echo "    cd '$FRONTEND_DIR'"
  echo "    npm run dev"
}

echo ""
echo "=============================="
echo "  접속 주소"
echo "=============================="
echo "  프런트엔드: http://localhost:3000"
echo "  백엔드 API: http://localhost:8000"
echo "  API 문서:   http://localhost:8000/docs"
echo "=============================="
