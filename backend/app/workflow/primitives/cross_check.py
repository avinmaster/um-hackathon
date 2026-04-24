"""``cross_check`` — reconcile outputs across earlier steps.

Pauses for user clarification only on *major* contradictions. Minor ones
are surfaced in the decision log but do not block the flow — the human
review step will display them.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Callable

from ...glm import get_client
from ...glm.tools import CROSS_CHECK_DOCUMENTS
from ...glm.prompts import CROSS_CHECK_SYSTEM
from ..state import RunState
from . import register

logger = logging.getLogger(__name__)


@register("cross_check")
def cross_check_factory(step: dict[str, Any]) -> Callable[[RunState], dict[str, Any]]:
    step_id = step["id"]
    cfg = step.get("config") or {}
    compare: list[str] = cfg.get("compare") or []

    def node(state: RunState) -> dict[str, Any]:
        # Resume path — user acknowledged the contradiction, move on.
        pending = (state.get("pending_input") or {}).get(step_id) or {}
        if state.get("step_outputs", {}).get(step_id, {}).get("resolved"):
            return {"awaiting_user": False, "awaiting_step_id": None}

        step_outputs = state.get("step_outputs") or {}
        scope = {sid: step_outputs.get(sid) for sid in compare if sid in step_outputs}

        decisions: list[dict] = []

        def sink(d):
            e = d.to_dict()
            e["step_id"] = step_id
            decisions.append(e)

        client = get_client(sink=sink)
        result = client.call_tool(
            messages=[
                {"role": "system", "content": CROSS_CHECK_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        "Compare the following step outputs. Return contradictions only.\n\n"
                        f"{json.dumps(scope, indent=2, default=str)[:30000]}"
                    ),
                },
            ],
            tool_spec=CROSS_CHECK_DOCUMENTS,
        )

        contradictions = result.get("contradictions") or []
        major = [c for c in contradictions if c.get("severity") == "major"]

        # User acknowledged — move on even if there were majors.
        if pending.get("acknowledged"):
            return {
                "step_outputs": {step_id: {"resolved": True, "contradictions": contradictions}},
                "decision_log": decisions,
                "pending_input": {step_id: None},
                "awaiting_user": False,
                "awaiting_step_id": None,
                "user_prompt": None,
            }

        if major:
            return {
                "awaiting_user": True,
                "awaiting_step_id": step_id,
                "user_prompt": (
                    "Major contradictions detected across your documents. "
                    "Review and confirm or re-upload."
                ),
                "step_outputs": {step_id: {"resolved": False, "contradictions": contradictions}},
                "decision_log": decisions,
            }

        return {
            "step_outputs": {step_id: {"resolved": True, "contradictions": contradictions}},
            "decision_log": decisions,
            "pending_input": {step_id: None},
            "awaiting_user": False,
            "awaiting_step_id": None,
        }

    return node
