"""Shah Alam's canonical 7-step template. Shipped with the seed so demos
work on a fresh clone without the admin having to author anything first.

Covers the full primitive vocabulary: a basics form, three compliance
uploads (ownership, Bomba fire, MBSA zoning), one content upload, a
cross-check, human review, and publish.
"""
from __future__ import annotations

from typing import Any


def shah_alam_template_steps() -> list[dict[str, Any]]:
    return [
        {
            "id": "basics",
            "primitive": "collect_form",
            "title": "Building basics",
            "config": {
                "fields": [
                    {
                        "name": "name",
                        "label": "Building name",
                        "type": "text",
                        "required": True,
                        "hint": "e.g. Menara Mutiara",
                    },
                    {
                        "name": "address",
                        "label": "Street address",
                        "type": "text",
                        "required": True,
                        "hint": "e.g. 22 Jalan Bunga Raya, Section 7, Shah Alam",
                    },
                    {
                        "name": "floors",
                        "label": "Number of floors",
                        "type": "number",
                        "required": True,
                        "hint": "e.g. 18",
                    },
                    {
                        "name": "unit_count",
                        "label": "Number of units",
                        "type": "number",
                        "required": True,
                        "hint": "e.g. 96",
                    },
                    {
                        "name": "year_built",
                        "label": "Year built",
                        "type": "number",
                        "required": False,
                        "hint": "e.g. 2014",
                    },
                    {
                        "name": "footprint_m2",
                        "label": "Footprint area (m²)",
                        "type": "number",
                        "required": False,
                        "hint": "e.g. 1850",
                    },
                ]
            },
        },
        {
            "id": "ownership",
            "primitive": "upload_compliance",
            "title": "Ownership proof",
            "config": {
                "accepts": ["application/pdf", "image/png", "image/jpeg"],
                "max_files": 2,
                "doc_type": "ownership_deed",
                "extract_fields": ["owner_name", "address", "issue_date"],
                "criteria": [
                    "Document must name the building owner.",
                    "Document must reference the building's address.",
                    "Document must be dated.",
                ],
            },
        },
        {
            "id": "fire_safety",
            "primitive": "upload_compliance",
            "title": "Bomba fire-safety approval",
            "config": {
                "accepts": ["application/pdf"],
                "max_files": 1,
                "doc_type": "fire_safety_cert",
                "extract_fields": ["issuer", "address", "valid_until"],
                "criteria": [
                    "Must be issued by the local fire department (Bomba / JBPM).",
                    "Must reference the building's address.",
                    "Must be valid at date of submission.",
                ],
            },
        },
        {
            "id": "zoning",
            "primitive": "upload_compliance",
            "title": "MBSA zoning clearance",
            "config": {
                "accepts": ["application/pdf"],
                "max_files": 1,
                "doc_type": "zoning_approval",
                "extract_fields": ["issuer", "address", "zoning_type", "issue_date"],
                "criteria": [
                    "Must be issued by Majlis Bandaraya Shah Alam (MBSA).",
                    "Must reference the building's address.",
                    "Must state the zoning designation (residential, commercial, mixed).",
                ],
            },
        },
        {
            "id": "layout_and_content",
            "primitive": "upload_content",
            "title": "Floor plans, amenities, photos",
            "config": {
                "accepts": [
                    "application/pdf",
                    "image/png",
                    "image/jpeg",
                ],
                "max_files": 10,
                "extract_fields": [
                    "floor_layout",
                    "unit_list",
                    "amenities",
                    "photo_captions",
                ],
            },
        },
        {
            "id": "reconcile",
            "primitive": "cross_check",
            "title": "Consistency check",
            "config": {
                "compare": [
                    "basics",
                    "ownership",
                    "fire_safety",
                    "zoning",
                    "layout_and_content",
                ]
            },
        },
        {
            "id": "review",
            "primitive": "human_review",
            "title": "Review and confirm",
            "config": {
                "summary_includes": [
                    "basics",
                    "verification_results",
                    "profile_preview",
                ]
            },
        },
        {
            "id": "done",
            "primitive": "publish",
            "title": "Publish",
            "config": {},
        },
    ]
