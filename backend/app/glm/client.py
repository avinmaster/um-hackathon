"""Thin wrapper around the OpenAI SDK pointed at ILMU (GLM).

All GLM traffic flows through this module. Every call is observable via
``decision_log`` callbacks so primitives can persist reasoning-by-step.
"""
from __future__ import annotations

import json
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable

from openai import APIStatusError, OpenAI, RateLimitError
from openai.types.chat import ChatCompletion

from ..config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass
class Decision:
    """One GLM interaction, persisted to ``step_runs.decision_log``."""

    call_id: str
    tool: str  # logical tool name, e.g. "verify_against_criteria"
    request: dict[str, Any]
    response: dict[str, Any]
    duration_ms: int
    ts: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return {
            "call_id": self.call_id,
            "tool": self.tool,
            "request": self.request,
            "response": self.response,
            "duration_ms": self.duration_ms,
            "ts": self.ts,
        }


DecisionSink = Callable[[Decision], None]


def _redact(messages: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Shrink big content blocks so the decision log stays readable."""
    out = []
    for m in messages:
        c = m.get("content")
        if isinstance(c, str) and len(c) > 4000:
            m = {**m, "content": c[:4000] + f"… [+{len(c)-4000} chars]"}
        elif isinstance(c, list):
            trimmed = []
            for part in c:
                if isinstance(part, dict) and part.get("type") == "image_url":
                    trimmed.append({"type": "image_url", "image_url": "…elided…"})
                else:
                    trimmed.append(part)
            m = {**m, "content": trimmed}
        out.append(m)
    return out


class GLMClient:
    """Wraps ``openai.OpenAI`` with retries, JSON mode, tool-calling, and logging.

    Use ``complete`` for free-form text, ``complete_json`` for strict JSON
    output, and ``call_tool`` for single-shot function invocations.
    """

    def __init__(self, settings: Settings | None = None, sink: DecisionSink | None = None) -> None:
        self.settings = settings or get_settings()
        self.sink = sink
        self._openai = OpenAI(
            api_key=self.settings.glm_api_key,
            base_url=self.settings.glm_base_url,
        )

    # -------- public helpers ----------------------------------------------

    def complete(
        self,
        *,
        messages: list[dict[str, Any]],
        tool: str = "complete",
        temperature: float = 0.2,
        max_tokens: int | None = None,
        reasoning_effort: str | None = None,
        stream: bool = False,
    ) -> ChatCompletion:
        return self._chat(
            tool=tool,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            reasoning_effort=reasoning_effort,
            stream=stream,
        )

    def complete_json(
        self,
        *,
        messages: list[dict[str, Any]],
        tool: str = "complete_json",
        schema_hint: str | None = None,
        temperature: float = 0.1,
        max_tokens: int | None = None,
        reasoning_effort: str | None = "low",
    ) -> dict[str, Any]:
        """Return a parsed JSON object. Enforces ``response_format=json_object``.

        If ``schema_hint`` is given, it is injected into the system prompt so
        the model knows the exact shape to produce.
        """
        payload_messages = list(messages)
        if schema_hint:
            payload_messages = [
                {
                    "role": "system",
                    "content": (
                        "Return ONLY JSON matching this shape. No prose, no markdown.\n"
                        f"{schema_hint}"
                    ),
                },
                *payload_messages,
            ]

        completion = self._chat(
            tool=tool,
            messages=payload_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            reasoning_effort=reasoning_effort,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content or "{}"
        raw = _strip_fences(raw)
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.warning("GLM returned invalid JSON: %s", e)
            return {"_error": "invalid_json", "_raw": raw[:2000]}

    def call_tool(
        self,
        *,
        messages: list[dict[str, Any]],
        tool_spec: dict[str, Any],
        temperature: float = 0.1,
        max_tokens: int | None = None,
        reasoning_effort: str | None = "low",
    ) -> dict[str, Any]:
        """Force the model to call ``tool_spec`` and return its parsed arguments.

        We use ``tool_choice`` to require the named tool; the JSON arguments
        are parsed and returned directly. Useful for structured extraction
        where the function-calling surface is cleaner than JSON mode.
        """
        fn_name = tool_spec["function"]["name"]
        completion = self._chat(
            tool=fn_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            reasoning_effort=reasoning_effort,
            tools=[tool_spec],
            tool_choice={"type": "function", "function": {"name": fn_name}},
        )
        msg = completion.choices[0].message
        if not msg.tool_calls:
            logger.warning("GLM did not invoke tool %s", fn_name)
            return {"_error": "no_tool_call", "_raw": msg.content or ""}
        args_raw = msg.tool_calls[0].function.arguments or "{}"
        try:
            return json.loads(args_raw)
        except json.JSONDecodeError as e:
            logger.warning("Tool args invalid JSON (%s): %s", fn_name, e)
            return {"_error": "invalid_json", "_raw": args_raw[:2000]}

    # -------- core ---------------------------------------------------------

    def _chat(
        self,
        *,
        tool: str,
        messages: list[dict[str, Any]],
        temperature: float,
        max_tokens: int | None,
        reasoning_effort: str | None = None,
        response_format: dict[str, Any] | None = None,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: Any = None,
        stream: bool = False,
        max_retries: int = 4,
    ) -> ChatCompletion:
        request_body: dict[str, Any] = {
            "model": self.settings.glm_model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            request_body["max_tokens"] = max_tokens
        if reasoning_effort:
            request_body["reasoning_effort"] = reasoning_effort
        if response_format:
            request_body["response_format"] = response_format
        if tools:
            request_body["tools"] = tools
        if tool_choice is not None:
            request_body["tool_choice"] = tool_choice
        if stream:
            request_body["stream"] = True

        last_exc: Exception | None = None
        for attempt in range(max_retries):
            t0 = time.monotonic()
            try:
                completion = self._openai.chat.completions.create(**request_body)
                duration_ms = int((time.monotonic() - t0) * 1000)
                if not stream:
                    self._emit(tool, request_body, completion, duration_ms)
                return completion  # type: ignore[return-value]
            except RateLimitError as e:
                last_exc = e
                wait = min(30.0, (2 ** attempt) + random.uniform(0, 0.5))
                logger.warning("GLM 429, retry %s in %.1fs", attempt + 1, wait)
                time.sleep(wait)
            except APIStatusError as e:
                if e.status_code >= 500 and attempt < max_retries - 1:
                    wait = min(30.0, (2 ** attempt) + random.uniform(0, 0.5))
                    logger.warning("GLM %s, retry %s in %.1fs", e.status_code, attempt + 1, wait)
                    time.sleep(wait)
                    last_exc = e
                    continue
                raise
        assert last_exc is not None
        raise last_exc

    def _emit(
        self,
        tool: str,
        request_body: dict[str, Any],
        completion: ChatCompletion,
        duration_ms: int,
    ) -> None:
        if not self.sink:
            return
        try:
            msg = completion.choices[0].message
            content = msg.content
            tool_calls = [
                {"name": tc.function.name, "arguments": tc.function.arguments}
                for tc in (msg.tool_calls or [])
            ]
            usage = completion.usage.model_dump() if completion.usage else None
        except Exception:
            content, tool_calls, usage = None, [], None

        self.sink(
            Decision(
                call_id=completion.id,
                tool=tool,
                request={
                    "model": request_body.get("model"),
                    "messages": _redact(request_body.get("messages", [])),
                    "temperature": request_body.get("temperature"),
                    "response_format": request_body.get("response_format"),
                    "tools": [t["function"]["name"] for t in request_body.get("tools") or []],
                },
                response={
                    "content": content,
                    "tool_calls": tool_calls,
                    "finish_reason": completion.choices[0].finish_reason,
                    "usage": usage,
                },
                duration_ms=duration_ms,
            )
        )


def _strip_fences(raw: str) -> str:
    import re

    return re.sub(r"^```(?:json)?\n|```$", "", raw.strip())


def get_client(sink: DecisionSink | None = None) -> GLMClient:
    return GLMClient(sink=sink)
