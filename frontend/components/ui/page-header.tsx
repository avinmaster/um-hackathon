import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Consistent top-of-page hero used across admin / onboard / buildings.
 * Layout: small uppercase eyebrow, large semibold title, muted lede,
 * actions block aligned to the right on wide screens.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  className,
  divider = true,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  className?: string;
  divider?: boolean;
}) {
  return (
    <header
      className={cn(
        "relative",
        divider && "border-b border-[var(--color-border)]",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 pb-8 pt-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-ink-subtle)]">
              {eyebrow}
            </div>
          )}
          <h1 className="text-balance text-[clamp(1.6rem,2.6vw,2.4rem)] font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          {lede && (
            <p className="mt-3 max-w-[620px] text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
              {lede}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
