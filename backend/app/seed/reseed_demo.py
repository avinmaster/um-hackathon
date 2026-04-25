"""Drop all app tables, recreate them, and run the demo seed.

Use this instead of ``rm var/dev.sqlite`` — deleting the SQLite file while
the backend has it open leaves the running process attached to the unlinked
inode, so the API silently keeps serving stale data until restart. Going
through SQLAlchemy ``drop_all`` / ``create_all`` and ``DELETE`` on the
LangGraph checkpoint tables works whether the backend is running or not:
the running engine's pool sees the new schema on its next query.

Run: ``.venv/bin/python -m app.seed.reseed_demo``
"""
from __future__ import annotations

import logging
import sqlite3

from sqlalchemy import text

from ..config import get_settings
from ..db.schema import create_all, drop_all
from ..db.session import engine
from ..workflow.checkpointer import get_checkpointer_path
from .seed_demo import run as seed_run

logging.basicConfig(level="INFO", format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("reseed")


def _wipe_langgraph_state() -> None:
    """Clear the LangGraph checkpointer so resumed threads can't reference
    deleted building IDs."""
    settings = get_settings()
    if settings.database_url.startswith("sqlite"):
        path = get_checkpointer_path()
        if not path.exists():
            return
        conn = sqlite3.connect(str(path))
        try:
            tables = [
                row[0]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' "
                    "AND name NOT LIKE 'sqlite_%'"
                ).fetchall()
            ]
            for t in tables:
                conn.execute(f"DELETE FROM {t}")
            conn.commit()
            logger.info("cleared langgraph tables: %s", tables or "(none)")
        finally:
            conn.close()
        return

    # Postgres path — checkpointer tables live in the same DB, so wipe the
    # checkpoint-prefixed tables. Names come from langgraph-checkpoint-postgres.
    with engine.begin() as conn:
        rows = conn.execute(
            text(
                "SELECT tablename FROM pg_tables "
                "WHERE schemaname='public' AND tablename LIKE 'checkpoint%'"
            )
        ).fetchall()
        for (tname,) in rows:
            conn.execute(text(f'DELETE FROM "{tname}"'))
        if rows:
            logger.info("cleared langgraph tables: %s", [r[0] for r in rows])


def run() -> None:
    logger.info("dropping app tables")
    drop_all()
    logger.info("recreating app tables")
    create_all()
    _wipe_langgraph_state()
    seed_run()
    logger.info("reseed complete")


if __name__ == "__main__":
    run()
