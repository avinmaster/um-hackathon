# Frontend Redesign — Design Spec

**Date:** 2026-04-25
**Owner:** assistant (implementing); user (deploys, demos)
**Deadline:** 2026-04-26 07:59:59 MYT

## Goal

Take the current functional-but-MVPish frontend and turn it into a stunning, demo-ready product. The judge sees this in a 5-minute pitch — the landing page must hook them in 10 seconds, the workflow page must show the engine working, and the building page must close with the 3D + grounded assistant payoff.

## Non-goals (this pass)

- Light theme (tokens are structured so a future invert is straight; deferred for budget)
- Photo-realistic 3D renders
- Real-time multi-user collaboration
- Admin layout overhaul (polish only)
- Auth UI (still mocked)

## Aesthetic direction

Warp/Vercel-leaning: near-pure black with a violet→cyan duotone, animated SVG line work as ambient texture, motion that's smooth-not-snappy. Every transition uses shared easing tokens; nothing pops in instantly.

## 1. Design system

### 1.1 Color tokens (dark, the only theme this pass)

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#050507` | page |
| `--color-bg-elev` | `#0c0d11` | cards, panels |
| `--color-bg-raised` | `#14161c` | inputs, hover surfaces |
| `--color-border` | `#1f222b` | hairlines |
| `--color-border-strong` | `#2d313c` | hover/focus borders |
| `--color-ink` | `#f4f6fa` | primary text |
| `--color-ink-muted` | `#9ba3b1` | secondary text |
| `--color-ink-subtle` | `#5a6172` | tertiary text |
| `--color-primary` | `#8b5cf6` | brand, primary CTAs, "running" |
| `--color-primary-glow` | `#a78bfa` | hover, gradient stops |
| `--color-accent` | `#22d3ee` | highlights, animated lines, success rings |
| `--color-mint` | `#7df9c5` | step "passed" semantic (kept) |
| `--color-warn` | `#ffb547` | warnings |
| `--color-fail` | `#ff5d6e` | failures |

The existing token names (`--color-accent`, `--color-accent-deep`) will be remapped: the old mint-as-primary becomes `--color-mint` (semantic, status-only), and the new violet/cyan duotone takes over brand and ambient.

### 1.2 Motion tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | enter, cinematic |
| `--ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` | UI affordance |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | bidirectional |
| `--dur-quick` | `180ms` | hover, focus, micro |
| `--dur-base` | `320ms` | section transitions |
| `--dur-cinematic` | `700ms` | hero, camera moves |

Stagger cap: 60ms per child. No transition exceeds 1.2s.

### 1.3 Other tokens

- **Radii:** `--r-sm 6px`, `--r-md 10px`, `--r-lg 14px`, `--r-xl 20px`
- **Shadows:** `--shadow-glow-violet`, `--shadow-glow-cyan`, `--shadow-lift-md`, `--shadow-lift-lg`
- **Type:** Geist Sans / Geist Mono (already loaded). Display weights 600/700; body 400/500.

### 1.4 Reusable primitives

- **`<GridLines variant="ambient" | "hero" />`** — full-bleed SVG grid; strokes use `--color-primary` → `--color-accent` linear gradient at very low opacity, slowly drifting via CSS keyframes. Used on landing hero and section dividers.
- **`<DrawPath />`** — animates `stroke-dashoffset` from `pathLength` to 0 on view (IntersectionObserver). Used for the underline beneath H1, arrow on closing CTA, and decorative section connectors.
- **`<Reveal stagger>`** — wraps children with `motion.div` opacity + y transform, viewport-triggered. Standard entrance for any non-hero content.
- **`<TabUnderline layoutId>`** — shared-layout underline for tabbed views (exterior/interior, etc.).

### 1.5 Stack additions

- **`framer-motion`** (animations and shared layouts; React 19 compatible)
- **1× new GLB** under `public/models/` (apartment interior, CC-BY from Poly Pizza). Attribution added to `ATTRIBUTIONS.md`. Fallback if no clean model is found: stylized procedural floorplan extruded from `scene_config`.

## 2. Landing page

A scroll-driven narrative. ~5 viewports tall, with one pinned 3D moment.

### 2.1 Hero (vh 0–1)

- Full-bleed `bg`. Background layer: `<GridLines variant="hero" />` slowly drifting (no parallax — drift is enough motion).
- Top-right ambient "GLM online" pill: pulsing cyan dot + monospaced `ilmu-glm-5.1`.
- H1: stagger-in word-by-word (60ms cap). Below it, a `<DrawPath />` underline draws over 1.2s.
- Sub-copy fades up at +160ms.
- Primary CTA "Author a template" (violet) and secondary "Run a workflow" (outlined). Tertiary text-link "Browse the directory →" with a long animated arrow on hover.
- TopBar reacts to scroll: height 64→52, blur intensifies past 80px.

### 2.2 Pinned 3D moment (vh 1–3)

Section pins for 2 viewports. Center stage: the apartment-building GLB. Scroll progress (0→1) drives:
- `rotation.y` 0 → 2π
- Camera dolly Z 12 → 7 (push in at climax)
- Cyan halo intensity 0 → 1

**Left rail** — four reveal cards, each with a draw-in icon:
1. *Author the workflow* — admin authors per-city template
2. *Verify with GLM* — compliance docs checked criterion-by-criterion
3. *Cross-check* — contradictions surface as cards
4. *Publish* — building lands here, grounded assistant ready

**Right rail** — fake "decision log" stream that types out GLM verdicts as scroll progresses. Mono font, with cyan badges and timestamps. Provides immediate flavor of what the engine actually does — judges read this and get the value-prop without watching the demo end-to-end.

### 2.3 Feature triptych (vh 3–4)

Three role cards (Admin / Owner / Visitor). Each:
- Subtle tilt toward cursor (`useMouseFollow` capped at ±6deg)
- A unique animated micro-illustration: admin = SVG nodes wiring up; owner = upload arrow + verdict tick; visitor = chat bubble streaming text
- Hover: violet glow + 2px lift

### 2.4 Primitives bento (vh 4–5)

6-cell asymmetric grid. One cell per primitive (`collect_form`, `upload_compliance`, `upload_content`, `cross_check`, `human_review`, `publish`). Each cell has:
- Primitive icon (lucide, kept)
- Mono primitive name
- One-line plain-English description
- Tiny inline diagram (e.g., for `cross_check`, two doc icons with a connecting line that pulses)

### 2.5 Closing CTA + footer

Single-line CTA: "Author a template →" with a long `<DrawPath />` arrow. Footer keeps current ILMU credit but the GLM dot pulses cyan.

## 3. Workflow page (de-clunked)

The biggest UX miss today: nodes fitView-zoomed to ~50%, text unreadable, can't drag, no overview, no keyboard.

### 3.1 Canvas

- **Larger nodes** — 260×96 with primitive icon, title, status pill, mini chevron showing prereqs.
- **Layout strategy** — vertical spine for ≤6 nodes (better fit on a half-width column); horizontal for >8. Spacing 32px gutter.
- **Default zoom 1.0**, `minZoom 0.4`, `maxZoom 1.6`, `fitViewOptions.padding 0.4` so first paint is always readable.
- **Draggable nodes** (`draggable: true`) with snap-to-grid (24px). Double-click resets that node.
- **MiniMap** in bottom-right corner, restyled with our tokens.
- **Floating toolbar** (top-right of canvas): `Fit`, `1:1`, `+`, `−`, `Compact layout` (auto-relayout button — naive vertical stacking, no new dep).
- **Keyboard**: `J/K` next/prev step, `Space` toggle pan, `F` fit, `R` reset layout. Ghost legend auto-hides after 4s.

### 3.2 Status & affordance

- **Active step** keeps `pulse-ring` but adds a violet outer halo so it pops at a glance.
- **Edge animation** — completed edges get a slow-traveling cyan dot; running edges get a brighter pulse; pending edges are muted gray.
- **Progress strip** above canvas — segmented bar (one cell per step) showing pending/running/passed/failed at a glance. Cells are clickable shortcuts.

### 3.3 Step panel

- Cross-fade (180ms) when `picked` changes — no instant swap.
- Sticky sub-header inside panel (primitive label + step title).
- Decision log moves to a collapsible drawer at the bottom; action UI always above the fold.
- Inline transitions for verdict cards, contradiction cards, summary article (height + opacity, no layout pop).

### 3.4 Top header

- Slim breadcrumb: `City › Building › Step` with responsive truncation.
- Status badge becomes a richer "run pulse" widget: status + elapsed time + "view audit log" link.

### 3.5 Admin template editor

Reuses the same canvas component in an "edit" mode (drag to reorder, click to edit step config in a side sheet). One source of truth for the workflow visualization.

## 4. Building detail (interior + exterior)

### 4.1 Tabbed 3D

- **Exterior** — current GLB picker, with three camera presets (`Street`, `Top`, `Iso`) animated over 700ms with `--ease-out-expo`. Auto-rotate slows when user interacts; resumes after 4s idle.
- **Interior** — new GLB. Camera defaults to first-person-ish angle; presets `Living room`, `Bedroom`, `Top-down`. Fallback if no clean interior GLB is sourced: procedural floorplan extruded from `scene_config` with labelled rooms.
- **Toggle pill** `Exterior / Interior` floats top-left of the canvas. Tab switch fades through a brief cyan flash for delight.
- Active tab uses `<TabUnderline layoutId>` so the underline morphs.

### 4.2 Profile facts overlay

Stays bottom-left. Glassmorphism refresh (heavier blur, thinner border, slightly translucent violet edge). Stagger-in.

### 4.3 Assistant chat

- Streaming token shimmer — cyan underline travels under text as it streams.
- Suggestion chips animate in with stagger; click presses down + dispatches.
- User bubbles use violet→cyan gradient instead of solid mint.
- "Sources" expandable drawer below each assistant bubble. Placeholder if backend doesn't yet return citations: `grounding: profile.amenities, content[2]`.

## 5. Buildings directory + admin polish

### 5.1 Directory cards

- Replace tiny SVG silhouette with a CSS-only isometric block stack (city's hue × accent). Hover: shimmer.
- Hover: 2px lift + violet glow. "Open →" pill reveals.

### 5.2 Admin

Same tokens, same icons, same motion primitives. No layout overhaul — card transitions, subtler dividers, focus rings, button micro-motion. Template editor uses the shared canvas.

### 5.3 TopBar

Thinner, with a faint cyan progress bar at the bottom that tracks `scrollYProgress` on long pages. Logo gets a subtle gradient ring.

### 5.4 Footer

Same content. GLM credit gets a pulsing cyan dot.

## 6. Implementation surfaces (checklist)

- `app/globals.css` — token overhaul, motion vars, scrollbar refresh, xyflow restyle
- `components/ui/*` — refresh button, badge, card, input
- `components/motion/*` — `Reveal`, `DrawPath`, `GridLines`, `TabUnderline` (new)
- `components/nav/topbar.tsx` — compress on scroll, scroll-progress underline, gradient logo
- `app/page.tsx` — full landing rebuild
- `components/landing/*` — hero, pinned-3d, decision-log-stream, triptych, primitives-bento, closing-cta (new)
- `components/onboard/workflow-canvas.tsx` — node drag, minimap, toolbar, keyboard, layout
- `components/onboard/step-node.tsx` — bigger, halo, prereq chevron
- `components/onboard/step-panel.tsx` — cross-fade, sticky header, log drawer
- `app/buildings/[id]/page.tsx` — tabs, camera presets, glassmorphism overlay
- `components/building/scene-3d.tsx` — camera preset interpolation, halo, idle resume
- `components/building/scene-3d-interior.tsx` — new
- `components/building/assistant-chat.tsx` — streaming shimmer, gradient bubbles, sources drawer
- `app/buildings/page.tsx` — isometric directory cards
- `app/admin/**` — polish pass with the new tokens
- `public/models/` — 1× new interior GLB + ATTRIBUTIONS update

## 7. Open questions to resolve at implementation time

- Which interior GLB? (search Poly Pizza for CC-BY apartment interior; if none clean, ship procedural floorplan fallback.)
- Does scroll-pinning work cleanly with the existing Next.js App Router setup? Validate in the first vertical slice.
- Confirm `framer-motion` plays well with React 19.2 + Next 16.2 (latest framer-motion 11+ supports both).

## 8. Out of scope

- Light theme (token structure supports future invert)
- Photo-realistic 3D
- Real-time collab
- Admin layout overhaul
- Auth UI
