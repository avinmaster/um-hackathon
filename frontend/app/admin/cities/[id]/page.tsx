"use client";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Plus,
  Save,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { TopBar } from "../../../../components/nav/topbar";
import { TemplateAssistant } from "../../../../components/admin/template-assistant";
import { StepInspector } from "../../../../components/admin/step-inspector";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { EmptyState } from "../../../../components/ui/empty-state";
import { api, type City, type Template, type TemplateStep } from "../../../../lib/api";

// Canvas is client-only (xyflow needs the DOM).
const TemplateCanvas = dynamic(
  () =>
    import("../../../../components/admin/template-canvas").then(
      (m) => m.TemplateCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center">
        <div className="shimmer h-32 w-32 rounded-md" />
      </div>
    ),
  },
);

export default function AdminCityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [city, setCity] = useState<City | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [tab, setTab] = useState<"inspector" | "tutor">("tutor");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([api.listCities(), api.listTemplates(id)]).then(
      ([cs, ts]) => {
        setCity(cs.find((c) => c.id === id) ?? null);
        setTemplates(ts);
        setActiveId(ts[0]?.id ?? null);
      },
    );
  }, [id]);

  const active = useMemo(
    () => templates.find((t) => t.id === activeId) ?? null,
    [templates, activeId],
  );

  const applyTemplate = useCallback((next: Template) => {
    setTemplates((ts) => ts.map((t) => (t.id === next.id ? next : t)));
  }, []);

  const updateSteps = useCallback(
    (steps: TemplateStep[]) => {
      if (!active) return;
      applyTemplate({ ...active, steps });
    },
    [active, applyTemplate],
  );

  const selectedStep = useMemo<TemplateStep | null>(() => {
    if (!active || !selectedStepId) return null;
    return active.steps.find((s) => s.id === selectedStepId) ?? null;
  }, [active, selectedStepId]);

  const onSelectStep = useCallback((id: string | null) => {
    setSelectedStepId(id);
    if (id) setTab("inspector");
  }, []);

  const onUpdateStep = useCallback(
    (next: TemplateStep) => {
      if (!active) return;
      const oldId = selectedStepId;
      const nextSteps = active.steps.map((s) =>
        s.id === oldId ? next : s,
      );
      applyTemplate({ ...active, steps: nextSteps });
      // If the user renamed the step ID, follow it.
      if (oldId !== next.id) setSelectedStepId(next.id);
    },
    [active, selectedStepId, applyTemplate],
  );

  const createTemplate = async () => {
    const name = prompt(
      "Workflow name?",
      `${city?.name ?? ""} — v${templates.length + 1}`,
    );
    if (!name) return;
    try {
      const t = await api.createTemplate(id, name);
      setTemplates((ts) => [...ts, t]);
      setActiveId(t.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    setError(null);
    try {
      const t = await api.updateTemplate(active.id, active.steps);
      applyTemplate(t);
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!active) return;
    setPublishing(true);
    setError(null);
    try {
      await api.updateTemplate(active.id, active.steps);
      const t = await api.publishTemplate(active.id);
      applyTemplate(t);
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <TopBar current="admin" />
      <main className="flex flex-1 flex-col min-h-0">
        {/* Top meta bar */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]">
          <div className="mx-auto w-full max-w-[1500px] px-6 py-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--color-ink-subtle)] transition-colors hover:text-[var(--color-ink)]"
                >
                  <ArrowLeft className="h-3 w-3" />
                  All cities
                </Link>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <h1 className="text-xl font-semibold tracking-tight">
                    {city?.name ?? "…"}
                  </h1>
                  <span className="text-[var(--color-ink-subtle)]">·</span>
                  <span className="text-sm text-[var(--color-ink-muted)]">
                    workflow
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-[12px] text-[var(--color-ink-muted)]">
                  Drag steps to reorder, click to edit. Publish when it's
                  ready.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <TemplateSwitcher
                  templates={templates}
                  activeId={activeId}
                  onChange={setActiveId}
                />
                <Button variant="secondary" size="md" onClick={createTemplate}>
                  <Plus className="h-3.5 w-3.5" /> Version
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={save}
                  disabled={!active || saving}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="md"
                  onClick={publish}
                  disabled={!active || publishing}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  {publishing ? "Publishing…" : "Publish"}
                </Button>
              </div>
            </div>

            {active && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
                <Badge tone={active.status === "published" ? "accent" : "neutral"}>
                  {active.status === "published" ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> Published
                    </>
                  ) : (
                    "Draft"
                  )}
                </Badge>
                <span className="text-[var(--color-ink-subtle)]">
                  v{active.version}
                </span>
                <span className="text-[var(--color-ink-subtle)]">·</span>
                <span className="text-[var(--color-ink-muted)]">
                  {active.steps.length} step
                  {active.steps.length === 1 ? "" : "s"}
                </span>
                {savedAt && (
                  <>
                    <span className="text-[var(--color-ink-subtle)]">·</span>
                    <span className="text-[var(--color-ink-subtle)]">
                      saved{" "}
                      {savedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </>
                )}
                {error && (
                  <span className="text-[var(--color-fail)]">{error}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Workspace: canvas + right tabs */}
        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
          <section className="relative min-h-0">
            {!active ? (
              <div className="grid h-full place-items-center px-6 py-10">
                <EmptyState
                  icon={Sparkles}
                  title="No workflow yet"
                  body="Start blank and add steps, or describe the rules in the AI panel and let it draft one."
                  action={
                    <Button onClick={createTemplate}>
                      <Plus className="h-4 w-4" /> Create workflow
                    </Button>
                  }
                />
              </div>
            ) : (
              <TemplateCanvas
                steps={active.steps}
                selectedId={selectedStepId}
                onSelect={onSelectStep}
                onChange={updateSteps}
              />
            )}
          </section>

          <aside className="flex min-h-0 flex-col border-t border-[var(--color-border)] bg-[var(--color-bg-elev)] lg:border-l lg:border-t-0">
            <Tabs.Root
              value={tab}
              onValueChange={(v) => setTab(v as "inspector" | "tutor")}
              className="flex h-full min-h-0 flex-col"
            >
              <Tabs.List className="flex shrink-0 items-center gap-0.5 border-b border-[var(--color-border)] px-2 py-1.5">
                <TabTrigger value="inspector">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  Edit step
                  {selectedStep && (
                    <span className="ml-1 truncate font-mono text-[10px] text-[var(--color-ink-subtle)]">
                      {selectedStep.id}
                    </span>
                  )}
                </TabTrigger>
                <TabTrigger value="tutor">
                  <Wand2 className="h-3 w-3" />
                  AI helper
                </TabTrigger>
              </Tabs.List>
              <Tabs.Content
                value="inspector"
                className="min-h-0 flex-1 outline-none"
              >
                {active && (
                  <StepInspector
                    step={selectedStep}
                    onChange={onUpdateStep}
                  />
                )}
              </Tabs.Content>
              <Tabs.Content
                value="tutor"
                className="flex min-h-0 flex-1 flex-col outline-none"
              >
                {active && (
                  <TemplateAssistant
                    template={active}
                    onTemplate={applyTemplate}
                  />
                )}
              </Tabs.Content>
            </Tabs.Root>
          </aside>
        </div>
      </main>
    </>
  );
}

function TabTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] data-[state=active]:bg-[var(--color-bg-raised)] data-[state=active]:text-[var(--color-ink)]"
    >
      {children}
    </Tabs.Trigger>
  );
}

function TemplateSwitcher({
  templates,
  activeId,
  onChange,
}: {
  templates: Template[];
  activeId: string | null;
  onChange: (id: string) => void;
}) {
  if (templates.length <= 1) return null;
  return (
    <div className="relative">
      <select
        value={activeId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 pr-9 text-sm outline-none transition-colors hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} · v{t.version}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-subtle)]" />
    </div>
  );
}
