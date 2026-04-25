"""``upload_compliance`` — stub for T3 (full impl lives in T4).

Behaves like ``collect_form`` but against ``pending_input[step_id].docs``.
When at least one document has been uploaded and processed, it calls
``extract_document`` and ``verify_against_criteria`` and stores the result.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

from ...glm import get_client
from ...glm.tools import EXTRACT_DOCUMENT, VERIFY_AGAINST_CRITERIA
from ..state import RunState
from . import register

logger = logging.getLogger(__name__)


def _decisions_for(run_id: str, step_id: str) -> tuple[Callable, list[dict]]:
    log: list[dict] = []

    def sink(decision):
        entry = decision.to_dict()
        entry["step_id"] = step_id
        log.append(entry)

    return sink, log


@register("upload_compliance")
def upload_compliance_factory(step: dict[str, Any]) -> Callable[[RunState], dict[str, Any]]:
    step_id = step["id"]
    cfg = step.get("config") or {}
    criteria: list[str] = cfg.get("criteria") or []
    doc_type: str = cfg.get("doc_type") or "document"
    extract_fields: list[str] = cfg.get("extract_fields") or []

    def node(state: RunState) -> dict[str, Any]:
        if state.get("step_outputs", {}).get(step_id, {}).get("passed"):
            return {"awaiting_user": False, "awaiting_step_id": None}

        pending = (state.get("pending_input") or {}).get(step_id) or {}
        docs: list[dict[str, Any]] = pending.get("docs") or []

        if not docs:
            return {
                "awaiting_user": True,
                "awaiting_step_id": step_id,
                "user_prompt": f"Please upload document(s) for: {step.get('title', step_id)}.",
            }

        sink, decisions = _decisions_for(state["run_id"], step_id)
        client = get_client(sink=sink)

        verification_results: list[dict[str, Any]] = []
        uploaded_docs: list[dict[str, Any]] = []
        all_passed = True

        for doc in docs:
            text = doc.get("text") or ""
            extract_prompt = (
                f"Expected doc_type: {doc_type}.\n"
                f"Fields of interest: {', '.join(extract_fields) or '(free-form)'}.\n\n"
                "You MUST populate `fields` with at least 3 concrete entries "
                "drawn verbatim from the document text. Use the field names "
                "above when present in the document; otherwise use descriptive "
                "snake_case keys. Never return an empty `fields` object — if "
                "you cannot find the requested fields, extract whatever "
                "concrete facts the document actually states.\n\n"
                f"Document text:\n{text[:30000]}"
            )
            extracted = client.call_tool(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Extract building facts from the document text. The "
                            "`fields` object is required and must be non-empty."
                        ),
                    },
                    {"role": "user", "content": extract_prompt},
                ],
                tool_spec=EXTRACT_DOCUMENT,
            )

            verify_prompt = (
                "Criteria (numbered):\n"
                + "\n".join(f"{i+1}. {c}" for i, c in enumerate(criteria))
                + f"\n\nDocument text:\n{text[:30000]}"
            )
            verdict = client.call_tool(
                messages=[
                    {
                        "role": "system",
                        "content": "Judge the document against the listed criteria.",
                    },
                    {"role": "user", "content": verify_prompt},
                ],
                tool_spec=VERIFY_AGAINST_CRITERIA,
            )

            doc_passed = bool(verdict.get("passed"))
            all_passed = all_passed and doc_passed

            uploaded_docs.append(
                {
                    "id": doc.get("id"),
                    "step_id": step_id,
                    "doc_class": "compliance",
                    "doc_type": doc_type,
                    "filename": doc.get("filename"),
                    "file_url": doc.get("file_url"),
                    "mime_type": doc.get("mime_type"),
                    "text": text[:2000],
                    "extracted": extracted,
                    "verification_result": verdict,
                }
            )
            verification_results.append(
                {
                    "step_id": step_id,
                    "doc_id": doc.get("id"),
                    "passed": doc_passed,
                    "reasons": verdict.get("reasons", []),
                    "summary": verdict.get("summary", ""),
                }
            )

        if not all_passed:
            # Pause again — owner re-uploads. Clear pending_input so the next
            # submission replaces the last batch.
            return {
                "awaiting_user": True,
                "awaiting_step_id": step_id,
                "user_prompt": "One or more documents failed verification. Please re-upload.",
                "verification_results": verification_results,
                "uploaded_docs": uploaded_docs,
                "decision_log": decisions,
                "pending_input": {step_id: None},
            }

        return {
            "step_outputs": {
                step_id: {
                    "passed": True,
                    "extracted": [d["extracted"] for d in uploaded_docs],
                    "verification": verification_results,
                }
            },
            "verification_results": verification_results,
            "uploaded_docs": uploaded_docs,
            "decision_log": decisions,
            "pending_input": {step_id: None},
            "awaiting_user": False,
            "awaiting_step_id": None,
            "user_prompt": None,
        }

    return node
