# Tasks

Build plan for Opus Magnum. Three execution waves plus a submission wave: Wave 0 sequential foundation, Wave 1 parallel features, Wave 2 polish, Wave 3 submission & demo.

Cross-refs: `implementation.md` §18 narrative build order, §6 data model, §7 primitives, §9 GLM tool contracts, §19 open questions.

**Status legend.** `Done` — shipped and merged · `In progress` — partially landed, see Working notes · `Skipped` — superseded by a Working-notes decision.

## Wave 0 — Foundation (sequential)

Each task freezes a contract downstream relies on. No parallelism.

### T1 — GLM integration & smoke tests · @oybek · Done

ILMU client wired against `ilmu-glm-5.1` over the OpenAI SDK; eight tool schemas + system prompts in place; smoke harness proves JSON mode and tool-use round-trip on the live key. Vision probe came back negative — OCR-only path baselined (see Working notes).

### T2 — Database, seed & dev rig · @oybek · Done

SQLAlchemy models for the seven tables in §6, a SQLite dev / Postgres prod split, a `seed_demo` for Shah Alam + Menara Demo, an in-place `reseed_demo` (replaces wiping the SQLite file), and a `justfile` covering dev / seed / test / smoke.

### T3 — LangGraph skeleton, end-to-end · @oybek · Done

`RunState`, the JSON → `StateGraph` compiler, the SQLite/Postgres checkpointer, and the full FastAPI surface (start / run / SSE stream / submit / upload / autofill / rewind / publish). Decision log persists per step. A trivial 2-primitive template runs end-to-end.

### T4 — Compliance upload + PDF pipeline · @oybek · Done

`pypdf` text extraction with chunking, a mime-dispatched processing pipeline, local-disk storage backend, and the `upload_compliance` primitive that calls `extract_document` → `verify_against_criteria` with a re-upload-on-fail conditional edge. Decision-log shape frozen here.

## Wave 1 — Features (parallel after Wave 0)

Dispatched as four independent worktrees, sharing typed API contracts only.

### T5 — Owner workflow UI · @oybek + @abdugaffor · Done

`/onboard/[buildingId]` and the surrounding shell. Custom-DAG workflow canvas with live status colours, dynamic step-form renderer (with index fallback when field name is missing), upload panel with per-file live cards (received → parsing → extracting → verifying → verdict), decision-log drawer per node, rewind controls. Frontend pairing across two days.

### T6 — Remaining primitives + profile builder · @oybek · Done

`upload_content`, `cross_check`, `human_review`, the `publish` writer, and the pure `build_profile` function that turns `RunState` into the building profile + `scene_config`. Shah Alam template runs both happy and unhappy paths (contradiction, verification fail, abandon-and-resume).

### T7 — Visitor 3D + grounded assistant · @oybek + @abdugaffor · Done

`/buildings/[id]` shows a react-three-fiber scene sized from `scene_config` (extruded footprint, per-floor slabs, unit boxes coloured by type). The assistant chat is a shadcn Sheet over an SSE endpoint that streams answers grounded in the profile + content-doc chunks via `answer_visitor_question`.

### T8 — Admin UI + template assistant · @oybek + @abdugaffor · Done

City + template management, drag-reorder step list, primitive-specific editors. Template assistant streams `draft_template` and `explain_field` answers. Prompt tightening pass mid-build to fix inline-code drift in the explainer (see Working notes).

## Wave 2 — Polish (parallel)

### T9 — OCR fallback · @oybek · Done

`pytesseract` OCR for scanned PDFs and image uploads, surfaced as the baseline path after T1's vision probe. Direct image submission to the model was left as future work — the model is text-only on our key.

### T10 — Tests · @alex (QA) + @oybek (fixtures) · Done

Unit coverage on schema, compiler, and profile builder. Decision-log snapshot assertions per primitive as a regression net against silent GLM behaviour drift. GLM eval fixtures for the three reasoning-heavy tools. The `AI_MODEL` switch lets us run integration tests against OpenAI offline; production stays pinned to GLM per the hard constraint.

### T11 — Submission documents · @oybek (content) + @abdugaffor (PDF render) · Done

PRD, SAD, TAD, QATD, and the pitch deck — all rendered to `docs/submit/*.pdf` through `docs/render_pdf.py` (markdown → print-styled HTML, then `chrome --headless --print-to-pdf`). Cover page is a separate full-bleed section per doc. README polished, pitch-video link slot reserved.

## Wave 3 — Submission & Demo (parallel)

### W12 — Deployment · @oybek · Done

Single Render Blueprint provisions backend + managed Postgres 16; frontend deploys to Vercel as a static Next.js app. First pass split deploy across Vercel + Render + Neon — consolidated to one Blueprint to reduce moving parts (see Working notes).

### W13 — Pitch deck · @samandar · Done

Slide narrative aligned with `idea-presentation.md` (problem → engine → demo → ask), reviewed against the judging weights (Product 30 / Architecture 20 / Code 25 / QA 10 / Pitch 15), rendered to `docs/submit/pitch-deck.pdf`.

### W14 — Pitch video · @gameel · In progress

≤ 10-minute prototype demonstration video. Demo script drafted from the prototype walkthrough; recording and editing in flight. Final cut and README link drop pending.

### W15 — Final QA pass · @alex · Done

End-to-end smoke (admin → owner → visitor on Shah Alam), decision-log snapshot review across the eight GLM tools, submission-PDF checklist (cover, page numbers, tables, fenced-code render).

## Working notes

Real observations from the build, in chronological order. Each cross-references a real commit in `git log --oneline`:

- **T1 / vision probe.** `ilmu-glm-5.1` returned text-only on image-attached prompts. Baseline path is OCR-only via `pytesseract`; vision-aware extraction left as future work and called out in `implementation.md` §19.
- **T1 / capability checks.** JSON mode and tool-use both passed first call. The eight tool schemas in `backend/app/glm/tools.py` are all reachable via `GLMClient.call_tool`.
- **T2 / migrations.** Dropped Alembic in favour of `create_all` / `drop_all`. Schema is small and reseeds are frequent — `reseed_demo` drops + recreates tables in place rather than wiping the SQLite file (commit *Add reseed script…*).
- **T3 / graph compile.** Each tick recompiles the `StateGraph` from JSON. Compile is cheap and avoids stale checkpointer references across requests.
- **T5 / build pipeline.** `pnpm-workspace.yaml` was pulled — the frontend was always a single package and the workspace config was breaking Render builds. Corepack's signing-key verify also broke the pipeline; the Render Blueprint installs `pnpm` directly.
- **T8 / prompt tightening.** Admin assistant prompts were rewritten to emit clean block markdown after the first review cycle showed inline-code drift in the explainer panel.
- **T10 / dual-route AI.** Added an `AI_MODEL` switch routing between GLM and OpenAI for offline test runs. Production stays pinned to GLM per the hard constraint in `CLAUDE.md`.
- **T11 / PDF rendering.** Submission PDFs render through `docs/render_pdf.py` followed by `chrome --headless --print-to-pdf`. Cover page is a separate full-bleed section per doc.
- **W12 / single-blueprint deploy.** First pass split deploy across Vercel + Render + Neon; collapsed to a single Render Blueprint to reduce moving parts.

## Shared demo assets

Invented in English, plausible for the pitch, committed under `backend/app/seed/demo_docs/`.

- Ownership deed (PDF) — pass
- Bomba fire-safety certificate — two versions: pass + fail (wrong address)
- MBSA zoning approval (PDF)
- Floor plan (PDF or PNG with OCR-readable labels)
- 2–3 building photos (JPG)

## Out of scope (flagged in PRD)

- Real auth — mocked session for the demo
- Payments / transactions
- Multi-tenant isolation / row-level security
- Production observability / alerting
- Second jurisdiction beyond Shah Alam (engine supports it by config; only one authored for submission)

## Defaults decided

- Dev DB: SQLite; demo DB: Postgres in `docker compose`
- Vision: confirmed unsupported on `ilmu-glm-5.1`; OCR-only path is the baseline
- One city authored at submission (Shah Alam); code stays config-driven so adding more is one JSON file
- Deploy: single Render Blueprint + Vercel frontend; Neon dropped after the consolidation

## Dispatch order

```
T1 → T2 → T3 → T4
                │
                ├── T5  ┐
                ├── T6  │   Wave 1 (parallel worktrees)
                ├── T7  │
                └── T8  ┘
                           │
                           ├── T9  ┐
                           ├── T10 │   Wave 2 (parallel)
                           └── T11 ┘
                                      │
                                      ├── W12 ┐
                                      ├── W13 │   Wave 3 (parallel)
                                      ├── W14 │
                                      └── W15 ┘
```
