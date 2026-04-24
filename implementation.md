# Implementation Plan

Technical source of truth for the platform. Covers the system, the workflow engine, the data model, the AI integration, and the three user surfaces.

## 1. What we are building

A platform that turns painful, fragmented **building onboarding** into a guided AI workflow. Three roles, one engine, one knowledge base.

- **Admin** configures, per city, the onboarding workflow template — which forms, which documents, which verifications. GLM helps them author and refine templates.
- **Building owner** picks their city, runs that city's workflow, uploads documents (two classes: *compliance* for verification, *content* for the public listing), gets verified, and publishes the building.
- **Visitor** browses published buildings in a 3D view and talks to an assistant grounded in the owner's content documents.

Under the hood, the platform is an **adaptive multi-modal verification workflow engine**. Buildings are today's concrete case; the same engine pattern applies to any regulated onboarding (suppliers, licenses, KYC). Keep the codebase honest about that: buildings are a domain, the engine is not.

**Litmus test to protect throughout the build:** remove GLM and the following all break — document parsing, cross-document verification, template drafting for admins, and the visitor-side assistant. Manual form-filling UI keeps working; everything that matters doesn't.

## 2. Three roles and their surfaces

| Role | Surface | What they do |
|---|---|---|
| Admin | `/admin/*` | Create cities, author workflow templates with AI help, review AI's draft suggestions, publish templates for owners to use |
| Building owner | `/onboard/*`, `/dashboard` | Create a building, pick its city, run the workflow step-by-step, upload docs, get verified, publish |
| Visitor | `/buildings`, `/buildings/[id]` | Browse published buildings, explore a building in 3D, ask the grounded assistant anything |

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js, TS)                        │
│                                                                     │
│  Admin UI             Owner UI                Visitor UI            │
│  /admin/cities        /onboard/[id]           /buildings            │
│  - template builder   - workflow canvas       /buildings/[id]       │
│  - template assistant   (React Flow)          - 3D scene            │
│                       - per-step forms        - grounded assistant  │
│                       - upload panel                                │
└─────────┬─────────────────────┬─────────────────────┬───────────────┘
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI, Python)                        │
│                                                                     │
│  /api/admin/*       /api/onboard/*         /api/buildings/*         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              GLM Reasoning Core (ILMU API)                   │   │
│  │   OpenAI SDK → https://api.ilmu.ai/v1  (ilmu-glm-5.1)        │   │
│  │                                                              │   │
│  │   Tools exposed to GLM:                                      │   │
│  │    draft_template, explain_field, extract_document,          │   │
│  │    verify_against_criteria, cross_check_documents,           │   │
│  │    summarize_for_review, answer_visitor_question             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────┐     ┌─────────────────────────────┐    │
│  │   LangGraph Runtime     │◄───►│    Template Compiler        │    │
│  │   StateGraph per run,   │     │    template (JSON in DB)    │    │
│  │   Postgres checkpointer │     │    → StateGraph             │    │
│  └─────────────────────────┘     └─────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────┐     ┌─────────────────────────────┐    │
│  │   Doc Processing Hub    │     │    Building Profile Builder │    │
│  │   pdf → text (pypdf)    │     │    Aggregates extracted     │    │
│  │   image → text/caption  │     │    content-doc facts into   │    │
│  │   (OCR + GLM vision     │     │    a structured profile     │    │
│  │    fallback)            │     │    used by 3D + assistant   │    │
│  └─────────────────────────┘     └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
   Postgres (cities, templates, buildings, runs, docs, profiles, users)
   Object store (uploaded files — S3 in prod, local in dev)
```

## 4. Stack

| Layer | Choice | Reason |
|---|---|---|
| LLM | ILMU `ilmu-glm-5.1` via OpenAI SDK | Mandatory GLM; OpenAI-compatible endpoint |
| Orchestration | LangGraph (Python) | Stateful graphs, checkpointing, human-in-loop, native to "multi-step AI workflow" |
| Backend | FastAPI + Pydantic | Typed tool/API schemas, easy SSE |
| DB | Postgres (prod) / SQLite (dev fallback) | JSONB for templates and run state; first-class LangGraph checkpointer |
| Auth | Mock session for MVP; drop-in JWT later | Out of scope for MVP; flag in PRD |
| PDF | `pypdf` (+ `pytesseract` fallback for scans) | Extract text for GLM reasoning |
| Image | GLM vision if available; OCR fallback | Floor plans, certs, photos — needed to parse |
| Frontend | Next.js App Router + TypeScript + Tailwind + shadcn/ui | Team-familiar; fast |
| Workflow viz | React Flow + custom nodes | Branded per-step blocks with live status |
| 3D | react-three-fiber + drei | Simple extruded-box building with per-floor unit boxes |
| Realtime | SSE | Enough for workflow progress + assistant streaming |
| Storage | S3 (prod) / local dir (dev) | Uploaded docs |

### 4.1 shadcn scope

shadcn/ui covers the standard surfaces — forms, dialogs, tabs, sheets, toasts, tables, directory cards, chat shells. The React Flow workflow canvas (custom step nodes) and the react-three-fiber 3D scene are bespoke; shadcn is a Tailwind/a11y foundation there, not a component library. Add the `shadcn` MCP server to `.mcp.json` so frontend work can scaffold primitives directly instead of hand-writing them.

## 5. Repository layout

```
um-hackathon/
├── backend/
│   ├── app/
│   │   ├── main.py                       # FastAPI entry
│   │   ├── api/
│   │   │   ├── admin.py                  # cities, templates, template assistant
│   │   │   ├── onboard.py                # buildings, runs, uploads, steps
│   │   │   ├── buildings.py              # visitor-facing read API
│   │   │   └── assistant.py              # visitor assistant (SSE)
│   │   ├── glm/
│   │   │   ├── client.py                 # OpenAI SDK → ILMU
│   │   │   ├── tools.py                  # tool schemas (function-calling)
│   │   │   └── prompts.py                # system prompts per use case
│   │   ├── workflow/
│   │   │   ├── state.py                  # RunState (TypedDict / Pydantic)
│   │   │   ├── compiler.py               # template JSON → StateGraph
│   │   │   ├── primitives/
│   │   │   │   ├── collect_form.py
│   │   │   │   ├── upload_compliance.py
│   │   │   │   ├── upload_content.py
│   │   │   │   ├── cross_check.py
│   │   │   │   ├── human_review.py
│   │   │   │   └── publish.py
│   │   │   └── checkpointer.py           # Postgres checkpointer wiring
│   │   ├── processing/
│   │   │   ├── pdf.py                    # pdf → text
│   │   │   ├── image.py                  # image → text (OCR + vision)
│   │   │   └── pipeline.py               # dispatch by mime type
│   │   ├── profile/
│   │   │   └── builder.py                # content-doc extracts → building profile
│   │   ├── db/
│   │   │   ├── models.py                 # SQLAlchemy
│   │   │   └── migrations/
│   │   └── seed/
│   │       └── seed_demo.py              # demo admin + city + template
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── page.tsx                      # landing (brief, explains platform)
│   │   ├── admin/
│   │   │   ├── page.tsx                  # admin dashboard
│   │   │   ├── cities/page.tsx
│   │   │   └── cities/[id]/page.tsx      # city + template editor
│   │   ├── onboard/
│   │   │   ├── page.tsx                  # new building + city picker
│   │   │   └── [buildingId]/page.tsx     # workflow canvas + step panel
│   │   ├── dashboard/page.tsx            # owner's buildings
│   │   ├── buildings/page.tsx            # public directory
│   │   └── buildings/[id]/page.tsx       # 3D + assistant
│   ├── components/
│   │   ├── admin/template-editor/
│   │   ├── admin/template-assistant/     # chat for authoring
│   │   ├── onboard/workflow-canvas/      # React Flow + custom step nodes
│   │   ├── onboard/step-form/            # dynamic per-primitive UI
│   │   ├── onboard/upload-panel/         # shows live per-doc AI processing
│   │   ├── building/scene-3d/            # react-three-fiber
│   │   ├── building/assistant-chat/
│   │   └── ui/                           # shadcn primitives
│   └── lib/
│       ├── api.ts
│       └── sse.ts
└── docs/
```

## 6. Data model

Postgres, authoritative. JSONB where the shape is domain-specific and evolves.

```
users
  id (uuid), email, name, role ENUM('admin','owner','visitor'),
  created_at

cities
  id, name, country, region,
  created_by_admin_id → users,
  created_at

workflow_templates
  id, city_id → cities, name, version INT,
  steps JSONB,              -- ordered list of step configs
  status ENUM('draft','published'),
  created_at, updated_at

buildings
  id, owner_id → users, city_id → cities,
  name, address, coordinates JSONB,
  status ENUM('draft','onboarding','verified','published','rejected'),
  profile JSONB,            -- compiled from content docs
  scene_config JSONB,       -- { floors, unit_count, footprint } for 3D
  created_at, published_at

workflow_runs
  id, building_id → buildings, template_id → workflow_templates,
  state JSONB,              -- RunState snapshot (also in LangGraph checkpointer)
  current_step_id TEXT,
  status ENUM('running','awaiting_user','completed','failed'),
  created_at, updated_at

step_runs
  id, run_id → workflow_runs, step_id TEXT, primitive TEXT,
  input JSONB, output JSONB,
  decision_log JSONB,       -- every GLM call + reasoning for audit
  status ENUM('pending','running','awaiting_user','passed','failed'),
  started_at, completed_at

documents
  id, building_id → buildings, step_run_id → step_runs,
  class ENUM('compliance','content'),
  type TEXT,                -- e.g. 'fire_safety_cert', 'floor_plan', 'photo'
  mime_type TEXT, file_url TEXT,
  extracted JSONB,          -- structured fields pulled by GLM
  verification_result JSONB,-- {passed: bool, reasons: [...]} for compliance docs
  created_at
```

## 7. Workflow primitive types

A workflow template is an ordered list of steps. Each step has a `primitive` type and a `config` object. These primitives are the whole vocabulary — new templates combine them in new ways.

| Primitive | Purpose | Admin configures | Runtime behavior | GLM's role |
|---|---|---|---|---|
| `collect_form` | Structured input from owner | Fields (label, type, required, hints) | Renders form; validates types | Optional: explains fields, spots obvious mistakes |
| `upload_compliance` | Owner uploads proof docs for verification | Accepted doc types, required criteria (plain-English) | Accepts files, runs processing, calls verification | Reads each doc, judges it against criteria, returns pass/fail + reasoning |
| `upload_content` | Owner uploads info docs for the public listing | Expected content types (floor plans, amenities, photos) | Accepts files, runs processing, extracts facts | Extracts building-facts per doc, contributes to building profile |
| `cross_check` | Reconcile info across steps | Which earlier steps to compare | Pulls outputs from referenced steps | Detects contradictions, explains them; can pause for owner clarification |
| `human_review` | Owner confirms an AI summary before advancing | Summary template / what to include | Shows AI-generated summary, allows edits | Produces the summary; re-generates after edits |
| `publish` | Terminal step | — | Flips building → `published`, snapshots profile | — |

Templates are not limited in length. A simple city template might be: `collect_form` → `upload_compliance` → `upload_content` → `cross_check` → `human_review` → `publish`. A stricter jurisdiction might add multiple `upload_compliance` steps (fire, zoning, ownership) with a `cross_check` between them.

**Step config is JSON, stored in `workflow_templates.steps`.** Example:

```json
[
  {
    "id": "basics",
    "primitive": "collect_form",
    "title": "Building basics",
    "fields": [
      { "name": "name", "label": "Building name", "type": "text", "required": true },
      { "name": "floors", "label": "Number of floors", "type": "number", "required": true },
      { "name": "year_built", "label": "Year built", "type": "number", "required": false }
    ]
  },
  {
    "id": "ownership",
    "primitive": "upload_compliance",
    "title": "Ownership proof",
    "accepts": ["pdf", "image"],
    "criteria": [
      "Document must name the building owner.",
      "Owner name must match the logged-in user.",
      "Document must be dated within the last 24 months."
    ],
    "max_files": 2
  },
  {
    "id": "fire_safety",
    "primitive": "upload_compliance",
    "title": "Fire safety approval",
    "accepts": ["pdf"],
    "criteria": [
      "Must be issued by the local fire department.",
      "Must reference the building's address.",
      "Must be valid at date of submission."
    ],
    "max_files": 1
  },
  {
    "id": "layout_and_content",
    "primitive": "upload_content",
    "title": "Floor plans, amenities, photos",
    "accepts": ["pdf", "image"],
    "extracts": ["floor_layout", "unit_list", "amenities", "photo_captions"]
  },
  {
    "id": "reconcile",
    "primitive": "cross_check",
    "title": "Consistency check",
    "compare": ["basics", "ownership", "fire_safety", "layout_and_content"]
  },
  {
    "id": "review",
    "primitive": "human_review",
    "title": "Review and confirm",
    "summary_includes": ["basics", "verification_results", "profile_preview"]
  },
  {
    "id": "done",
    "primitive": "publish"
  }
]
```

## 8. Template → StateGraph compilation

`workflow/compiler.py` turns a template's `steps` JSON into a concrete LangGraph `StateGraph` at run start:

```python
def compile_template(steps: list[dict]) -> StateGraph:
    g = StateGraph(RunState)
    for step in steps:
        node_fn = PRIMITIVES[step["primitive"]](step)
        g.add_node(step["id"], node_fn)
    # Linear edges by default; conditional routing added on ambiguity
    for a, b in zip(steps, steps[1:]):
        g.add_edge(a["id"], b["id"])
    g.set_entry_point(steps[0]["id"])
    g.add_edge(steps[-1]["id"], END)
    return g.compile(checkpointer=postgres_checkpointer())
```

Non-linear routing (e.g., `upload_compliance` can loop back if verification fails) is added by the primitive itself using conditional edges. The compiler stays small; primitives own their own edges to themselves and to the next step.

RunState (shared across all primitives):

```python
class RunState(TypedDict):
    run_id: str
    building_id: str
    city_id: str
    template_id: str
    step_outputs: dict[str, Any]        # keyed by step_id
    uploaded_docs: list[UploadedDoc]
    verification_results: list[VerificationResult]
    profile_draft: dict                 # accumulated by upload_content / cross_check
    awaiting_user: bool
    user_prompt: str | None
    decision_log: list[Decision]
```

## 9. GLM tool contracts

Defined in `glm/tools.py`, reused across primitives and admin flows. All use OpenAI function-calling schemas.

| Tool | Used by | Inputs | Output |
|---|---|---|---|
| `draft_template` | Admin UI | City name, admin's short description of requirements | Proposed `steps` JSON |
| `explain_field` | Admin UI | A single step or field spec | Plain-English explanation + suggestions |
| `extract_document` | `upload_compliance`, `upload_content` | doc text, expected type, fields of interest | Structured JSON of extracted fields |
| `verify_against_criteria` | `upload_compliance` | extracted fields, raw text, criteria list | `{passed: bool, reasons: [{criterion, verdict, evidence}]}` |
| `cross_check_documents` | `cross_check` | outputs of multiple earlier steps | list of contradictions (possibly empty), each with evidence |
| `summarize_for_review` | `human_review` | selected step outputs | Human-readable summary |
| `answer_visitor_question` | Visitor assistant | building profile, content-doc chunks, question | Grounded answer citing the source |

Structured outputs are enforced via JSON mode for tools where the schema is strict.

## 10. Multi-modal processing pipelines

Separating *processing* (file → text/features) from *reasoning* (GLM over the extracted content) keeps each doc type cheap and visible in the UI.

| Input type | Pipeline | Latency hint |
|---|---|---|
| PDF (text layer) | `pypdf.extract_text` → chunks | < 1 s |
| PDF (scanned) | `pypdf` (empty) fallback → `pytesseract` OCR → chunks | 2–5 s |
| Image (cert, photo, floor plan) | If GLM vision available: direct. Else: `pytesseract` for text + image caption stub → combined text | 2–5 s |

Each uploaded doc shows a live card in the UI: *received → parsing → extracting → verifying → verdict.* This is the demo's "different AI processing" beat and must be visible.

If `ilmu-glm-5.1` turns out to be text-only (confirm on first smoke call), vision degrades to OCR + text-based reasoning. Acceptable for MVP.

## 11. API surface

### Admin

```
POST  /api/admin/cities                         { name, country, region }
GET   /api/admin/cities

POST  /api/admin/cities/:cityId/templates       { name }
GET   /api/admin/templates/:id
PUT   /api/admin/templates/:id                  { steps }
POST  /api/admin/templates/:id/publish

POST  /api/admin/templates/:id/draft-with-ai    { description } → { steps }
POST  /api/admin/templates/:id/assistant        SSE; messages[] → grounded help
```

### Owner (onboarding)

```
POST  /api/onboard/buildings                    { name, address, city_id } → building
POST  /api/onboard/buildings/:id/start                                     → run_id
GET   /api/onboard/buildings/:id/run                                       → RunState
GET   /api/onboard/buildings/:id/run/stream     SSE (progress events)
GET   /api/onboard/buildings/:id/run/graph                                 → {nodes, edges, current}
POST  /api/onboard/buildings/:id/run/steps/:stepId/submit                  → multipart / JSON
POST  /api/onboard/buildings/:id/publish                                   → flips status
```

### Visitor

```
GET   /api/buildings                             → published buildings (list)
GET   /api/buildings/:id                         → profile + scene_config
POST  /api/buildings/:id/assistant               SSE; messages[] → grounded answer
```

## 12. Frontend surfaces

### 12.1 Admin — template editor (`/admin/cities/[id]`)

- Left: list of steps in the current template, drag to reorder, click to edit.
- Center: step editor — fields specific to the chosen primitive.
- Right: **template assistant** panel. Owner types *"This is Shah Alam, needs fire, zoning, and ownership."* GLM calls `draft_template` and inserts a proposed sequence. Admin tweaks fields. Assistant continues as a tutor: *"why do I need a cross-check step?"* → GLM answers.
- Top: *Publish* button (template becomes selectable by owners).

### 12.2 Owner — workflow canvas (`/onboard/[buildingId]`)

- Canvas: React Flow rendering the compiled graph. Each node = a step, styled per primitive (form icon vs upload icon vs review icon), with live status (pending / running / awaiting-user / passed / failed).
- Side panel: the current step's UI. If it's `collect_form`, a form. If it's `upload_compliance`, a drag-and-drop zone + live card per uploaded doc showing processing stages. If it's `human_review`, the AI summary with an edit button.
- Decision log: expandable per node, shows GLM's reasoning for that step.

### 12.3 Visitor — 3D building page (`/buildings/[id]`)

- 3D scene: extruded box sized from `scene_config` (floors, footprint); per-floor unit boxes colored by type/status. Simple, clean, clearly a building.
- Assistant chat panel (right). Suggested prompts: *"What's on floor 3?"*, *"How many units are vacant?"*, *"Are there any amenities?"* Answers cite which content doc or profile field they come from.

### 12.4 Directory (`/buildings`)

Simple grid of published building cards. Name, city, photo thumbnail, link. No marketplace, no transactions, no filters beyond city search.

### 12.5 Landing (`/`)

Short page explaining what the platform is + links to: admin (demo), onboard (demo as owner), directory. Minimal. The pitch surface.

## 13. Demo scenario

One end-to-end story that exercises every surface.

1. **Admin** opens `/admin/cities`, creates city *Shah Alam*.
2. Admin enters: *"Shah Alam requires MBSA zoning clearance, Bomba fire-safety approval, ownership proof, and standard floor plans + photos. Include cross-checks."* Clicks *Draft with AI*.
3. GLM proposes a 7-step template. Admin adjusts one field. Publishes.
4. Switch role → **Owner**. Opens `/onboard`, creates building *Menara Demo*, picks Shah Alam. Starts run.
5. Fills `basics` form. Uploads ownership PDF; watches the live card — parsed → fields extracted → verified. Uploads Bomba fire-safety cert — verification fails (wrong address, intentionally). GLM's plain-language rejection shown inline.
6. Owner uploads corrected Bomba cert. Passes. Uploads floor plans and two photos for the content step. Processing visible per file.
7. `cross_check` runs. A minor inconsistency detected and shown (floor count differs between form and floor plan). Owner confirms the plan is correct; form is updated; check passes.
8. `human_review` shows a full AI summary of the building profile. Owner confirms. Publish.
9. Switch role → **Visitor**. Open `/buildings`, click Menara Demo. 3D scene loads — the public payoff of the completed workflow.
10. Ask the assistant *"What's on floor 3?"* → grounded answer referencing the floor plan and the unit list.

The whole story is ≤ 3 minutes live, with every AI moment visible on screen.

## 14. Edge cases to cover

| Case | Where | Expected behavior |
|---|---|---|
| Unreadable scan | `upload_compliance` / `upload_content` | Clear error, re-upload prompt, no hidden retry |
| Wrong doc type | `upload_compliance` | GLM detects mismatch, asks for correct type |
| Verification fails a criterion | `upload_compliance` | Plain-language rejection with evidence; owner re-uploads; step loops |
| Contradiction across docs | `cross_check` | GLM surfaces contradiction with evidence; pause; owner edits form or re-uploads |
| Owner abandons mid-flow | checkpointer | RunState persists; resume from current step on return |
| Admin's draft template is nonsensical | `draft_template` | Still editable as normal; no failure state |
| Missing content doc at publish time | `human_review` | Summary shows gaps; owner cannot confirm without filling |
| Assistant asked something outside its knowledge | Visitor assistant | Declines + suggests what the building page does know |

## 15. Testing strategy

| Level | Tool | What we test |
|---|---|---|
| Unit | pytest | Template JSON schema validation, compiler output shape, profile builder |
| GLM eval | pytest + fixtures | `extract_document` on 10 labeled docs; `verify_against_criteria` on 10 labeled pass/fail pairs; `draft_template` on 5 admin prompts |
| Graph | pytest + in-memory checkpointer | Each demo-scenario step runs end-to-end against real GLM; decision-log snapshot per run |
| API | httpx | Start-run → submit-step × n → publish, per the demo scenario |
| Frontend smoke | Playwright | One script walks the demo path (admin, owner, visitor) |

Decision-log snapshots are the primary regression net against silent GLM drift.

## 16. AI API reference (ILMU)

All GLM calls go through the ILMU API, which is OpenAI-compatible. Use the OpenAI SDK with `base_url` set and the standard chat-completions surface works unchanged.

- **Base URL:** `https://api.ilmu.ai/v1`
- **Auth:** `Authorization: Bearer $GLM_API_KEY`
- **Model:** `ilmu-glm-5.1` — 200,000 token context, 16,000 max completion tokens.
- **SDK:** `OpenAI(api_key=..., base_url="https://api.ilmu.ai/v1")`. Chat completions, streaming, tool-use (function calling), and JSON mode all follow the OpenAI shape.

### Docs

The HTML docs site blocks direct scraping. Every page has a markdown mirror (append `.md` to the path), and there is a full-text concatenation suitable for loading into context in one request.

- Doc index: https://docs.ilmu.ai/llms.txt
- Full concatenated text: https://docs.ilmu.ai/llms-full.txt
- OpenAPI spec: https://docs.ilmu.ai/specs/openapi.yaml

### Pages we will actually use

| Topic | URL |
|---|---|
| Quickstart | https://docs.ilmu.ai/docs/getting-started/quickstart.md |
| Authentication | https://docs.ilmu.ai/docs/getting-started/authentication.md |
| OpenAI compatibility | https://docs.ilmu.ai/docs/developer-tools/openai-compatibility.md |
| Chat completions | https://docs.ilmu.ai/docs/api/chat-completions.md |
| Streaming (SSE) | https://docs.ilmu.ai/docs/api/streaming.md |
| Structured outputs (JSON mode) | https://docs.ilmu.ai/docs/api/structured-outputs.md |
| Tool use (function calling) | https://docs.ilmu.ai/docs/capabilities/tool-use.md |
| Context windows | https://docs.ilmu.ai/docs/capabilities/context-windows.md |
| Error handling + retry | https://docs.ilmu.ai/docs/platform/error-handling.md |
| Rate limits | https://docs.ilmu.ai/docs/platform/rate-limits.md |
| Error reference | https://docs.ilmu.ai/docs/reference/errors.md |
| Models overview | https://docs.ilmu.ai/docs/models/overview.md |

### Verification notes

- The env var is `GLM_API_KEY` (named after the `ilmu-glm-5.1` family).
- `list models` on our key returns only `ilmu-glm-5.1`. Other models (e.g. `nemo-super`) are subscription-gated.
- A smoke chat-completion against `ilmu-glm-5.1` returned a valid response — API is live for us.
- Tool-use and JSON mode should be confirmed on first real integration. OpenAI-compatible endpoints can differ per model; do not assume parity without verifying.

## 17. Environment

```
GLM_API_KEY=...
GLM_BASE_URL=https://api.ilmu.ai/v1
GLM_MODEL=ilmu-glm-5.1

DATABASE_URL=postgresql://...
STORAGE_BACKEND=local|s3
STORAGE_PATH=./var/uploads
```

Dev commands (`justfile`):

```
just backend-dev       # uvicorn with reload
just frontend-dev      # next dev
just migrate           # alembic upgrade
just seed              # one admin, one city, one template, one demo owner
just test              # pytest + playwright smoke
```

## 18. Build order

1. GLM client + tool schemas + smoke test (classify-fit + extract-pdf).
2. DB models + migrations + seed (admin, city, owner, empty template).
3. LangGraph scaffold + RunState + compiler with `collect_form` + `publish` only; run end-to-end.
4. `upload_compliance` with PDF-only processing + real `verify_against_criteria`.
5. Owner frontend: workflow canvas + step panel + upload panel with live processing cards.
6. `upload_content` + building profile builder + `cross_check` + `human_review`.
7. Visitor 3D scene + assistant; wire assistant to `answer_visitor_question` over profile.
8. Admin UI: city list, template editor, `draft_with_ai`, template assistant.
9. Image processing + OCR fallback + vision if ILMU supports it.
10. Polish, decision-log UI, README with demo video link, PRD/SAD/TAD drafts.

## 19. Open questions — resolved 2026-04-24

Smoke-tested via `backend/scripts/glm_smoke.py` against our live `ilmu-glm-5.1` key. Full log: `backend/scripts/glm_smoke_results.json`.

- **Tool use (function calling): supported.** `tools` + `tool_choice={"type":"function","function":{"name":...}}` returns valid structured arguments. `verify_against_criteria` probe produced correct per-criterion verdicts with evidence.
- **JSON mode: supported.** `response_format={"type":"json_object"}` returns strict JSON. `json_schema` mode is also advertised but `json_object` is what we rely on; we inject a schema-hint system message for shape control.
- **Streaming: supported.** Standard OpenAI SSE; chunks assemble cleanly. Do not emit a decision-log entry until after the stream is consumed.
- **`reasoning_effort`: supported.** Values: `low` / `medium` / `high`. GLM 5.1 is a thinking model — tiny `max_tokens` ceilings get eaten by the reasoning phase and yield empty `content`. Default in our client: `reasoning_effort="low"` on JSON-mode and tool-call paths, no override on free-form chat. Always budget ≥ 256 `max_tokens` on text responses.
- **Vision: NOT supported on `ilmu-glm-5.1`.** The multimodal OpenAI content schema is accepted (no error) but the model consistently replies "No image provided" / "I cannot see any image" / "unknown" regardless of the attached PNG. Image documents therefore go through OCR (`pytesseract`) before GLM sees them — this is the baseline for T4 and T9. Confirm again when/if ILMU adds a vision-capable model to our key.
- **Embeddings: not needed for MVP.** The visitor assistant grounds on the structured building profile + raw content-doc chunks passed in-context. 200k context is large enough for any single building. Upgrade to embeddings only if per-building content breaks the budget.
- **Auth: mocked session for MVP.** Flagged in the PRD as future work.
