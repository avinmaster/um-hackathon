"use client";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

export function TopBar({
  current,
}: {
  current?: "admin" | "onboard" | "buildings";
}) {
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

  const link = (href: string, label: string, key: typeof current) => {
    const isActive = current === key;
    return (
      <Link
        href={href}
        className={cn(
          "relative text-sm px-3 py-1.5 rounded-md transition-colors",
          isActive
            ? "text-[var(--color-ink)]"
            : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
        )}
      >
        {label}
        {isActive && (
          <motion.span
            layoutId="topbar-active"
            className="absolute inset-0 -z-10 rounded-md bg-[var(--color-bg-raised)]"
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
          />
        )}
      </Link>
    );
  };

  return (
    <motion.header
      initial={false}
      animate={{
        height: scrolled ? 52 : 64,
        backgroundColor: scrolled
          ? "rgba(5, 5, 7, 0.85)"
          : "rgba(5, 5, 7, 0.55)",
      }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] backdrop-blur-md"
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="ring-brand h-7 w-7 rounded-md grid place-items-center text-[var(--color-primary-glow)] font-bold text-sm transition-transform duration-300 group-hover:rotate-[8deg]">
            O
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold tracking-tight">Opus Magnum</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-subtle)] hidden sm:inline">
              adaptive onboarding
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          {link("/admin", "Admin", "admin")}
          {link("/onboard", "Onboard", "onboard")}
          {link("/buildings", "Directory", "buildings")}
        </nav>
      </div>
      {/* scroll progress underline */}
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] origin-left bg-[var(--color-primary)]"
        style={{
          width: "100%",
          scaleX: progressX,
        }}
      />
    </motion.header>
  );
}
