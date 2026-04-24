import Link from "next/link";
import { cn } from "../../lib/cn";

export function TopBar({ current }: { current?: "admin" | "onboard" | "buildings" }) {
  const link = (href: string, label: string, key: typeof current) => (
    <Link
      href={href}
      className={cn(
        "text-sm px-3 py-1.5 rounded-md transition-colors",
        current === key
          ? "bg-[var(--color-bg-raised)] text-[var(--color-ink)]"
          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
      )}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-[var(--color-accent)] grid place-items-center text-black font-bold">
            O
          </div>
          <div className="font-semibold tracking-tight">Opus Magnum</div>
          <span className="text-xs text-[var(--color-ink-subtle)] hidden sm:inline">
            adaptive onboarding
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {link("/admin", "Admin", "admin")}
          {link("/onboard", "Onboard", "onboard")}
          {link("/buildings", "Directory", "buildings")}
        </nav>
      </div>
    </header>
  );
}
