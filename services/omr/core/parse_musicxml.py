"""MusicXML 파싱 및 데모 악보 생성"""

from typing import List, Dict, Any
from pathlib import Path
from core.colorize import colorize_note


# ─── 데모 악보 (반짝반짝 작은 별) ────────────────────────────

TWINKLE_NOTES = [
    ("C4", 0.5, 1, 1.0), ("C4", 0.5, 1, 1.5), ("G4", 0.5, 1, 2.0), ("G4", 0.5, 1, 2.5),
    ("A4", 0.5, 2, 1.0), ("A4", 0.5, 2, 1.5), ("G4", 1.0, 2, 2.0),
    ("F4", 0.5, 3, 1.0), ("F4", 0.5, 3, 1.5), ("E4", 0.5, 3, 2.0), ("E4", 0.5, 3, 2.5),
    ("D4", 0.5, 4, 1.0), ("D4", 0.5, 4, 1.5), ("C4", 1.0, 4, 2.0),
    ("G4", 0.5, 5, 1.0), ("G4", 0.5, 5, 1.5), ("F4", 0.5, 5, 2.0), ("F4", 0.5, 5, 2.5),
    ("E4", 0.5, 6, 1.0), ("E4", 0.5, 6, 1.5), ("D4", 1.0, 6, 2.0),
    ("G4", 0.5, 7, 1.0), ("G4", 0.5, 7, 1.5), ("F4", 0.5, 7, 2.0), ("F4", 0.5, 7, 2.5),
    ("E4", 0.5, 8, 1.0), ("E4", 0.5, 8, 1.5), ("D4", 1.0, 8, 2.0),
    ("C4", 0.5, 9, 1.0), ("C4", 0.5, 9, 1.5), ("G4", 0.5, 9, 2.0), ("G4", 0.5, 9, 2.5),
    ("A4", 0.5, 10, 1.0), ("A4", 0.5, 10, 1.5), ("G4", 1.0, 10, 2.0),
    ("F4", 0.5, 11, 1.0), ("F4", 0.5, 11, 1.5), ("E4", 0.5, 11, 2.0), ("E4", 0.5, 11, 2.5),
    ("D4", 0.5, 12, 1.0), ("D4", 0.5, 12, 1.5), ("C4", 1.0, 12, 2.0),
]

# music21 음표 type → duration 배수 (4분음표 = 0.5)
DURATION_MAP = {
    "whole": 2.0, "half": 1.0, "quarter": 0.5,
    "eighth": 0.25, "16th": 0.125, "32nd": 0.0625,
}


def generate_demo_score(score_id: str, title: str = "반짝반짝 작은 별") -> Dict[str, Any]:
    notes = [colorize_note(p, i, d, m, b) for i, (p, d, m, b) in enumerate(TWINKLE_NOTES)]
    return {"id": score_id, "title": title, "bpm": 100, "key": "C", "timeSignature": "4/4", "notes": notes}


# ─── 경량 OMR JSON → 색깔악보 ─────────────────────────────────

def build_score_from_notes(
    raw_notes: List[Dict],
    score_id: str,
    title: str = "악보",
    beats_per_measure: int = 4,
) -> Dict[str, Any]:
    """
    경량 OMR(OpenCV) 결과를 색깔악보 JSON으로 변환한다.
    raw_notes: [{"pitch": "C4", "x": 100, "y": 200, "duration": 0.5}, ...]
    """
    # 음표를 마디와 박자로 배치
    notes_out = []
    measure = 1
    beat_in_measure = 1.0

    for i, rn in enumerate(raw_notes):
        pitch = rn["pitch"]
        dur = rn.get("duration", 0.5)

        cn = colorize_note(pitch, i, dur, measure, beat_in_measure)
        notes_out.append(cn)

        beat_in_measure += dur * 2  # duration 0.5 = 1박
        if beat_in_measure > beats_per_measure:
            measure += 1
            beat_in_measure = 1.0

    # 키 분석: 가장 많이 나오는 음 기준
    key = "C"

    return {
        "id": score_id,
        "title": title,
        "bpm": 100,
        "key": key,
        "timeSignature": f"{beats_per_measure}/4",
        "notes": notes_out,
    }


# ─── MusicXML → 색깔악보 JSON ─────────────────────────────────

def parse_musicxml(xml_path: str, score_id: str, title: str = "악보") -> Dict[str, Any]:
    """
    MusicXML 파일을 파싱해 색깔악보 JSON을 반환한다.
    music21을 사용한다.
    """
    try:
        import music21 as m21
    except ImportError:
        raise RuntimeError("music21이 설치되지 않았습니다.")

    score = m21.converter.parse(xml_path)

    # 조성 분석
    key_obj = score.analyze("key")
    key_name = key_obj.tonic.name  # 예: "C", "G"

    # BPM 추출
    bpm = 100
    for el in score.flat.getElementsByClass(m21.tempo.MetronomeMark):
        if el.number:
            bpm = int(el.number)
            break

    # 박자표 추출
    time_sig = "4/4"
    for ts in score.flat.getElementsByClass(m21.meter.TimeSignature):
        time_sig = ts.ratioString  # 예: "4/4", "3/4", "6/8"
        break

    # 단선율 추출 (첫 번째 파트의 상단 성부)
    notes_raw = []
    part = score.parts[0] if score.parts else score

    note_id = 0
    for measure in part.getElementsByClass(m21.stream.Measure):
        measure_num = measure.number or 1
        beat_offset = 0.0
        for el in measure.notes:
            if isinstance(el, m21.note.Note):
                pitch_str = _m21_pitch_to_str(el.pitch)
                dur = _m21_duration(el)
                notes_raw.append((pitch_str, dur, measure_num, beat_offset + 1.0))
                beat_offset += dur * 4
                note_id += 1
            elif isinstance(el, m21.chord.Chord):
                # 화음이면 최고음만 추출
                top = max(el.pitches, key=lambda p: p.midi)
                pitch_str = _m21_pitch_to_str(top)
                dur = _m21_duration(el)
                notes_raw.append((pitch_str, dur, measure_num, beat_offset + 1.0))
                beat_offset += dur * 4
                note_id += 1

    if not notes_raw:
        raise RuntimeError("악보에서 음표를 찾을 수 없습니다.")

    notes = [
        colorize_note(p, i, d, m, b, key_name)
        for i, (p, d, m, b) in enumerate(notes_raw)
    ]

    return {
        "id": score_id,
        "title": title,
        "bpm": bpm,
        "key": key_name,
        "timeSignature": time_sig,
        "notes": notes,
    }


def _m21_pitch_to_str(pitch) -> str:
    """music21 Pitch → 'C4' 형식"""
    name = pitch.name.replace("-", "b")  # Eb, Bb 등
    return f"{name}{pitch.octave}"


def _m21_duration(el) -> float:
    """music21 요소 → duration (4분음표 = 0.5 기준)"""
    t = el.duration.type
    dots = el.duration.dots
    base = DURATION_MAP.get(t, 0.5)
    # 점음표 처리
    for i in range(dots):
        base += base / (2 ** (i + 1))
    return base
