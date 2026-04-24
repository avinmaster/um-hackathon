"""Pydantic request/response DTOs shared by routers."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class CreateBuildingIn(BaseModel):
    name: str
    address: str | None = None
    city_id: str
    owner_id: str | None = None  # mocked auth → falls back to seeded owner


class BuildingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    address: str | None = None
    city_id: str
    owner_id: str
    status: str
    profile: dict[str, Any] | None = None
    scene_config: dict[str, Any] | None = None


class StartRunOut(BaseModel):
    run_id: str
    status: str
    current_step_id: str | None


class SubmitStepIn(BaseModel):
    input: dict[str, Any] = {}


class RunStateOut(BaseModel):
    run_id: str
    status: str
    current_step_id: str | None
    state: dict[str, Any]


class GraphOut(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    current: str | None


class CityIn(BaseModel):
    name: str
    country: str = "Malaysia"
    region: str | None = None


class CityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    country: str
    region: str | None = None


class TemplateIn(BaseModel):
    name: str


class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    city_id: str
    name: str
    version: int
    steps: list[dict[str, Any]]
    status: str


class TemplateUpdateIn(BaseModel):
    steps: list[dict[str, Any]]


class DraftTemplateIn(BaseModel):
    description: str


class AssistantMessage(BaseModel):
    role: str
    content: str


class AssistantIn(BaseModel):
    messages: list[AssistantMessage]
    building_id: str | None = None
    template_id: str | None = None
    step_id: str | None = None
