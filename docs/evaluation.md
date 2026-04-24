# UMHackathon 2026 — Preliminary Round Judging Criteria

Scoring breakdown used by judges. Percentages are the total weight each
category contributes to the final score.

| # | Criteria                                       | Percentage |
|---|------------------------------------------------|-----------:|
| 1 | Product Thinking and Problem Design            |        30% |
| 2 | Technical Architecture & Engineering Execution |        20% |
| 3 | Engineering Execution & Code Quality           |        25% |
| 4 | Quality Assurance & Test Planning              |        10% |
| 5 | Pitch & Prototype Demonstration                |        15% |
|   | **Total**                                      |   **100%** |

> Using Z.AI's GLM is **mandatory**. Using any other reasoning model, or
> removing GLM as the central reasoning engine, results in disqualification.

## Sub-criteria (from official Judging Criteria document)

### 1. Product Thinking and Problem Design — 30%
| Aspect | Weight |
|---|---:|
| Problem Definition & Purpose | 5% |
| Target Users & User Stories | 8% |
| Originality, Innovation & Value Realization | 10% |
| Feature Prioritization & MVP Scope | 7% |

### 2. Technical Architecture & Engineering Execution — 20%
| Aspect | Weight |
|---|---:|
| System Logic & Architecture | 7% |
| System Schema & Design | 6% |
| Technical Feasibility & Workflow Integration | 7% |

### 3. Engineering Execution & Code Quality — 25%
| Aspect | Weight |
|---|---:|
| Version Control & Repository Management | 5% |
| Code Modularity & Structure | 8% |
| Implementation Quality | 12% |

### 4. Quality Assurance & Test Planning — 10%
| Aspect | Weight |
|---|---:|
| Risk Anticipation & Mitigation | 5% |
| Testing Strategy, Coverage & Impact | 5% |

### 5. Pitch & Prototype Demonstration — 15%
| Aspect | Weight |
|---|---:|
| Technical Walkthrough | 6% |
| UI/UX & Usability | 5% |
| Presentation Delivery & Deck Quality | 4% |

## Domain requirement (AI Systems & Agentic Workflow Automation)

GLM must act as the **central reasoning engine** of a stateful, adaptive
workflow. The solution must demonstrate:

- Understanding of unstructured inputs (messages, forms, documents)
- Multi-step reasoning and decision-making across workflow stages
- Dynamic task orchestration, including tool / API interactions
- Generation of structured, actionable outputs
- Handling of ambiguity, incomplete data, and process failures

**Litmus test:** if GLM is removed, the system should lose its ability
to coordinate and execute the workflow.

## Submission deliverables

- PRD, SAD, TAD, and Pitch Deck — **PDF only** (not .md), uploaded to GitHub.
- Pitch video link highlighted in the **first section of the README**.
- GLM on Z.AI used as the main critical component (else: disqualification).
- Deadline: **26 April 2026, 07:59:59 MYT** — no extensions.
