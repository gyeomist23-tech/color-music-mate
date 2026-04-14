"""OpenCV 전처리 모듈"""

import cv2
import numpy as np
from pathlib import Path


def preprocess_image(image_path: str) -> np.ndarray:
    """
    악보 이미지 전처리:
    1. 그레이스케일 변환
    2. 잡음 제거
    3. 이진화 (Otsu's thresholding)
    4. 기울기 보정
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"이미지를 읽을 수 없습니다: {image_path}")

    # 그레이스케일
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 잡음 제거
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # Otsu's threshold
    _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 기울기 보정
    corrected = deskew(binary)

    return corrected


def deskew(image: np.ndarray) -> np.ndarray:
    """이미지 기울기 보정"""
    coords = np.column_stack(np.where(image < 128))
    if len(coords) == 0:
        return image

    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) < 0.5:  # 기울기가 미미하면 그대로 반환
        return image

    h, w = image.shape
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated


def save_preprocessed(image_path: str, output_dir: str) -> str:
    """전처리된 이미지 저장 후 경로 반환"""
    processed = preprocess_image(image_path)
    stem = Path(image_path).stem
    output_path = str(Path(output_dir) / f"{stem}_processed.png")
    cv2.imwrite(output_path, processed)
    return output_path
