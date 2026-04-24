# UMHackathon — Adaptive Onboarding Workflow Platform

An AI-powered onboarding workflow engine. Buildings is the concrete domain we ship. The engine itself — multi-step, multi-modal, config-driven, AI-verified — is general and the same pattern applies to any regulated onboarding (suppliers, licenses, KYC).

## What the product is

Three roles, one engine, one knowledge base:

- **Admin** — authors per-city workflow templates in a UI. GLM helps them draft starter templates from a one-line description and explains what any given field or step is for. Templates live in Postgres, not in YAML files.
- **Building owner** — picks a city, runs that city's workflow, uploads two classes of documents (*compliance* for AI verification, *content* for the public listing), resolves any contradictions the AI surfaces, and publishes the building.
- **Visitor** — browses published buildings in a 3D scene and asks a grounded assistant questions answered from the owner's content documents.

GLM sits at the center of every reasoning step: document parsing, verification against plain-English criteria, cross-checking across documents, template drafting, and visitor Q&A. Remove GLM and all of these break. That's both the domain rule and our architectural invariant.

## Source-of-truth documents

- `implementation.md` — engineering plan (architecture, data model, primitives, APIs, build order). Single source of truth for code.
- `idea-presentation.md` — narrative brief for the pitch team (deck, demo script, tone).
- `docs/evaluation.md` — judging criteria with sub-weights.
- `docs/requirements.md` — submission rules.
- `idea.md` — original one-paragraph concept.
- `docs/Domain 1_AI Systems & Agentic Workflow Automation.pdf` — competition problem statement.

Reconcile all code and narrative changes with `implementation.md` first.

## Hard constraints

- **GLM (`ilmu-glm-5.1` via ILMU API) is mandatory.** Using any other reasoning model disqualifies the submission. Removing GLM must break the system end-to-end.
- **Deliverables must be PDFs** (not .md): PRD, SAD, TAD, Pitch Deck. Uploaded to GitHub.
- **Pitch video link goes in the first section of the README.**
- Judging weights: Product Thinking 30 / Architecture 20 / Code Quality 25 / QA 10 / Pitch 15.

## Stack (planned)

| Layer | Choice |
|---|---|
| LLM | ILMU `ilmu-glm-5.1` via OpenAI SDK |
| Orchestration | LangGraph with Postgres checkpointer |
| Template execution | JSON templates compiled to `StateGraph` at run start |
| Backend | FastAPI + Pydantic |
| DB | Postgres (prod) / SQLite (dev) |
| Docs | `pypdf` + `pytesseract` fallback for scans; vision if the model supports it |
| Frontend | Next.js App Router + TypeScript + Tailwind + shadcn/ui |
| Workflow viz | React Flow with custom step nodes |
| 3D | react-three-fiber + drei |
| Realtime | SSE |

Auth is mocked for the demo. Flag as future work in the PRD.

## Product shape (at a glance)

- A **workflow template** is an ordered list of primitives authored by an admin and stored as JSON in Postgres.
- The primitives are: `collect_form`, `upload_compliance`, `upload_content`, `cross_check`, `human_review`, `publish`. New cities combine the same primitives in new ways.
- A **template compiler** turns the JSON template into a LangGraph `StateGraph` when an owner starts a run.
- **Runs are checkpointed** per building — resumable, auditable.
- Documents are split into **compliance** (for verification, never shown publicly) and **content** (extracted into the building profile, used by the 3D assistant). Never conflate the two.
- The 3D scene is light: extruded boxes sized from the building's `scene_config`. The interesting surface is the grounded assistant.

## AI API reference (ILMU)

The ILMU API is OpenAI-compatible. Use the OpenAI SDK with `base_url` set.

- **Base URL:** `https://api.ilmu.ai/v1`
- **Auth:** `Authorization: Bearer $GLM_API_KEY` (env var: `GLM_API_KEY`; present in `.env`)
- **Model available on our key:** `ilmu-glm-5.1` — 200k token context, 16k max completion tokens.

Docs. The HTML site blocks direct scraping, but every page has a markdown mirror (append `.md` to the path). There's also a full-text concatenation useful for one-shot loading into context.

- Index of all docs: https://docs.ilmu.ai/llms.txt
- Full concatenated docs: https://docs.ilmu.ai/llms-full.txt
- OpenAPI spec: https://docs.ilmu.ai/specs/openapi.yaml

Pages we'll actually touch:

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

Notes from verification:
- The env var is `GLM_API_KEY` (named after the `ilmu-glm-5.1` family).
- `list models` on our key returns only `ilmu-glm-5.1`. `nemo-super` is subscription-gated.
- A chat completion smoke call against `ilmu-glm-5.1` succeeded; API is live for us.
- Confirm tool-use and JSON mode behavior on the first real integration — OpenAI-compatible APIs can vary by model.

## Conventions

- Workflow templates are DB rows authored in the admin UI. Do **not** reintroduce YAML rule files.
- Every GLM call writes to a per-step `decision_log`. Snapshot tests assert the log sequence.
- Prefer SSE over WebSockets for progress streams and assistant output.
- Team-facing docs (idea-presentation.md, PRD, pitch deck) must read as clean narrative. No `[improv: …]` tags, no meta-prompts.
- Keep compliance and content documents separate everywhere — in the template primitives, the DB, the API, and the UI.
- The 3D scene is a stack of extruded boxes sized from the building's profile. Do not chase photorealism.

## Open questions (resolve on first real integration)

- Does `ilmu-glm-5.1` support vision? If not, OCR everything before GLM sees it.
- Tool-use + JSON mode support on this model — confirm with a smoke call.
- Rate limits — check the rate-limits doc before load testing.
