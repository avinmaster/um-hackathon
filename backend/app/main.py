"""FastAPI entry. Wires routers, CORS, startup schema bootstrap.

Run: ``just backend-dev`` or ``uvicorn app.main:app --reload``.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import admin, assistant, buildings, onboard
from .config import get_settings
from .db.schema import create_all

logging.basicConfig(level="INFO", format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("main")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Opus Magnum — Adaptive Onboarding",
        version="0.1.0",
        description="AI-driven building onboarding workflow platform.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex=r"^https://([a-z0-9-]+\.)*vercel\.app$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _bootstrap() -> None:
        create_all()
        logger.info("DB ready at %s", settings.database_url)
        if settings.seed_on_startup:
            try:
                from .seed.seed_demo import run as seed_run

                seed_run()
                logger.info("startup seed complete")
            except Exception:
                logger.exception("startup seed failed (continuing)")

    @app.get("/health")
    def health() -> dict:
        return {"ok": True, "model": settings.glm_model}

    app.include_router(onboard.router)
    app.include_router(admin.router)
    app.include_router(buildings.router)
    app.include_router(assistant.router)
    return app


app = create_app()
