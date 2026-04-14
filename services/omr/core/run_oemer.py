"""
경량 OMR: OpenCV 기반 음표 인식

oemer ONNX 모델이 Railway 512MB 메모리 한도를 초과하므로,
OpenCV만으로 오선지 + 음표 위치를 감지하여 음높이를 결정한다.
"""

import cv2
import numpy as np
import logging
import json
from pathlib import Path
from typing import List, Tuple, Dict, Any

logger = logging.getLogger(__name__)


def run_oemer(image_path: str, output_dir: str) -> str:
    """
    OpenCV로 악보 이미지에서 음표를 감지하고 JSON으로 저장한다.
    반환값: 생성된 JSON 파일 경로
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    logger.info(f"경량 OMR 시작: {image_path}")

    img = cv2.imread(image_path)
    if img is None:
        raise RuntimeError(f"이미지를 읽을 수 없습니다: {image_path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    logger.info(f"이미지 크기: {w}x{h}")

    # 1. 오선지 감지
    staff_lines = detect_staff_lines(gray)
    logger.info(f"감지된 오선 그룹: {len(staff_lines)}개")

    if not staff_lines:
        raise RuntimeError("오선지를 감지하지 못했습니다.")

    for i, staff in enumerate(staff_lines):
        logger.info(f"  오선 {i+1}: y={staff}")

    # 2. 음표 머리(notehead) 감지
    noteheads = detect_noteheads(gray, staff_lines)
    logger.info(f"감지된 음표: {len(noteheads)}개")

    if not noteheads:
        raise RuntimeError("음표를 감지하지 못했습니다.")

    # 3. 음표 위치 → 음높이 변환
    notes = assign_pitches(noteheads, staff_lines)
    logger.info(f"음높이 할당 완료: {len(notes)}개")

    # JSON으로 저장
    result = {
        "notes": notes,
        "staff_count": len(staff_lines),
    }
    json_path = output_path / f"{Path(image_path).stem}_omr.json"
    with open(json_path, "w") as f:
        json.dump(result, f, ensure_ascii=False)

    logger.info(f"경량 OMR 완료: {json_path}")
    return str(json_path)


def detect_staff_lines(gray: np.ndarray) -> List[List[int]]:
    """
    오선지(5줄 그룹)를 감지한다.
    반환: [[y1, y2, y3, y4, y5], ...] 각 오선 그룹의 y좌표
    """
    h, w = gray.shape

    # 이진화
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # ── 1단계: 강한 수평선 감지 ──────────────────────────
    # 이미지 너비의 1/8 이상인 수평선
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w // 8, 1))
    horiz_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horiz_kernel)

    row_sums = np.sum(horiz_lines, axis=1) / 255

    # 두 단계 임계값: 강한 선 (>30%) + 약한 선 (>8%)
    strong_threshold = w * 0.3
    weak_threshold = w * 0.08

    strong_rows = np.where(row_sums > strong_threshold)[0]

    if len(strong_rows) == 0:
        logger.warning("강한 수평선을 찾을 수 없음")
        return []

    # 강한 선 병합
    strong_lines = _merge_rows(strong_rows, gap=3)
    logger.info(f"강한 선 {len(strong_lines)}개: {strong_lines}")

    # ── 2단계: 오선 그룹 찾기 ────────────────────────────
    # 강한 선의 간격 패턴 분석
    if len(strong_lines) < 3:
        logger.warning(f"강한 선이 {len(strong_lines)}개로 부족")
        return []

    # 인접 선 간격 계산
    gaps = [strong_lines[i+1] - strong_lines[i] for i in range(len(strong_lines)-1)]

    # 오선 간격 = 가장 작은 간격들의 중앙값 (오선 내 줄 간격은 좁음)
    sorted_gaps = sorted(gaps)
    staff_gap = int(np.median(sorted_gaps[:min(4, len(sorted_gaps))]))
    logger.info(f"추정 오선 간격: {staff_gap}px")

    # ── 3단계: 5줄씩 그룹화 (간격 기반) ──────────────────
    # 오선 그룹 분리: 간격이 staff_gap * 3 이상이면 다른 그룹
    groups: List[List[int]] = [[strong_lines[0]]]
    for i in range(1, len(strong_lines)):
        if strong_lines[i] - groups[-1][-1] > staff_gap * 3:
            groups.append([strong_lines[i]])
        else:
            groups[-1].append(strong_lines[i])

    # ── 4단계: 누락된 줄 보간 ────────────────────────────
    staff_groups = []
    for group in groups:
        if len(group) >= 5:
            staff_groups.append(group[:5])
        elif len(group) >= 2:
            # 누락된 줄을 간격 패턴으로 보간
            completed = _complete_staff(group, staff_gap, row_sums, weak_threshold)
            if len(completed) == 5:
                staff_groups.append(completed)
            else:
                logger.warning(f"오선 보간 실패: {group} → {completed}")

    return staff_groups


def _merge_rows(rows: np.ndarray, gap: int = 3) -> List[int]:
    """연속된 행을 하나의 선으로 병합"""
    if len(rows) == 0:
        return []
    lines = []
    start = rows[0]
    for i in range(1, len(rows)):
        if rows[i] - rows[i-1] > gap:
            lines.append(int((start + rows[i-1]) // 2))
            start = rows[i]
    lines.append(int((start + rows[-1]) // 2))
    return lines


def _complete_staff(
    detected: List[int], gap: int,
    row_sums: np.ndarray, weak_threshold: float
) -> List[int]:
    """
    감지된 줄이 5개 미만일 때, 간격 패턴과 약한 선 탐색으로 5줄을 완성한다.
    """
    if len(detected) >= 5:
        return detected[:5]

    # 감지된 줄의 실제 간격 계산
    if len(detected) >= 2:
        local_gaps = [detected[i+1] - detected[i] for i in range(len(detected)-1)]
        actual_gap = int(np.median(local_gaps))
    else:
        actual_gap = gap

    # 5줄 후보 생성: 첫 줄 기준으로 등간격
    first = detected[0]
    candidates = [first + actual_gap * i for i in range(5)]

    # 각 후보 위치 근처에서 약한 선이 있는지 확인하고 미세 조정
    result = []
    for target_y in candidates:
        # 탐색 범위: target_y ± gap//2
        search_range = actual_gap // 2
        best_y = target_y
        best_sum = 0
        lo = max(0, target_y - search_range)
        hi = min(len(row_sums), target_y + search_range + 1)
        for y in range(lo, hi):
            if row_sums[y] > best_sum:
                best_sum = row_sums[y]
                best_y = y

        if best_sum > weak_threshold:
            result.append(int(best_y))
        else:
            result.append(int(target_y))  # 추정치 사용

    return result


def detect_noteheads(
    gray: np.ndarray,
    staff_lines: List[List[int]]
) -> List[Tuple[int, int, int, int]]:
    """
    음표 머리(검은 타원)를 감지한다.
    반환: [(x, y, w, h), ...] 음표 머리의 바운딩 박스
    """
    h_img, w_img = gray.shape

    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # 오선 제거
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (w_img // 8, 1))
    horiz_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horiz_kernel)
    no_staff = cv2.subtract(binary, horiz_lines)

    # 오선 간격
    if staff_lines and len(staff_lines[0]) >= 2:
        staff_gap = staff_lines[0][1] - staff_lines[0][0]
    else:
        staff_gap = 10

    # 음표 머리 크기
    min_size = max(3, int(staff_gap * 0.4))
    max_size = int(staff_gap * 2.5)

    # 닫기 연산으로 음표 머리 복원 (오선 제거로 깨진 부분)
    close_kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (max(3, staff_gap // 2), max(3, staff_gap // 2))
    )
    notes_enhanced = cv2.morphologyEx(no_staff, cv2.MORPH_CLOSE, close_kernel)

    # 컨투어 찾기
    contours, _ = cv2.findContours(
        notes_enhanced, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    noteheads = []
    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        area = cv2.contourArea(cnt)

        if min_size <= cw <= max_size and min_size <= ch <= max_size:
            aspect = cw / max(ch, 1)
            if 0.3 < aspect < 3.0 and area > min_size * min_size * 0.2:
                # 오선 영역 내의 음표만 선택 (위아래 여유 포함)
                center_y = y + ch // 2
                in_staff = False
                for staff in staff_lines:
                    margin = (staff[-1] - staff[0]) * 0.6
                    if staff[0] - margin <= center_y <= staff[-1] + margin:
                        in_staff = True
                        break
                if in_staff:
                    noteheads.append((x, y, cw, ch))

    # x좌표로 정렬
    noteheads.sort(key=lambda n: n[0])
    return noteheads


def assign_pitches(
    noteheads: List[Tuple[int, int, int, int]],
    staff_lines: List[List[int]]
) -> List[Dict[str, Any]]:
    """
    음표의 y좌표와 오선 위치로부터 음높이를 결정한다.
    높은음자리표 기준: 맨 아래 줄=E4, 맨 위 줄=F5
    """
    notes = []

    for nh_x, nh_y, nh_w, nh_h in noteheads:
        center_y = nh_y + nh_h // 2
        center_x = nh_x + nh_w // 2

        # 가장 가까운 오선 그룹 찾기
        best_staff = None
        best_dist = float('inf')
        for staff in staff_lines:
            staff_center = (staff[0] + staff[-1]) / 2
            dist = abs(center_y - staff_center)
            if dist < best_dist:
                best_dist = dist
                best_staff = staff

        if best_staff is None:
            continue

        # 오선 간격 (줄 사이 거리의 반 = 한 스텝)
        gap = (best_staff[-1] - best_staff[0]) / 4
        half_gap = gap / 2

        # 맨 아래 줄(E4) 기준 스텝 계산
        bottom_y = best_staff[-1]
        steps = round((bottom_y - center_y) / half_gap)

        pitch = _step_to_pitch(steps)
        if pitch:
            notes.append({
                "pitch": pitch,
                "x": int(center_x),
                "y": int(center_y),
                "duration": 0.5,
            })

    return notes


def _step_to_pitch(step: int) -> str:
    """
    오선 맨 아래줄(E4) 기준, 반 칸 step → 음높이
    step 0 = E4 (맨 아래 줄, 높은음자리표)
    step 1 = F4 (첫 번째 칸)
    step 2 = G4 (아래서 두 번째 줄)
    step 3 = A4, step 4 = B4
    step 5 = C5 (가운데 줄 위 칸)
    step 6 = D5 (위에서 두 번째 줄)
    step 7 = E5, step 8 = F5 (맨 위 줄)
    """
    # 절대 음높이 배열: C3부터 시작
    all_pitches = [
        "C3", "D3", "E3", "F3", "G3", "A3", "B3",
        "C4", "D4",
        "E4",  # ← step 0 = index 9
        "F4", "G4", "A4", "B4",
        "C5", "D5", "E5", "F5",
        "G5", "A5", "B5", "C6",
    ]
    base_index = 9  # E4의 인덱스
    idx = base_index + step
    if idx < 0:
        return all_pitches[0]
    if idx >= len(all_pitches):
        return all_pitches[-1]
    return all_pitches[idx]
