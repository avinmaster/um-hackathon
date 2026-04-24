"""Template JSON → LangGraph StateGraph.

The template is an ordered list of step configs. Each step becomes a
node named by its ``id``; default edges are linear A→B→…→END. A node
can short-circuit to END by setting ``awaiting_user=True`` — the
conditional ``_route_after_step`` function interprets that.

Primitives can optionally declare their own conditional edges by
returning extra routing metadata, but MVP relies on the standard
linear+pause model which covers every demo-scenario step.
"""
from __future__ import annotations

from typing import Any, Callable

from langgraph.graph import END, StateGraph

from .primitives import REGISTRY
from .state import RunState


def _route_after_step(state: RunState) -> str:
    """Route END when the graph is paused for the user.

    Set as the post-node conditional for every non-terminal step. The
    LangGraph runtime re-enters the graph (from checkpoint) when the
    user submits — ``pending_input`` is merged into the state and the
    same node runs again.
    """
    if state.get("awaiting_user"):
        return "__pause__"
    return "__continue__"


def compile_template(
    steps: list[dict[str, Any]],
    *,
    checkpointer=None,
) -> Callable[..., Any]:
    """Return a compiled LangGraph ``app`` with a node per step.

    ``checkpointer`` should be an instance of one of LangGraph's
    checkpointers. Pass ``None`` for pure functional tests.
    """
    if not steps:
        raise ValueError("template must have at least one step")

    graph: StateGraph = StateGraph(RunState)

    for step in steps:
        primitive = step["primitive"]
        if primitive not in REGISTRY:
            raise ValueError(f"unknown primitive: {primitive}")
        node_fn = REGISTRY[primitive](step)
        graph.add_node(step["id"], node_fn)

    # Linear routing with pause short-circuit between every pair of steps.
    for i, step in enumerate(steps):
        is_last = i == len(steps) - 1
        next_target = END if is_last else steps[i + 1]["id"]
        graph.add_conditional_edges(
            step["id"],
            _route_after_step,
            {"__pause__": END, "__continue__": next_target},
        )

    graph.set_entry_point(steps[0]["id"])

    compile_kwargs: dict[str, Any] = {}
    if checkpointer is not None:
        compile_kwargs["checkpointer"] = checkpointer

    return graph.compile(**compile_kwargs)
