"use client";
import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { TopBar } from "../../../components/nav/topbar";
import { AssistantChat } from "../../../components/building/assistant-chat";
import { Badge } from "../../../components/ui/badge";
import { api, type Building } from "../../../lib/api";

const Scene3D = dynamic(
  () => import("../../../components/building/scene-3d").then((m) => m.Scene3D),
  { ssr: false, loading: () => <SceneSkeleton /> },
);

export default function BuildingVisitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [building, setBuilding] = useState<Building | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void api
      .getPublishedBuilding(id)
      .then(setBuilding)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [id]);

  if (err) {
    return (
      <>
        <TopBar current="buildings" />
        <main className="flex-1 grid place-items-center">
          <div className="text-center">
            <p className="text-[var(--color-fail)] mb-3">{err}</p>
            <Link href="/buildings" className="text-[var(--color-ink-muted)] underline">
              ← back to directory
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (!building) {
    return (
      <>
        <TopBar current="buildings" />
        <main className="flex-1 grid place-items-center text-[var(--color-ink-subtle)] text-sm">
          Loading building…
        </main>
      </>
    );
  }

  const scene = building.scene_config ?? {
    floors: 6,
    unit_count: 24,
    footprint_m2: 400,
  };
  const profile = (building.profile || {}) as Record<string, unknown>;

  return (
    <>
      <TopBar current="buildings" />
      <main className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <Link
                href="/buildings"
                className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
              >
                ← directory
              </Link>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {building.name}
              </h1>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {building.address || "—"}
              </p>
            </div>
            <Badge tone="accent">published</Badge>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative h-[460px] lg:h-auto border-b lg:border-b-0 lg:border-r border-[var(--color-border)]">
            <Scene3D buildingId={building.id} sceneConfig={scene} />
            <ProfileOverlay profile={profile} />
          </div>
          <aside className="bg-[var(--color-bg-elev)] min-h-0 flex">
            <AssistantChat buildingId={building.id} />
          </aside>
        </div>
      </main>
    </>
  );
}

function ProfileOverlay({ profile }: { profile: Record<string, unknown> }) {
  const entries = Object.entries(profile).filter(
    ([, v]) =>
      v !== null && v !== "" && (typeof v !== "object" || (Array.isArray(v) && v.length > 0)),
  );
  if (!entries.length) return null;
  return (
    <div className="absolute bottom-4 left-4 right-4 lg:right-auto max-w-xl rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_85%,transparent)] backdrop-blur px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-ink-subtle)] mb-2">
        Profile facts · grounding the assistant
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {entries.slice(0, 10).map(([k, v]) => (
          <div key={k} className="flex gap-2 min-w-0">
            <dt className="text-[var(--color-ink-subtle)] font-mono shrink-0">{k}:</dt>
            <dd className="truncate text-[var(--color-ink)]">{prettyValue(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function prettyValue(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function SceneSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-40 w-40 shimmer rounded-md" />
    </div>
  );
}
