"""Image extraction via OCR. GLM-5.1 lacks vision (see implementation.md §19)
so images get text-only treatment before any reasoning runs.
"""
from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_image_text(path: str | Path | bytes) -> str:
    try:
        import pytesseract  # type: ignore
        from PIL import Image  # type: ignore
    except ImportError:
        logger.info("OCR extras not installed; image text = ''")
        return ""

    try:
        if isinstance(path, (bytes, bytearray)):
            import io

            img = Image.open(io.BytesIO(path))
        else:
            img = Image.open(str(path))
        return pytesseract.image_to_string(img)
    except Exception as e:
        logger.warning("image OCR failed: %s", e)
        return ""
