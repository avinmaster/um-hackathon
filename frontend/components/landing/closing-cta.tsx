"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../motion/reveal";
import { DrawPath } from "../motion/draw-path";

export function ClosingCTA() {
  return (
    <section className="relative isolate w-full overflow-hidden py-32">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 400px at 50% 50%, rgba(139,92,246,0.12), transparent 70%)",
        }}
      />
      <Reveal className="mx-auto flex max-w-[920px] flex-col items-center px-6 text-center">
        <span className="mb-5 text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-subtle)]">
          Ready when you are
        </span>
        <h2 className="text-balance text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.05] tracking-tight">
          One engine.{" "}
          <span className="text-gradient-brand">Six primitives.</span>
          <br />
          Every city by config.
        </h2>
        <p className="mt-6 max-w-[560px] text-[var(--color-ink-muted)]">
          Workflow templates are JSON in Postgres, compiled to LangGraph at run
          start. Every GLM call is logged for audit. Remove GLM and the platform
          stops reasoning — that's the architectural litmus test.
        </p>

        <div className="relative mt-10">
          <Link
            href="/admin"
            className="group inline-flex items-center gap-3 rounded-md bg-[var(--color-primary)] px-7 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[var(--color-primary-glow)] hover:shadow-[var(--shadow-glow-violet)]"
          >
            Author your first template
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <DrawPath
            d="M 5 50 L 95 50 L 88 42 M 95 50 L 88 58"
            className="pointer-events-none absolute -right-32 top-1/2 hidden h-12 w-32 -translate-y-1/2 lg:block"
            duration={1.6}
            delay={0.4}
            strokeWidth={1}
          />
        </div>
      </Reveal>
    </section>
  );
}
