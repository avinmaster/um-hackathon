import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { TopBar } from "../../components/nav/topbar";
import { Badge } from "../../components/ui/badge";
import type { Building } from "../../lib/api";
import { API_BASE } from "../../lib/api";

async function loadBuildings(): Promise<Building[]> {
  try {
    const res = await fetch(`${API_BASE}/api/buildings`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as Building[];
  } catch {
    return [];
  }
}

export default async function BuildingsIndex() {
  const buildings = await loadBuildings();
  return (
    <>
      <TopBar current="buildings" />
      <main className="relative mx-auto w-full max-w-[1400px] flex-1 px-6 py-12">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-72"
          style={{
            background:
              "radial-gradient(800px 280px at 30% 20%, color-mix(in srgb, var(--color-primary) 7%, transparent), transparent 70%)",
          }}
        />
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <Badge tone="brand">Visitor directory</Badge>
            <h1 className="mt-3 text-[clamp(2rem,3.5vw,3rem)] font-semibold leading-tight tracking-tight">
              Published buildings
            </h1>
            <p className="mt-3 max-w-2xl text-[var(--color-ink-muted)]">
              Each listing is a building that completed its city's onboarding
              workflow — verified, cross-checked, and summarised before going
              public. Click through for the 3D scene and the grounded
              assistant.
            </p>
          </div>
          <div className="hidden text-right text-xs text-[var(--color-ink-subtle)] sm:block">
            <div className="font-mono text-[var(--color-ink-muted)]">
              {buildings.length}
            </div>
            <div>buildings</div>
          </div>
        </div>

        {buildings.length === 0 ? (
          <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--color-border)] p-14 text-center">
            <Building2 className="mx-auto mb-3 h-7 w-7 text-[var(--color-ink-subtle)]" />
            <div className="text-lg font-semibold">Nothing published yet.</div>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Run a building through the onboarding workflow to see it land
              here.
            </p>
            <Link
              href="/onboard"
              className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-deep)]"
            >
              Start onboarding
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((b) => (
              <BuildingCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function BuildingCard({ b }: { b: Building }) {
  const sc = b.scene_config;
  return (
    <Link
      href={`/buildings/${b.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift-md)]"
    >
      <div className="relative h-44 overflow-hidden border-b border-[var(--color-border)] bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-bg-elev)] to-[var(--color-bg)]">
        <IsoBuilding id={b.id} floors={sc?.floors ?? 6} />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
          <Badge tone="accent">published</Badge>
          {sc && (
            <span className="font-mono text-[10px] text-[var(--color-ink-subtle)]">
              {sc.floors}F · {sc.unit_count}u
            </span>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--color-bg-elev)] via-transparent to-transparent opacity-60" />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <div className="font-semibold transition-colors group-hover:text-[var(--color-primary-glow)]">
          {b.name}
        </div>
        <div className="truncate text-xs text-[var(--color-ink-muted)]">
          {b.address || "—"}
        </div>
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--color-ink-subtle)] transition-colors group-hover:text-[var(--color-primary-glow)]">
          Open listing
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/**
 * Isometric stack — height = floor count, hue derived from id.
 */
function IsoBuilding({ id, floors }: { id: string; floors: number }) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  const stories = Math.max(3, Math.min(14, floors));
  const cell = 14;
  const startY = 130;
  const fillTop = `hsl(${hue}, 65%, 60%)`;
  const fillSide = `hsl(${hue}, 50%, 38%)`;
  const fillFront = `hsl(${hue}, 55%, 48%)`;

  return (
    <svg
      viewBox="0 0 240 170"
      className="absolute inset-0 m-auto h-full w-full transition-transform duration-500 group-hover:scale-105"
    >
      <defs>
        <linearGradient id={`iso-side-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillSide} stopOpacity="1" />
          <stop offset="100%" stopColor={fillSide} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`iso-front-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillFront} stopOpacity="1" />
          <stop offset="100%" stopColor={fillFront} stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* shadow */}
      <ellipse cx="120" cy={startY + 8} rx="80" ry="8" fill="rgba(0,0,0,0.5)" />

      {/* stack from bottom up */}
      {Array.from({ length: stories }).map((_, i) => {
        const yOffset = -i * cell;
        const top = startY + yOffset - cell;
        return (
          <g key={i} transform={`translate(0 ${yOffset})`}>
            {/* left side (parallelogram) */}
            <polygon
              points={`70,${startY} 120,${startY + 18} 120,${startY - cell + 18} 70,${startY - cell}`}
              fill={`url(#iso-side-${id})`}
              opacity={0.95}
            />
            {/* front */}
            <polygon
              points={`120,${startY + 18} 170,${startY} 170,${startY - cell} 120,${startY - cell + 18}`}
              fill={`url(#iso-front-${id})`}
              opacity={0.95}
            />
            {/* top */}
            <polygon
              points={`70,${startY - cell} 120,${startY - cell + 18} 170,${startY - cell} 120,${startY - cell - 18}`}
              fill={fillTop}
              opacity={i === stories - 1 ? 1 : 0}
            />
            {/* tiny windows */}
            <g
              className="origin-center"
              transform="translate(0 0)"
              opacity="0.85"
            >
              <rect x="78" y={top + 2} width="3" height="6" fill="rgba(255,255,255,0.7)" />
              <rect x="86" y={top + 2} width="3" height="6" fill="rgba(255,255,255,0.4)" />
              <rect x="94" y={top + 2} width="3" height="6" fill="rgba(255,255,255,0.7)" />
              <rect x="102" y={top + 2} width="3" height="6" fill="rgba(255,255,255,0.4)" />
              <rect x="128" y={top + 6} width="3" height="6" fill="rgba(255,255,255,0.7)" />
              <rect x="136" y={top + 8} width="3" height="6" fill="rgba(255,255,255,0.4)" />
              <rect x="144" y={top + 10} width="3" height="6" fill="rgba(255,255,255,0.7)" />
              <rect x="152" y={top + 12} width="3" height="6" fill="rgba(255,255,255,0.4)" />
            </g>
          </g>
        );
      })}

      {/* glow accent */}
      <circle
        cx="195"
        cy="40"
        r="22"
        fill={`hsl(${hue}, 70%, 60%)`}
        opacity="0.18"
        className="transition-opacity duration-300 group-hover:opacity-40"
      />
    </svg>
  );
}
