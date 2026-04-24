"""Primitive registry.

The compiler imports ``REGISTRY`` to turn a template step's ``primitive``
string into a node factory. Primitive modules register themselves here
rather than being imported ad-hoc.
"""
from __future__ import annotations

from typing import Any, Callable

from ..state import RunState

PrimitiveFactory = Callable[[dict[str, Any]], Callable[[RunState], dict[str, Any]]]

REGISTRY: dict[str, PrimitiveFactory] = {}


def register(name: str) -> Callable[[PrimitiveFactory], PrimitiveFactory]:
    def _decorator(fn: PrimitiveFactory) -> PrimitiveFactory:
        REGISTRY[name] = fn
        return fn

    return _decorator


# Side-effect imports wire primitives into REGISTRY.
from . import collect_form  # noqa: E402,F401
from . import publish  # noqa: E402,F401
from . import upload_compliance  # noqa: E402,F401
from . import upload_content  # noqa: E402,F401
from . import cross_check  # noqa: E402,F401
from . import human_review  # noqa: E402,F401
