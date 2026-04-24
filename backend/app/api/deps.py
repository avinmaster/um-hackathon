"""FastAPI dependency helpers.

Mocked auth for the demo — we pick the seeded owner or admin based on the
route prefix. Real auth is listed as out-of-scope in the PRD.
"""
from __future__ import annotations

from typing import Iterator

from sqlalchemy.orm import Session

from ..db import SessionLocal


def db_session() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
