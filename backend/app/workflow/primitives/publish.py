"""``publish`` primitive: terminal step.

Flips ``published=True`` and writes a summary output. The API layer is
responsible for reading this and updating ``Building.status='published'``
in the relational DB when the graph completes.
"""
from __future__ import annotations

from typing import Any, Callable

from ..state import RunState
from . import register


@register("publish")
def publish_factory(step: dict[str, Any]) -> Callable[[RunState], dict[str, Any]]:
    step_id = step["id"]

    def node(state: RunState) -> dict[str, Any]:
        return {
            "published": True,
            "step_outputs": {step_id: {"published": True}},
            "awaiting_user": False,
            "awaiting_step_id": None,
        }

    return node
