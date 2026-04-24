"""T4: compliance upload verification via live GLM.

Runs a small ``collect_form`` → ``upload_compliance`` → ``publish`` template
twice:
- once with an ownership deed that matches all criteria → passes;
- once with a Bomba cert at the wrong address → pauses for re-upload.

Also snapshots the decision log shape so downstream tests can compare.
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest
from sqlalchemy import select

from app.db import SessionLocal
from app.db.models import Building, City, StepRun, User, WorkflowRun, WorkflowTemplate
from app.db.schema import create_all
from app.seed.seed_demo import run as seed_run
from app.workflow.runner import start_run, tick

FIX = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def seeded():
    create_all()
    seed_run()
    yield


def _template_with_compliance(db, *, city_id: str, step_cfg: dict) -> WorkflowTemplate:
    tpl = WorkflowTemplate(
        city_id=city_id,
        name="TEST compliance",
        version=1,
        status="published",
        steps=[
            {
                "id": "basics",
                "primitive": "collect_form",
                "title": "Basics",
                "config": {
                    "fields": [
                        {"name": "name", "type": "text", "required": True},
                    ]
                },
            },
            {
                "id": "check",
                "primitive": "upload_compliance",
                "title": "Compliance check",
                "config": step_cfg,
            },
            {"id": "done", "primitive": "publish", "title": "Publish", "config": {}},
        ],
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


def _make_building(db, *, city_id: str) -> Building:
    owner = db.execute(select(User).where(User.role == "owner")).scalar_one()
    b = Building(owner_id=owner.id, city_id=city_id, name="T4 Building")
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@pytest.mark.skipif(
    not os.environ.get("GLM_API_KEY") and not (Path(__file__).resolve().parents[2] / ".env").exists(),
    reason="GLM key required",
)
def test_compliance_pass(seeded):
    with SessionLocal() as db:
        city = db.execute(select(City).where(City.name == "Shah Alam")).scalar_one()
        tpl = _template_with_compliance(
            db,
            city_id=city.id,
            step_cfg={
                "doc_type": "ownership_deed",
                "extract_fields": ["owner_name", "address", "issue_date"],
                "criteria": [
                    "Document must name the building owner.",
                    "Document must reference the building's address.",
                    "Document must be dated.",
                ],
            },
        )
        b = _make_building(db, city_id=city.id)
        run = start_run(db, building_id=b.id, template_id=tpl.id)

        snap = tick(db, run_id=run.id)
        assert snap.current_step_id == "basics"
        snap = tick(
            db,
            run_id=run.id,
            submit={"step_id": "basics", "input": {"name": "T4 Building"}},
        )
        assert snap.current_step_id == "check"

        text = (FIX / "ownership_deed_pass.txt").read_text()
        snap = tick(
            db,
            run_id=run.id,
            submit={
                "step_id": "check",
                "input": {
                    "docs": [
                        {
                            "id": "doc-pass",
                            "filename": "ownership_deed_pass.txt",
                            "file_url": "fixture://ownership_deed_pass.txt",
                            "mime_type": "text/plain",
                            "text": text,
                        }
                    ]
                },
            },
        )
        assert snap.status == "completed", snap.state
        # Verify decision log is persisted on the step_run
        sr = (
            db.execute(
                select(StepRun).where(StepRun.run_id == run.id, StepRun.step_id == "check")
            )
            .scalar_one()
        )
        assert sr.status in {"passed", "completed"}
        assert sr.decision_log and len(sr.decision_log) >= 2  # extract + verify
        # All decisions are tagged with step_id
        assert all(d.get("step_id") == "check" for d in sr.decision_log)


@pytest.mark.skipif(
    not os.environ.get("GLM_API_KEY") and not (Path(__file__).resolve().parents[2] / ".env").exists(),
    reason="GLM key required",
)
def test_compliance_fail_loops(seeded):
    with SessionLocal() as db:
        city = db.execute(select(City).where(City.name == "Shah Alam")).scalar_one()
        tpl = _template_with_compliance(
            db,
            city_id=city.id,
            step_cfg={
                "doc_type": "fire_safety_cert",
                "extract_fields": ["issuer", "address", "valid_until"],
                "criteria": [
                    "Must be issued by the local fire department (Bomba / JBPM).",
                    "Must reference the address '12 Jalan Demo, Shah Alam'.",
                    "Must be valid at date of submission (today is 2026-04-24).",
                ],
            },
        )
        b = _make_building(db, city_id=city.id)
        run = start_run(db, building_id=b.id, template_id=tpl.id)

        # Fast-forward past basics.
        tick(db, run_id=run.id)
        tick(
            db,
            run_id=run.id,
            submit={"step_id": "basics", "input": {"name": "T4 Building Fail"}},
        )

        # Submit the failing Bomba cert — verification should fail and the
        # graph should pause back on the same step, not advance to publish.
        fail_text = (FIX / "bomba_cert_fail.txt").read_text()
        snap = tick(
            db,
            run_id=run.id,
            submit={
                "step_id": "check",
                "input": {
                    "docs": [
                        {
                            "id": "doc-fail",
                            "filename": "bomba_cert_fail.txt",
                            "file_url": "fixture://bomba_cert_fail.txt",
                            "mime_type": "text/plain",
                            "text": fail_text,
                        }
                    ]
                },
            },
        )
        assert snap.status == "awaiting_user"
        assert snap.current_step_id == "check", snap.state

        # Now submit the corrected cert — verification passes and graph publishes.
        pass_text = (FIX / "bomba_cert_pass.txt").read_text()
        snap = tick(
            db,
            run_id=run.id,
            submit={
                "step_id": "check",
                "input": {
                    "docs": [
                        {
                            "id": "doc-pass",
                            "filename": "bomba_cert_pass.txt",
                            "file_url": "fixture://bomba_cert_pass.txt",
                            "mime_type": "text/plain",
                            "text": pass_text,
                        }
                    ]
                },
            },
        )
        assert snap.status == "completed", snap.state
