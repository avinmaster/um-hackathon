"""Visitor-facing read API — published buildings only."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.models import Building
from .deps import db_session
from .schemas import BuildingOut

router = APIRouter(prefix="/api/buildings", tags=["buildings"])


@router.get("", response_model=list[BuildingOut])
def list_published(db: Session = Depends(db_session)) -> list[Building]:
    return (
        db.execute(select(Building).where(Building.status == "published"))
        .scalars()
        .all()
    )


@router.get("/{building_id}", response_model=BuildingOut)
def get_building(building_id: str, db: Session = Depends(db_session)) -> Building:
    b = db.get(Building, building_id)
    if not b or b.status != "published":
        raise HTTPException(404, "building not found or not published")
    return b
