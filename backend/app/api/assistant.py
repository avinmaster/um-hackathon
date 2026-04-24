"""Visitor assistant — grounded answers from profile + content doc text."""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.models import Building, Document
from ..glm import get_client
from ..glm.prompts import ANSWER_VISITOR_QUESTION_SYSTEM
from .deps import db_session
from .schemas import AssistantIn

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/buildings", tags=["assistant"])


def _content_corpus(db: Session, building_id: str, budget_chars: int = 60_000) -> list[dict]:
    docs = (
        db.execute(
            select(Document).where(
                Document.building_id == building_id,
                Document.doc_class == "content",
            )
        )
        .scalars()
        .all()
    )
    corpus: list[dict] = []
    used = 0
    for d in docs:
        excerpt = (d.extracted and json.dumps(d.extracted, default=str)) or ""
        if not excerpt:
            continue
        if used + len(excerpt) > budget_chars:
            excerpt = excerpt[: budget_chars - used]
        corpus.append({"doc": d.filename, "excerpt": excerpt})
        used += len(excerpt)
        if used >= budget_chars:
            break
    return corpus


@router.post("/{building_id}/assistant")
def assistant(
    building_id: str, payload: AssistantIn, db: Session = Depends(db_session)
) -> StreamingResponse:
    b = db.get(Building, building_id)
    if not b or b.status != "published":
        raise HTTPException(404, "building not found or not published")

    client = get_client()

    ground = {
        "building": b.name,
        "address": b.address,
        "profile": b.profile or {},
        "scene_config": b.scene_config or {},
        "content_excerpts": _content_corpus(db, building_id),
    }

    messages = [
        {"role": "system", "content": ANSWER_VISITOR_QUESTION_SYSTEM},
        {
            "role": "system",
            "content": "Grounding material:\n" + json.dumps(ground, indent=2, default=str)[:80_000],
        },
        *[{"role": m.role, "content": m.content} for m in payload.messages],
    ]

    def gen():
        stream = client.complete(
            messages=messages,
            tool="visitor_assistant",
            max_tokens=1024,
            reasoning_effort="low",
            stream=True,
        )
        for event in stream:  # type: ignore[union-attr]
            if getattr(event, "choices", None) and event.choices:
                delta = event.choices[0].delta
                if delta and delta.content:
                    yield f"data: {json.dumps({'content': delta.content})}\n\n"
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")
