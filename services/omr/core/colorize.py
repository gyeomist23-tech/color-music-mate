"""음표에 색상 매핑 및 조성 변환"""

from typing import Optional, List, Dict, Any

COLOR_MAP = {
    1: {"color": "#FF4444", "solfege": "도"},
    2: {"color": "#FF8C00", "solfege": "레"},
    3: {"color": "#FFD700", "solfege": "미"},
    4: {"color": "#4CAF50", "solfege": "파"},
    5: {"color": "#87CEEB", "solfege": "솔"},
    6: {"color": "#4169E1", "solfege": "라"},
    7: {"color": "#9370DB", "solfege": "시"},
}

# 반음 순서 (샤프 기준)
CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# 장조 스케일 도수 간격 (반음 단위)
MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11]

# 조성별 루트음 반음 인덱스
KEY_ROOT = {
    "C": 0, "C#": 1, "Db": 1,
    "D": 2, "D#": 3, "Eb": 3,
    "E": 4,
    "F": 5, "F#": 6, "Gb": 6,
    "G": 7, "G#": 8, "Ab": 8,
    "A": 9, "A#": 10, "Bb": 10,
    "B": 11,
}


def pitch_to_midi(pitch: str) -> int:
    """C4 → 60, D4 → 62 등 MIDI 번호 반환"""
    # 음이름과 옥타브 분리
    if len(pitch) >= 2 and pitch[-1].isdigit():
        octave = int(pitch[-1])
        note_name = pitch[:-1].upper()
    else:
        octave = 4
        note_name = pitch.upper()

    try:
        semitone = CHROMATIC.index(note_name)
    except ValueError:
        # 플랫 처리 (예: Bb → A#)
        flat_map = {"DB": "C#", "EB": "D#", "GB": "F#", "AB": "G#", "BB": "A#"}
        note_name = flat_map.get(note_name, note_name)
        try:
            semitone = CHROMATIC.index(note_name)
        except ValueError:
            semitone = 0

    return (octave + 1) * 12 + semitone


def midi_to_pitch(midi: int) -> str:
    """MIDI 번호 → 음이름 (예: 60 → C4)"""
    octave = (midi // 12) - 1
    semitone = midi % 12
    return f"{CHROMATIC[semitone]}{octave}"


def midi_to_degree(midi: int, key: str) -> int:
    """MIDI 번호를 현재 조성의 도수(1~7)로 변환"""
    root = KEY_ROOT.get(key, 0)
    semitone_from_root = (midi - root) % 12
    # 가장 가까운 스케일 도수 찾기
    for deg_idx, interval in enumerate(MAJOR_INTERVALS):
        if semitone_from_root == interval:
            return deg_idx + 1
    # 스케일 외 음은 가장 가까운 도수로 근사
    min_dist = 12
    best_deg = 1
    for deg_idx, interval in enumerate(MAJOR_INTERVALS):
        dist = min(abs(semitone_from_root - interval), 12 - abs(semitone_from_root - interval))
        if dist < min_dist:
            min_dist = dist
            best_deg = deg_idx + 1
    return best_deg


def colorize_note(pitch: str, note_id: int, duration: float, measure: int, beat: float, key: str = "C") -> dict:
    midi = pitch_to_midi(pitch)
    degree = midi_to_degree(midi, key)
    mapping = COLOR_MAP[degree]
    return {
        "id": note_id,
        "pitch": pitch,
        "degree": degree,
        "solfege": mapping["solfege"],
        "color": mapping["color"],
        "duration": duration,
        "measure": measure,
        "beat": beat,
    }


def transpose_score(notes: List[Dict[str, Any]], semitones: int, new_key: str) -> List[Dict[str, Any]]:
    """악보 전체를 semitones 반음만큼 이조하고 새 조성 기준으로 색상 재매핑"""
    transposed = []
    for note in notes:
        midi = pitch_to_midi(note["pitch"])
        new_midi = midi + semitones
        new_pitch = midi_to_pitch(new_midi)
        new_degree = midi_to_degree(new_midi, new_key)
        mapping = COLOR_MAP[new_degree]
        transposed.append({
            **note,
            "pitch": new_pitch,
            "degree": new_degree,
            "solfege": mapping["solfege"],
            "color": mapping["color"],
        })
    return transposed
