"use client";
import {
  FileCheck,
  FileInput,
  GitCompare,
  Image,
  ScrollText,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { Reveal, RevealItem } from "../motion/reveal";

const PRIMS: Array<{
  name: string;
  blurb: string;
  icon: LucideIcon;
  span: string; // tailwind grid span
}> = [
  {
    name: "collect_form",
    blurb: "Structured data, no free-text. Validation per field, prefilled across runs.",
    icon: FileInput,
    span: "md:col-span-2",
  },
  {
    name: "upload_compliance",
    blurb: "Documents are checked criterion-by-criterion. Verdicts logged with evidence.",
    icon: UploadCloud,
    span: "md:col-span-1",
  },
  {
    name: "upload_content",
    blurb: "Public-facing facts only. GLM extracts; the assistant grounds.",
    icon: Image,
    span: "md:col-span-1",
  },
  {
    name: "cross_check",
    blurb: "Contradictions across docs surface as resolvable cards.",
    icon: GitCompare,
    span: "md:col-span-2",
  },
  {
    name: "human_review",
    blurb: "Owner sees a summary + gaps. Confirms before publish.",
    icon: ScrollText,
    span: "md:col-span-2",
  },
  {
    name: "publish",
    blurb: "Building lands in the directory. Visitors get the 3D + assistant.",
    icon: FileCheck,
    span: "md:col-span-1",
  },
];

export function PrimitivesBento() {
  return (
    <section className="relative w-full px-6 py-28">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 380px at 70% 30%, color-mix(in srgb, var(--color-primary) 6%, transparent), transparent 70%)",
        }}
      />
      <Reveal stagger className="mx-auto flex max-w-[1400px] flex-col items-center">
        <RevealItem className="mb-3 text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-subtle)]">
          The primitives
        </RevealItem>
        <RevealItem className="mb-14 max-w-[640px] text-balance text-center text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-tight tracking-tight">
          Six building blocks. Combine them for any city.
        </RevealItem>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {PRIMS.map((p) => (
            <RevealItem key={p.name} className={p.span}>
              <PrimitiveCard prim={p} />
            </RevealItem>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function PrimitiveCard({
  prim,
}: {
  prim: (typeof PRIMS)[number];
}) {
  const Icon = prim.icon;
  return (
    <div className="group relative h-full overflow-hidden rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 transition-all duration-300 hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:shadow-[var(--shadow-glow-violet)] hover:-translate-y-0.5">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] text-[var(--color-primary-glow)] transition-colors duration-300 group-hover:bg-[color-mix(in_srgb,var(--color-cyan)_22%,transparent)] group-hover:text-[var(--color-cyan)]">
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-mono text-[12px] text-[var(--color-ink)]">
          {prim.name}
        </span>
      </div>
      <p className="text-[14px] leading-relaxed text-[var(--color-ink-muted)]">
        {prim.blurb}
      </p>
      {/* corner accent */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  );
}
