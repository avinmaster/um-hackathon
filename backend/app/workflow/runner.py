"""Bridges the DB (``WorkflowRun`` row) and the LangGraph runtime.

Responsibilities:
- Compile a template on demand (cheap; cached per template_id).
- Open a checkpointer and run the graph to its next pause or completion.
- Persist the latest ``RunState`` snapshot + decision log back to the
  relational DB so the UI can read it without speaking LangGraph.

Design notes:
- ``thread_id = run_id`` so checkpointing is 1:1 with a run.
- After every graph tick we read the final state and update
  ``WorkflowRun.state``, ``step_runs`` rows, and ``Building.status``.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from ..db.models import Building, Document, StepRun, WorkflowRun, WorkflowTemplate
from ..profile.builder import build_profile
from .checkpointer import get_checkpointer
from .compiler import compile_template
from .state import RunState, new_run_state

logger = logging.getLogger(__name__)


@dataclass
class RunSnapshot:
    run_id: str
    state: dict[str, Any]
    status: str  # 'running' | 'awaiting_user' | 'completed' | 'failed'
    current_step_id: str | None


def _steps_of(tpl: WorkflowTemplate) -> list[dict[str, Any]]:
    steps = tpl.steps or []
    if not isinstance(steps, list):
        raise ValueError("template.steps must be a list")
    return steps


def _run_state_from_db(run: WorkflowRun) -> RunState:
    state = run.state or {}
    if not state:
        state = new_run_state(
            run_id=run.id,
            building_id=run.building_id,
            city_id="",
            template_id=run.template_id,
        )
    state["run_id"] = run.id  # type: ignore[assignment]
    return state  # type: ignore[return-value]


def start_run(db: Session, *, building_id: str, template_id: str) -> WorkflowRun:
    """Create a ``WorkflowRun`` row (does not advance the graph).

    The API's ``/start`` endpoint creates the run and then calls
    ``tick(run_id)`` separately so SSE can stream progress.
    """
    run = WorkflowRun(
        building_id=building_id,
        template_id=template_id,
        state={},
        status="running",
    )
    db.add(run)
    db.flush()

    b = db.get(Building, building_id)
    if b and b.status == "draft":
        b.status = "onboarding"

    db.commit()
    return run


def tick(db: Session, *, run_id: str, submit: dict[str, Any] | None = None) -> RunSnapshot:
    """Advance a run by one graph invocation.

    ``submit`` is merged into ``pending_input`` before the invocation so the
    current paused step receives fresh input.
    """
    run = db.get(WorkflowRun, run_id)
    if run is None:
        raise ValueError(f"run {run_id} not found")

    tpl = db.get(WorkflowTemplate, run.template_id)
    if tpl is None:
        raise ValueError(f"template {run.template_id} not found")
    steps = _steps_of(tpl)

    state = _run_state_from_db(run)
    state["city_id"] = tpl.city_id

    if submit:
        step_id = submit.get("step_id") or state.get("awaiting_step_id")
        if step_id:
            pending = dict(state.get("pending_input") or {})
            pending[step_id] = submit.get("input") or {}
            state["pending_input"] = pending

    # Clear pause flags so the graph enters normally.
    state["awaiting_user"] = False
    state["awaiting_step_id"] = None
    state["user_prompt"] = None

    with get_checkpointer() as checkpointer:
        app = compile_template(steps, checkpointer=checkpointer)
        config = {"configurable": {"thread_id": _thread_id(run.id, state.get("rewind_rev") or 0)}}
        try:
            final_state = app.invoke(state, config=config)
        except Exception as e:
            logger.exception("run %s failed", run.id)
            run.status = "failed"
            run.state = {**state, "error": repr(e)}
            db.commit()
            return RunSnapshot(
                run_id=run.id,
                state=run.state,
                status="failed",
                current_step_id=state.get("awaiting_step_id"),
            )

    run.state = _serialise_state(final_state)
    run.current_step_id = final_state.get("awaiting_step_id")
    if final_state.get("published"):
        run.status = "completed"
        b = db.get(Building, run.building_id)
        if b:
            profile, scene_config = build_profile(final_state)
            b.status = "published"
            b.published_at = datetime.utcnow()
            b.profile = profile
            b.scene_config = scene_config
    elif final_state.get("awaiting_user"):
        run.status = "awaiting_user"
    else:
        run.status = "running"

    _persist_step_runs(db, run, final_state)

    db.commit()

    return RunSnapshot(
        run_id=run.id,
        state=run.state,
        status=run.status,
        current_step_id=run.current_step_id,
    )


def _serialise_state(state: dict[str, Any]) -> dict[str, Any]:
    return json.loads(json.dumps(state, default=str))


def _persist_step_runs(db: Session, run: WorkflowRun, state: dict[str, Any]) -> None:
    """Mirror step outputs + decision log into relational rows.

    Step rows are upserted by (run_id, step_id). The decision log for each
    step is the union of all GLM decisions tagged with that step_id.
    """
    outputs: dict[str, Any] = state.get("step_outputs") or {}
    log: list[dict[str, Any]] = state.get("decision_log") or []
    by_step: dict[str, list[dict[str, Any]]] = {}
    for d in log:
        sid = d.get("step_id")
        if not sid:
            continue
        by_step.setdefault(sid, []).append(d)

    existing = {sr.step_id: sr for sr in db.query(StepRun).filter(StepRun.run_id == run.id).all()}
    awaiting = state.get("awaiting_step_id")

    for sid, output in outputs.items():
        sr = existing.get(sid)
        if sr is None:
            sr = StepRun(run_id=run.id, step_id=sid, primitive="", status="pending")
            db.add(sr)
            existing[sid] = sr
        if not sr.started_at:
            sr.started_at = datetime.utcnow()
        sr.output = output
        sr.decision_log = by_step.get(sid, [])
        if isinstance(output, dict) and (output.get("passed") or output.get("published") or output.get("confirmed") or output.get("resolved")):
            sr.status = "passed" if not output.get("published") else "completed"
            sr.completed_at = datetime.utcnow()
        elif sid == awaiting:
            sr.status = "awaiting_user"
        else:
            sr.status = "running"


def _thread_id(run_id: str, rev: int) -> str:
    """LangGraph thread key. Rewinding bumps ``rev`` so the new run uses a
    fresh checkpoint thread instead of resuming the old paused position."""
    return run_id if not rev else f"{run_id}#r{rev}"


def rewind_run(db: Session, *, run_id: str, target_step_id: str) -> RunSnapshot:
    """Reopen ``target_step_id`` for editing, discarding it + downstream output.

    Clears outputs, pending input, verification results, and uploaded docs
    for the target step and every later step (by template order). Bumps
    ``rewind_rev`` so the next ``tick()`` runs on a fresh checkpoint thread.
    Earlier steps stay valid and short-circuit on their idempotency guards
    when the run is re-invoked, leaving the run paused at the target.
    """
    run = db.get(WorkflowRun, run_id)
    if run is None:
        raise ValueError(f"run {run_id} not found")
    if run.status == "completed":
        raise ValueError("cannot rewind a completed run")

    tpl = db.get(WorkflowTemplate, run.template_id)
    if tpl is None:
        raise ValueError(f"template {run.template_id} not found")
    steps = _steps_of(tpl)

    step_ids = [s["id"] for s in steps]
    if target_step_id not in step_ids:
        raise ValueError(f"unknown step_id {target_step_id}")
    target_idx = step_ids.index(target_step_id)
    cleared = set(step_ids[target_idx:])

    state = dict(_run_state_from_db(run))

    step_outputs = {k: v for k, v in (state.get("step_outputs") or {}).items() if k not in cleared}
    pending_input = {k: v for k, v in (state.get("pending_input") or {}).items() if k not in cleared}
    verification_results = [
        v for v in (state.get("verification_results") or []) if v.get("step_id") not in cleared
    ]
    uploaded_docs = [
        d for d in (state.get("uploaded_docs") or []) if d.get("step_id") not in cleared
    ]

    decision_log = list(state.get("decision_log") or [])
    decision_log.append(
        {
            "step_id": target_step_id,
            "call_id": f"rewind-{uuid.uuid4().hex[:8]}",
            "tool": "rewind",
            "request": {"target": target_step_id, "cleared": sorted(cleared)},
            "response": {},
            "duration_ms": 0,
            "ts": time.time(),
        }
    )

    state.update(
        step_outputs=step_outputs,
        pending_input=pending_input,
        verification_results=verification_results,
        uploaded_docs=uploaded_docs,
        decision_log=decision_log,
        rewind_rev=int(state.get("rewind_rev") or 0) + 1,
        awaiting_user=False,
        awaiting_step_id=None,
        user_prompt=None,
        published=False,
    )

    db.query(StepRun).filter(StepRun.run_id == run.id, StepRun.step_id.in_(cleared)).delete(
        synchronize_session=False
    )

    run.state = _serialise_state(state)
    run.current_step_id = None
    run.status = "running"
    db.commit()

    return tick(db, run_id=run.id)


# Primitives whose output is purely derived from upstream state — they can
# be re-executed without further user input. Editing any earlier step
# invalidates these but leaves the user-driven steps (forms, uploads) intact.
_RECOMPUTE_PRIMITIVES = {"cross_check", "human_review", "publish"}


def apply_edit(
    db: Session,
    *,
    run_id: str,
    step_id: str,
    form_input: dict[str, Any] | None = None,
    doc_input: list[dict[str, Any]] | None = None,
) -> RunSnapshot:
    """In-place edit of one earlier step's input. Preserves every other
    step's data; only re-runs the target step plus downstream
    derived-from-state steps (cross_check, human_review, publish).

    Use this instead of ``rewind_run`` when the user wants to fix one
    field or swap one document without losing the rest of their work.
    """
    run = db.get(WorkflowRun, run_id)
    if run is None:
        raise ValueError(f"run {run_id} not found")
    if run.status == "completed":
        raise ValueError("cannot edit a completed run")

    tpl = db.get(WorkflowTemplate, run.template_id)
    if tpl is None:
        raise ValueError(f"template {run.template_id} not found")
    steps = _steps_of(tpl)
    step_ids = [s["id"] for s in steps]
    if step_id not in step_ids:
        raise ValueError(f"unknown step_id {step_id}")
    target_idx = step_ids.index(step_id)
    target = steps[target_idx]
    target_primitive = target["primitive"]

    if target_primitive == "collect_form":
        if not form_input:
            raise ValueError("form_input required for collect_form edit")
    elif target_primitive in {"upload_compliance", "upload_content"}:
        if not doc_input:
            raise ValueError("doc_input required for upload edit")
    else:
        raise ValueError(f"cannot edit primitive {target_primitive}")

    downstream_recompute = {
        s["id"] for s in steps[target_idx + 1 :] if s["primitive"] in _RECOMPUTE_PRIMITIVES
    }
    # Any step we want to re-execute needs its output dropped so its
    # idempotency guard doesn't short-circuit the next tick.
    cleared_outputs = downstream_recompute | {step_id}
    # The target step's old per-doc artefacts must go too, otherwise the
    # `_extend` reducer would surface stale verdicts alongside fresh ones.
    cleared_artefacts = {step_id}

    state = dict(_run_state_from_db(run))

    step_outputs = {
        k: v
        for k, v in (state.get("step_outputs") or {}).items()
        if k not in cleared_outputs
    }
    pending_input = {
        k: v
        for k, v in (state.get("pending_input") or {}).items()
        if k not in downstream_recompute
    }
    if target_primitive == "collect_form":
        pending_input[step_id] = dict(form_input or {})
    else:
        pending_input[step_id] = {"docs": doc_input or []}

    verification_results = [
        v
        for v in (state.get("verification_results") or [])
        if v.get("step_id") not in cleared_artefacts
    ]
    uploaded_docs = [
        d
        for d in (state.get("uploaded_docs") or [])
        if d.get("step_id") not in cleared_artefacts
    ]

    decision_log = list(state.get("decision_log") or [])
    decision_log.append(
        {
            "step_id": step_id,
            "call_id": f"edit-{uuid.uuid4().hex[:8]}",
            "tool": "edit",
            "request": {
                "target": step_id,
                "primitive": target_primitive,
                "downstream_recomputed": sorted(downstream_recompute),
            },
            "response": {},
            "duration_ms": 0,
            "ts": time.time(),
        }
    )

    state.update(
        step_outputs=step_outputs,
        pending_input=pending_input,
        verification_results=verification_results,
        uploaded_docs=uploaded_docs,
        decision_log=decision_log,
        rewind_rev=int(state.get("rewind_rev") or 0) + 1,
        awaiting_user=False,
        awaiting_step_id=None,
        user_prompt=None,
        published=False,
    )

    db.query(StepRun).filter(
        StepRun.run_id == run.id, StepRun.step_id.in_(cleared_outputs)
    ).delete(synchronize_session=False)

    run.state = _serialise_state(state)
    run.current_step_id = None
    run.status = "running"
    db.commit()

    return tick(db, run_id=run.id)
