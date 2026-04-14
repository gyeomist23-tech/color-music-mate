"""oemer 실행 및 MusicXML 추출 — 메모리 최적화 (직접 import 방식)"""

import sys
import os
import gc
import logging
from pathlib import Path
from types import SimpleNamespace

logger = logging.getLogger(__name__)


def run_oemer(image_path: str, output_dir: str) -> str:
    """
    oemer로 이미지를 MusicXML로 변환한다.
    subprocess 대신 직접 import하여 메모리 절약 (Python 프로세스 1개만 사용).
    반환값: 생성된 MusicXML 파일 경로
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    logger.info(f"oemer 직접 실행: {image_path} → {output_path}")

    # 메모리 절약을 위해 GC 강제 실행
    gc.collect()

    from oemer.ete import extract, clear_data

    # oemer의 extract 함수에 전달할 args 객체 생성
    args = SimpleNamespace(
        img_path=image_path,
        output_path=str(output_path),
        use_tf=False,
        save_cache=False,
        without_deskew=False,
    )

    clear_data()
    mxl_path = extract(args)
    logger.info(f"oemer extract 완료: {mxl_path}")

    gc.collect()

    # extract()가 반환한 경로 확인
    if mxl_path and Path(mxl_path).exists():
        return str(mxl_path)

    # 반환 경로가 없으면 output_dir에서 탐색
    img_stem = Path(image_path).stem
    candidates = (
        list(output_path.glob(f"{img_stem}*.musicxml")) +
        list(output_path.glob("*.musicxml")) +
        list(output_path.glob(f"{img_stem}*.xml")) +
        list(output_path.glob("*.xml"))
    )

    if not candidates:
        all_files = list(output_path.iterdir()) if output_path.exists() else []
        logger.error(f"MusicXML 미발견. output_path 내용: {[f.name for f in all_files]}")
        raise RuntimeError(f"MusicXML 파일을 찾을 수 없습니다. 파일들: {[f.name for f in all_files]}")

    result_path = str(max(candidates, key=lambda p: p.stat().st_mtime))
    logger.info(f"MusicXML 발견: {result_path}")
    return result_path
