"""Smoke test wrapping the live GLM probes into pytest.

The actual probing logic lives in ``scripts/glm_smoke.py`` so it can be run
standalone. This test gates the suite on the results file the script writes.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
RESULTS = BACKEND / "scripts" / "glm_smoke_results.json"


@pytest.mark.skipif(
    not os.environ.get("GLM_API_KEY") and not (BACKEND.parent / ".env").exists(),
    reason="GLM_API_KEY not available",
)
def test_glm_smoke_runs_and_plain_works() -> None:
    """Run the smoke script once; assert plain completion + JSON mode + tools work.

    Vision is allowed to fail — we document whichever state the model is in.
    """
    subprocess.run(
        [sys.executable, str(BACKEND / "scripts" / "glm_smoke.py")],
        check=True,
        cwd=BACKEND.parent,
    )
    data = json.loads(RESULTS.read_text())
    required = ["plain", "json_mode", "tool_use", "verify_pass", "streaming"]
    for k in required:
        assert data["results"][k]["ok"], f"{k} failed: {data['results'][k]['detail']}"
