# Idea & Presentation Brief

For the pitch and presentation team. This is the source material for the deck, the pitch script, and any walkthrough video. It describes the product, the problem, the users, and what the live demo looks like.

## One-line pitch

A platform that turns the chaos of onboarding a new building — the paperwork, the certifications, the city-specific rules — into a single guided workflow, powered end-to-end by an AI that reads documents, verifies them, and publishes the building as a public, explorable listing.

## The problem

Opening a new building is slow, paper-heavy, and local. Every new tower, commercial block, or mixed-use development has to prove itself to its city before it can operate. Ownership certificates, fire-safety approvals, zoning clearances, floor plans, safety reports — each submitted to a different office, each with its own format, each city wanting it slightly differently.

The people caught in the middle are building owners and developers. They file paperwork they don't fully understand, wait weeks for feedback, resubmit, wait again. Cities get a flood of submissions that look nothing alike. The public — the businesses and residents who want to move in — has no good way to discover what's new, what's approved, what's available.

The bottleneck is not bureaucracy as a concept. It is the absence of a system that can read what's submitted, check it against what a city requires, and keep the process moving without waiting on humans to re-read every form.

## The solution

One platform. Three roles. One AI at the center.

A city's administrator sets up the onboarding workflow for their city — the forms, the required documents, the verification rules. The AI helps them author it: draft a starter template from a one-line description, explain what each step is for, suggest fields they've missed.

A building owner creates a building, picks their city, and runs that city's workflow. They fill forms. They upload documents in two groups: *compliance documents* for the AI to verify (ownership, fire safety, zoning), and *content documents* that describe the building itself (floor plans, amenities, photos). The AI reads each document, verifies the compliance ones against the city's criteria, extracts structured facts from the content ones, and cross-checks everything for consistency. Where something's missing or wrong, the workflow pauses and asks — in plain language, with evidence.

When verification passes, the building is published. It becomes a 3D page anyone can visit, with an assistant that answers questions about the building using the same content documents the owner submitted. The paperwork and the public listing come from the same submission.

## Three users, three surfaces

**Admin.** A city's configuration point. They author workflow templates, shaped by the AI's suggestions. They never touch an owner's submission; they define the shape of what owners go through.

**Building owner.** The workflow user. They see a live graph of the onboarding process, step by step, and a panel that tells them what to do next. They upload documents and watch the AI process each one in real time. When all steps pass, their building goes public.

**Visitor.** The public-facing audience. They browse the directory of published buildings, open one in 3D, and talk to its assistant. They never see the workflow that produced it — just the result. The visitor surface is the *payoff* of a completed workflow, not a separate product: the same documents the workflow verified are the documents the assistant reads.

## How someone uses it

### Admin

The admin opens the console, picks a city or creates a new one, and opens its workflow template. An empty template is a blank sequence. They can describe the city's requirements in a sentence and ask the AI to draft a starter template. The AI produces an ordered sequence of steps — forms, uploads, verifications, a review step, a publish step. The admin edits any step, changes field labels, adds criteria in plain English, re-orders. The assistant is always available to explain a step or suggest improvements. When it looks right, they publish the template and owners in that city can use it.

### Building owner

The owner signs in, creates a building, and picks its city. The system loads that city's published template and starts a live workflow. On screen, a canvas shows every step of the onboarding as a node in a graph — what's done, what's running, what's waiting. Next to it, a panel presents the current step: a form to fill, or a place to drop documents.

As they upload each document, they see it enter a small card that walks through the AI's processing — received, parsed, extracted, verified — and ends with a clear verdict. When verification fails, the reason is specific and human: *"This fire-safety document doesn't mention the building's address."* They re-upload, or edit the form, and the step continues.

A later step cross-checks everything they've submitted and flags contradictions — *the floor plan shows 12 floors but the form says 10* — for the owner to reconcile. A final review shows an AI-generated summary of the whole submission. The owner confirms, and the building is published.

### Visitor

The visitor opens the public directory, picks a building, and sees a 3D view of it alongside a chat panel. They ask anything: what's on a given floor, how many units are available, what amenities the building has, whether it has parking. The assistant answers using the content documents the owner submitted, citing what it saw. There is no registration, no checkout, no transaction. It's discovery.

## What the demo looks like

A three-minute live walkthrough. The first two minutes are the workflow — the thesis of the product. The last minute is the 3D visitor page — the payoff of a completed workflow, not a separate feature.

**Act 1 — Admin authors the city's workflow with AI (the hero moment).**

1. Open the admin console. Create a new city called *Shah Alam*.
2. Open its empty workflow template. Type one sentence: *"Shah Alam requires MBSA zoning clearance, Bomba fire-safety approval (Sijil Perakuan Bomba), proof of ownership, and standard floor plans + photos. Include a cross-check and a final review."* Click *Draft with AI.*
3. A seven-step template appears live — forms, compliance uploads with plain-English criteria, cross-check, review, publish. Open the fire-safety step; ask the assistant *"why do I need a cross-check step?"* — get a grounded answer. Edit one criterion. Publish.

**Act 2 — Owner runs the workflow end to end.**

4. Switch roles. As a building owner, create *Menara Demo* in Shah Alam and start the onboarding.
5. Fill the basics form. Upload an ownership PDF and watch the live card advance: *received → parsed → fields extracted → verified → pass.*
6. Upload a Bomba fire-safety PDF that's deliberately wrong — different address. Watch the AI's plain-language rejection appear, citing the mismatched address.
7. Upload the correct one. Watch it pass. Upload floor plans and two photos for the content step. Each file shows its own processing in real time.
8. The cross-check step catches a contradiction between the form and the floor plan. Resolve it. The step passes.
9. The review step presents a full AI-generated summary of the submission. Confirm. Publish.

**Act 3 — Visitor sees the payoff.**

10. Switch to the visitor surface. Open the published building. Rotate the 3D view. Ask the assistant *"what's on floor 3?"* and watch it answer with a citation to the floor plan.
11. Close on the architecture slide: the AI at the center, labeled with the five things it owns. Remove it and template drafting, document parsing, verification, cross-checking, and the visitor assistant all stop working.

## What makes it different

The AI is the engine, not the garnish. The forms do not exist until the admin's template says they do. The verifications are not rule-based checks — they are GLM reading a document and judging it against the admin's plain-English criteria. The assistant on the public page isn't a separate bot — it reads the same documents the workflow used to verify the building.

The workflow itself is data, not code. A new city's process is a new template. A template is a sequence of primitives — form, compliance upload, content upload, cross-check, review, publish — arranged as that city requires. The same engine runs every template.

The two classes of document — compliance and content — are a deliberate design choice. One set proves the building is legitimate. The other set makes the public page useful. They live in the same workflow because the owner is already submitting everything once, and the platform shouldn't make them submit twice.

## Why the AI sits at the center

Everything the product does that matters comes from the AI's reasoning.

The AI reads unstructured documents — PDFs, images, scans — and extracts the facts that belong in a structured record. It applies an admin's plain-English criteria against a submitted document and returns a pass-or-fail judgement with evidence. It reconciles information across multiple submitted documents and surfaces the contradictions a human would miss. It drafts workflow templates for administrators setting up new cities, and explains any field an admin asks about. It answers visitor questions about a published building by reading the documents that building's owner uploaded.

Remove the AI and the platform loses all of this. The forms still render, but nothing gets verified; no summaries get written; no template suggestions appear; the public assistant has nothing to say. The AI is not a feature sitting on top of a form system. The form system is a thin shell over the AI.

## Beyond buildings

**The product is the onboarding engine. Buildings are the demo.** The same platform, with different templates, onboards anything that requires multi-step verification — suppliers, vendors, licensees, regulated professionals, KYC. We ship buildings because they are concrete, visual, and immediately painful; the pattern underneath is adaptive, multi-modal, AI-verified onboarding.

Say this plainly in the pitch, not only at the end. The opening frame is *"we built a regulated-onboarding engine; this is what it looks like applied to new buildings in Malaysian cities."*

## Suggested deck outline

1. Title, one-line pitch, team.
2. The problem — a concrete scene of a developer caught in paperwork, or a city buried in submissions.
3. Why it's hard — fragmentation, jurisdictional variance, manual reading and re-reading.
4. The product — a regulated-onboarding engine, demoed with buildings. Three roles, one engine, one knowledge base. A diagram with admin, owner, visitor orbiting the AI.
5. **Hero slide: How a template gets built.** An admin types one sentence about Shah Alam's requirements; GLM drafts a seven-step workflow live on stage. The same engine runs every template. This is the "adaptive" in "adaptive workflow engine."
6. How the workflow then runs — the graph of primitives and what the AI does at each one.
7. Live demo.
8. Architecture — the AI dead-center. A single slide with five concrete breakages, one line each:
   - *No GLM → no template drafting for admins.*
   - *No GLM → no document parsing or fact extraction.*
   - *No GLM → no compliance verification against plain-English criteria.*
   - *No GLM → no cross-document reconciliation.*
   - *No GLM → no grounded visitor assistant.*
   This is the slide that earns the "remove it and nothing works" line.
9. Beyond buildings — the same engine for suppliers, licenses, KYC, any regulated onboarding.
10. Close — repeat the one-line pitch. Team.

## Tone and visual direction

Be confident and concrete. Never say "leveraging AI." Say what the AI reads, what it decides, what it writes. Show the AI doing work on screen — processing cards advancing, verdicts appearing, summaries being written — so the audience sees it, not just hears it. Keep the language local where it helps: real Malaysian city names, real building names, real document types. Contrast the before and the after without caricature: before is stacks of PDFs and weeks of back-and-forth; after is a live workflow that walks an owner from blank building to published listing in one sitting.

## Still to be decided

- Product name, logo, and tagline.
- The opening scene for the problem slide — a developer, a city officer, or a prospective tenant.
- Which persona anchors the pitch voice: admin, owner, or visitor.
- The exact wording of the "remove the AI" moment.
- Visual motif for the deck — blueprints, document stacks folding into a graph, or city skylines rendering from paperwork.
