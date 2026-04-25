"use client";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, FileEdit, MessageCircle, UploadCloud } from "lucide-react";
import { Reveal, RevealItem } from "../motion/reveal";
import type { ReactNode } from "react";

const ROLES = [
  {
    title: "Admin",
    blurb:
      "Draft a city template from one sentence. GLM proposes the steps; you tweak and publish.",
    href: "/admin",
    cta: "Author a template",
    Illustration: AdminIllustration,
  },
  {
    title: "Owner",
    blurb:
      "Pick your city, fill the form, upload proofs. Watch every AI verdict unfold per document.",
    href: "/onboard",
    cta: "Run a workflow",
    Illustration: OwnerIllustration,
  },
  {
    title: "Visitor",
    blurb:
      "Browse published buildings in 3D. Ask the grounded assistant — every fact cites a source.",
    href: "/buildings",
    cta: "Browse the directory",
    Illustration: VisitorIllustration,
  },
];

export function Triptych() {
  return (
    <section className="relative w-full px-6 py-28">
      <Reveal stagger className="mx-auto flex max-w-[1400px] flex-col items-center">
        <RevealItem className="mb-3 text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-subtle)]">
          Three roles · one engine
        </RevealItem>
        <RevealItem className="mb-14 text-balance text-center text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-tight tracking-tight">
          Built for everyone in the building lifecycle
        </RevealItem>
        <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-3">
          {ROLES.map((r) => (
            <RevealItem key={r.title}>
              <RoleCard role={r} />
            </RevealItem>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function RoleCard({
  role,
}: {
  role: (typeof ROLES)[number];
}) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), {
    stiffness: 200,
    damping: 20,
  });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), {
    stiffness: 200,
    damping: 20,
  });
  const Illustration = role.Illustration;
  return (
    <motion.div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 800 }}
      className="group relative h-full overflow-hidden rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 transition-shadow duration-300 hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:shadow-[var(--shadow-glow-violet)]"
    >
      <div className="mb-6 grid h-32 place-items-center rounded-md bg-[color-mix(in_srgb,var(--color-bg)_70%,transparent)] border border-[var(--color-border)]">
        <Illustration />
      </div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-primary-glow)] mb-1 font-mono">
        {role.title}
      </div>
      <p className="text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
        {role.blurb}
      </p>
      <Link
        href={role.href}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink)] transition-colors hover:text-[var(--color-primary-glow)]"
      >
        {role.cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.div>
  );
}

function AdminIllustration(): ReactNode {
  return (
    <svg viewBox="0 0 200 100" className="h-24 w-full">
      <defs>
        <linearGradient id="admin-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-cyan)" />
        </linearGradient>
      </defs>
      {[
        { x: 16, y: 30 },
        { x: 80, y: 18 },
        { x: 80, y: 56 },
        { x: 144, y: 30 },
      ].map((n, i) => (
        <g key={i}>
          <rect
            x={n.x}
            y={n.y}
            width="36"
            height="22"
            rx="4"
            fill="var(--color-bg-raised)"
            stroke="url(#admin-stroke)"
            strokeWidth="1"
          />
          <FileEdit
            x={n.x + 8}
            y={n.y + 5}
            width="12"
            height="12"
            color="var(--color-primary-glow)"
          />
          <rect
            x={n.x + 22}
            y={n.y + 8}
            width="10"
            height="2"
            rx="1"
            fill="var(--color-ink-subtle)"
          />
          <rect
            x={n.x + 22}
            y={n.y + 12}
            width="6"
            height="2"
            rx="1"
            fill="var(--color-ink-subtle)"
          />
        </g>
      ))}
      <path
        d="M 52 41 L 80 30 M 52 41 L 80 67 M 116 30 L 144 41 M 116 67 L 144 41"
        stroke="url(#admin-stroke)"
        strokeWidth="1"
        fill="none"
        strokeDasharray="3 3"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-12"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

function OwnerIllustration(): ReactNode {
  return (
    <svg viewBox="0 0 200 100" className="h-24 w-full">
      <UploadCloud
        x={84}
        y={20}
        width="32"
        height="32"
        color="var(--color-primary-glow)"
      />
      <g transform="translate(20, 60)">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${i * 56}, 0)`}>
            <rect
              width="48"
              height="20"
              rx="4"
              fill="var(--color-bg-raised)"
              stroke="var(--color-border-strong)"
            />
            <circle
              cx="10"
              cy="10"
              r="3"
              fill={
                i === 2
                  ? "var(--color-warn)"
                  : "var(--color-accent)"
              }
            >
              <animate
                attributeName="opacity"
                values="1;0.4;1"
                dur="1.4s"
                begin={`${i * 0.3}s`}
                repeatCount="indefinite"
              />
            </circle>
            <rect
              x="20"
              y="6"
              width="20"
              height="2"
              rx="1"
              fill="var(--color-ink-subtle)"
            />
            <rect
              x="20"
              y="11"
              width="14"
              height="2"
              rx="1"
              fill="var(--color-ink-subtle)"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

function VisitorIllustration(): ReactNode {
  return (
    <svg viewBox="0 0 200 100" className="h-24 w-full">
      <defs>
        <linearGradient id="visitor-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-cyan)" />
        </linearGradient>
      </defs>
      <g>
        <rect
          x="20"
          y="20"
          width="60"
          height="32"
          rx="6"
          fill="var(--color-bg-raised)"
          stroke="url(#visitor-stroke)"
          strokeWidth="1"
        />
        <rect
          x="28"
          y="30"
          width="38"
          height="2"
          rx="1"
          fill="var(--color-ink-muted)"
        />
        <rect
          x="28"
          y="36"
          width="28"
          height="2"
          rx="1"
          fill="var(--color-ink-subtle)"
        />
        <rect
          x="28"
          y="42"
          width="20"
          height="2"
          rx="1"
          fill="var(--color-ink-subtle)"
        />
      </g>
      <g transform="translate(108, 50)">
        <rect
          width="72"
          height="32"
          rx="6"
          fill="color-mix(in srgb, var(--color-cyan) 18%, transparent)"
          stroke="var(--color-cyan)"
          strokeWidth="1"
        />
        <MessageCircle
          x="6"
          y="9"
          width="14"
          height="14"
          color="var(--color-cyan)"
        />
        <g>
          <circle cx="34" cy="16" r="2" fill="var(--color-ink)">
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="44" cy="16" r="2" fill="var(--color-ink)">
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="1s"
              begin="0.2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="54" cy="16" r="2" fill="var(--color-ink)">
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="1s"
              begin="0.4s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </g>
    </svg>
  );
}
