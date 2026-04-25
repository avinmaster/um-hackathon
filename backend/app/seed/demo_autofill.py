"""Demo-autofill fixtures for the Shah Alam template.

The frontend's "Autofill demo" button on collect_form / upload_compliance /
upload_content steps calls into the backend, which looks up the step_id
here and either:

- returns form values to be submitted (collect_form), or
- returns a list of demo doc filenames under ``demo_docs/`` to be
  ingested through the same upload pipeline real submissions use.

Form values + doc contents are intentionally consistent so cross_check
passes and human_review reports no gaps — that's the demo path.
"""
from __future__ import annotations

from pathlib import Path

DEMO_DOCS_DIR = Path(__file__).parent / "demo_docs"


FORM_FIXTURES: dict[str, dict[str, object]] = {
    "basics": {
        "name": "Menara Demo",
        "address": "No. 12, Jalan Demo, Seksyen 7, 40000 Shah Alam, Selangor",
        # Deliberate mismatch with the documents (Bomba: "18 above ground",
        # MBSA: "18 storeys", listing pack: "18"). Drives the cross_check
        # contradiction → human_review gap → Auto-fix-with-AI recovery
        # demo flow.
        "floors": 20,
        "unit_count": 96,
        "year_built": 2014,
        "footprint_m2": 1850,
    },
}


DOC_FIXTURES: dict[str, list[str]] = {
    "ownership": ["menara_demo_ownership_deed.md"],
    "fire_safety": ["menara_demo_bomba_cert.md"],
    "zoning": ["menara_demo_mbsa_zoning.md"],
    "layout_and_content": ["menara_demo_listing_pack.md"],
}


def form_values_for(step_id: str) -> dict[str, object] | None:
    return FORM_FIXTURES.get(step_id)


def docs_for(step_id: str) -> list[Path]:
    names = DOC_FIXTURES.get(step_id, [])
    return [DEMO_DOCS_DIR / n for n in names]
