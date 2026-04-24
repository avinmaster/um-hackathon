"""Checkpointer wiring. Chooses SQLite vs Postgres from the DB URL.

LangGraph's checkpointer persists ``RunState`` per thread so a run that
pauses for user input resumes cleanly on the next API call.
"""
from __future__ import annotations

import logging
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from ..config import REPO_ROOT, get_settings

logger = logging.getLogger(__name__)

_LANGGRAPH_SQLITE_PATH = REPO_ROOT / "var" / "langgraph.sqlite"


@contextmanager
def get_checkpointer() -> Iterator[object]:
    """Context-manager that yields a configured checkpointer.

    - SQLite: ``langgraph-checkpoint-sqlite``; backing file at ``var/langgraph.sqlite``.
    - Postgres: ``langgraph-checkpoint-postgres``; uses the app's DB URL.

    Always opens a fresh connection so the checkpointer's ``setup()`` can
    create its tables on first use.
    """
    settings = get_settings()
    url = settings.database_url
    if url.startswith("sqlite"):
        _LANGGRAPH_SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
        from langgraph.checkpoint.sqlite import SqliteSaver

        conn = sqlite3.connect(str(_LANGGRAPH_SQLITE_PATH), check_same_thread=False)
        try:
            saver = SqliteSaver(conn)
            saver.setup()
            yield saver
        finally:
            conn.close()
        return

    # Postgres path
    from langgraph.checkpoint.postgres import PostgresSaver

    pg_url = url
    # SQLAlchemy style prefixes confuse the direct postgres saver.
    pg_url = pg_url.replace("postgresql+psycopg://", "postgresql://")
    with PostgresSaver.from_conn_string(pg_url) as saver:
        saver.setup()
        yield saver


def get_checkpointer_path() -> Path:
    return _LANGGRAPH_SQLITE_PATH
