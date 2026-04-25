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
            "radial-gradient(700px 360px at 50% 50%, color-mix(in srgb, var(--color-primary) 9%, transparent), transparent 70%)",
        }}
      />
      {/* horizontal animated line — Warp signature */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-px scan-x"
        style={{
          top: "50%",
          background:
            "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-primary) 50%, transparent), transparent)",
        }}
      />
      <Reveal className="mx-auto flex max-w-[920px] flex-col items-center px-6 text-center">
        <span className="mb-5 text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-subtle)]">
          Ready when you are
        </span>
        <h2 className="text-balance text-[clamp(2rem,4.5vw,3.4rem)] font-semibold leading-[1.05] tracking-tight">
          One engine.{" "}
          <span className="text-[var(--color-primary-glow)]">Every city.</span>
          <br />
          By configuration.
        </h2>
        <p className="mt-6 max-w-[520px] text-[var(--color-ink-muted)]">
          Workflows are stored as data, not code. Add a city, pick the steps,
          publish. Owners follow the same flow you defined.
        </p>

        <div className="relative mt-10">
          <Link
            href="/admin"
            className="group inline-flex items-center gap-3 rounded-md bg-[var(--color-primary)] px-7 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[var(--color-primary-deep)]"
          >
            Build your first workflow
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
