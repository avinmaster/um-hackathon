"""HTTP smoke: the onboard API drives a minimal template through to publish."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.db.models import City, User, WorkflowTemplate
from app.db.schema import create_all
from app.main import create_app
from app.seed.seed_demo import run as seed_run


@pytest.fixture(scope="module")
def client():
    create_all()
    seed_run()
    with SessionLocal() as db:
        city = db.execute(select(City).where(City.name == "Shah Alam")).scalar_one()
        tpl = WorkflowTemplate(
            city_id=city.id,
            name="TEST HTTP minimal",
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
                            {"name": "floors", "type": "number", "required": True},
                        ]
                    },
                },
                {"id": "done", "primitive": "publish", "title": "Publish", "config": {}},
            ],
        )
        db.add(tpl)
        db.commit()

    app = create_app()
    yield TestClient(app)


def test_full_http_flow(client: TestClient):
    # Find the test city + pick the TEST template.
    with SessionLocal() as db:
        city = db.execute(select(City).where(City.name == "Shah Alam")).scalar_one()
        # There may be multiple templates — force our test one by bumping version.
        tpl = db.execute(
            select(WorkflowTemplate)
            .where(WorkflowTemplate.name == "TEST HTTP minimal")
        ).scalar_one()
        tpl.version = 99
        db.commit()

    r = client.post("/api/onboard/buildings", json={"name": "HTTP Test", "city_id": city.id})
    assert r.status_code == 200, r.text
    bid = r.json()["id"]

    r = client.post(f"/api/onboard/buildings/{bid}/start")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "awaiting_user"
    assert r.json()["current_step_id"] == "basics"

    r = client.get(f"/api/onboard/buildings/{bid}/run/graph")
    assert r.status_code == 200
    g = r.json()
    assert [n["id"] for n in g["nodes"]] == ["basics", "done"]
    assert g["current"] == "basics"

    r = client.post(
        f"/api/onboard/buildings/{bid}/run/steps/basics/submit",
        json={"input": {"name": "HTTP Test", "floors": 9}},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "completed", body

    r = client.get(f"/api/buildings/{bid}")
    assert r.status_code == 200
    pub = r.json()
    assert pub["status"] == "published"
    assert pub["scene_config"]["floors"] == 9
