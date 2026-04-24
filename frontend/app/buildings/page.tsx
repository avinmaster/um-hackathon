import Link from "next/link";
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
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10">
        <div className="mb-8">
          <Badge tone="accent">Visitor directory</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Published buildings
          </h1>
          <p className="mt-2 text-[var(--color-ink-muted)] max-w-2xl">
            Each listing is a building that completed the city's onboarding
            workflow — verified, cross-checked, and summarised before it went
            public. Click through for the 3D scene and a grounded assistant.
          </p>
        </div>

        {buildings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] p-14 text-center">
            <div className="text-lg font-semibold">Nothing published yet.</div>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Run a building through the onboarding workflow to see it land here.
            </p>
            <Link
              href="/onboard"
              className="mt-5 inline-block rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:bg-[var(--color-accent-deep)] hover:text-[var(--color-ink)] transition-colors"
            >
              Start onboarding →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] overflow-hidden hover:border-[var(--color-border-strong)] transition-all"
    >
      <div className="relative h-40 bg-gradient-to-br from-[#1a1e24] via-[#13161b] to-[#0b0d10] border-b border-[var(--color-border)]">
        <BuildingPreview id={b.id} />
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-between">
          <Badge tone="accent">published</Badge>
          {sc && (
            <span className="text-[10px] font-mono text-[var(--color-ink-subtle)]">
              {sc.floors}F · {sc.unit_count}u
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="font-semibold group-hover:text-[var(--color-accent)] transition-colors">
          {b.name}
        </div>
        <div className="text-xs text-[var(--color-ink-muted)] mt-1 truncate">
          {b.address || "—"}
        </div>
      </div>
    </Link>
  );
}

// Tiny SVG silhouette so the directory has visual variety without loading
// full 3D scenes per card.
function BuildingPreview({ id }: { id: string }) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  const floors = 6 + (Math.abs(h) % 6);
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto h-32 w-32 opacity-70">
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue}, 55%, 65%)`} />
          <stop offset="100%" stopColor={`hsl(${hue}, 45%, 35%)`} />
        </linearGradient>
      </defs>
      <rect
        x="25"
        y={90 - floors * 7}
        width="50"
        height={floors * 7}
        rx="1"
        fill={`url(#g-${id})`}
      />
      {Array.from({ length: floors }).map((_, i) => (
        <g key={i}>
          <rect
            x="30"
            y={90 - (i + 1) * 7 + 2}
            width="5"
            height="3"
            fill="rgba(255,255,255,0.4)"
          />
          <rect
            x="40"
            y={90 - (i + 1) * 7 + 2}
            width="5"
            height="3"
            fill="rgba(255,255,255,0.25)"
          />
          <rect
            x="50"
            y={90 - (i + 1) * 7 + 2}
            width="5"
            height="3"
            fill="rgba(255,255,255,0.4)"
          />
          <rect
            x="60"
            y={90 - (i + 1) * 7 + 2}
            width="5"
            height="3"
            fill="rgba(255,255,255,0.25)"
          />
        </g>
      ))}
      <rect x="23" y="90" width="54" height="1.5" fill="rgba(0,0,0,0.5)" />
    </svg>
  );
}
