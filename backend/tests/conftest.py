"""Pytest fixtures that point the app at a throwaway SQLite DB.

Each test session gets a fresh ``tests/.var/test.sqlite`` so tests don't
step on a dev DB and checkpointer state doesn't leak.
"""
from __future__ import annotations

import os
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent

_test_db = REPO / "var" / "test.sqlite"
_test_lg_db = REPO / "var" / "langgraph.test.sqlite"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_test_db}")

# Wipe on session start so each run is clean.
for p in (_test_db, _test_lg_db):
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        if p.exists():
            p.unlink()
    except Exception:
        pass
