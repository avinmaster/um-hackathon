"""Thin helper to create/drop all tables.

We intentionally skip Alembic for hackathon velocity — schema is tiny and
every change during development is a full reset. Write-through migrations
for production are out-of-scope for the MVP demo.
"""
from __future__ import annotations

from . import models  # noqa: F401  — import side-effect registers mappers
from .session import Base, engine


def create_all() -> None:
    Base.metadata.create_all(bind=engine)


def drop_all() -> None:
    Base.metadata.drop_all(bind=engine)
