"""Structural test: the full Shah Alam 7-step template compiles cleanly
and the compiler rejects invalid primitives.

We avoid running the full graph here (each pass burns 20+ GLM calls).
Happy path + edge cases are covered under ``test_upload_compliance`` with
live GLM. Here we just prove the compiler matches the template shape.
"""
from __future__ import annotations

import pytest

from app.profile.builder import build_profile
from app.seed.shah_alam_template import shah_alam_template_steps
from app.workflow.compiler import compile_template
from app.workflow.primitives import REGISTRY


def test_all_primitives_registered():
    expected = {
        "collect_form",
        "upload_compliance",
        "upload_content",
        "cross_check",
        "human_review",
        "publish",
    }
    assert expected <= set(REGISTRY.keys())


def test_shah_alam_template_compiles():
    steps = shah_alam_template_steps()
    app = compile_template(steps, checkpointer=None)
    # Verify node set matches.
    graph = app.get_graph()
    assert {n for n in graph.nodes} >= {s["id"] for s in steps}


def test_compiler_rejects_unknown_primitive():
    bad = [{"id": "bad", "primitive": "summon_dragon", "title": "dragon"}]
    with pytest.raises(ValueError, match="unknown primitive"):
        compile_template(bad, checkpointer=None)


def test_profile_builder_shapes():
    state = {
        "step_outputs": {
            "basics": {
                "name": "Menara Demo",
                "address": "12 Jalan Demo",
                "floors": 15,
                "unit_count": 60,
                "footprint_m2": 900,
                "year_built": 2019,
            }
        },
        "profile_draft": {
            "amenities": ["pool", "gym"],
            "photo_captions": ["south-facing balcony"],
        },
    }
    profile, scene = build_profile(state)
    assert profile["name"] == "Menara Demo"
    assert profile["floors"] == 15
    assert profile["amenities"] == ["pool", "gym"]
    assert scene == {"floors": 15, "unit_count": 60, "footprint_m2": 900.0}


def test_profile_builder_defaults_on_missing_basics():
    _, scene = build_profile({"step_outputs": {}, "profile_draft": {}})
    assert scene["floors"] >= 1 and scene["unit_count"] >= 1
