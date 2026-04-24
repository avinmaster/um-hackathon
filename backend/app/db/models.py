"""SQLAlchemy models — the schema described in implementation.md §6.

Design rules:
- UUIDs stored as ``str`` so the same code works on SQLite and Postgres.
- JSON columns use ``sqlalchemy.JSON`` (maps to JSONB on Postgres, TEXT on SQLite).
- Enums stored as short strings — trivially extensible without migrations.
- Timestamps default to ``datetime.utcnow`` at row insert; ``updated_at`` is
  DB-side so concurrent writers agree.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


# ---------- users / tenants (minimal for demo) ----------------------------


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="owner")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


# ---------- cities & templates --------------------------------------------


class City(Base):
    __tablename__ = "cities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255))
    country: Mapped[str] = mapped_column(String(128), default="Malaysia")
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_by_admin_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    templates: Mapped[list["WorkflowTemplate"]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )


class WorkflowTemplate(Base):
    __tablename__ = "workflow_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    city_id: Mapped[str] = mapped_column(String(36), ForeignKey("cities.id"))
    name: Mapped[str] = mapped_column(String(255))
    version: Mapped[int] = mapped_column(default=1)
    steps: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    city: Mapped[City] = relationship(back_populates="templates")


# ---------- buildings & runs ----------------------------------------------


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    city_id: Mapped[str] = mapped_column(String(36), ForeignKey("cities.id"))
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    coordinates: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    profile: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    scene_config: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    published_at: Mapped[datetime | None] = mapped_column(nullable=True)


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    building_id: Mapped[str] = mapped_column(String(36), ForeignKey("buildings.id"))
    template_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_templates.id"))
    state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    current_step_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="running")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )


class StepRun(Base):
    __tablename__ = "step_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_runs.id"))
    step_id: Mapped[str] = mapped_column(String(128))
    primitive: Mapped[str] = mapped_column(String(64))
    input: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    output: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    decision_log: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)


# ---------- documents ------------------------------------------------------


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    building_id: Mapped[str] = mapped_column(String(36), ForeignKey("buildings.id"))
    step_run_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("step_runs.id"), nullable=True
    )
    doc_class: Mapped[str] = mapped_column(String(16))  # 'compliance' | 'content'
    doc_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    filename: Mapped[str] = mapped_column(String(512))
    file_url: Mapped[str] = mapped_column(String(1024))
    extracted: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    verification_result: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    processing_status: Mapped[str] = mapped_column(String(32), default="received")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


__all__ = [
    "User",
    "City",
    "WorkflowTemplate",
    "Building",
    "WorkflowRun",
    "StepRun",
    "Document",
]
