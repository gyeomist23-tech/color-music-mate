#!/bin/bash
set -e

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  echo "가상환경이 없습니다. 먼저 venv를 생성하세요:"
  echo "  python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

source venv/bin/activate
echo "FastAPI 서버 시작: http://localhost:8000"
echo "API 문서: http://localhost:8000/docs"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
