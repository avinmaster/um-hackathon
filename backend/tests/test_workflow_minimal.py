"""End-to-end T3 smoke: a trivial 2-primitive template runs via the runner.

Template: ``collect_form`` → ``publish``.
Graph should pause on the form, accept a submission, then publish.
"""
from __future__ import annotations

import pytest
from sqlalchemy import select

from app.db import SessionLocal
from app.db.models import Building, City, User, WorkflowTemplate
from app.db.schema import create_all
from app.seed.seed_demo import run as seed_run
from app.workflow.runner import start_run, tick


@pytest.fixture(scope="module")
def seeded_db():
    create_all()
    seed_run()
    yield


def _make_minimal_template(db, *, city_id: str) -> WorkflowTemplate:
    tpl = WorkflowTemplate(
        city_id=city_id,
        name="TEST minimal",
        version=1,
        status="published",
        steps=[
            {
                "id": "basics",
                "primitive": "collect_form",
                "title": "Basics",
                "config": {
                    "fields": [
                        {"name": "name", "label": "Name", "type": "text", "required": True},
                        {
                            "name": "floors",
                            "label": "Floors",
                            "type": "number",
                            "required": True,
                        },
                    ]
                },
            },
            {"id": "done", "primitive": "publish", "title": "Publish", "config": {}},
        ],
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


def test_two_step_template_runs_end_to_end(seeded_db):
    with SessionLocal() as db:
        owner = db.execute(select(User).where(User.role == "owner")).scalar_one()
        city = db.execute(select(City).where(City.name == "Shah Alam")).scalar_one()
        tpl = _make_minimal_template(db, city_id=city.id)

        b = Building(owner_id=owner.id, city_id=city.id, name="Test Building")
        db.add(b)
        db.commit()
        db.refresh(b)

        run = start_run(db, building_id=b.id, template_id=tpl.id)

        # First tick: should pause on collect_form.
        snap = tick(db, run_id=run.id)
        assert snap.status == "awaiting_user"
        assert snap.current_step_id == "basics"

        # Submit the form.
        snap = tick(
            db,
            run_id=run.id,
            submit={"step_id": "basics", "input": {"name": "Test Building", "floors": 7}},
        )
        assert snap.status == "completed", snap.state
        db.refresh(b)
        assert b.status == "published"
        assert b.scene_config == {"floors": 7, "unit_count": 28, "footprint_m2": 400.0}
