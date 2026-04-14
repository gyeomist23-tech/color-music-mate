FROM python:3.10-slim

WORKDIR /app

# 시스템 의존성
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# oemer 모델 다운로드
RUN python -c "import urllib.request, os; from oemer import MODULE_PATH; base='https://github.com/BreezeWhite/oemer/releases/download/checkpoints'; os.makedirs(f'{MODULE_PATH}/checkpoints/unet_big', exist_ok=True); os.makedirs(f'{MODULE_PATH}/checkpoints/seg_net', exist_ok=True); urllib.request.urlretrieve(f'{base}/1st_model.onnx', f'{MODULE_PATH}/checkpoints/unet_big/model.onnx'); urllib.request.urlretrieve(f'{base}/2nd_model.onnx', f'{MODULE_PATH}/checkpoints/seg_net/model.onnx'); print('모델 다운로드 완료')"

# numpy/sklearn 호환성 패치
COPY patch_oemer.py .
RUN python patch_oemer.py

# 앱 소스 복사
COPY . .

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
