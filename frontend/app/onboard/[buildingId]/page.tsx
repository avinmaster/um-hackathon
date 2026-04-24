"use client";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { TopBar } from "../../../components/nav/topbar";
import { WorkflowCanvas } from "../../../components/onboard/workflow-canvas";
import { StepPanel } from "../../../components/onboard/step-panel";
import { Badge } from "../../../components/ui/badge";
import {
  api,
  type Building,
  type GraphOut,
  type RunState,
  type Template,
  type TemplateStep,
} from "../../../lib/api";

export default function OnboardRunPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = use(params);
  const [building, setBuilding] = useState<Building | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [graph, setGraph] = useState<GraphOut | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, r, g] = await Promise.all([
        api.listBuildings(),
        api.getRun(buildingId),
        api.getGraph(buildingId),
      ]);
      const b = list.find((x) => x.id === buildingId) || null;
      setBuilding(b);
      setRun(r);
      setGraph(g);
      if (!picked) setPicked(g.current ?? g.nodes[0]?.id ?? null);
      // Fetch template once.
      if (b && !template) {
        const ts = await api.listTemplates(b.city_id);
        const tpl =
          ts.find((t) => t.status === "published") ||
          (ts.length ? ts[0] : null);
        setTemplate(tpl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [buildingId, picked, template]);

  useEffect(() => {
    void load();
  }, [load]);

  // Light polling so the canvas stays fresh while a step is running (the
  // upload endpoint is synchronous so this mostly handles resume).
  useEffect(() => {
    if (!run) return;
    if (run.status === "completed" || run.status === "failed") return;
    const t = setInterval(() => {
      void api.getRun(buildingId).then((next) => setRun(next));
      void api.getGraph(buildingId).then(setGraph);
    }, 3000);
    return () => clearInterval(t);
  }, [buildingId, run]);

  const onStateChange = useCallback(
    (next: RunState) => {
      setRun(next);
      void api.getGraph(buildingId).then(setGraph);
      if (!picked || picked !== next.current_step_id) {
        setPicked(next.current_step_id ?? picked);
      }
    },
    [buildingId, picked],
  );

  const pickedStep = useMemo<TemplateStep | null>(() => {
    if (!template || !picked) return null;
    return template.steps.find((s) => s.id === picked) || null;
  }, [template, picked]);

  return (
    <>
      <TopBar current="onboard" />
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[var(--color-ink-subtle)]">
                <Link href="/onboard" className="hover:text-[var(--color-ink)]">
                  onboarding
                </Link>
                <span>/</span>
                <span className="font-mono">{buildingId.slice(0, 8)}</span>
              </div>
              <h1 className="mt-1 truncate text-xl font-semibold">
                {building?.name || "Building"}
              </h1>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {building?.address || "—"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {run && (
                <Badge
                  tone={
                    run.status === "completed"
                      ? "accent"
                      : run.status === "awaiting_user"
                        ? "warn"
                        : run.status === "failed"
                          ? "fail"
                          : "info"
                  }
                >
                  {run.status}
                </Badge>
              )}
              {building?.status === "published" && (
                <Link
                  href={`/buildings/${building.id}`}
                  className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black hover:bg-[var(--color-accent-deep)] hover:text-[var(--color-ink)]"
                >
                  View public listing →
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
          <div className="relative h-[360px] lg:h-auto border-b lg:border-b-0 lg:border-r border-[var(--color-border)]">
            {graph ? (
              <WorkflowCanvas
                graph={graph}
                current={picked}
                onPickStep={setPicked}
              />
            ) : (
              <div className="grid h-full place-items-center text-[var(--color-ink-subtle)] text-sm">
                Loading graph…
              </div>
            )}
          </div>
          <div className="min-h-0 bg-[var(--color-bg-elev)]">
            {run && pickedStep && (
              <StepPanel
                buildingId={buildingId}
                run={run}
                step={pickedStep}
                onChange={onStateChange}
              />
            )}
            {!run && (
              <div className="grid h-full place-items-center text-[var(--color-ink-subtle)] text-sm">
                Loading run…
              </div>
            )}
            {error && (
              <div className="p-4 text-sm text-[var(--color-fail)]">{error}</div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
