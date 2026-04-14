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
RUN python -c "\
import urllib.request, os; \
base = 'https://github.com/BreezeWhite/oemer/releases/download/checkpoints'; \
from oemer import MODULE_PATH; \
os.makedirs(f'{MODULE_PATH}/checkpoints/unet_big', exist_ok=True); \
os.makedirs(f'{MODULE_PATH}/checkpoints/seg_net', exist_ok=True); \
urllib.request.urlretrieve(f'{base}/1st_model.onnx', f'{MODULE_PATH}/checkpoints/unet_big/model.onnx'); \
urllib.request.urlretrieve(f'{base}/2nd_model.onnx', f'{MODULE_PATH}/checkpoints/seg_net/model.onnx'); \
print('모델 다운로드 완료')"

# numpy 호환성 패치
RUN python -c "\
import site, os; \
sp = site.getsitepackages()[0]; \
files = [f'{sp}/oemer/staffline_extraction.py', f'{sp}/oemer/symbol_extraction.py', f'{sp}/oemer/bbox.py']; \
patches = [('dtype=np.int)', 'dtype=int)'), ('np.int(unit_size//2)', 'int(unit_size//2)')]; \
import re; \
for f in files:\
    txt = open(f).read();\
    for old, new in patches:\
        txt = txt.replace(old, new);\
    txt = txt.replace('    model = AgglomerativeClustering', '    if len(bboxes) <= 1:\\n        return list(bboxes)\\n    model = AgglomerativeClustering', 1);\
    open(f, 'w').write(txt);\
print('패치 완료')"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
