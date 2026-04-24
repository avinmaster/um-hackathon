"""Owner-facing onboarding routes.

Endpoints:
- ``POST /buildings`` — create a draft building (mock auth).
- ``GET  /buildings`` — list this owner's buildings.
- ``POST /buildings/{id}/start`` — create run + advance to first pause.
- ``GET  /buildings/{id}/run`` — read the current RunState.
- ``GET  /buildings/{id}/run/graph`` — render graph nodes/edges for React Flow.
- ``GET  /buildings/{id}/run/stream`` — SSE: progress events for the UI.
- ``POST /buildings/{id}/run/steps/{step_id}/submit`` — submit form / docs.
- ``POST /buildings/{id}/publish`` — explicit publish (for templates that omit publish primitive).

See ``implementation.md §11`` for the contract.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from ..db.models import Building, City, Document, User, WorkflowRun, WorkflowTemplate
from ..workflow.runner import start_run, tick
from .deps import db_session
from .schemas import (
    BuildingOut,
    CreateBuildingIn,
    GraphOut,
    RunStateOut,
    StartRunOut,
    SubmitStepIn,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/onboard", tags=["onboard"])


def _demo_owner(db: Session) -> User:
    u = db.execute(select(User).where(User.role == "owner")).scalars().first()
    if not u:
        raise HTTPException(404, "No owner seeded; run `just seed`.")
    return u


def _latest_run(db: Session, building_id: str) -> WorkflowRun | None:
    return (
        db.execute(
            select(WorkflowRun)
            .where(WorkflowRun.building_id == building_id)
            .order_by(WorkflowRun.created_at.desc())
        )
        .scalars()
        .first()
    )


@router.post("/buildings", response_model=BuildingOut)
def create_building(payload: CreateBuildingIn, db: Session = Depends(db_session)) -> Building:
    owner_id = payload.owner_id or _demo_owner(db).id
    if not db.get(User, owner_id):
        raise HTTPException(400, f"Unknown owner_id={owner_id}")
    if not db.get(City, payload.city_id):
        raise HTTPException(400, f"Unknown city_id={payload.city_id}")
    b = Building(
        owner_id=owner_id,
        city_id=payload.city_id,
        name=payload.name,
        address=payload.address,
        status="draft",
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.get("/buildings", response_model=list[BuildingOut])
def list_buildings(db: Session = Depends(db_session)) -> list[Building]:
    owner = _demo_owner(db)
    return (
        db.execute(select(Building).where(Building.owner_id == owner.id))
        .scalars()
        .all()
    )


@router.post("/buildings/{building_id}/start", response_model=StartRunOut)
def start(building_id: str, db: Session = Depends(db_session)) -> StartRunOut:
    b = db.get(Building, building_id)
    if not b:
        raise HTTPException(404, "building not found")

    tpl = db.execute(
        select(WorkflowTemplate)
        .where(WorkflowTemplate.city_id == b.city_id, WorkflowTemplate.status == "published")
        .order_by(WorkflowTemplate.version.desc())
    ).scalars().first()
    if not tpl:
        raise HTTPException(400, f"No published template for city_id={b.city_id}")

    run = start_run(db, building_id=b.id, template_id=tpl.id)
    snap = tick(db, run_id=run.id)
    return StartRunOut(run_id=run.id, status=snap.status, current_step_id=snap.current_step_id)


@router.get("/buildings/{building_id}/run", response_model=RunStateOut)
def get_run(building_id: str, db: Session = Depends(db_session)) -> RunStateOut:
    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")
    return RunStateOut(
        run_id=run.id,
        status=run.status,
        current_step_id=run.current_step_id,
        state=run.state or {},
    )


@router.get("/buildings/{building_id}/run/graph", response_model=GraphOut)
def get_graph(building_id: str, db: Session = Depends(db_session)) -> GraphOut:
    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")
    tpl = db.get(WorkflowTemplate, run.template_id)
    if not tpl:
        raise HTTPException(500, "template disappeared")
    steps = tpl.steps or []
    state = run.state or {}
    outputs = state.get("step_outputs") or {}
    awaiting = state.get("awaiting_step_id") or run.current_step_id

    nodes: list[dict[str, Any]] = []
    for s in steps:
        sid = s["id"]
        status = "pending"
        if outputs.get(sid):
            out = outputs[sid]
            if isinstance(out, dict):
                if out.get("published") or out.get("confirmed") or out.get("resolved") or out.get("passed"):
                    status = "passed"
                elif out.get("ready") is False or out.get("passed") is False:
                    status = "failed"
                else:
                    status = "passed"
        if sid == awaiting:
            status = "awaiting_user"
        nodes.append(
            {
                "id": sid,
                "primitive": s["primitive"],
                "title": s.get("title", sid),
                "status": status,
            }
        )
    edges = [{"source": steps[i]["id"], "target": steps[i + 1]["id"]} for i in range(len(steps) - 1)]
    return GraphOut(nodes=nodes, edges=edges, current=awaiting)


@router.get("/buildings/{building_id}/run/stream")
async def stream_run(building_id: str):
    """SSE stream of progress events. Polls the DB for state changes —
    MVP-simple, avoids a pub/sub bus. Frontend closes the connection on pause.
    """
    from .deps import db_session as _dbs

    async def gen():
        last_payload: str | None = None
        idle_ticks = 0
        # open one session, reuse across iterations
        db_gen = _dbs()
        db = next(db_gen)
        try:
            while True:
                run = _latest_run(db, building_id)
                if not run:
                    yield {"event": "error", "data": json.dumps({"error": "no run"})}
                    return
                payload = json.dumps(
                    {
                        "status": run.status,
                        "current_step_id": run.current_step_id,
                        "awaiting": (run.state or {}).get("awaiting_step_id"),
                    }
                )
                if payload != last_payload:
                    yield {"event": "state", "data": payload}
                    last_payload = payload
                    idle_ticks = 0
                else:
                    idle_ticks += 1
                if run.status in {"completed", "failed"} or idle_ticks >= 60:
                    yield {"event": "end", "data": payload}
                    return
                await asyncio.sleep(0.5)
                db.expire_all()
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass

    return EventSourceResponse(gen())


@router.post("/buildings/{building_id}/run/steps/{step_id}/submit", response_model=RunStateOut)
async def submit_step(
    building_id: str,
    step_id: str,
    payload: SubmitStepIn | None = None,
    db: Session = Depends(db_session),
) -> RunStateOut:
    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")
    body = (payload.input if payload else {}) or {}
    tick(db, run_id=run.id, submit={"step_id": step_id, "input": body})
    db.refresh(run)
    return RunStateOut(
        run_id=run.id,
        status=run.status,
        current_step_id=run.current_step_id,
        state=run.state or {},
    )


@router.post("/buildings/{building_id}/run/steps/{step_id}/upload", response_model=RunStateOut)
async def upload_docs(
    building_id: str,
    step_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(db_session),
) -> RunStateOut:
    from ..processing.pipeline import ingest_uploaded_files

    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")
    # Determine doc_class from the template step config.
    tpl = db.get(WorkflowTemplate, run.template_id)
    step = next((s for s in (tpl.steps or []) if s["id"] == step_id), None)
    if not step:
        raise HTTPException(400, f"unknown step {step_id}")
    primitive = step["primitive"]
    doc_class = "compliance" if primitive == "upload_compliance" else "content"

    ingested = await ingest_uploaded_files(
        db=db,
        files=files,
        building_id=building_id,
        step_id=step_id,
        doc_class=doc_class,
    )
    tick(db, run_id=run.id, submit={"step_id": step_id, "input": {"docs": ingested}})
    db.refresh(run)
    return RunStateOut(
        run_id=run.id,
        status=run.status,
        current_step_id=run.current_step_id,
        state=run.state or {},
    )


@router.post("/buildings/{building_id}/publish", response_model=BuildingOut)
def publish_building(building_id: str, db: Session = Depends(db_session)) -> Building:
    b = db.get(Building, building_id)
    if not b:
        raise HTTPException(404, "building not found")
    b.status = "published"
    db.commit()
    db.refresh(b)
    return b
