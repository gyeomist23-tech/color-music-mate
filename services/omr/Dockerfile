FROM python:3.10-slim

WORKDIR /app

# 시스템 의존성 (OpenCV용)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# 앱 소스 복사
COPY . .

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
