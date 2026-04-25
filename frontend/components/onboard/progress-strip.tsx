"use client";
import { motion } from "framer-motion";
import type { GraphOut } from "../../lib/api";
import type { StepStatus } from "../status";
import { cn } from "../../lib/cn";

const cellTone: Record<StepStatus, string> = {
  pending: "bg-[var(--color-bg-raised)] hover:bg-[var(--color-border-strong)]",
  running: "bg-[var(--color-primary)]",
  awaiting_user: "bg-[var(--color-warn)]",
  passed: "bg-[var(--color-accent)]",
  failed: "bg-[var(--color-fail)]",
};

export function ProgressStrip({
  graph,
  current,
  onPickStep,
}: {
  graph: GraphOut;
  current: string | null;
  onPickStep: (id: string) => void;
}) {
  const total = graph.nodes.length || 1;
  const passed = graph.nodes.filter((n) => n.status === "passed").length;
  const pct = Math.round((passed / total) * 100);
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
            workflow progress
          </span>
          <span className="text-[12px] text-[var(--color-ink-muted)]">
            <span className="text-[var(--color-ink)] font-medium">{passed}</span>
            {" "}of {total} steps complete
          </span>
        </div>
        <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
          <span className="text-[var(--color-primary)]">{pct}</span>
          <span className="text-[var(--color-ink-subtle)]">%</span>
        </span>
      </div>
      <div className="flex gap-1.5">
        {graph.nodes.map((n, i) => {
          const isCurrent = n.id === current;
          return (
            <button
              key={n.id}
              onClick={() => onPickStep(n.id)}
              title={`${n.title} · ${n.status}`}
              className={cn(
                "group relative h-2 flex-1 rounded-full transition-all duration-300",
                cellTone[n.status],
                isCurrent && "h-3 -mt-0.5",
              )}
            >
              {isCurrent && (
                <motion.span
                  layoutId="progress-strip-cursor"
                  className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--color-primary)]"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded border border-[var(--color-border)] bg-[var(--color-bg-translucent)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-muted)] opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur">
                {i + 1}. {n.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
