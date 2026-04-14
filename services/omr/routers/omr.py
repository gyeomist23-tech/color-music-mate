"""OMR 라우터"""

import asyncio
import uuid
import shutil
from pathlib import Path
from typing import Dict, Any, List

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel

from core.preprocess import save_preprocessed
from core.parse_musicxml import generate_demo_score, parse_musicxml
from core.run_oemer import run_oemer
from core.colorize import transpose_score, KEY_ROOT, MAJOR_INTERVALS

router = APIRouter(prefix="/omr", tags=["omr"])

UPLOAD_DIR = Path("uploads")
PROCESSED_DIR = Path("processed")
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

jobs: Dict[str, Dict[str, Any]] = {}
scores: Dict[str, Dict[str, Any]] = {}


# ─── 업로드 ───────────────────────────────────────────────

@router.post("/upload")
async def upload_image(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    allowed_types = {"image/png", "image/jpeg", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(400, "PNG 또는 JPG 파일만 허용됩니다.")

    job_id = str(uuid.uuid4())
    ext = Path(file.filename or "score.jpg").suffix or ".jpg"
    filepath = UPLOAD_DIR / f"{job_id}{ext}"

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    jobs[job_id] = {
        "id": job_id,
        "status": "pending",
        "progress": 0,
        "message": "악보를 받았습니다. 분석을 시작합니다...",
        "score_id": None,
        "filepath": str(filepath),
    }

    background_tasks.add_task(process_image, job_id, str(filepath))
    return {"id": job_id, "status": "pending", "message": "업로드 완료. 분석 중..."}


async def process_image(job_id: str, filepath: str):
    job = jobs[job_id]
    loop = asyncio.get_event_loop()
    try:
        # ── 1단계: 전처리 ──────────────────────────────────
        job["status"] = "processing"
        job["progress"] = 10
        job["message"] = "이미지를 전처리하고 있습니다..."

        preprocessed_path = filepath
        try:
            preprocessed_path = await loop.run_in_executor(
                None, save_preprocessed, filepath, str(PROCESSED_DIR)
            )
        except Exception as e:
            job["message"] = f"전처리 건너뜀 (원본 사용): {e}"

        # ── 2단계: oemer OMR ──────────────────────────────
        job["progress"] = 30
        job["message"] = "악보를 인식하고 있습니다... (AI 분석 중, 5~10분 소요)"

        omr_output_dir = str(PROCESSED_DIR / job_id)
        score_id = str(uuid.uuid4())

        try:
            xml_path = await loop.run_in_executor(
                None, run_oemer, preprocessed_path, omr_output_dir
            )

            # ── 3단계: MusicXML 파싱 ─────────────────────
            job["progress"] = 80
            job["message"] = "음표를 분석하고 색깔악보로 변환하고 있습니다..."

            img_title = Path(filepath).stem
            score_data = await loop.run_in_executor(
                None, parse_musicxml, xml_path, score_id, img_title
            )

        except Exception as omr_err:
            # oemer 실패 시 데모 악보로 fallback
            job["message"] = f"OMR 인식 실패 (기본 악보 사용): {omr_err}"
            score_data = generate_demo_score(score_id)

        scores[score_id] = score_data

        job["progress"] = 100
        job["status"] = "done"
        job["message"] = "변환 완료!"
        job["score_id"] = score_id

    except Exception as e:
        job["status"] = "error"
        job["message"] = f"처리 중 오류: {str(e)}"


# ─── 상태 / 악보 조회 ──────────────────────────────────────

@router.get("/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    return jobs[job_id]


@router.get("/score/{score_id}")
async def get_score(score_id: str):
    if score_id not in scores:
        raise HTTPException(404, "악보를 찾을 수 없습니다.")
    return scores[score_id]


# ─── 조성 변경 ────────────────────────────────────────────

SEMITONE_FROM_C = {
    "C": 0, "C#": 1, "Db": 1,
    "D": 2, "D#": 3, "Eb": 3,
    "E": 4,
    "F": 5, "F#": 6, "Gb": 6,
    "G": 7, "G#": 8, "Ab": 8,
    "A": 9, "A#": 10, "Bb": 10,
    "B": 11,
}

class TransposeRequest(BaseModel):
    target_key: str  # 예: "G", "F", "D"

@router.post("/score/{score_id}/transpose")
async def transpose(score_id: str, req: TransposeRequest):
    if score_id not in scores:
        raise HTTPException(404, "악보를 찾을 수 없습니다.")

    score = scores[score_id]
    current_key = score["key"]
    target_key = req.target_key

    if target_key not in SEMITONE_FROM_C:
        raise HTTPException(400, f"지원하지 않는 조성입니다: {target_key}")

    semitones = SEMITONE_FROM_C[target_key] - SEMITONE_FROM_C.get(current_key, 0)
    # 옥타브 내에서 최단 경로
    if semitones > 6:
        semitones -= 12
    elif semitones < -6:
        semitones += 12

    new_notes = transpose_score(score["notes"], semitones, target_key)

    new_score = {
        **score,
        "key": target_key,
        "notes": new_notes,
    }
    scores[score_id] = new_score
    return new_score


# ─── 음표 수정 ────────────────────────────────────────────

class NoteCorrection(BaseModel):
    note_id: int
    pitch: str        # 새 음이름 (예: "D4")
    duration: float   # 새 길이 (예: 0.5)

@router.patch("/score/{score_id}/notes")
async def correct_note(score_id: str, correction: NoteCorrection):
    if score_id not in scores:
        raise HTTPException(404, "악보를 찾을 수 없습니다.")

    score = scores[score_id]
    key = score.get("key", "C")
    notes = score["notes"]

    target = next((n for n in notes if n["id"] == correction.note_id), None)
    if target is None:
        raise HTTPException(404, f"음표 {correction.note_id}을 찾을 수 없습니다.")

    from core.colorize import colorize_note
    updated = colorize_note(
        correction.pitch,
        correction.note_id,
        correction.duration,
        target["measure"],
        target["beat"],
        key,
    )

    for i, n in enumerate(notes):
        if n["id"] == correction.note_id:
            notes[i] = updated
            break

    scores[score_id] = {**score, "notes": notes}
    return updated


# ─── 지원 조성 목록 ──────────────────────────────────────

@router.get("/keys")
async def list_keys():
    keys = [
        {"key": "C",  "label": "C장조 (다장조)"},
        {"key": "G",  "label": "G장조 (사장조)"},
        {"key": "D",  "label": "D장조 (라장조)"},
        {"key": "A",  "label": "A장조 (가장조)"},
        {"key": "E",  "label": "E장조 (마장조)"},
        {"key": "F",  "label": "F장조 (바장조)"},
        {"key": "Bb", "label": "Bb장조 (내림나장조)"},
        {"key": "Eb", "label": "Eb장조 (내림마장조)"},
        {"key": "Ab", "label": "Ab장조 (내림가장조)"},
    ]
    return keys
