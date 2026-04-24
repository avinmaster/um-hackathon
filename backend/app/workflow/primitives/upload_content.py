"""``upload_content`` — content-class documents (stub for T3, real in T6).

Unlike ``upload_compliance``, content docs feed the public listing, not a
pass/fail verdict. We extract structured facts per doc and append them to
``profile_draft`` plus ``uploaded_docs`` with ``doc_class='content'``.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

from ...glm import get_client
from ...glm.tools import EXTRACT_DOCUMENT
from ..state import RunState
from . import register

logger = logging.getLogger(__name__)


@register("upload_content")
def upload_content_factory(step: dict[str, Any]) -> Callable[[RunState], dict[str, Any]]:
    step_id = step["id"]
    cfg = step.get("config") or {}
    extract_fields: list[str] = cfg.get("extract_fields") or []

    def node(state: RunState) -> dict[str, Any]:
        if state.get("step_outputs", {}).get(step_id):
            return {"awaiting_user": False, "awaiting_step_id": None}

        pending = (state.get("pending_input") or {}).get(step_id) or {}
        docs: list[dict[str, Any]] = pending.get("docs") or []

        if not docs:
            return {
                "awaiting_user": True,
                "awaiting_step_id": step_id,
                "user_prompt": f"Please upload content documents for: {step.get('title', step_id)}.",
            }

        decisions: list[dict] = []

        def sink(decision):
            e = decision.to_dict()
            e["step_id"] = step_id
            decisions.append(e)

        client = get_client(sink=sink)

        uploaded_docs: list[dict[str, Any]] = []
        profile_patch: dict[str, Any] = {}

        for doc in docs:
            text = doc.get("text") or ""
            prompt = (
                f"Fields of interest: {', '.join(extract_fields) or '(free-form)'}.\n\n"
                f"Document:\n{text[:30000]}"
            )
            extracted = client.call_tool(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Extract facts from a content document for a public building listing. "
                            "Structured, concise, and grounded in the text."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                tool_spec=EXTRACT_DOCUMENT,
            )

            fields = extracted.get("fields") or {}
            profile_patch = _merge_profile(profile_patch, fields)

            uploaded_docs.append(
                {
                    "id": doc.get("id"),
                    "step_id": step_id,
                    "doc_class": "content",
                    "doc_type": extracted.get("doc_type") or "content",
                    "filename": doc.get("filename"),
                    "file_url": doc.get("file_url"),
                    "mime_type": doc.get("mime_type"),
                    "text": text[:2000],
                    "extracted": extracted,
                }
            )

        return {
            "step_outputs": {step_id: {"extracted": [d["extracted"] for d in uploaded_docs]}},
            "uploaded_docs": uploaded_docs,
            "profile_draft": profile_patch,
            "decision_log": decisions,
            "pending_input": {step_id: None},
            "awaiting_user": False,
            "awaiting_step_id": None,
            "user_prompt": None,
        }

    return node


def _merge_profile(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    """Append-style merge — lists concatenate, scalars overwrite later wins."""
    out = dict(base)
    for k, v in patch.items():
        if isinstance(v, list) and isinstance(out.get(k), list):
            out[k] = out[k] + v
        elif isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = {**out[k], **v}
        else:
            out[k] = v
    return out
