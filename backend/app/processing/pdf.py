"""PDF extraction. ``pypdf`` first; if the layer is empty, OCR fallback.

OCR is gated on ``pytesseract`` being importable — the package is in the
``ocr`` extras. Absent it, we return whatever text we managed to pull and
let GLM do its best.
"""
from __future__ import annotations

import io
import logging
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader

logger = logging.getLogger(__name__)


@dataclass
class PdfExtract:
    text: str
    page_count: int
    ocr_used: bool


def _safe_page_text(page) -> str:
    try:
        return page.extract_text() or ""
    except Exception as e:
        logger.warning("pypdf page extract failed: %s", e)
        return ""


def extract_pdf_text(path: str | Path | bytes) -> PdfExtract:
    if isinstance(path, (bytes, bytearray)):
        reader = PdfReader(io.BytesIO(path))
    else:
        reader = PdfReader(str(path))
    parts: list[str] = []
    for page in reader.pages:
        parts.append(_safe_page_text(page))
    text = "\n\n".join(p.strip() for p in parts if p.strip())
    page_count = len(reader.pages)

    if text.strip():
        return PdfExtract(text=text, page_count=page_count, ocr_used=False)

    # Empty text layer — try OCR per page if available.
    ocr_text = _ocr_pdf_fallback(path)
    return PdfExtract(text=ocr_text, page_count=page_count, ocr_used=bool(ocr_text))


def _ocr_pdf_fallback(path: str | Path | bytes) -> str:
    """Best-effort OCR via pdf2image + pytesseract if installed.

    Returns empty string if OCR is unavailable — upstream flags this in
    the decision log so the reviewer can see the doc came in without text.
    """
    try:
        from pdf2image import convert_from_bytes, convert_from_path  # type: ignore
        import pytesseract  # type: ignore
    except ImportError:
        logger.info("OCR extras not installed; skipping fallback")
        return ""

    try:
        if isinstance(path, (bytes, bytearray)):
            images = convert_from_bytes(bytes(path))
        else:
            images = convert_from_path(str(path))
    except Exception as e:
        logger.warning("pdf2image failed: %s", e)
        return ""

    chunks: list[str] = []
    for img in images:
        try:
            chunks.append(pytesseract.image_to_string(img))
        except Exception as e:
            logger.warning("tesseract failed: %s", e)
    return "\n\n".join(c.strip() for c in chunks if c and c.strip())
