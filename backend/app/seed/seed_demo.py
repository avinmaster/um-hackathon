"""Idempotent demo seed.

Populates the DB with:
- one admin user (admin@demo.local)
- one owner user (owner@demo.local)
- Shah Alam city
- the published Shah Alam template (§13 scenario)
- an empty "Menara Demo" building owned by the owner

Run: ``.venv/bin/python -m app.seed.seed_demo``
"""
from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import REPO_ROOT
from ..db import SessionLocal
from ..db.models import Building, City, User, WorkflowTemplate
from ..db.schema import create_all
from .shah_alam_template import shah_alam_template_steps

logging.basicConfig(level="INFO", format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("seed")


def upsert_user(db: Session, email: str, name: str, role: str) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user:
        return user
    user = User(email=email, name=name, role=role)
    db.add(user)
    db.flush()
    logger.info("seeded user %s (%s)", email, role)
    return user


def upsert_city(db: Session, name: str, admin_id: str) -> City:
    city = db.execute(select(City).where(City.name == name)).scalar_one_or_none()
    if city:
        return city
    city = City(name=name, country="Malaysia", region="Selangor", created_by_admin_id=admin_id)
    db.add(city)
    db.flush()
    logger.info("seeded city %s", name)
    return city


def upsert_template(db: Session, city_id: str, name: str, steps: list) -> WorkflowTemplate:
    tpl = db.execute(
        select(WorkflowTemplate).where(
            WorkflowTemplate.city_id == city_id, WorkflowTemplate.name == name
        )
    ).scalar_one_or_none()
    if tpl:
        tpl.steps = steps
        tpl.status = "published"
        db.flush()
        logger.info("refreshed template %s for city %s", name, city_id)
        return tpl
    tpl = WorkflowTemplate(
        city_id=city_id,
        name=name,
        version=1,
        steps=steps,
        status="published",
    )
    db.add(tpl)
    db.flush()
    logger.info("seeded template %s (%s steps)", name, len(steps))
    return tpl


def upsert_building(db: Session, owner_id: str, city_id: str, name: str) -> Building:
    b = db.execute(
        select(Building).where(Building.name == name, Building.owner_id == owner_id)
    ).scalar_one_or_none()
    if b:
        return b
    b = Building(
        owner_id=owner_id,
        city_id=city_id,
        name=name,
        address="12 Jalan Demo, Seksyen 7, 40000 Shah Alam",
        status="draft",
    )
    db.add(b)
    db.flush()
    logger.info("seeded building %s", name)
    return b


def run() -> None:
    create_all()
    (REPO_ROOT / "var" / "uploads").mkdir(parents=True, exist_ok=True)

    with SessionLocal() as db:
        admin = upsert_user(db, "admin@demo.local", "Demo Admin", "admin")
        owner = upsert_user(db, "owner@demo.local", "Demo Owner", "owner")
        shah_alam = upsert_city(db, "Shah Alam", admin.id)
        upsert_template(db, shah_alam.id, "Shah Alam — Standard", shah_alam_template_steps())
        upsert_building(db, owner.id, shah_alam.id, "Menara Demo")
        db.commit()
        logger.info("demo seed complete")


if __name__ == "__main__":
    run()
