# Color Music Mate

색깔로 배우는 피아노 악보 웹앱. 동요 악보 이미지(PNG/JPG)를 업로드하면 색깔악보로 변환하고 재생까지 제공합니다.

## 주요 기능

- 악보 이미지 업로드 (드래그앤드롭 + 클릭)
- 음표를 계이름별 색상으로 변환 (도=빨강, 레=주황, 미=노랑, 파=초록, 솔=하늘, 라=파랑, 시=보라)
- Tone.js 기반 재생 (속도 조절, 구간 반복)
- 교사용/학생용 분리 화면

## 프로젝트 구조

```
(앱) Color Music Mate/
├── apps/
│   └── color-music-mate/     # Next.js 14 프런트엔드
│       ├── app/
│       │   ├── page.tsx              # 홈 (업로드)
│       │   ├── score/[id]/page.tsx   # 결과 화면
│       │   ├── teacher/[id]/page.tsx # 교사용
│       │   ├── student/[id]/page.tsx # 학생용
│       │   └── api/uploads/route.ts  # 업로드 API
│       ├── components/
│       │   ├── upload/UploadZone.tsx
│       │   ├── score/ColorScore.tsx
│       │   └── playback/PlaybackControls.tsx
│       └── lib/
│           ├── color-mapping.ts
│           └── api.ts
└── services/
    └── omr/                  # FastAPI 백엔드
        ├── main.py
        ├── routers/omr.py
        ├── core/
        │   ├── preprocess.py
        │   ├── parse_musicxml.py
        │   └── colorize.py
        └── requirements.txt
```

## 시작 방법

### 방법 1: 자동 시작 (macOS)

```bash
./start-dev.sh
```

### 방법 2: 수동 시작

**터미널 1 - FastAPI 백엔드:**

```bash
cd services/omr
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**터미널 2 - Next.js 프런트엔드:**

```bash
cd apps/color-music-mate
npm run dev
```

### 접속 주소

- 앱: http://localhost:3000
- API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 처음 설치 시

### 프런트엔드

```bash
cd apps/color-music-mate
npm install
```

### 백엔드

```bash
cd services/omr
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 색상 매핑

| 계이름 | 숫자 | 색상 |
|--------|------|------|
| 도 | 1 | 빨강 #FF4444 |
| 레 | 2 | 주황 #FF8C00 |
| 미 | 3 | 노랑 #FFD700 |
| 파 | 4 | 초록 #4CAF50 |
| 솔 | 5 | 하늘 #87CEEB |
| 라 | 6 | 파랑 #4169E1 |
| 시 | 7 | 보라 #9370DB |

## MVP 동작 방식

현재 MVP는 "반짝반짝 작은 별" 악보를 하드코딩으로 반환합니다.
실제 OMR(악보 인식)은 추후 통합 예정입니다.

이미지 업로드 → 전처리(OpenCV) → 데모 악보 반환 → 색깔악보 렌더링 → Tone.js 재생
