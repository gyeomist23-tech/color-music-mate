# Color Music Mate - MVP 버전 전체 기획 및 기술 아키텍처 초안

## 1. 제품 개요

### 제품명
**Color Music Mate**

### 한 줄 정의
인터넷이나 개인 자료에서 구한 **동요 1단 피아노 악보 이미지(PNG/JPG)** 를 업로드하면,
앱이 이를 자동 분석하여 **학생용 색깔악보**로 변환하고,
**속도 조절 · 구간 반복 · 음표 하이라이트 재생**까지 제공하는 웹앱.

### 주요 사용자
- 특수교사
- 발달장애·지체장애 학생
- 가정에서 반복 연습을 돕는 보호자

### MVP 목표
MVP의 핵심 목표는 다음 한 흐름을 안정적으로 구현하는 것이다.

> **깔끔한 1단 동요 악보 이미지 1장 → 색깔악보 생성 → 재생**

여기서 중요한 것은 “최고 정확도”가 아니라,
**선생님이 실제 수업에서 바로 사용할 수 있는 속도와 단순성**이다.

---

## 2. MVP 범위

### MVP에서 반드시 구현할 기능
- PNG/JPG 업로드
- 1페이지 악보만 처리
- 단선율 중심 분석
- 색깔악보 생성
- 학생용 보기 / 교사용 보기
- 전체 재생
- 속도 조절
- 구간 반복
- 음표 하이라이트 재생
- PDF 또는 PNG 저장

### MVP에서 제외할 기능
- 다페이지 악보
- 복잡한 반주 분석
- 가사 정교 복원
- 코드명 인식
- 완전 자동 편집
- 모바일 앱 패키징
- 난도 자동 단순화

---

## 3. 주요 사용자 시나리오

### 시나리오 A. 교사가 동요 악보를 색깔악보로 만드는 경우
1. 교사가 PNG/JPG 악보 이미지를 업로드한다.
2. 앱이 자동 분석을 시작한다.
3. 앱이 색깔악보 초안을 생성한다.
4. 교사가 이상한 음표 1~2개만 확인한다.
5. 학생용 화면으로 전환한다.
6. 느린 속도로 재생한다.
7. PDF 저장 또는 수업 화면으로 활용한다.

### 시나리오 B. 학생이 색깔악보를 보고 따라 연주하는 경우
1. 학생이 색깔악보 화면에 진입한다.
2. 음표마다 색, 숫자, 계이름을 본다.
3. 재생 버튼을 누른다.
4. 현재 음표가 하이라이트된다.
5. 느린 속도와 반복 재생으로 따라 연습한다.

---

## 4. 제품 설계 원칙

1. **입력은 어렵고 출력은 쉬워야 한다.**  
   교사는 이미지만 올리면 되고, 학생은 단순한 색깔악보를 바로 봐야 한다.

2. **자동화는 하되 수정 여지를 남긴다.**  
   악보 이미지 인식은 100%가 아니므로, 교사 확인 구조를 전제로 설계한다.

3. **색만으로 정보를 전달하지 않는다.**  
   색 + 숫자 + 계이름을 함께 제공한다.

4. **접근성은 부가 기능이 아니라 기본값이다.**  
   큰 터치 영역, 높은 대비, 단순한 화면 구조를 기본으로 둔다.

---

## 5. MVP 기술 전략

MVP는 **Next.js 프런트엔드 + Python OMR 백엔드**의 2층 구조가 가장 현실적이다.

### 기술 스택

#### 프런트엔드
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui

#### 악보 렌더링
- OpenSheetMusicDisplay (OSMD)

#### 재생
- Tone.js

#### 백엔드 / 분석
- FastAPI
- OpenCV
- music21
- oemer

#### 저장소 및 데이터
- Supabase Storage 또는 S3 계열 스토리지
- PostgreSQL 또는 Supabase Postgres

---

## 6. 왜 이 조합이 현실적인가

### Next.js
- 웹앱 UI 구축이 빠르다.
- 업로드, 결과 조회, 세션 관리 구조를 만들기 쉽다.
- Codex로 구조 생성하기 좋다.

### FastAPI
- 업로드 파일 처리와 분석 API 구성이 간단하다.
- Python 기반 OMR 도구들과 연결이 자연스럽다.

### oemer
- 이미지 악보를 MusicXML로 바꾸는 오픈소스 OMR 엔진이다.
- 초기 MVP에서 가장 단순하게 붙일 수 있다.

### music21
- MusicXML을 읽고, 조성을 다루고, 이조(Transpose)를 적용하기 좋다.
- 색깔악보용 음계 degree 계산에 유리하다.

### OpenSheetMusicDisplay
- MusicXML을 브라우저에 시각적으로 렌더링할 수 있다.
- 학생용/교사용 보기 분리에도 적합하다.

### Tone.js
- 재생 타이밍, 템포, 반복 재생, 하이라이트 동기화 구현에 적합하다.

---

## 7. MVP 시스템 아키텍처

```text
[사용자 브라우저]
   └─ Next.js 웹앱
       ├─ 업로드 UI
       ├─ 색깔악보 뷰어
       ├─ 재생 컨트롤
       └─ 교사 확인 화면

[API 계층]
   ├─ Next.js Route Handlers
   │   ├─ 업로드 세션 생성
   │   ├─ 작업 상태 조회
   │   └─ 결과 JSON 전달
   └─ FastAPI OMR 서비스
       ├─ 파일 수신
       ├─ OpenCV 전처리
       ├─ oemer 실행
       ├─ music21 후처리
       └─ 결과 JSON / MusicXML 저장

[저장소]
   ├─ 원본 이미지
   ├─ MusicXML
   ├─ 색깔악보 JSON
   └─ 내보내기 파일(PDF/PNG)
```

### 역할 분리
- **Next.js**: 사용자 경험, 화면 전환, 업로드/조회, 결과 표시
- **FastAPI**: 이미지 처리, OMR 실행, 조성 분석, 색 매핑 데이터 생성
- **Storage/DB**: 업로드 파일, 결과 파일, 작업 상태 저장

---

## 8. MVP 처리 흐름

1. 사용자가 악보 이미지(PNG/JPG)를 업로드한다.
2. Next.js가 업로드 세션을 생성한다.
3. 파일이 스토리지에 저장된다.
4. FastAPI가 파일을 가져와 전처리한다.
5. OpenCV로 흑백화, 이진화, 크기 보정, 기울기 보정을 수행한다.
6. `oemer`로 MusicXML을 생성한다.
7. `music21`으로 조성을 확인하고 음표 구조를 정리한다.
8. 음표를 degree 기반으로 색상 매핑한다.
9. 결과를 JSON + MusicXML 형식으로 저장한다.
10. 프런트엔드가 OSMD로 악보를 렌더링한다.
11. Tone.js로 재생하며 음표를 하이라이트한다.

---

## 9. 색깔악보 변환 정책

### 색 매핑 모드

#### 1) 절대음 기준
- C = 빨강
- D = 주황
- E = 노랑
- F = 초록
- G = 하늘
- A = 파랑
- B = 보라

#### 2) 계이름 기준
- 현재 조성의 1도(도) = 빨강
- 2도 = 주황
- 3도 = 노랑
- 4도 = 초록
- 5도 = 하늘
- 6도 = 파랑
- 7도 = 보라

### 학생용 표시 방식
- 음표 색상
- 숫자 병기 (1~7)
- 계이름 병기 (도레미)
- 필요 시 영어 음이름 표시

### MVP 추천 기본값
- **계이름 기준 색 매핑**
- **숫자 + 계이름 동시 표시**

---

## 10. 재생 기능 설계

### 기본 재생 기능
- 전체 재생
- 일시정지
- 다시 시작
- 속도 50% / 75% / 100%
- 구간 반복
- 현재 음표 하이라이트

### 교육용 재생 UX
- 느리게 재생을 기본에 가깝게 배치
- 학생용 화면은 버튼 수를 최소화
- 현재 음표를 시각적으로 강하게 표시
- 한 마디 반복 기능 제공

---

## 11. 화면 구조

### 1) 업로드 화면
- 파일 업로드 영역
- 지원 형식 안내
- 권장 해상도 안내
- 예시 이미지 노출

### 2) 분석 진행 화면
- 업로드 완료 상태
- 분석 중 로딩
- 예상 처리 단계 표시

### 3) 결과 화면 (교사용)
- 원본 이미지 보기
- 변환된 색깔악보 보기
- 재생 컨트롤
- 내보내기 버튼
- 간단 확인 메시지

### 4) 결과 화면 (학생용)
- 단순한 악보만 크게 표시
- 큰 재생 버튼
- 반복 버튼
- 속도 조절 버튼 최소화

---

## 12. 데이터 모델 초안

### SongUpload
- id
- userId
- originalFileUrl
- status
- createdAt

### OMRResult
- id
- uploadId
- musicXmlUrl
- confidenceScore
- rawNotesJson

### ColorScore
- id
- omrResultId
- mappingMode
- targetKey
- renderedScoreJson
- exportPdfUrl
- exportPngUrl

### PlaybackPreset
- id
- colorScoreId
- bpm
- loopStart
- loopEnd
- instrument

---

## 13. API 초안

### Next.js Route Handlers
- `POST /api/uploads`
- `GET /api/uploads/:id`
- `GET /api/scores/:id`
- `POST /api/exports/pdf`
- `POST /api/exports/png`

### FastAPI
- `POST /omr/jobs`
- `GET /omr/jobs/{job_id}`
- `POST /omr/analyze`
- `POST /omr/transpose`
- `POST /omr/render-model`

---

## 14. 권장 폴더 구조

```text
apps/color-music-mate/
  app/
    page.tsx
    upload/page.tsx
    score/[id]/page.tsx
    teacher/[id]/page.tsx
    api/
      uploads/route.ts
      scores/[id]/route.ts
      exports/pdf/route.ts
      exports/png/route.ts

  components/
    upload/
    score/
    playback/
    teacher-review/

  lib/
    api/
    playback/
    color-mapping/
    score-model/

services/omr/
  main.py
  routers/
  workers/
  core/
    preprocess.py
    run_oemer.py
    parse_musicxml.py
    transpose.py
    colorize.py
```

---

## 15. 접근성 설계

### 공통 원칙
- 큰 버튼
- 높은 대비
- 단순한 화면
- 실수 방지
- 색만이 아닌 숫자/문자 동시 제공

### 발달장애 학생 고려
- 화면 요소 수 최소화
- 단계별 흐름 유지
- 예측 가능한 UI
- 반복 재생을 전면에 배치

### 지체장애 학생 고려
- 충분히 큰 터치 영역
- 버튼 간격 확보
- 드래그보다 탭 중심 인터랙션

---

## 16. MVP 개발 순서

### Sprint 1
- 업로드 UI
- 파일 저장
- FastAPI 연결
- 샘플 이미지 테스트

### Sprint 2
- oemer 연동
- MusicXML 생성 확인
- OSMD 렌더링

### Sprint 3
- 색깔악보 변환
- Tone.js 재생
- 속도 조절 / 루프

### Sprint 4
- PDF/PNG 내보내기
- 교사용 확인 UI
- 오류 메시지 정리

---

## 17. MVP 성공 기준

MVP의 성공 기준은 “완전 자동”이 아니다.

다음 기준을 만족하면 성공이다.

- 인터넷에서 받은 1단 동요 악보 1장을 올렸을 때
- 1~2분 내에 색깔악보가 생성되고
- 교사가 약간만 확인하면
- 실제 수업에서 사용할 수 있어야 한다.

즉,

> **“대부분 맞고, 교사가 조금 고치면 바로 수업 가능”**

이 상태가 MVP의 현실적인 목표다.

---

## 18. Codex용 시작 지시문 초안

```md
Build a Next.js web app called Color Music Mate.

Goal:
- Upload a PNG/JPG image of a simple one-line children's piano sheet.
- Send the image to a FastAPI OMR backend.
- Use Python preprocessing + oemer to convert the image into MusicXML.
- Use music21 to analyze the score and create a color-score JSON model.
- Render the result with OpenSheetMusicDisplay.
- Add playback using Tone.js with highlight sync.
- Include teacher view and student view.
- Support export to PNG and PDF.

Tech:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- FastAPI
- OpenCV
- oemer
- music21
- Tone.js
- OpenSheetMusicDisplay
```

---

## 19. 최종 정리

MVP 단계에서 가장 중요한 것은 복잡한 기능을 많이 넣는 것이 아니다.

가장 중요한 것은 다음 세 가지다.

1. **업로드가 쉬울 것**
2. **결과가 빨리 나올 것**
3. **학생이 바로 따라볼 수 있을 것**

따라서 Color Music Mate MVP는,

> **자동 분석 → 색깔악보 생성 → 재생 → 간단 확인**

이 한 흐름을 가장 먼저 완성해야 한다.
