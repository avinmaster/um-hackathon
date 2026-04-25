import Link from "next/link";
import { ArrowRight, Building2, MessageCircle, Sparkles } from "lucide-react";
import { TopBar } from "../../components/nav/topbar";
import { PageHeader } from "../../components/ui/page-header";
import { EmptyState } from "../../components/ui/empty-state";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
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
      <main className="flex-1">
        <PageHeader
          eyebrow={
            <>
              <Sparkles className="h-3 w-3 text-[var(--color-primary)]" />
              Browse
            </>
          }
          title="Live buildings"
          lede="Each one finished its city's workflow. Open a card for the 3D scene and to ask the assistant."
          actions={
            <div className="hidden text-right text-[11px] text-[var(--color-ink-subtle)] sm:block">
              <div className="font-mono text-[var(--color-ink-muted)]">
                {buildings.length}
              </div>
              <div>{buildings.length === 1 ? "building" : "buildings"}</div>
            </div>
          }
        />

        <section className="mx-auto w-full max-w-[1400px] px-6 py-10">
          {buildings.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Nothing live yet"
              body="When a building finishes its workflow, it shows up here with a 3D scene and a Q&A assistant."
              action={
                <Link href="/onboard">
                  <Button>
                    Submit a building
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buildings.map((b) => (
                <BuildingCard key={b.id} b={b} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function BuildingCard({ b }: { b: Building }) {
  const sc = b.scene_config;
  return (
    <Link
      href={`/buildings/${b.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift-md)]"
    >
      <div className="relative h-44 overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <IsoBuilding id={b.id} floors={sc?.floors ?? 6} />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Badge tone="accent">live</Badge>
          {sc && (
            <span className="rounded border border-[var(--color-border)] bg-[var(--color-bg-translucent)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-ink-muted)] backdrop-blur">
              {sc.floors}F · {sc.unit_count}u
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="text-[15px] font-semibold tracking-tight transition-colors group-hover:text-[var(--color-primary)]">
          {b.name}
        </div>
        <div className="truncate text-[12px] text-[var(--color-ink-muted)]">
          {b.address || "—"}
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--color-ink-muted)]">
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            ask the assistant
          </span>
          <span className="inline-flex items-center gap-1 transition-colors group-hover:text-[var(--color-primary)]">
            Open
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Tiny isometric stack — height = floor count, hue derived from id.
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

      <ellipse cx="120" cy={startY + 8} rx="80" ry="8" fill="rgba(0,0,0,0.5)" />

      {Array.from({ length: stories }).map((_, i) => {
        const yOffset = -i * cell;
        const top = startY + yOffset - cell;
        return (
          <g key={i} transform={`translate(0 ${yOffset})`}>
            <polygon
              points={`70,${startY} 120,${startY + 18} 120,${startY - cell + 18} 70,${startY - cell}`}
              fill={`url(#iso-side-${id})`}
              opacity={0.95}
            />
            <polygon
              points={`120,${startY + 18} 170,${startY} 170,${startY - cell} 120,${startY - cell + 18}`}
              fill={`url(#iso-front-${id})`}
              opacity={0.95}
            />
            <polygon
              points={`70,${startY - cell} 120,${startY - cell + 18} 170,${startY - cell} 120,${startY - cell - 18}`}
              fill={fillTop}
              opacity={i === stories - 1 ? 1 : 0}
            />
            <g opacity="0.85">
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
    </svg>
  );
}
