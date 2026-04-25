"use client";
import * as React from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-glow)] hover:shadow-[var(--shadow-glow-violet)] active:translate-y-px",
  secondary:
    "bg-[var(--color-bg-raised)] text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-glow)]",
  ghost:
    "bg-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-elev)]",
  success:
    "bg-[var(--color-accent)] text-black hover:bg-[var(--color-accent-deep)] hover:text-[var(--color-ink)]",
  danger: "bg-[var(--color-fail)] text-black hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  }
>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
