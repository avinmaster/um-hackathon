"""``human_review`` — final summary the owner confirms before publish.

Produces a markdown summary via ``summarize_for_review`` and waits for
``pending_input[step_id].confirmed == True``. If ``gaps`` is non-empty,
the primitive refuses to advance until the gaps are cleared.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Callable

from ...glm import get_client
from ...glm.tools import SUMMARIZE_FOR_REVIEW
from ...glm.prompts import SUMMARIZE_FOR_REVIEW_SYSTEM
from ..state import RunState
from . import register

logger = logging.getLogger(__name__)


@register("human_review")
def human_review_factory(step: dict[str, Any]) -> Callable[[RunState], dict[str, Any]]:
    step_id = step["id"]

    def node(state: RunState) -> dict[str, Any]:
        if state.get("step_outputs", {}).get(step_id, {}).get("confirmed"):
            return {"awaiting_user": False, "awaiting_step_id": None}

        pending = (state.get("pending_input") or {}).get(step_id) or {}

        # Generate (or re-generate) the summary fresh each time we enter.
        step_outputs = state.get("step_outputs") or {}
        profile = state.get("profile_draft") or {}
        verification = state.get("verification_results") or []

        decisions: list[dict] = []

        def sink(d):
            e = d.to_dict()
            e["step_id"] = step_id
            decisions.append(e)

        client = get_client(sink=sink)
        result = client.call_tool(
            messages=[
                {"role": "system", "content": SUMMARIZE_FOR_REVIEW_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        "Step outputs:\n"
                        f"{json.dumps(step_outputs, indent=2, default=str)[:16000]}\n\n"
                        "Verification results:\n"
                        f"{json.dumps(verification, indent=2, default=str)[:8000]}\n\n"
                        "Profile draft:\n"
                        f"{json.dumps(profile, indent=2, default=str)[:8000]}"
                    ),
                },
            ],
            tool_spec=SUMMARIZE_FOR_REVIEW,
        )

        summary_md = result.get("summary_markdown", "")
        gaps = result.get("gaps") or []
        ready = bool(result.get("ready_to_publish")) and not gaps

        if pending.get("confirmed") and ready:
            return {
                "step_outputs": {
                    step_id: {
                        "confirmed": True,
                        "summary_markdown": summary_md,
                        "gaps": gaps,
                    }
                },
                "decision_log": decisions,
                "pending_input": {step_id: None},
                "awaiting_user": False,
                "awaiting_step_id": None,
            }

        return {
            "awaiting_user": True,
            "awaiting_step_id": step_id,
            "user_prompt": (
                "Review the summary before publishing."
                if ready
                else "Summary has unresolved gaps; fix before publishing."
            ),
            "step_outputs": {
                step_id: {
                    "confirmed": False,
                    "summary_markdown": summary_md,
                    "gaps": gaps,
                    "ready": ready,
                }
            },
            "decision_log": decisions,
        }

    return node
