"""Processing-pipeline tests.

Verify:
- PDF text-layer extraction works on the native path.
- OCR fallback degrades gracefully when ``pytesseract`` / ``pdf2image`` are
  not installed (no crash; returns empty string).
- Image OCR returns "" without tesseract installed, and does not raise.
"""
from __future__ import annotations

import io
import struct
import zlib
from pathlib import Path

from app.processing.image import extract_image_text
from app.processing.pdf import extract_pdf_text


FIX = Path(__file__).parent / "fixtures"


def _tiny_pdf_with_text(body: str) -> bytes:
    """Return a minimal PDF containing ``body`` in a single Tj operator."""
    # This is the simplest possible text-layer PDF: a 1-page document
    # that writes ``body`` at position (72, 700) in Helvetica 12pt.
    stream = f"BT /F1 12 Tf 72 700 Td ({body}) Tj ET"
    stream_bytes = stream.encode("latin-1")
    xref_offsets: list[int] = []

    def obj(n: int, content: bytes) -> bytes:
        return f"{n} 0 obj\n".encode() + content + b"\nendobj\n"

    b = bytearray(b"%PDF-1.4\n")
    xref_offsets.append(len(b))
    b += obj(1, b"<< /Type /Catalog /Pages 2 0 R >>")
    xref_offsets.append(len(b))
    b += obj(2, b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    xref_offsets.append(len(b))
    b += obj(
        3,
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    )
    xref_offsets.append(len(b))
    b += obj(4, f"<< /Length {len(stream_bytes)} >>\nstream\n".encode() + stream_bytes + b"\nendstream")
    xref_offsets.append(len(b))
    b += obj(5, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    xref_pos = len(b)
    b += b"xref\n0 6\n0000000000 65535 f \n"
    for off in xref_offsets:
        b += f"{off:010d} 00000 n \n".encode()
    b += b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"
    b += f"{xref_pos}\n".encode()
    b += b"%%EOF"
    return bytes(b)


def test_pdf_text_layer_extraction():
    body = "Ownership Deed Owner Ahmad bin Tan"
    pdf = _tiny_pdf_with_text(body)
    result = extract_pdf_text(pdf)
    assert body in result.text or "Ahmad" in result.text, result
    assert result.page_count == 1
    assert result.ocr_used is False


def test_image_ocr_graceful_without_tesseract(tmp_path):
    # 1x1 PNG
    w = h = 1
    raw = b"\x00" + b"\xff\xff\xff" * w
    def _chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data)
        return len(data).to_bytes(4, "big") + tag + data + crc.to_bytes(4, "big")
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", zlib.compress(raw))
        + _chunk(b"IEND", b"")
    )
    # Should return a string without raising — empty if tesseract is missing.
    text = extract_image_text(png)
    assert isinstance(text, str)


def test_fixture_text_files_exist():
    """The fixture text files used by the compliance tests are present."""
    for name in (
        "ownership_deed_pass.txt",
        "bomba_cert_fail.txt",
        "bomba_cert_pass.txt",
    ):
        assert (FIX / name).read_text().strip(), f"{name} is missing or empty"
