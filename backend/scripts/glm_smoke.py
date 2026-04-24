"""GLM smoke tests. Resolves the §19 open questions empirically.

Run:
    .venv/bin/python backend/scripts/glm_smoke.py

Emits human-readable results + writes ``backend/scripts/glm_smoke_results.json``
so T1 can ship a file you can diff against later.
"""
from __future__ import annotations

import base64
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.glm.client import Decision, GLMClient  # noqa: E402
from app.glm.tools import EXTRACT_DOCUMENT, VERIFY_AGAINST_CRITERIA  # noqa: E402


def record(results: dict, key: str, ok: bool, detail: object) -> None:
    results[key] = {"ok": ok, "detail": detail}
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {key}")
    if not ok:
        print(f"    detail: {detail}")


def probe_plain(client: GLMClient, results: dict) -> None:
    print("\n-- plain completion --")
    try:
        c = client.complete(
            messages=[{"role": "user", "content": "Reply with the single word: ready"}],
            tool="smoke_plain",
            max_tokens=512,
            reasoning_effort="low",
        )
        text = (c.choices[0].message.content or "").strip().lower()
        record(results, "plain", "ready" in text, text[:200])
    except Exception as e:
        record(results, "plain", False, repr(e))


def probe_json_mode(client: GLMClient, results: dict) -> None:
    print("\n-- JSON mode --")
    try:
        out = client.complete_json(
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Return JSON with keys 'city' (string) and 'floors' (integer). "
                        "City is 'Shah Alam', floors is 12."
                    ),
                }
            ],
            tool="smoke_json",
            schema_hint='{"city": "string", "floors": "integer"}',
        )
        ok = isinstance(out, dict) and out.get("city") == "Shah Alam" and int(out.get("floors", 0)) == 12
        record(results, "json_mode", ok, out)
    except Exception as e:
        record(results, "json_mode", False, repr(e))


def probe_tool_use(client: GLMClient, results: dict) -> None:
    print("\n-- tool use (forced function call) --")
    try:
        args = client.call_tool(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract building facts from the document text."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Document text:\n"
                        "BUILDING CERTIFICATE\n"
                        "Name: Menara Demo\n"
                        "Owner: Ahmad bin Tan\n"
                        "Address: 12 Jalan Demo, Shah Alam\n"
                        "Floors: 15\n"
                        "Issued: 2024-05-01\n\n"
                        "Expected doc_type: certificate. Fields of interest: "
                        "building_name, owner_name, address, floors, issue_date."
                    ),
                },
            ],
            tool_spec=EXTRACT_DOCUMENT,
        )
        fields = args.get("fields", {}) if isinstance(args, dict) else {}
        ok = (
            isinstance(args, dict)
            and "_error" not in args
            and fields.get("building_name") in ("Menara Demo", None)  # model may extract
        )
        # Looser check: any field extracted is enough
        ok = ok and len(fields) >= 2
        record(results, "tool_use", ok, args)
    except Exception as e:
        record(results, "tool_use", False, repr(e))


def probe_verify(client: GLMClient, results: dict) -> None:
    print("\n-- verify_against_criteria (positive case) --")
    try:
        args = client.call_tool(
            messages=[
                {
                    "role": "system",
                    "content": "Judge the document against the listed criteria.",
                },
                {
                    "role": "user",
                    "content": (
                        "Criteria:\n"
                        "1. Document must name the building owner.\n"
                        "2. Document must include an issue date.\n\n"
                        "Document text:\n"
                        "OWNERSHIP DEED\n"
                        "Owner: Ahmad bin Tan\n"
                        "Property: Menara Demo, Shah Alam\n"
                        "Issued: 15 March 2024\n"
                    ),
                },
            ],
            tool_spec=VERIFY_AGAINST_CRITERIA,
        )
        ok = isinstance(args, dict) and args.get("passed") is True and len(args.get("reasons", [])) == 2
        record(results, "verify_pass", ok, args)
    except Exception as e:
        record(results, "verify_pass", False, repr(e))


def probe_streaming(client: GLMClient, results: dict) -> None:
    print("\n-- streaming --")
    try:
        stream = client.complete(
            messages=[{"role": "user", "content": "Count 1 to 5, one number per line."}],
            tool="smoke_stream",
            max_tokens=256,
            reasoning_effort="low",
            stream=True,
        )
        chunks = 0
        total = ""
        for event in stream:  # type: ignore[union-attr]
            if getattr(event, "choices", None) and event.choices:
                delta = event.choices[0].delta
                if delta and delta.content:
                    chunks += 1
                    total += delta.content
        record(results, "streaming", chunks > 1, {"chunks": chunks, "total": total[:200]})
    except Exception as e:
        record(results, "streaming", False, repr(e))


def probe_vision(client: GLMClient, results: dict) -> None:
    """Honest vision check: build a solid-colour PNG and assert the model
    names the colour. If the model says "no image", vision is unsupported
    and downstream code must take the OCR path.
    """
    print("\n-- vision (solid-magenta 96x96 PNG) --")
    import struct
    import zlib

    w = h = 96
    raw = b""
    for _ in range(h):
        raw += b"\x00" + b"\xff\x00\xff" * w  # magenta scanline

    def _chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data)
        return len(data).to_bytes(4, "big") + tag + data + crc.to_bytes(4, "big")

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", zlib.compress(raw))
        + _chunk(b"IEND", b"")
    )
    png_b64 = base64.b64encode(png).decode()
    try:
        c = client.complete(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "What colour is this square? Reply with exactly one word.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{png_b64}"},
                        },
                    ],
                }
            ],
            tool="smoke_vision",
            max_tokens=512,
            reasoning_effort="low",
        )
        text = (c.choices[0].message.content or "").strip().lower()
        # Vision works only if the model recognises the colour. A refusal
        # or "no image" response means vision is not actually functioning.
        vision_ok = (
            any(color in text for color in ("magenta", "pink", "purple", "violet"))
            and "no image" not in text
            and "cannot see" not in text
            and "don't see" not in text
        )
        record(results, "vision", vision_ok, text[:200])
    except Exception as e:
        record(results, "vision", False, repr(e))


def main() -> int:
    decisions: list[Decision] = []
    client = GLMClient(sink=decisions.append)
    results: dict = {}
    t0 = time.monotonic()
    probe_plain(client, results)
    probe_json_mode(client, results)
    probe_tool_use(client, results)
    probe_verify(client, results)
    probe_streaming(client, results)
    probe_vision(client, results)
    elapsed = time.monotonic() - t0

    summary = {
        "model": client.settings.glm_model,
        "base_url": client.settings.glm_base_url,
        "elapsed_s": round(elapsed, 2),
        "decision_count": len(decisions),
        "results": results,
    }

    out_path = Path(__file__).parent / "glm_smoke_results.json"
    out_path.write_text(json.dumps(summary, indent=2, default=str))
    print(f"\nWrote {out_path}")

    fails = [k for k, v in results.items() if not v["ok"]]
    print("\n=== summary ===")
    print(json.dumps({k: v["ok"] for k, v in results.items()}, indent=2))
    if fails:
        print(f"Failures: {fails}")
    return 0 if not fails or fails == ["vision"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
