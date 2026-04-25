"""Admin routes: cities, templates, template-assistant.

The full assistant chat + ``draft_with_ai`` implementation lives in T8.
This module ships the CRUD + a working ``draft_with_ai`` since that is
the single biggest "admin UX" demo beat per §13.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.models import City, User, WorkflowTemplate
from ..glm import get_client
from ..glm.prompts import DRAFT_TEMPLATE_SYSTEM, EXPLAIN_FIELD_SYSTEM
from ..glm.tools import DRAFT_TEMPLATE, EXPLAIN_FIELD
from .deps import db_session
from .schemas import (
    AssistantIn,
    CityIn,
    CityOut,
    DraftTemplateIn,
    TemplateIn,
    TemplateOut,
    TemplateUpdateIn,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _demo_admin(db: Session) -> User:
    u = db.execute(select(User).where(User.role == "admin")).scalars().first()
    if not u:
        raise HTTPException(404, "No admin seeded; run `just seed`.")
    return u


@router.get("/cities", response_model=list[CityOut])
def list_cities(db: Session = Depends(db_session)) -> list[City]:
    return db.execute(select(City).order_by(City.name)).scalars().all()


@router.post("/cities", response_model=CityOut)
def create_city(payload: CityIn, db: Session = Depends(db_session)) -> City:
    admin = _demo_admin(db)
    c = City(
        name=payload.name,
        country=payload.country,
        region=payload.region,
        created_by_admin_id=admin.id,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/cities/{city_id}/templates", response_model=list[TemplateOut])
def list_templates(city_id: str, db: Session = Depends(db_session)) -> list[WorkflowTemplate]:
    return (
        db.execute(
            select(WorkflowTemplate)
            .where(WorkflowTemplate.city_id == city_id)
            .order_by(WorkflowTemplate.version.desc())
        )
        .scalars()
        .all()
    )


@router.post("/cities/{city_id}/templates", response_model=TemplateOut)
def create_template(
    city_id: str, payload: TemplateIn, db: Session = Depends(db_session)
) -> WorkflowTemplate:
    if not db.get(City, city_id):
        raise HTTPException(404, "city not found")
    tpl = WorkflowTemplate(city_id=city_id, name=payload.name, steps=[], status="draft")
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.get("/templates/{template_id}", response_model=TemplateOut)
def get_template(template_id: str, db: Session = Depends(db_session)) -> WorkflowTemplate:
    tpl = db.get(WorkflowTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "template not found")
    return tpl


@router.put("/templates/{template_id}", response_model=TemplateOut)
def update_template(
    template_id: str,
    payload: TemplateUpdateIn,
    db: Session = Depends(db_session),
) -> WorkflowTemplate:
    tpl = db.get(WorkflowTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "template not found")
    tpl.steps = payload.steps
    db.commit()
    db.refresh(tpl)
    return tpl


@router.post("/templates/{template_id}/publish", response_model=TemplateOut)
def publish_template(template_id: str, db: Session = Depends(db_session)) -> WorkflowTemplate:
    tpl = db.get(WorkflowTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "template not found")
    tpl.status = "published"
    db.commit()
    db.refresh(tpl)
    return tpl


@router.post("/templates/{template_id}/draft-with-ai", response_model=TemplateOut)
def draft_with_ai(
    template_id: str, payload: DraftTemplateIn, db: Session = Depends(db_session)
) -> WorkflowTemplate:
    tpl = db.get(WorkflowTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "template not found")

    client = get_client()
    args = client.call_tool(
        messages=[
            {"role": "system", "content": DRAFT_TEMPLATE_SYSTEM},
            {"role": "user", "content": payload.description},
        ],
        tool_spec=DRAFT_TEMPLATE,
    )
    steps = args.get("steps") or []
    if not isinstance(steps, list) or not steps:
        raise HTTPException(502, f"GLM returned no steps: {args}")

    tpl.steps = steps
    db.commit()
    db.refresh(tpl)
    return tpl


@router.post("/templates/{template_id}/assistant")
def template_assistant(
    template_id: str, payload: AssistantIn, db: Session = Depends(db_session)
) -> StreamingResponse:
    """Stream a tutor-style answer from GLM about the current template.

    The last user message drives the query; prior messages provide context.
    """
    tpl = db.get(WorkflowTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "template not found")

    client = get_client()
    messages = [
        {"role": "system", "content": EXPLAIN_FIELD_SYSTEM},
        {
            "role": "system",
            "content": (
                "Current template (JSON):\n"
                f"{json.dumps(tpl.steps or [], indent=2)[:16000]}"
            ),
        },
        *[{"role": m.role, "content": m.content} for m in payload.messages],
    ]

    def gen():
        try:
            stream = client.complete(
                messages=messages,
                tool="template_assistant",
                max_tokens=1024,
                reasoning_effort="low",
                stream=True,
            )
            for event in stream:  # type: ignore[union-attr]
                if getattr(event, "choices", None) and event.choices:
                    delta = event.choices[0].delta
                    if delta and delta.content:
                        yield f"data: {json.dumps({'content': delta.content})}\n\n"
        except Exception as exc:  # noqa: BLE001 — surface upstream failures to the client
            logger.warning("template assistant stream failed: %s", exc)
            payload = json.dumps({"message": f"{type(exc).__name__}: {exc}"})
            yield f"event: error\ndata: {payload}\n\n"
            return
        yield "event: end\ndata: {}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")
