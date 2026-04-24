"""Upload ingestion pipeline: save to storage → extract text → DB row.

Everything here runs synchronously per file so the UI can show progressive
status cards in real time. Returns a list of dicts suitable for merging
into ``RunState.pending_input[step_id].docs``.
"""
from __future__ import annotations

import logging
import mimetypes
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db.models import Document
from .image import extract_image_text
from .pdf import extract_pdf_text

logger = logging.getLogger(__name__)


async def ingest_uploaded_files(
    *,
    db: Session,
    files: list[UploadFile],
    building_id: str,
    step_id: str,
    doc_class: str,
) -> list[dict]:
    settings = get_settings()
    root = Path(settings.storage_path) / building_id / step_id
    root.mkdir(parents=True, exist_ok=True)

    out: list[dict] = []
    for file in files:
        raw = await file.read()
        if not raw:
            continue
        doc_id = str(uuid.uuid4())
        safe_name = Path(file.filename or doc_id).name
        dest = root / f"{doc_id}__{safe_name}"
        dest.write_bytes(raw)

        mime = file.content_type or mimetypes.guess_type(str(dest))[0] or "application/octet-stream"
        text = ""
        if mime == "application/pdf" or safe_name.lower().endswith(".pdf"):
            extract = extract_pdf_text(raw)
            text = extract.text
            if not text.strip():
                logger.info("PDF %s had empty text layer", safe_name)
        elif mime.startswith("image/"):
            text = extract_image_text(raw)
        else:
            # Plain text upload — decode best-effort for demo fixtures.
            try:
                text = raw.decode("utf-8", errors="replace")
            except Exception:
                text = ""

        row = Document(
            id=doc_id,
            building_id=building_id,
            doc_class=doc_class,
            mime_type=mime,
            filename=safe_name,
            file_url=str(dest),
            processing_status="parsed" if text else "parsed_empty",
        )
        db.add(row)
        db.flush()

        out.append(
            {
                "id": doc_id,
                "filename": safe_name,
                "file_url": str(dest),
                "mime_type": mime,
                "text": text,
            }
        )

    db.commit()
    return out
