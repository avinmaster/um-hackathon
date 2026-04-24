# Tasks

Build plan for Opus Magnum. Three waves: Wave 0 sequential (shared contracts), Wave 1 parallel features, Wave 2 parallel polish. Wave 1/2 tasks dispatch as independent agents in their own worktrees.

Cross-refs: `implementation.md` §18 narrative build order, §6 data model, §7 primitives, §9 GLM tool contracts, §19 open questions.

## Wave 0 — Foundation (sequential, one agent after another)

Each task freezes a contract downstream relies on. Do not parallelize.

### T1 — GLM client + tool schemas + smoke tests

**Deliverable:** GLM tools callable from Python; §19 open questions resolved with evidence.

- `backend/app/glm/client.py` — OpenAI SDK against `https://api.ilmu.ai/v1`, `ilmu-glm-5.1`, chat + streaming wrappers
- `backend/app/glm/tools.py` — function-calling schemas for all 7 tools in §9
- `backend/app/glm/prompts.py` — system prompts per tool
- Smoke scripts: plain completion, tool-use round-trip, JSON-mode output, vision probe
- `backend/tests/test_glm_smoke.py` — records which capabilities work
- Write results + fallback decisions (OCR-only if no vision, etc.) back into `implementation.md` §19

### T2 — DB models + migrations + seed + dev rig

**Deliverable:** `just seed` populates demo data on empty DB.

- `backend/app/db/models.py` — SQLAlchemy for all tables per §6
- Alembic init + first migration
- `docker-compose.yml` with Postgres service (dev); SQLite fallback for unit tests
- `backend/app/seed/seed_demo.py` — 1 admin, 1 owner, Shah Alam city, empty template, Menara Demo building
- `.env.example` with `GLM_API_KEY`, `GLM_BASE_URL`, `DATABASE_URL`, `STORAGE_*`
- `justfile` with `just backend-dev / frontend-dev / migrate / seed / test`

### T3 — LangGraph skeleton, end-to-end

**Deliverable:** trivial 2-primitive template runs via API. Primitive interface + `RunState` locked.

- `backend/app/workflow/state.py` — `RunState` TypedDict per §8
- `backend/app/workflow/compiler.py` — JSON steps → `StateGraph`
- `backend/app/workflow/checkpointer.py` — Postgres checkpointer wiring
- `backend/app/workflow/primitives/collect_form.py` + `publish.py` only
- `backend/app/api/onboard.py` — `POST /buildings`, `POST /:id/start`, `GET /:id/run`, `GET /:id/run/stream` (SSE), `POST /:id/run/steps/:stepId/submit`, `POST /:id/publish`
- Decision log writes to `step_runs.decision_log`
- `backend/tests/test_workflow_minimal.py` — end-to-end trivial template

### T4 — upload_compliance + PDF pipeline

**Deliverable:** upload → verify → pass/fail against real GLM. Decision-log shape frozen.

- `backend/app/processing/pdf.py` — `pypdf` text extraction + chunking
- `backend/app/processing/pipeline.py` — dispatch by mime type
- File upload endpoint + local disk storage backend (`STORAGE_BACKEND=local`)
- `backend/app/workflow/primitives/upload_compliance.py` — calls `extract_document` then `verify_against_criteria`
- Conditional edge: verification fail → re-upload loop, pass → next step
- `backend/tests/test_upload_compliance.py` — pass-doc and fail-doc fixtures, decision-log snapshot

## Wave 1 — Features (4 agents, parallel, after Wave 0)

Dispatch each in its own worktree. They share typed API contracts only.

### T5 — Owner frontend: workflow canvas + step panel

**Deliverable:** `/onboard/[buildingId]` drives Wave 0's minimal template UI-side.

- Next.js scaffold, Tailwind, shadcn init, `.mcp.json` with shadcn MCP server
- `app/page.tsx` landing, `app/dashboard/page.tsx`, `app/onboard/page.tsx`, `app/onboard/[buildingId]/page.tsx`
- `components/onboard/workflow-canvas/` — React Flow with custom nodes per primitive, live status colors (pending / running / awaiting / passed / failed)
- `components/onboard/step-form/` — dynamic form renderer from `collect_form` config
- `components/onboard/upload-panel/` — drop zone + per-file live card (received → parsing → extracting → verifying → verdict)
- `lib/api.ts`, `lib/sse.ts`
- Decision-log drawer per step node

### T6 — Remaining primitives + profile builder

**Deliverable:** full 7-step Shah Alam template runs happy + unhappy paths.

- `upload_content.py` — extracts facts via `extract_document`, appends to `profile_draft`
- `cross_check.py` — `cross_check_documents` over referenced step outputs, pause on contradictions
- `human_review.py` — `summarize_for_review`, interrupt/resume with edits
- `backend/app/profile/builder.py` — profile + `scene_config` (floors, footprint, unit_count)
- Shah Alam demo template JSON loaded in seed
- Graph tests: happy path, contradiction path, verification-fail path, resumable-abandon path

### T7 — Visitor 3D + assistant

**Deliverable:** `/buildings/[id]` shows a 3D building and answers grounded questions.

- `app/buildings/page.tsx` — shadcn card grid directory
- `app/buildings/[id]/page.tsx` — react-three-fiber canvas, extruded footprint sized from `scene_config`, per-floor slabs, unit boxes colored by type
- drei orbit controls + grounding plane + ambient lighting
- `components/building/assistant-chat/` — shadcn Sheet with SSE stream
- `backend/app/api/assistant.py` — SSE endpoint wired to `answer_visitor_question` over profile + content-doc chunks
- Suggested-prompts chips

### T8 — Admin UI + template assistant

**Deliverable:** admin drafts and publishes a city template in the UI.

- `app/admin/page.tsx`, `app/admin/cities/page.tsx`, `app/admin/cities/[id]/page.tsx`
- `components/admin/template-editor/` — drag-reorder step list, primitive-specific editor (fields, criteria, compare list)
- `components/admin/template-assistant/` — chat panel calling `draft_template` + `explain_field` (SSE)
- `backend/app/api/admin.py` — CRUD + `POST /templates/:id/draft-with-ai`, `POST /templates/:id/assistant` (SSE), `POST /templates/:id/publish`

## Wave 2 — Polish (parallel)

### T9 — OCR + vision fallback

**Deliverable:** scanned PDFs and images parse correctly.

- `backend/app/processing/image.py` — `pytesseract` OCR
- If vision confirmed in T1: direct image submission path; else OCR-only, flagged in decision log
- Fixture tests on scanned cert + floor-plan image

### T10 — Tests

**Deliverable:** green suite; decision-log snapshots as drift net.

- Unit: template schema validation, compiler output shape, profile builder
- GLM eval fixtures: 10 labeled `extract_document`, 10 labeled `verify_against_criteria`, 5 `draft_template` prompts
- API integration (httpx): full demo scenario happy path
- Playwright smoke: admin → owner → visitor
- Decision-log snapshot assertions per primitive

### T11 — Deliverables (PRD, SAD, TAD, Pitch Deck, README polish)

**Deliverable:** four PDFs in `docs/`; README ready for pitch-video link + team names.

- `docs/prd.md` → `docs/prd.pdf` (product thinking, user stories, scope + mocked-auth flag)
- `docs/sad.md` → `docs/sad.pdf` (arch diagrams from §3, component boundaries, data flows)
- `docs/tad.md` → `docs/tad.pdf` (stack decisions, ILMU integration, trade-offs)
- `docs/pitch-deck.md` → `docs/pitch-deck.pdf` (8–12 slides per `idea-presentation.md`)
- Render via `pandoc` or `weasyprint`
- Update README with demo gif

## Shared demo assets

Invented in English, plausible for the pitch, committed under `backend/app/seed/demo_docs/`.

- Ownership deed (PDF) — pass
- Bomba fire-safety certificate (PDF) — two versions: pass + fail (wrong address)
- MBSA zoning approval (PDF)
- Floor plan (PDF or PNG with OCR-readable labels)
- 2–3 building photos (JPG)

## Out of scope (flag explicitly in PRD)

- Real auth — mocked session for the demo
- Payments / transactions
- Multi-tenant isolation / row-level security
- Production observability / alerting
- Second jurisdiction beyond Shah Alam (engine supports it by config; only one authored for submission)

## Defaults decided (no need to confirm)

- Dev DB: SQLite; demo DB: Postgres in `docker compose`
- Vision: assume unsupported until T1 proves otherwise; OCR-only path is the baseline
- One city authored at submission (Shah Alam); code stays config-driven so adding more is one JSON file
- Deploy: user handles (Vercel + Neon + Koyeb free tiers viable); repo stays deploy-target-agnostic

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
```
