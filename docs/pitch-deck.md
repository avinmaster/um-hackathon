# Opus Magnum — Pitch Deck

<!-- Each <section class="slide"> renders as one slide in the PDF. -->

<section class="slide slide-title">

# Opus Magnum

### Adaptive building onboarding, powered end-to-end by GLM.

**UMHackathon 2026 · Domain 1 — AI Systems & Agentic Workflow Automation**

</section>

---

<section class="slide">

## The problem

Every new building has to prove itself to its city — ownership, fire safety, zoning, floor plans, photos. Every submission goes to a different office, in a different format, graded against slightly different rules.

**Developers** file paperwork they don't fully understand and wait weeks for feedback.
**Cities** drown in submissions that look nothing alike.
**The public** has no good way to discover what's new, approved, or available.

> The bottleneck is not bureaucracy as a concept. It is the absence of a system that can read what's submitted, check it against what a city requires, and keep the process moving without waiting on humans to re-read every form.

</section>

---

<section class="slide">

## The product

**One platform. Three roles. One AI in the middle.**

- **Admin** authors the city's workflow template. GLM drafts it from a one-line brief, explains every step, and lets the admin tweak fields in a live editor.
- **Owner** picks their city, runs that template, uploads documents, and watches GLM verify each one in real time.
- **Visitor** browses published buildings in 3D and talks to a grounded assistant that answers only from the owner's content documents.

*It is not a form-system with AI on the side. The form system is a thin shell over the AI.*

</section>

---

<section class="slide">

## Hero moment — a template gets built in one sentence

The admin types:

> *"Shah Alam requires MBSA zoning clearance, Bomba fire-safety approval, ownership proof, and standard floor plans + photos. Include a cross-check."*

Clicks **Draft with AI**.

GLM returns a **seven-step template**, live:

`basics → ownership → fire_safety → zoning → layout_and_content → reconcile → review → publish`

Each step is already configured with the right primitive, the criteria written in English, the extraction fields named. The admin edits any field, publishes, done.

**A new jurisdiction is one JSON template. No deploys, no code.**

</section>

---

<section class="slide">

## Six primitives. Every city by config.

| Primitive | Owner sees | GLM does |
|---|---|---|
| `collect_form` | A form | (optional) Explains a field |
| `upload_compliance` | Drop-zone + live verdict card | Reads the doc. Judges against criteria. Returns pass/fail + evidence |
| `upload_content` | Drop-zone with extracted facts | Extracts structured facts from each doc, feeds the public profile |
| `cross_check` | Contradictions highlighted | Reconciles outputs across earlier steps |
| `human_review` | AI summary + confirm button | Writes the summary, lists gaps |
| `publish` | Terminal step | — |

The template is data, not code. The workflow canvas in the UI is the template.

</section>

---

<section class="slide">

## Live demo — three minutes

**Act 1 — Admin.** Type one sentence. GLM drafts the whole template. Publish.

**Act 2 — Owner.**

1. Create *Menara Demo* in Shah Alam. Start the workflow.
2. Fill the basics form. Upload the ownership deed — watch the card advance `received → parsing → verifying → pass` with evidence citations.
3. Upload a Bomba cert with the wrong address. GLM rejects it in plain English. Upload the correct one. Passes.
4. Upload floor plans + photos. GLM extracts units, amenities, captions.
5. Cross-check catches a contradiction between the form and the floor plan. Resolve it.
6. Review summary — AI writes the listing copy. Confirm. **Published.**

**Act 3 — Visitor.** Open the 3D building page. Ask "what's on floor 3?". Answer arrives, cited.

</section>

---

<section class="slide">

## Architecture — GLM at the centre

```
     ┌──── admin UI ──── draft_template / explain_field
     │
     ├──── owner UI ──── extract_document / verify_against_criteria /
     │                   cross_check_documents / summarize_for_review
     │
     └──── visitor UI ── answer_visitor_question

           ↓            All routes through GLMClient → ILMU
                        Every call logged in step_runs.decision_log
```

**Remove GLM and five things stop working:**

- No template drafting for admins.
- No document parsing or fact extraction.
- No compliance verification against plain-English criteria.
- No cross-document reconciliation.
- No grounded visitor assistant.

Form rendering survives. Nothing else does.

</section>

---

<section class="slide">

## Engineering notes

- **Backend.** FastAPI + LangGraph + Postgres checkpointer. Templates are JSONB; compiled to a `StateGraph` at run start. Runs are resumable.
- **AI layer.** Single `GLMClient` against ILMU (`ilmu-glm-5.1` via OpenAI SDK). Seven function-calling tools, JSON mode, streaming, `reasoning_effort="low"` on structured paths.
- **Frontend.** Next.js 16 App Router + Tailwind v4. React Flow for the workflow canvas (per-primitive nodes with live status). react-three-fiber with CC-BY apartment models for the visitor page.
- **Audit.** Every GLM call produces a `Decision` (call_id, tool, duration, usage) persisted per step.
- **Tests.** Graph-level, HTTP-level, GLM-integration (pass/fail fixtures), processing unit tests. All green.

</section>

---

<section class="slide">

## Beyond buildings

The product is the **onboarding engine**. Buildings are the demo because buildings are concrete, visual, and immediately painful.

The same engine, with different templates, onboards:

- **Suppliers** for a procurement team — compliance certificates, insurance docs, tax clearances.
- **Licensees** for a regulator — continuing-education proofs, identity docs, fitness-to-practise attestations.
- **KYC subjects** for a bank — ID, address proof, beneficial-ownership paperwork, cross-verification.
- **Regulated professionals** — credentials, criminal-record checks, registration renewals.

The primitives are the same. The templates change. The AI reads everything.

</section>

---

<section class="slide slide-close">

## Close

**Opus Magnum.** Adaptive building onboarding, powered end-to-end by GLM.

- Six primitives, every jurisdiction by config.
- Every decision logged, every criterion verified, every contradiction surfaced.
- The AI is the engine, not the garnish.

*Remove GLM and nothing that matters still works.*

---

**Team & repository** — see README for the demo video link and submission materials.

</section>
