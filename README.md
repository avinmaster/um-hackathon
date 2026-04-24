# Opus Magnum

> AI-driven building onboarding platform. GLM reasons. Humans review. Cities scale by config.

**Pitch video:** _[paste link here before submission]_

Submission for **UMHackathon 2026 — Domain 1: AI Systems & Agentic Workflow Automation**.

## What it does

Three roles, one engine, one knowledge base:

- **Admin** — authors city-specific onboarding templates in a UI. GLM drafts starter templates from a one-line description and explains any field on request.
- **Building owner** — picks a city, runs its template, uploads documents (compliance = for AI verification, content = for the public listing), resolves contradictions the AI surfaces, and publishes.
- **Visitor** — browses published buildings in a 3D scene and asks a grounded assistant questions answered from the owner's content documents.

Workflow templates are JSON in Postgres, compiled per run into a LangGraph `StateGraph` with a Postgres checkpointer. Six primitives (`collect_form`, `upload_compliance`, `upload_content`, `cross_check`, `human_review`, `publish`) combine into any city's flow. Every GLM call writes to a per-step decision log for auditability. Remove GLM and document parsing, verification, cross-checking, admin template drafting, and the visitor assistant all break — the architectural litmus test.

## Deliverables

| Document | File |
|---|---|
| Product Requirements (PRD) | [docs/prd.pdf](docs/prd.pdf) |
| Software Architecture (SAD) | [docs/sad.pdf](docs/sad.pdf) |
| Technical Architecture (TAD) | [docs/tad.pdf](docs/tad.pdf) |
| Pitch Deck | [docs/pitch-deck.pdf](docs/pitch-deck.pdf) |

## Stack

| Layer | Choice |
|---|---|
| LLM | ILMU `ilmu-glm-5.1` via OpenAI SDK (`https://api.ilmu.ai/v1`) |
| Orchestration | LangGraph (Python) + Postgres checkpointer |
| Backend | FastAPI + Pydantic |
| DB | Postgres (prod) / SQLite (dev) |
| Frontend | Next.js App Router + TypeScript + Tailwind + shadcn/ui |
| Workflow viz | React Flow (custom step nodes) |
| 3D | react-three-fiber + drei |
| Realtime | SSE |
| PDF/OCR | pypdf + pytesseract fallback |

## Quickstart

```bash
cp .env.example .env     # GLM_API_KEY already in team .env
docker compose up -d db  # local Postgres
just migrate
just seed                # admin, Shah Alam city, demo template, Menara Demo
just backend-dev         # http://localhost:8000
just frontend-dev        # http://localhost:3000
```

Walk through the end-to-end demo per `implementation.md` §13.

## Repository

```
um-hackathon/
├── backend/              FastAPI + LangGraph + GLM tools + seed
├── frontend/             Next.js app (admin, onboarding, 3D building pages)
├── docs/                 PRD, SAD, TAD, pitch deck, competition evaluation
├── implementation.md     engineering single source of truth
├── tasks.md              build plan, task-by-task
└── idea-presentation.md  pitch narrative
```

## Judging alignment

| Criterion | Weight | Where it lives |
|---|---|---|
| Product Thinking | 30% | `docs/prd.pdf`, `idea-presentation.md`, demo script |
| Architecture | 20% | `docs/sad.pdf`, `docs/tad.pdf`, `implementation.md` |
| Code Quality | 25% | `backend/`, `frontend/` |
| QA & Tests | 10% | `backend/tests/`, Playwright smoke |
| Pitch & Demo | 15% | `docs/pitch-deck.pdf`, pitch video |

## Team

_[add team members before submission]_

## License

_[to be decided]_
