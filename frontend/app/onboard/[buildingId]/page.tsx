"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { TopBar } from "../../../components/nav/topbar";
import { WorkflowCanvas } from "../../../components/onboard/workflow-canvas";
import { StepPanel } from "../../../components/onboard/step-panel";
import { ProgressStrip } from "../../../components/onboard/progress-strip";
import { Badge } from "../../../components/ui/badge";
import { prettyStatus } from "../../../components/status";
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
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.listBuildings();
      const b = list.find((x) => x.id === buildingId) || null;
      setBuilding(b);
      if (b && !template) {
        const ts = await api.listTemplates(b.city_id);
        const tpl =
          ts.find((t) => t.status === "published") ||
          (ts.length ? ts[0] : null);
        setTemplate(tpl);
      }

      let r: RunState;
      let g: GraphOut;
      try {
        [r, g] = await Promise.all([
          api.getRun(buildingId),
          api.getGraph(buildingId),
        ]);
      } catch (innerErr) {
        const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
        if (!msg.startsWith("404")) throw innerErr;
        setStarting(true);
        await api.startRun(buildingId);
        [r, g] = await Promise.all([
          api.getRun(buildingId),
          api.getGraph(buildingId),
        ]);
        setStarting(false);
      }
      setRun(r);
      setGraph(g);
      setError(null);
      if (!picked) setPicked(g.current ?? g.nodes[0]?.id ?? null);
    } catch (e) {
      setStarting(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [buildingId, picked, template]);

  useEffect(() => {
    void load();
  }, [load]);

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
      if (next.status === "completed") {
        // Publish landed — jump focus to the publish step so the owner
        // sees the success state instead of staying on the now-stale
        // review summary.
        const publishStep =
          template?.steps.find((s) => s.primitive === "publish") ??
          template?.steps[template.steps.length - 1];
        if (publishStep) {
          setPicked(publishStep.id);
          return;
        }
      }
      if (!picked || picked !== next.current_step_id) {
        setPicked(next.current_step_id ?? picked);
      }
    },
    [buildingId, picked, template],
  );

  const pickedStep = useMemo<TemplateStep | null>(() => {
    if (!template || !picked) return null;
    return template.steps.find((s) => s.id === picked) || null;
  }, [template, picked]);

  return (
    <>
      <TopBar current="onboard" />
      <main className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-60px)] lg:flex-none lg:overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]">
          <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-end justify-between gap-4 px-6 py-4">
            <div className="min-w-0">
              <Link
                href="/onboard"
                className="inline-flex items-center gap-1 text-[11px] text-[var(--color-ink-subtle)] transition-colors hover:text-[var(--color-ink)]"
              >
                <ArrowLeft className="h-3 w-3" />
                Submit
              </Link>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {building?.name || "Building"}
                </h1>
                {pickedStep && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--color-ink-subtle)]" />
                    <span className="text-sm text-[var(--color-ink-muted)] truncate">
                      {pickedStep.title}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                {building?.address || "—"}
                {run && (
                  <>
                    <span className="mx-2 text-[var(--color-ink-subtle)]">·</span>
                    <span className="font-mono text-[11px]">
                      run {run.run_id.slice(0, 8)}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {run && <RunPulse run={run} />}
              {building?.status === "published" && (
                <Link
                  href={`/buildings/${building.id}`}
                  className="group inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-deep)]"
                >
                  View public listing
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {graph && (
          <ProgressStrip
            graph={graph}
            current={picked}
            onPickStep={setPicked}
          />
        )}

        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1.3fr_1fr]">
          <div className="relative h-[420px] lg:h-auto lg:min-h-0 lg:overflow-hidden border-b lg:border-b-0 lg:border-r border-[var(--color-border)]">
            {graph ? (
              <WorkflowCanvas
                graph={graph}
                current={picked}
                onPickStep={setPicked}
                processing={processing}
              />
            ) : error ? (
              <div className="grid h-full place-items-center p-6 text-center text-sm text-[var(--color-ink-muted)]">
                <div>
                  <div className="text-[var(--color-fail)] font-medium mb-1">
                    Couldn't load the workflow
                  </div>
                  <div className="text-xs break-all">{error}</div>
                  <button
                    onClick={() => {
                      setError(null);
                      void load();
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)]"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center text-[var(--color-ink-subtle)] text-sm">
                {starting ? "Starting workflow…" : "Loading graph…"}
              </div>
            )}
          </div>
          <div className="min-h-0 overflow-hidden bg-[var(--color-bg-elev)]">
            {run && pickedStep && (
              <StepPanel
                buildingId={buildingId}
                run={run}
                step={pickedStep}
                steps={template?.steps}
                onChange={onStateChange}
                editingStepId={editingStepId}
                startEdit={(id) => {
                  setEditingStepId(id);
                  setPicked(id);
                }}
                cancelEdit={() => setEditingStepId(null)}
                processing={processing}
                setProcessing={setProcessing}
              />
            )}
            {!run && !error && (
              <div className="grid h-full place-items-center text-[var(--color-ink-subtle)] text-sm">
                {starting ? "Starting workflow…" : "Loading run…"}
              </div>
            )}
            {!run && error && (
              <div className="grid h-full place-items-center p-6 text-center text-sm text-[var(--color-ink-muted)]">
                <div>
                  <div className="text-[var(--color-fail)] font-medium mb-1">
                    Couldn't start the run
                  </div>
                  <div className="text-xs break-all">{error}</div>
                  <button
                    onClick={() => {
                      setError(null);
                      void load();
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)]"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function RunPulse({ run }: { run: RunState }) {
  const tone =
    run.status === "completed"
      ? "accent"
      : run.status === "awaiting_user"
        ? "warn"
        : run.status === "failed"
          ? "fail"
          : "brand";

  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
      <Badge tone={tone}>
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 pulse-dot" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
        {prettyStatus(run.status)}
      </Badge>
      <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
        run · {run.run_id.slice(0, 8)}
      </span>
    </div>
  );
}
