"""Shared state for a single workflow run.

Every primitive reads and writes this dict. LangGraph merges via the
``add_messages``-style channel semantics for list fields, so we keep list
updates idempotent (append-only, deduped by id where it matters).
"""
from __future__ import annotations

from typing import Annotated, Any, TypedDict

from langgraph.graph.message import add_messages  # noqa: F401  (unused; kept for parity)


class UploadedDoc(TypedDict, total=False):
    id: str
    step_id: str
    doc_class: str  # 'compliance' | 'content'
    doc_type: str | None
    filename: str
    file_url: str
    mime_type: str
    text: str  # extracted raw text
    extracted: dict[str, Any]
    verification_result: dict[str, Any]


class Decision(TypedDict, total=False):
    step_id: str
    call_id: str
    tool: str
    request: dict[str, Any]
    response: dict[str, Any]
    duration_ms: int
    ts: float


class VerificationResult(TypedDict, total=False):
    step_id: str
    doc_id: str
    passed: bool
    reasons: list[dict[str, Any]]
    summary: str


def _extend(a: list, b: list) -> list:
    """Reducer: union-append lists across node returns."""
    return [*a, *b]


def _merge_dict(a: dict, b: dict) -> dict:
    return {**a, **b}


class RunState(TypedDict, total=False):
    run_id: str
    building_id: str
    city_id: str
    template_id: str
    # per-step outputs keyed by step_id
    step_outputs: Annotated[dict[str, Any], _merge_dict]
    # documents accumulated across upload steps
    uploaded_docs: Annotated[list[UploadedDoc], _extend]
    # verification verdicts from every compliance step
    verification_results: Annotated[list[VerificationResult], _extend]
    # building profile assembled by upload_content + cross_check
    profile_draft: Annotated[dict[str, Any], _merge_dict]
    # GLM decision log for the whole run (decisions also persisted per step_run)
    decision_log: Annotated[list[Decision], _extend]
    # interrupt handshake — primitives set these when they need user input
    awaiting_user: bool
    awaiting_step_id: str | None
    user_prompt: str | None
    # pending input submitted by the user for the current step; consumed on resume
    pending_input: Annotated[dict[str, Any], _merge_dict]
    # bumped by rewind_run; suffixes the LangGraph thread_id so a fresh
    # checkpoint thread is used after rewinding instead of resuming from the
    # old paused position.
    rewind_rev: int
    # terminal state
    published: bool


def new_run_state(
    *,
    run_id: str,
    building_id: str,
    city_id: str,
    template_id: str,
) -> RunState:
    return RunState(
        run_id=run_id,
        building_id=building_id,
        city_id=city_id,
        template_id=template_id,
        step_outputs={},
        uploaded_docs=[],
        verification_results=[],
        profile_draft={},
        decision_log=[],
        awaiting_user=False,
        awaiting_step_id=None,
        user_prompt=None,
        pending_input={},
        rewind_rev=0,
        published=False,
    )
