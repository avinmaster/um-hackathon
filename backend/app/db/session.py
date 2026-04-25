"""SQLAlchemy engine + session + declarative base.

Supports both SQLite (dev default) and Postgres (production + demo).
The dev path auto-creates ``var/`` so the sqlite file has somewhere to live.
"""
from __future__ import annotations

from pathlib import Path
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from ..config import REPO_ROOT, get_settings


class Base(DeclarativeBase):
    pass


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}, "future": True}
    return {"pool_pre_ping": True, "future": True}


def _normalize_db_url(url: str) -> str:
    """Coerce common Postgres URL shapes onto the psycopg v3 driver.

    Neon, Render, and Heroku all hand out URLs with the bare ``postgres://``
    or ``postgresql://`` scheme; SQLAlchemy then defaults to psycopg2 which
    isn't installed. Rewrite to ``postgresql+psycopg://`` so the v3 driver
    we actually depend on is used.
    """
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+psycopg" not in url:
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


settings = get_settings()
if settings.database_url.startswith("sqlite"):
    (REPO_ROOT / "var").mkdir(parents=True, exist_ok=True)

_db_url = _normalize_db_url(settings.database_url)
engine = create_engine(_db_url, **_engine_kwargs(_db_url))
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


def get_session() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
