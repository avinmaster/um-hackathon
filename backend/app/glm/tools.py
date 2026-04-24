"""OpenAI function-calling schemas for every GLM tool used by the platform.

These are the only contracts the rest of the system relies on when talking
to GLM. Changing a schema here ripples into primitives and admin endpoints,
so treat these as stable interfaces.
"""
from __future__ import annotations

from typing import Any


def _fn(name: str, description: str, parameters: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": parameters,
        },
    }


DRAFT_TEMPLATE = _fn(
    "draft_template",
    "Draft an onboarding workflow template as an ordered list of step configs. "
    "The list must use ONLY the allowed primitives.",
    {
        "type": "object",
        "properties": {
            "steps": {
                "type": "array",
                "description": "Ordered list of step configs; must end with a 'publish' step.",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "primitive": {
                            "type": "string",
                            "enum": [
                                "collect_form",
                                "upload_compliance",
                                "upload_content",
                                "cross_check",
                                "human_review",
                                "publish",
                            ],
                        },
                        "title": {"type": "string"},
                        "config": {
                            "type": "object",
                            "description": "Primitive-specific config (fields, criteria, etc.).",
                            "additionalProperties": True,
                        },
                    },
                    "required": ["id", "primitive", "title"],
                },
            },
            "rationale": {
                "type": "string",
                "description": "1–3 sentence explanation for the admin.",
            },
        },
        "required": ["steps"],
    },
)


EXPLAIN_FIELD = _fn(
    "explain_field",
    "Explain what a given step or field is for, in plain English, to help an admin author a template.",
    {
        "type": "object",
        "properties": {
            "explanation": {"type": "string"},
            "suggestions": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Optional follow-up tweaks the admin might apply.",
            },
        },
        "required": ["explanation"],
    },
)


EXTRACT_DOCUMENT = _fn(
    "extract_document",
    "Extract structured facts from a parsed document's text. "
    "Return a flat object of field→value pairs. Unknown fields should be omitted, not null.",
    {
        "type": "object",
        "properties": {
            "doc_type": {
                "type": "string",
                "description": "Best-guess document type, e.g. 'ownership_deed', 'fire_safety_cert'.",
            },
            "fields": {
                "type": "object",
                "description": "Extracted fields keyed by the names requested in the prompt.",
                "additionalProperties": True,
            },
            "confidence": {
                "type": "number",
                "description": "0–1, model's self-estimated extraction confidence.",
            },
            "notes": {
                "type": "string",
                "description": "Short human-readable summary (≤ 2 sentences).",
            },
        },
        "required": ["doc_type", "fields"],
    },
)


VERIFY_AGAINST_CRITERIA = _fn(
    "verify_against_criteria",
    "Judge a parsed document against a list of plain-English criteria. "
    "Return overall pass/fail plus per-criterion verdicts with evidence.",
    {
        "type": "object",
        "properties": {
            "passed": {"type": "boolean"},
            "reasons": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "criterion": {"type": "string"},
                        "verdict": {
                            "type": "string",
                            "enum": ["pass", "fail", "unclear"],
                        },
                        "evidence": {
                            "type": "string",
                            "description": "Quote or short paraphrase from the document supporting the verdict.",
                        },
                    },
                    "required": ["criterion", "verdict", "evidence"],
                },
            },
            "summary": {
                "type": "string",
                "description": "One-sentence human-facing summary (shown in the UI).",
            },
        },
        "required": ["passed", "reasons", "summary"],
    },
)


CROSS_CHECK_DOCUMENTS = _fn(
    "cross_check_documents",
    "Compare the outputs of earlier steps and surface any contradictions. "
    "Return an empty list if they are consistent.",
    {
        "type": "object",
        "properties": {
            "contradictions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "field": {
                            "type": "string",
                            "description": "The field name or topic that disagrees.",
                        },
                        "values": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "source": {"type": "string"},
                                    "value": {"type": "string"},
                                },
                                "required": ["source", "value"],
                            },
                        },
                        "explanation": {"type": "string"},
                        "severity": {
                            "type": "string",
                            "enum": ["minor", "major"],
                        },
                    },
                    "required": ["field", "values", "explanation"],
                },
            },
            "summary": {"type": "string"},
        },
        "required": ["contradictions", "summary"],
    },
)


SUMMARIZE_FOR_REVIEW = _fn(
    "summarize_for_review",
    "Summarise the run so far for the owner to confirm before publishing. "
    "Call out any gaps that would block publication.",
    {
        "type": "object",
        "properties": {
            "summary_markdown": {
                "type": "string",
                "description": "Readable markdown summary — sections, bullets, short.",
            },
            "gaps": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Outstanding items that block publication.",
            },
            "ready_to_publish": {"type": "boolean"},
        },
        "required": ["summary_markdown", "ready_to_publish"],
    },
)


ANSWER_VISITOR_QUESTION = _fn(
    "answer_visitor_question",
    "Answer a visitor's question about a building strictly from the provided profile "
    "and content-document excerpts. If the answer is not supported, say so.",
    {
        "type": "object",
        "properties": {
            "answer": {"type": "string"},
            "citations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "source": {
                            "type": "string",
                            "description": "Doc name or profile field that grounds the answer.",
                        },
                        "quote": {"type": "string"},
                    },
                    "required": ["source"],
                },
            },
            "confidence": {"type": "number"},
        },
        "required": ["answer"],
    },
)


TOOL_SPECS: dict[str, dict[str, Any]] = {
    "draft_template": DRAFT_TEMPLATE,
    "explain_field": EXPLAIN_FIELD,
    "extract_document": EXTRACT_DOCUMENT,
    "verify_against_criteria": VERIFY_AGAINST_CRITERIA,
    "cross_check_documents": CROSS_CHECK_DOCUMENTS,
    "summarize_for_review": SUMMARIZE_FOR_REVIEW,
    "answer_visitor_question": ANSWER_VISITOR_QUESTION,
}


def tool_spec(name: str) -> dict[str, Any]:
    return TOOL_SPECS[name]
