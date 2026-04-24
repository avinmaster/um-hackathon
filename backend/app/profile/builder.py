"""Build the public ``profile`` + ``scene_config`` for a completed run.

Reads ``RunState``: the ``basics`` collect_form output, every upload_content
extraction, and any cross-check adjustments. Produces:

- ``profile`` — flattened facts the visitor page shows verbatim.
- ``scene_config`` — floors, unit_count, footprint_m2 used by the 3D scene.

Called by the runner when ``publish`` fires. Pure function; no IO.
"""
from __future__ import annotations

from typing import Any


def _coerce_int(v: Any, default: int) -> int:
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def _coerce_float(v: Any, default: float) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def build_profile(state: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    outputs: dict[str, Any] = state.get("step_outputs") or {}
    profile_draft: dict[str, Any] = state.get("profile_draft") or {}
    basics: dict[str, Any] = outputs.get("basics") or {}

    floors = _coerce_int(basics.get("floors"), 5)
    unit_count = _coerce_int(basics.get("unit_count"), floors * 4)
    footprint = _coerce_float(basics.get("footprint_m2"), 400.0)
    year_built = basics.get("year_built")

    profile: dict[str, Any] = {
        "name": basics.get("name"),
        "address": basics.get("address"),
        "floors": floors,
        "unit_count": unit_count,
        "year_built": year_built,
        "footprint_m2": footprint,
        # content-doc extractions (floor_layout, amenities, photo_captions, …)
        **{k: v for k, v in profile_draft.items() if k not in {"name", "address"}},
    }

    scene_config = {
        "floors": max(1, floors),
        "unit_count": max(1, unit_count),
        "footprint_m2": max(50.0, footprint),
    }
    return profile, scene_config
