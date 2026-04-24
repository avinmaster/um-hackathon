import Link from "next/link";
import { TopBar } from "../components/nav/topbar";
import { Badge } from "../components/ui/badge";

export default function LandingPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-16">
        <section className="mx-auto max-w-3xl text-center">
          <Badge tone="accent" className="mb-6">
            UMHackathon 2026 · Domain 1 · Agentic workflows
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Painful building onboarding,
            <br />
            turned into a guided AI workflow.
          </h1>
          <p className="mt-6 text-[var(--color-ink-muted)] text-lg leading-relaxed">
            Admins author city-specific templates. Owners run them step by step.
            GLM verifies each document, flags contradictions, and grounds a
            public assistant — all from one audit-logged engine.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin"
              className="rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[var(--color-accent-deep)] hover:text-[var(--color-ink)] transition-colors"
            >
              Author a template
            </Link>
            <Link
              href="/onboard"
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-border-strong)] transition-colors"
            >
              Run the workflow as an owner
            </Link>
            <Link
              href="/buildings"
              className="rounded-md border border-transparent px-5 py-2.5 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
            >
              Browse the 3D directory →
            </Link>
          </div>
        </section>

        <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Admin",
              desc: "Draft a template from one sentence. GLM proposes the 7 steps, you tweak, publish.",
              href: "/admin",
            },
            {
              title: "Owner",
              desc: "Pick your city, fill the form, upload proofs. Watch each AI decision unfold per doc.",
              href: "/onboard",
            },
            {
              title: "Visitor",
              desc: "Browse published buildings in 3D. Ask a grounded assistant — every fact cites a source.",
              href: "/buildings",
            },
          ].map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 transition-all hover:border-[var(--color-border-strong)] hover:-translate-y-0.5"
            >
              <div className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent)]">
                {card.title}
              </div>
              <p className="mt-3 text-sm text-[var(--color-ink-muted)] leading-relaxed">
                {card.desc}
              </p>
              <div className="mt-4 text-xs text-[var(--color-ink-subtle)] group-hover:text-[var(--color-ink)] transition-colors">
                Enter →
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            One engine. Six primitives. Every city by config.
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--color-ink-muted)]">
            Workflow templates are JSON in Postgres, compiled into LangGraph
            StateGraphs per run. Every GLM call is logged for audit. Remove GLM
            and the platform stops reasoning — the architectural litmus test.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "collect_form",
              "upload_compliance",
              "upload_content",
              "cross_check",
              "human_review",
              "publish",
            ].map((p) => (
              <span
                key={p}
                className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-xs font-mono text-[var(--color-ink-muted)]"
              >
                {p}
              </span>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-[var(--color-border)] py-6">
        <div className="mx-auto max-w-[1400px] px-6 text-xs text-[var(--color-ink-subtle)] flex justify-between">
          <span>Powered by ILMU · <code className="font-mono">ilmu-glm-5.1</code></span>
          <span>UMHackathon 2026</span>
        </div>
      </footer>
    </>
  );
}
