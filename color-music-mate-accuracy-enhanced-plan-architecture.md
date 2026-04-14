# Color Music Mate - 정확도 보강 버전 전체 기획 및 기술 아키텍처 초안

## 1. 제품 개요

### 제품명
**Color Music Mate**

### 정확도 보강 버전의 목표
정확도 보강 버전의 목표는 단순히 기능을 늘리는 것이 아니다.
핵심 목표는 다음과 같다.

> **자동 생성은 유지하되, 틀리는 지점을 줄이고, 틀려도 교정이 빠르게 되게 만든다.**

즉, MVP가 “돌아가는 시스템”이라면,
정확도 보강 버전은 “현장 적용성이 높아진 시스템”이다.

---

## 2. 정확도 보강 버전이 필요한 이유

MVP가 성공하더라도 다음과 같은 문제가 남는다.

- 저해상도 이미지 오인식
- 기울어진 촬영 이미지 처리 한계
- 장식 요소가 많은 악보의 인식 오류
- 리듬/쉼표 일부 오인식
- 가사와 음표가 복잡하게 섞인 경우 품질 저하
- 교사가 결과 신뢰도를 판단하기 어려움

따라서 다음 단계에서는
**정확도 자체를 높이는 것**과 함께,
**교사가 빠르게 검토·보정할 수 있게 하는 구조**가 필요하다.

---

## 3. 제품 목표

### 상위 목표
- 이미지 악보 인식 품질 향상
- 저품질 입력에 대한 회복력 강화
- 신뢰도 기반 사용자 경험 제공
- 교정 가능성 중심 설계
- 실제 수업 현장에서 실패 확률 감소

### 핵심 성과 지표 예시
- 평균 인식 정확도 향상
- 분석 실패율 감소
- 교사 수정 시간 단축
- 1페이지 동요 악보 처리 성공률 상승
- 저화질 이미지에서도 최소 usable 결과 확보

---

## 4. 제품 범위

### 포함 기능
- 전처리 강화
- 작업 큐 도입
- 신뢰도 점수 산출
- 의심 음표 표시
- 교사 교정 UI
- 다중 전처리 시도
- OMR 로그 저장
- 실패 시 fallback 흐름
- 비교 보기(원본 vs 결과)
- 결과 품질 로그 축적

### 여전히 제외할 기능
- 완전 자동 무수정 보장
- 모든 악보 양식 100% 지원
- 손글씨 악보 지원
- 대규모 상용 PDF 배치 처리
- 모바일 네이티브 패키징

---

## 5. 정확도 보강 전략 요약

정확도 보강 버전은 다음 4가지 축으로 설계한다.

### 1) 전처리 강화
이미지를 바로 OMR에 넣지 않고,
인식률을 높이는 전처리 파이프라인을 먼저 태운다.

### 2) 작업 큐 구조
무거운 OMR 작업을 비동기 job으로 분리해 안정성과 재시도 가능성을 확보한다.

### 3) 신뢰도 기반 UI
결과를 모두 동일하게 보여주지 않고,
의심 구간만 선별해 교사가 빠르게 검토하도록 한다.

### 4) 수정 가능한 결과 구조
완전 자동보다 **빠른 수정 가능성**을 우선 설계한다.

---

## 6. 정확도 보강 버전 기술 스택

### 프런트엔드
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand 또는 Jotai

### 시각화 및 재생
- OpenSheetMusicDisplay
- Tone.js

### 백엔드
- FastAPI
- Celery 또는 경량 작업 큐 대안
- Redis (queue / cache 용도)

### 이미지 처리 / 음악 처리
- OpenCV
- music21
- oemer (primary OMR)
- 필요 시 homr (실험용)
- 필요 시 Audiveris (내부 검수용)

### 저장소 / 데이터베이스
- PostgreSQL
- Supabase Storage / S3
- 결과 로그 저장 테이블

---

## 7. 정확도 보강 버전 아키텍처

```text
[사용자 브라우저]
   └─ Next.js 앱
       ├─ 업로드
       ├─ 진행률 조회
       ├─ 색깔악보 뷰어
       ├─ 교정 에디터
       └─ 재생기

[API Gateway]
   ├─ Next.js Route Handlers
   └─ Auth / Session / File metadata

[Job Layer]
   ├─ Queue
   ├─ Worker 1: 이미지 전처리
   ├─ Worker 2: OMR 실행
   ├─ Worker 3: MusicXML 검증
   ├─ Worker 4: color-score 생성
   └─ Worker 5: export 생성

[OMR Layer]
   ├─ Primary: oemer
   ├─ Optional Lab: homr
   └─ Optional Internal Tool: Audiveris

[Music Logic Layer]
   ├─ music21 key 분석
   ├─ transpose
   ├─ degree mapping
   ├─ sequence JSON 생성
   └─ confidence scoring

[Storage]
   ├─ raw image
   ├─ preprocessed image
   ├─ musicxml
   ├─ score json
   ├─ playback json
   └─ exports
```

---

## 8. 계층별 역할 설명

### 1) Next.js 앱
- 업로드 UI 제공
- 작업 상태 폴링
- 원본/결과 비교 화면 제공
- 학생용 보기 / 교사용 보기 분리
- 교정 UI 제공

### 2) API Gateway / Route Handlers
- 업로드 세션 생성
- job 발행
- 결과 조회 API 제공
- 사용자 인증 및 세션 처리

### 3) Job Layer
- 무거운 작업을 비동기 처리
- 단계별 실패를 재시도 가능하게 관리
- 처리 로그를 남김
- 분석 시간을 사용자에게 투명하게 보여줌

### 4) OMR Layer
- 1차 기본 엔진: `oemer`
- 실험용 보조 엔진: `homr`
- 내부 검수 / 비교용: `Audiveris`

### 5) Music Logic Layer
- MusicXML 구조 확인
- 조성 분석
- 이조(장조 변경)
- 색 매핑
- 재생용 note sequence 생성
- confidence score 계산

---

## 9. 정확도 보강 처리 흐름

1. 사용자가 이미지 업로드
2. 업로드 직후 품질 검사 수행
3. 이미지 전처리 버전 여러 개 생성
4. 기본 OMR 엔진 실행
5. 실패 시 대체 전처리 또는 fallback 경로 적용
6. MusicXML 구조 검증
7. 조성 분석 수행
8. 이조 적용
9. 색깔악보 모델 생성
10. confidence score 계산
11. 낮은 신뢰도 음표만 교정 UI에 표시
12. 최종 렌더링
13. 재생용 sequence JSON 생성
14. 내보내기 파일 생성
15. 로그 저장

---

## 10. 전처리 강화 설계

정확도 향상을 위해 전처리 단계가 핵심이다.

### 전처리 항목
- grayscale 변환
- adaptive threshold
- noise 제거
- 기울기 보정
- 가장자리 crop
- 해상도 정규화
- staff line 대비 보강

### 전처리 전략
- 원본 이미지 하나만 쓰지 않는다.
- 2~3개의 전처리 variant를 만들고,
  그중 품질이 가장 높은 결과를 채택하는 방식도 고려한다.

### 전처리 결과 저장 이유
- 나중에 어떤 전처리 조합이 성능이 좋은지 추적 가능
- 악보 유형별 성능 패턴 분석 가능

---

## 11. OMR 엔진 전략

### 기본 운영 엔진: oemer
- 앱 통합이 가장 단순하다.
- Python 파이프라인과 연결하기 쉽다.
- MVP 연속선상에서 가장 현실적인 선택이다.

### 실험용 엔진: homr
- 카메라 사진 기반 악보 인식 실험에 유리할 수 있다.
- 다만 운영 엔진보다는 정확도 비교 실험용이 적합하다.

### 내부 검수용: Audiveris
- OMR 엔진 + 편집기 조합이라는 점에서 참고 가치가 높다.
- 제품 운영용 기본 엔진보다는 내부 확인 도구로 적합하다.

---

## 12. 신뢰도 점수 설계

정확도 보강 버전에서는 결과를 단순히 “성공/실패”로 나누지 않는다.

### confidence score가 필요한 이유
- 교사가 결과 품질을 빠르게 판단할 수 있다.
- 자동 생성 결과를 그대로 써도 되는지 알 수 있다.
- 검토가 필요한 구간만 선별할 수 있다.

### 신뢰도 분류 예시
- **높음**: 바로 색깔악보 생성
- **중간**: 주의 배너 표시 후 사용 가능
- **낮음**: 교사 검토 필수

### confidence 산정 후보
- note 인식 일관성
- 마디 합 계산 오류 여부
- 조표/박자표 일관성
- staff line 검출 품질
- 전처리 간 결과 편차

---

## 13. 교사 교정 UI 설계

정확도 보강 버전의 핵심은 “교사가 빠르게 고칠 수 있어야 한다”는 점이다.

### 교정 UI 주요 기능
- 의심 음표 강조 표시
- 음 높이 수정
- 마디 길이 수정
- 쉼표 수정
- 조성 변경 확인
- 색상 모드 변경

### 교정 UX 원칙
- 전체 악보를 다 수정하게 하지 않는다.
- 낮은 신뢰도 구간만 먼저 보여준다.
- 원본 이미지와 결과 악보를 나란히 비교할 수 있어야 한다.
- 마디 단위로 빠르게 탐색할 수 있어야 한다.

---

## 14. 추가 화면 구조

### 1) 업로드 화면
- 예시 이미지
- 권장 조건 안내
- 품질 경고 메시지

### 2) 분석 진행 화면
- 전처리 중
- 악보 인식 중
- 후처리 중
- 결과 생성 중

### 3) 교사 검토 화면
- 원본 이미지
- 변환 결과
- confidence 경고 영역
- 의심 음표 목록
- 수정 패널

### 4) 학생용 화면
- 큰 음표 간격
- 큰 재생 버튼
- 색 + 숫자 + 계이름
- 최소한의 UI

---

## 15. 데이터 모델 확장

### PreprocessVariant
- id
- uploadId
- variantType
- imageUrl
- score

### ConfidenceIssue
- id
- omrResultId
- measureIndex
- noteIndex
- issueType
- confidence

### ManualCorrection
- id
- colorScoreId
- originalValue
- correctedValue
- correctedBy
- correctedAt

### EngineRunLog
- id
- uploadId
- engineName
- runtimeMs
- success
- outputSummary

---

## 16. API 확장 초안

### Next.js
- `POST /api/uploads`
- `GET /api/uploads/:id`
- `GET /api/jobs/:id`
- `GET /api/scores/:id`
- `POST /api/corrections`
- `POST /api/exports/pdf`
- `POST /api/exports/png`

### FastAPI / Worker Layer
- `POST /omr/jobs`
- `GET /omr/jobs/{job_id}`
- `POST /omr/preprocess`
- `POST /omr/analyze`
- `POST /omr/validate`
- `POST /omr/transpose`
- `POST /omr/render-model`
- `POST /omr/confidence`

---

## 17. 권장 폴더 구조

```text
apps/color-music-mate/
  app/
    page.tsx
    upload/page.tsx
    jobs/[id]/page.tsx
    score/[id]/page.tsx
    teacher/[id]/page.tsx
    api/
      uploads/route.ts
      jobs/[id]/route.ts
      scores/[id]/route.ts
      corrections/route.ts
      exports/pdf/route.ts
      exports/png/route.ts

  components/
    upload/
    progress/
    score/
    playback/
    teacher-review/
    correction-editor/

  lib/
    api/
    playback/
    color-mapping/
    score-model/
    confidence/

services/omr/
  main.py
  workers/
    preprocess_worker.py
    omr_worker.py
    validate_worker.py
    score_worker.py
    export_worker.py
  core/
    preprocess.py
    preprocess_variants.py
    run_oemer.py
    run_homr.py
    parse_musicxml.py
    validate_musicxml.py
    transpose.py
    colorize.py
    confidence.py
```

---

## 18. 개발 단계 제안

### Phase 1. MVP 안정화
- 업로드 → 분석 → 색깔악보 → 재생 흐름 완성
- 샘플 동요 악보 테스트셋 확보

### Phase 2. 전처리 강화
- adaptive threshold
- 기울기 보정
- 전처리 variant 실험

### Phase 3. confidence score 도입
- 결과 품질 점수 계산
- 의심 구간 표시

### Phase 4. 교사 교정 UI 구현
- 음표 수정
- 마디 수정
- 결과 저장

### Phase 5. 다중 엔진 실험
- `oemer`와 보조 엔진 비교
- 악보 유형별 최적 경로 탐색

---

## 19. 품질 개선 관점의 핵심 철학

정확도 보강 버전에서 중요한 것은 단순히 “인공지능이 더 똑똑해지는 것”이 아니다.

가장 중요한 것은,

1. **더 덜 틀리게 만들고**
2. **틀려도 빨리 고치게 하며**
3. **교사가 결과를 믿고 쓸 수 있게 하는 것**

즉,

> **정확도 향상 + 신뢰도 가시화 + 빠른 교정 가능성**

이 세 가지가 함께 가야 한다.

---

## 20. 운영 리스크와 대응

### 리스크 1. 이미지 품질 편차
- 대응: 업로드 가이드 제공
- 대응: 품질 검사 및 경고

### 리스크 2. OMR 엔진 오인식
- 대응: 전처리 다변화
- 대응: confidence score
- 대응: 교정 UI

### 리스크 3. 처리 시간 증가
- 대응: 작업 큐 도입
- 대응: 진행률 표시

### 리스크 4. 결과 신뢰 부족
- 대응: 원본 vs 결과 비교 보기
- 대응: 의심 구간 표시

---

## 21. 성공 기준

정확도 보강 버전의 성공 기준은 다음과 같다.

- 저화질 이미지에서도 완전 실패하지 않는다.
- 교사가 결과를 보고 어느 정도 믿을 수 있다.
- 검토가 필요한 음표만 선별적으로 볼 수 있다.
- 수정 시간이 짧다.
- 실제 수업 전 준비 시간을 줄여 준다.

즉,

> **“자동 생성 결과가 더 믿을 만하고, 틀려도 빨리 수정 가능하다.”**

이 상태가 목표다.

---

## 22. Codex용 시작 지시문 초안

```md
Build the accuracy-enhanced version of Color Music Mate.

Goal:
- Improve recognition reliability for uploaded PNG/JPG one-line children's piano sheet images.
- Add preprocessing variants, async jobs, confidence scoring, and teacher correction UI.
- Keep the existing flow: upload → OMR → MusicXML → color score → playback.

Requirements:
- Use Next.js App Router for the frontend.
- Use FastAPI + background workers for OMR jobs.
- Add preprocessing variants with OpenCV.
- Use oemer as the primary OMR engine.
- Store MusicXML, color-score JSON, playback JSON, and correction logs.
- Add confidence scoring for notes and measures.
- Add a teacher review screen with note correction tools.
- Keep playback with Tone.js and rendering with OpenSheetMusicDisplay.

Deliverables:
- Async job architecture
- Teacher correction editor
- Confidence issue model
- Extended storage model
- Improved UI flow for review and export
```

---

## 23. 최종 정리

정확도 보강 버전은 새로운 앱을 만드는 단계가 아니다.
기존 Color Music Mate MVP를 **현장형 서비스**로 바꾸는 단계다.

정리하면,

- **MVP는 자동 생성이 되는가를 증명하는 단계**
- **정확도 보강 버전은 얼마나 덜 틀리고 얼마나 빨리 고칠 수 있는가를 개선하는 단계**

따라서 이 버전의 진짜 목표는 “완벽한 자동화”가 아니라,

> **현장에서 실패하지 않는 자동화**

를 만드는 것이다.
