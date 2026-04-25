"use client";
import { type ReactNode, type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/cn";

/**
 * Composed form field — label, optional inline hint, optional helper text
 * below. Use Field around any input you'd normally style by hand so the
 * spacing / typography is consistent across the app.
 *
 * <Field label="City name" hint="capital city" help="Shown to owners.">
 *   <Input ... />
 * </Field>
 */
export function Field({
  label,
  htmlFor,
  hint,
  help,
  required,
  error,
  children,
  className,
}: {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  help?: ReactNode;
  required?: boolean;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={htmlFor}
            className="text-[12px] font-medium tracking-tight text-[var(--color-ink)]"
          >
            {label}
            {required && (
              <span className="ml-1 text-[var(--color-fail)]">*</span>
            )}
          </label>
          {hint && (
            <span className="text-[11px] text-[var(--color-ink-subtle)]">
              {hint}
            </span>
          )}
        </div>
      )}
      {children}
      {help && !error && (
        <p className="text-[12px] leading-snug text-[var(--color-ink-muted)]">
          {help}
        </p>
      )}
      {error && (
        <p className="text-[12px] leading-snug text-[var(--color-fail)]">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Styled <select> matching our Input visual language.
 */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full appearance-none rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-9 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]",
        // chevron
        "bg-[length:14px_14px] bg-[right_0.75rem_center] bg-no-repeat",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239b9ba8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
});
