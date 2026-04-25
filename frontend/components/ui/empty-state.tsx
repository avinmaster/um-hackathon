import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Empty state used when a list has nothing in it. Should ALWAYS teach the
 * user what would normally live here and what to do next.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--r-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)] px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink-muted)]">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
        {title}
      </div>
      {body && (
        <p className="mt-2 max-w-[440px] text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {body}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
