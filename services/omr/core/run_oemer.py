"""oemer 실행 및 MusicXML 추출"""

import subprocess
import sys
import os
from pathlib import Path


def run_oemer(image_path: str, output_dir: str) -> str:
    """
    oemer로 이미지를 MusicXML로 변환한다.
    반환값: 생성된 MusicXML 파일 경로
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # 현재 Python 인터프리터로 oemer 실행 (Docker 및 로컬 모두 호환)
    cmd = [
        sys.executable, "-m", "oemer.ete",
        image_path,
        "-o", str(output_path),
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=300,
        cwd=str(Path(__file__).parent.parent),
    )

    if result.returncode != 0:
        # stderr에 진짜 오류가 있을 수 있음
        raise RuntimeError(f"oemer 실행 실패:\n{result.stderr[-2000:]}")

    # 생성된 MusicXML 파일 찾기
    img_stem = Path(image_path).stem
    candidates = list(output_path.glob(f"{img_stem}*.xml")) + \
                 list(output_path.glob("*.xml"))

    if not candidates:
        raise RuntimeError(f"MusicXML 파일을 찾을 수 없습니다. output: {result.stdout[-500:]}")

    # 가장 최근 파일 반환
    return str(max(candidates, key=lambda p: p.stat().st_mtime))
