import { TopBar } from "../components/nav/topbar";
import { Hero } from "../components/landing/hero";
import { Pinned3DLoader } from "../components/landing/pinned-3d-loader";
import { Triptych } from "../components/landing/triptych";
import { PrimitivesBento } from "../components/landing/primitives-bento";
import { ClosingCTA } from "../components/landing/closing-cta";

export default function LandingPage() {
  return (
    <>
      <TopBar />
      <main className="relative flex w-full flex-col">
        <Hero />
        <Pinned3DLoader />
        <Triptych />
        <PrimitivesBento />
        <ClosingCTA />
      </main>
      <footer className="relative border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-[var(--color-ink-subtle)] sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-cyan)] opacity-50 pulse-dot" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-cyan)]" />
            </span>
            Powered by ILMU ·{" "}
            <code className="font-mono text-[var(--color-ink-muted)]">
              ilmu-glm-5.1
            </code>
          </div>
          <span>UMHackathon 2026 · Domain 1</span>
        </div>
      </footer>
    </>
  );
}
