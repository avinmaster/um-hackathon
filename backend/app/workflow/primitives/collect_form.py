"""``collect_form`` primitive: renders a dynamic form for the owner to fill.

Behaviour:
- First entry with no ``pending_input`` → set ``awaiting_user=True`` so the
  graph pauses.
- When the owner submits, the API merges the payload into
  ``pending_input[step_id]`` and re-invokes. This node then validates the
  required fields and writes the result to ``step_outputs[step_id]``.
- Missing required fields → stay paused with a ``user_prompt`` listing the
  gaps so the UI can show them.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

from ..state import RunState
from . import register

logger = logging.getLogger(__name__)


def _validate(fields: list[dict[str, Any]], submitted: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    for f in fields:
        if f.get("required") and not submitted.get(f["name"]):
            missing.append(f["name"])
    return missing


def _coerce(fields: list[dict[str, Any]], submitted: dict[str, Any]) -> dict[str, Any]:
    """Best-effort type coercion by declared field type."""
    out: dict[str, Any] = {}
    for f in fields:
        if f["name"] not in submitted:
            continue
        v = submitted[f["name"]]
        t = f.get("type")
        try:
            if t == "number" and v is not None and v != "":
                v = float(v) if "." in str(v) else int(v)
        except (TypeError, ValueError):
            pass
        out[f["name"]] = v
    return out


@register("collect_form")
def collect_form_factory(step: dict[str, Any]) -> Callable[[RunState], dict[str, Any]]:
    step_id = step["id"]
    cfg = step.get("config") or {}
    fields: list[dict[str, Any]] = cfg.get("fields") or []

    def node(state: RunState) -> dict[str, Any]:
        # Already completed on a prior run — idempotent resume.
        if state.get("step_outputs", {}).get(step_id):
            return {"awaiting_user": False, "awaiting_step_id": None, "user_prompt": None}

        submitted = (state.get("pending_input") or {}).get(step_id)
        if not submitted:
            return {
                "awaiting_user": True,
                "awaiting_step_id": step_id,
                "user_prompt": f"Please fill in the form for step '{step_id}'.",
            }

        missing = _validate(fields, submitted)
        if missing:
            return {
                "awaiting_user": True,
                "awaiting_step_id": step_id,
                "user_prompt": (
                    "Missing required fields: " + ", ".join(missing)
                ),
            }

        values = _coerce(fields, submitted)
        return {
            "step_outputs": {step_id: values},
            "pending_input": {step_id: None},  # consumed
            "awaiting_user": False,
            "awaiting_step_id": None,
            "user_prompt": None,
        }

    return node
