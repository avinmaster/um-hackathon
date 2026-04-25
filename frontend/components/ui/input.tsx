import * as React from "react";
import { cn } from "../../lib/cn";

const inputBase =
  "w-full rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)] disabled:opacity-60";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(inputBase, "h-10 px-3", className)}
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
      className={cn(inputBase, "min-h-[88px] p-3 leading-relaxed", className)}
      {...props}
    />
  );
});

/**
 * Legacy Label — kept for compatibility. Prefer the <Field> wrapper from
 * components/ui/field.tsx for new code.
 */
export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-[12px] font-medium tracking-tight text-[var(--color-ink)]",
        className,
      )}
      {...props}
    />
  );
}
