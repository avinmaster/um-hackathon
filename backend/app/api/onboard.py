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
from ..workflow.runner import apply_edit, rewind_run, start_run, tick
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


def form_step_fields_listed(form_steps: list[dict[str, Any]]) -> str:
    parts = []
    for s in form_steps:
        names = [f.get("name") for f in (s.get("config") or {}).get("fields") or [] if f.get("name")]
        parts.append(f"{s['id']}: [{', '.join(names)}]")
    return "; ".join(parts)


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


@router.get("/buildings/{building_id}/run/steps/{step_id}/demo-preview")
def demo_preview(
    building_id: str,
    step_id: str,
    db: Session = Depends(db_session),
) -> dict[str, Any]:
    """Return what the autofill button *would* submit, without submitting.

    Lets the UI show the demo form values (collect_form) or document text
    (upload_*) before the owner commits. Keeps the demo path transparent —
    judges see the actual content, not a skip button."""
    from ..seed.demo_autofill import docs_for, form_values_for

    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")
    tpl = db.get(WorkflowTemplate, run.template_id)
    step = next((s for s in (tpl.steps or []) if s["id"] == step_id), None)
    if not step:
        raise HTTPException(400, f"unknown step {step_id}")
    primitive = step["primitive"]

    if primitive == "collect_form":
        values = form_values_for(step_id)
        if not values:
            raise HTTPException(404, f"no form fixture for step {step_id}")
        return {"primitive": primitive, "form_values": values}

    if primitive in {"upload_compliance", "upload_content"}:
        paths = docs_for(step_id)
        if not paths:
            raise HTTPException(404, f"no doc fixtures for step {step_id}")
        import mimetypes

        out: list[dict[str, Any]] = []
        for path in paths:
            if not path.exists():
                continue
            mime = mimetypes.guess_type(str(path))[0] or "text/plain"
            text = path.read_text(encoding="utf-8", errors="replace") if not mime.startswith(
                "image/"
            ) and mime != "application/pdf" else ""
            out.append(
                {
                    "filename": path.name,
                    "mime": mime,
                    "text": text,
                    "view_url": f"/api/onboard/demo-docs/{path.name}",
                }
            )
        return {"primitive": primitive, "docs": out}

    raise HTTPException(400, f"no demo preview for primitive {primitive}")


@router.get("/demo-docs/{filename}")
def demo_doc_raw(filename: str):
    """Serve a fixture file by name. Used for iframed PDF previews and as a
    fallback download link for any other fixture format."""
    from fastapi.responses import FileResponse
    from ..seed.demo_autofill import DEMO_DOCS_DIR

    safe = (DEMO_DOCS_DIR / filename).resolve()
    if not str(safe).startswith(str(DEMO_DOCS_DIR.resolve())) or not safe.exists():
        raise HTTPException(404, "fixture not found")
    return FileResponse(str(safe))


@router.post("/buildings/{building_id}/run/steps/{step_id}/autofill", response_model=RunStateOut)
async def autofill_step(
    building_id: str,
    step_id: str,
    db: Session = Depends(db_session),
) -> RunStateOut:
    """Submit demo-fixture data for the named step. Used by the
    "Autofill demo" button so judges can click through a workflow without
    typing addresses or hand-uploading PDFs. Goes through the same
    submit/upload paths a real owner would take, so the GLM verdicts are
    real, not faked."""
    from ..processing.pipeline import ingest_uploaded_files
    from ..seed.demo_autofill import docs_for, form_values_for

    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")

    tpl = db.get(WorkflowTemplate, run.template_id)
    step = next((s for s in (tpl.steps or []) if s["id"] == step_id), None)
    if not step:
        raise HTTPException(400, f"unknown step {step_id}")
    primitive = step["primitive"]

    if primitive == "collect_form":
        values = form_values_for(step_id)
        if not values:
            raise HTTPException(400, f"no form fixture registered for step {step_id}")
        tick(db, run_id=run.id, submit={"step_id": step_id, "input": values})
    elif primitive in {"upload_compliance", "upload_content"}:
        paths = docs_for(step_id)
        if not paths:
            raise HTTPException(400, f"no doc fixtures registered for step {step_id}")
        missing = [p for p in paths if not p.exists()]
        if missing:
            raise HTTPException(500, f"fixture files missing: {[str(m) for m in missing]}")

        uploads: list[UploadFile] = []
        for path in paths:
            uploads.append(UploadFile(file=path.open("rb"), filename=path.name))
        try:
            doc_class = "compliance" if primitive == "upload_compliance" else "content"
            ingested = await ingest_uploaded_files(
                db=db,
                files=uploads,
                building_id=building_id,
                step_id=step_id,
                doc_class=doc_class,
            )
        finally:
            for u in uploads:
                try:
                    u.file.close()
                except Exception:
                    pass
        tick(db, run_id=run.id, submit={"step_id": step_id, "input": {"docs": ingested}})
    else:
        raise HTTPException(400, f"autofill not supported for primitive {primitive}")

    db.refresh(run)
    return RunStateOut(
        run_id=run.id,
        status=run.status,
        current_step_id=run.current_step_id,
        state=run.state or {},
    )


@router.post("/buildings/{building_id}/run/steps/{step_id}/edit-form", response_model=RunStateOut)
def edit_form_step(
    building_id: str,
    step_id: str,
    payload: SubmitStepIn,
    db: Session = Depends(db_session),
) -> RunStateOut:
    """Replace a previously-submitted form step with new values, keeping
    every other step intact. Cross-check and human-review re-run on the
    updated state."""
    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")
    try:
        snap = apply_edit(
            db, run_id=run.id, step_id=step_id, form_input=payload.input or {}
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    db.refresh(run)
    return RunStateOut(
        run_id=run.id,
        status=run.status,
        current_step_id=snap.current_step_id,
        state=run.state or {},
    )


@router.post("/buildings/{building_id}/run/steps/{step_id}/edit-upload", response_model=RunStateOut)
async def edit_upload_step(
    building_id: str,
    step_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(db_session),
) -> RunStateOut:
    """Replace a previously-uploaded compliance/content step with new
    docs. Other uploads stay; cross-check and human-review re-run."""
    from ..processing.pipeline import ingest_uploaded_files

    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")
    tpl = db.get(WorkflowTemplate, run.template_id)
    step = next((s for s in (tpl.steps or []) if s["id"] == step_id), None)
    if not step:
        raise HTTPException(400, f"unknown step {step_id}")
    primitive = step["primitive"]
    if primitive not in {"upload_compliance", "upload_content"}:
        raise HTTPException(400, f"edit-upload not valid for primitive {primitive}")
    doc_class = "compliance" if primitive == "upload_compliance" else "content"

    ingested = await ingest_uploaded_files(
        db=db,
        files=files,
        building_id=building_id,
        step_id=step_id,
        doc_class=doc_class,
    )
    try:
        snap = apply_edit(db, run_id=run.id, step_id=step_id, doc_input=ingested)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    db.refresh(run)
    return RunStateOut(
        run_id=run.id,
        status=run.status,
        current_step_id=snap.current_step_id,
        state=run.state or {},
    )


@router.post("/buildings/{building_id}/run/auto-fix", response_model=RunStateOut)
def auto_fix_run(
    building_id: str,
    db: Session = Depends(db_session),
) -> RunStateOut:
    """Ask GLM to propose form-value corrections that close the gaps the
    human-review step is showing, then apply them via apply_edit. Only
    touches form steps; uploaded documents are treated as ground truth."""
    import json as _json

    from ..glm import get_client
    from ..glm.tools import PROPOSE_AUTO_FIX

    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")

    state = run.state or {}
    step_outputs = state.get("step_outputs") or {}
    uploaded_docs = state.get("uploaded_docs") or []

    # Pull the current gaps from human_review (if any).
    gaps: list[str] = []
    for sid, out in step_outputs.items():
        if isinstance(out, dict) and out.get("gaps"):
            gaps.extend(out["gaps"])
    if not gaps:
        raise HTTPException(400, "no gaps to fix")

    tpl = db.get(WorkflowTemplate, run.template_id)
    form_steps = [s for s in (tpl.steps or []) if s["primitive"] == "collect_form"]
    form_step_ids = [s["id"] for s in form_steps]
    form_step_fields: dict[str, set[str]] = {
        s["id"]: {f.get("name") for f in (s.get("config") or {}).get("fields") or [] if f.get("name")}
        for s in form_steps
    }

    # Ground the model in the actual document text rather than the
    # extraction layer (gpt-4o-mini frequently drops `fields`, leaving
    # verification_results uselessly sparse).
    docs_for_prompt = []
    for d in uploaded_docs:
        text = (d.get("text") or "").strip()
        if not text:
            continue
        docs_for_prompt.append(
            f"--- {d.get('filename') or d.get('id')} "
            f"(step={d.get('step_id')}, doc_type={d.get('doc_type')}) ---\n"
            f"{text[:4000]}"
        )
    docs_block = "\n\n".join(docs_for_prompt)[:24000]

    sys = (
        "You are an assistant fixing inconsistencies in a building "
        "submission. Treat uploaded regulator documents (deeds, Bomba "
        "certificates, MBSA approvals) as the source of truth and the "
        "owner-typed form values as suspect. Reply ONLY by calling "
        "propose_auto_fix with one field_changes entry per individual form "
        "field that needs to change. Each entry MUST include the literal "
        "new_value copied verbatim from a specific document — quote the "
        "document name in `reason`. If a field already matches the "
        "documents, do not include it. NEVER invent a value that no "
        "document states. If multiple documents disagree, prefer the "
        "majority; if still tied, prefer the deed/title document. "
        f"Editable form steps: {form_step_ids}. "
        f"Field names per step: {form_step_fields_listed(form_steps)}."
    )
    user = (
        f"Gaps from review:\n- " + "\n- ".join(gaps) + "\n\n"
        f"Current form values:\n{_json.dumps({k:v for k,v in step_outputs.items() if k in form_step_ids}, indent=2, default=str)[:6000]}\n\n"
        f"Uploaded document contents (authoritative):\n{docs_block or '(no document text available)'}"
    )

    client = get_client()
    proposal = client.call_tool(
        messages=[
            {"role": "system", "content": sys},
            {"role": "user", "content": user},
        ],
        tool_spec=PROPOSE_AUTO_FIX,
    )

    logger.info("auto-fix proposal: %s", proposal)
    raw_changes = proposal.get("field_changes") or proposal.get("edits") or []
    if not raw_changes:
        raise HTTPException(
            400,
            {
                "message": "GLM proposed no changes",
                "explanation": proposal.get("explanation", ""),
                "proposal": proposal,
            },
        )

    title_to_id = {(s.get("title") or "").strip().lower(): s["id"] for s in form_steps}
    id_set_lower = {sid.lower(): sid for sid in form_step_ids}

    def resolve_step(raw: str | None, field_name: str | None) -> str | None:
        if raw:
            r = raw.strip().lower()
            if r in id_set_lower:
                return id_set_lower[r]
            if r in title_to_id:
                return title_to_id[r]
        if len(form_step_ids) == 1:
            return form_step_ids[0]
        if field_name:
            for sid, declared in form_step_fields.items():
                if field_name in declared:
                    return sid
        return None

    # Group flat field_changes by step_id, then merge with existing values.
    grouped: dict[str, dict[str, Any]] = {}
    reasons: dict[str, list[str]] = {}
    for ch in raw_changes:
        # Tolerate the older nested shape too: {"step_id": ..., "fields": {...}}
        if isinstance(ch.get("fields"), dict) and ch["fields"]:
            sid_raw = ch.get("step_id")
            for fname, fval in ch["fields"].items():
                sid = resolve_step(sid_raw, fname)
                if not sid or fval is None:
                    continue
                grouped.setdefault(sid, {})[fname] = fval
                if ch.get("reason"):
                    reasons.setdefault(sid, []).append(ch["reason"])
            continue
        fname = ch.get("field")
        fval = ch.get("new_value")
        if fname is None or fval is None or fval == "":
            continue
        sid = resolve_step(ch.get("step_id"), fname)
        if not sid:
            continue
        grouped.setdefault(sid, {})[fname] = fval
        if ch.get("reason"):
            reasons.setdefault(sid, []).append(ch["reason"])

    # Validate every proposed value appears verbatim in at least one
    # uploaded document. gpt-4o-mini frequently invents plausible-looking
    # numbers that no document actually states; this filter is a hard
    # backstop against hallucination.
    full_doc_text = "\n".join(
        (d.get("text") or "") for d in uploaded_docs
    ).lower()

    def value_supported(v: Any) -> bool:
        if v is None or v == "":
            return False
        s = str(v).strip().lower()
        if not s:
            return False
        # Numbers: require the bare digit sequence to appear in some doc.
        # Strings: require the value (or first 8+ chars of it) to appear.
        if isinstance(v, (int, float)):
            return s in full_doc_text
        return s in full_doc_text or (len(s) >= 8 and s[:24] in full_doc_text)

    rejected: list[dict[str, Any]] = []
    applied: list[dict[str, Any]] = []
    for sid, new_fields in grouped.items():
        existing_raw = step_outputs.get(sid)
        existing = existing_raw if isinstance(existing_raw, dict) else {}
        validated_changes: dict[str, Any] = {}
        for k, v in new_fields.items():
            if existing.get(k) == v:
                continue  # no-op
            if not value_supported(v):
                rejected.append({"field": k, "value": v, "reason": "not in any document"})
                logger.warning(
                    "auto-fix: rejecting hallucinated %s=%r (not in any uploaded doc)", k, v
                )
                continue
            validated_changes[k] = v
        if not validated_changes:
            continue
        merged = {**existing, **validated_changes}
        try:
            apply_edit(db, run_id=run.id, step_id=sid, form_input=merged)
        except ValueError as e:
            raise HTTPException(400, f"edit {sid} failed: {e}") from e
        applied.append(
            {"step_id": sid, "fields": validated_changes, "reasons": reasons.get(sid, [])}
        )

    if rejected and not applied:
        raise HTTPException(
            400,
            {
                "message": (
                    "GLM proposed values that don't appear in any uploaded "
                    "document. This is usually a model-quality issue — try "
                    "switching OPENAI_MODEL to gpt-4o (not gpt-4o-mini), "
                    "or edit the basics step manually."
                ),
                "rejected": rejected,
                "proposal": proposal,
            },
        )

    if not applied:
        # Every proposed change matches what the form already says — gaps
        # are stale. Force a review re-run by re-applying the form values
        # unchanged; apply_edit clears human_review + cross_check outputs
        # so they'll re-execute against the current state.
        if form_step_ids:
            target = form_step_ids[0]
            existing_raw = step_outputs.get(target)
            existing = existing_raw if isinstance(existing_raw, dict) else {}
            if existing:
                try:
                    apply_edit(db, run_id=run.id, step_id=target, form_input=dict(existing))
                except ValueError as e:
                    raise HTTPException(400, f"refresh failed: {e}") from e
                db.refresh(run)
                return RunStateOut(
                    run_id=run.id,
                    status=run.status,
                    current_step_id=run.current_step_id,
                    state=run.state or {},
                )
        raise HTTPException(
            400,
            {
                "message": "GLM proposed changes but none differ from current values",
                "form_step_ids": form_step_ids,
                "proposal": proposal,
            },
        )

    db.refresh(run)
    return RunStateOut(
        run_id=run.id,
        status=run.status,
        current_step_id=run.current_step_id,
        state=run.state or {},
    )


@router.post("/buildings/{building_id}/run/rewind/{step_id}", response_model=RunStateOut)
def rewind_step(
    building_id: str,
    step_id: str,
    db: Session = Depends(db_session),
) -> RunStateOut:
    """Reopen ``step_id`` for editing, discarding it and every later step's
    output. Used by the human_review panel so the owner can fix gaps the
    AI surfaced (mismatched address, wrong building name, etc.)."""
    run = _latest_run(db, building_id)
    if not run:
        raise HTTPException(404, "no run started for this building")
    try:
        snap = rewind_run(db, run_id=run.id, target_step_id=step_id)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    db.refresh(run)
    return RunStateOut(
        run_id=run.id,
        status=run.status,
        current_step_id=snap.current_step_id,
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
