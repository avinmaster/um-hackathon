"use client";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

type Tab<T extends string> = { id: T; label: string };

export function TabUnderline<T extends string>({
  tabs,
  active,
  onChange,
  layoutId = "tab-underline",
  className,
}: {
  tabs: ReadonlyArray<Tab<T>>;
  active: T;
  onChange: (id: T) => void;
  layoutId?: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "text-[var(--color-ink)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
            )}
          >
            {t.label}
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute -bottom-1 left-2 right-2 h-[2px] rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, var(--color-primary) 0%, var(--color-cyan) 100%)",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
