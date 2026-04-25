"use client";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { Boxes, FileEdit, Layers, Moon, Sun } from "lucide-react";
import { cn } from "../../lib/cn";

type Section = "admin" | "onboard" | "buildings";

const NAV: Array<{
  href: string;
  label: string;
  key: Section;
  icon: typeof Layers;
}> = [
  { href: "/admin", label: "Workflows", key: "admin", icon: FileEdit },
  { href: "/onboard", label: "Submit", key: "onboard", icon: Layers },
  { href: "/buildings", label: "Browse", key: "buildings", icon: Boxes },
];

export function TopBar({ current }: { current?: Section }) {
  const { scrollY, scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    return scrollY.on("change", (y) => setScrolled(y > 80));
  }, [scrollY]);

  const progressX = useSpring(useTransform(scrollYProgress, [0, 1], [0, 1]), {
    stiffness: 120,
    damping: 24,
    mass: 0.4,
  });

  return (
    <motion.header
      initial={false}
      animate={{ height: scrolled ? 52 : 60 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors",
        scrolled
          ? "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)]"
          : "border-transparent bg-[color-mix(in_srgb,var(--color-bg)_55%,transparent)]",
      )}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo />
          <div className="flex items-baseline gap-2">
            <span className="font-semibold tracking-tight">Opus Magnum</span>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV.map((n) => (
            <NavLink key={n.key} item={n} active={current === n.key} />
          ))}
          <span className="hairline-v mx-2 h-5" />
          <ThemeToggle />
        </nav>
      </div>

      {/* scroll progress underline — single warm hairline */}
      <motion.div
        className="absolute bottom-0 left-0 h-px origin-left bg-[var(--color-primary)]"
        style={{ width: "100%", scaleX: progressX }}
      />
    </motion.header>
  );
}

function Logo() {
  return (
    <span
      aria-hidden
      className="relative grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg-elev)] text-[var(--color-primary)] transition-transform duration-300 group-hover:rotate-[10deg]"
    >
      <span
        className="absolute inset-0 rounded-md opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-primary) 28%, transparent), transparent 70%)",
        }}
      />
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M2 11 L7 2 L12 11"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.4 7.5 L9.6 7.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function NavLink({
  item,
  active,
}: {
  item: (typeof NAV)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
        active
          ? "text-[var(--color-ink)]"
          : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {item.label}
      {active && (
        <motion.span
          layoutId="topbar-active"
          className="absolute inset-0 -z-10 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
    </Link>
  );
}

function ThemeToggle() {
  // The no-flash <script> in app/layout.tsx already set data-theme before
  // React mounts; we just read it on first render.
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof document === "undefined") return "dark";
    return (
      (document.documentElement.getAttribute("data-theme") as
        | "dark"
        | "light"
        | null) ?? "dark"
    );
  });

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("om-theme", next);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-ink)]"
    >
      {theme === "dark" ? (
        <Sun className="h-3.5 w-3.5" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
