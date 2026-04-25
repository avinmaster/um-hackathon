"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { GridLines } from "../motion/grid-lines";
import { DrawPath } from "../motion/draw-path";

const HEADLINE_LINE_1 = ["Painful", "building", "onboarding,"];
const HEADLINE_LINE_2 = ["turned", "into", "a", "guided", "AI", "workflow."];

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[92vh] w-full items-center justify-center overflow-hidden">
      <GridLines variant="hero" />

      {/* aurora blobs */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 600px at 30% 20%, rgba(139,92,246,0.18), transparent 70%)," +
            "radial-gradient(700px 500px at 75% 70%, rgba(34,211,238,0.14), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col items-center px-6 text-center">
        {/* live pill */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg-translucent)] px-3 py-1 text-xs text-[var(--color-ink-muted)] backdrop-blur"
        >
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-cyan)] opacity-60 pulse-dot" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-cyan)]" />
          </span>
          GLM online ·
          <span className="font-mono text-[var(--color-ink)]">ilmu-glm-5.1</span>
        </motion.div>

        {/* tagline pill */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-subtle)]"
        >
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary-glow)]" />
          UMHackathon 2026 · Domain 1 · Agentic workflows
        </motion.div>

        <h1 className="relative text-balance text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[1.05] tracking-tight">
          <StaggeredHeadline words={HEADLINE_LINE_1} />
          <br />
          <span className="text-[var(--color-primary-glow)]">
            <StaggeredHeadline words={HEADLINE_LINE_2} startDelay={0.35} />
          </span>
          <DrawPath
            d="M 0 8 Q 50 2 100 8"
            className="absolute -bottom-3 left-1/2 h-3 w-[60%] -translate-x-1/2"
            duration={1.4}
            delay={0.9}
            preserveAspectRatio="none"
          />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-[640px] text-[1.05rem] leading-relaxed text-[var(--color-ink-muted)]"
        >
          Admins author city-specific templates. Owners run them step by step.
          GLM verifies each document, flags contradictions, and grounds a
          public assistant —{" "}
          <span className="text-[var(--color-ink)]">all from one engine</span>.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/admin"
            className="group inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[var(--color-primary-glow)] hover:shadow-[var(--shadow-glow-violet)]"
          >
            Author a template
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/onboard"
            className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)]/60 hover:text-[var(--color-primary-glow)]"
          >
            Run the workflow as an owner
          </Link>
          <Link
            href="/buildings"
            className="group inline-flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            Browse the 3D directory
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>

      {/* scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-[var(--color-ink-subtle)]"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          scroll
        </motion.div>
      </motion.div>
    </section>
  );
}

function StaggeredHeadline({
  words,
  startDelay = 0,
}: {
  words: string[];
  startDelay?: number;
}) {
  return (
    <>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.7,
            delay: startDelay + i * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block"
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </>
  );
}
