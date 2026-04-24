import * as React from "react";
import { cn } from "../../lib/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none transition-colors placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-accent)]",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm outline-none transition-colors placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-accent)]",
        className,
      )}
      {...props}
    />
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`block text-xs font-medium uppercase tracking-wider text-[var(--color-ink-muted)] mb-1.5 ${className || ""}`}
      {...props}
    />
  );
}
