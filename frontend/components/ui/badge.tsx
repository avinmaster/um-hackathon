import * as React from "react";
import { cn } from "../../lib/cn";

type Tone = "neutral" | "info" | "warn" | "fail" | "accent";

const tones: Record<Tone, string> = {
  neutral:
    "border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] text-[var(--color-ink-muted)]",
  info: "border-[color-mix(in_srgb,var(--color-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-info)_15%,transparent)] text-[var(--color-info)]",
  warn: "border-[color-mix(in_srgb,var(--color-warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_15%,transparent)] text-[var(--color-warn)]",
  fail: "border-[color-mix(in_srgb,var(--color-fail)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-fail)_15%,transparent)] text-[var(--color-fail)]",
  accent:
    "border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_15%,transparent)] text-[var(--color-accent)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
