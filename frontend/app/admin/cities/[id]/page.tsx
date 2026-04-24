"use client";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { TopBar } from "../../../../components/nav/topbar";
import { TemplateEditor } from "../../../../components/admin/template-editor";
import { TemplateAssistant } from "../../../../components/admin/template-assistant";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { api, type City, type Template } from "../../../../lib/api";

export default function AdminCityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [city, setCity] = useState<City | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      api.listCities(),
      api.listTemplates(id),
    ]).then(([cs, ts]) => {
      setCity(cs.find((c) => c.id === id) ?? null);
      setTemplates(ts);
      setActiveId(ts[0]?.id ?? null);
    });
  }, [id]);

  const active = useMemo(
    () => templates.find((t) => t.id === activeId) ?? null,
    [templates, activeId],
  );

  const applyTemplate = useCallback((next: Template) => {
    setTemplates((ts) => ts.map((t) => (t.id === next.id ? next : t)));
  }, []);

  const createTemplate = async () => {
    const name = prompt("New template name?", `${city?.name ?? ""} — v${templates.length + 1}`);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <TopBar current="admin" />
      <main className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/admin"
                className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
              >
                ← cities
              </Link>
              <h1 className="mt-1 text-xl font-semibold">
                {city?.name ?? "…"}{" "}
                <span className="text-[var(--color-ink-subtle)] font-normal">
                  template editor
                </span>
              </h1>
              {active && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <Badge tone={active.status === "published" ? "accent" : "neutral"}>
                    {active.status}
                  </Badge>
                  <span className="text-[var(--color-ink-subtle)]">
                    v{active.version} · {active.steps.length} step
                    {active.steps.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {templates.length > 1 && (
                <select
                  value={activeId ?? ""}
                  onChange={(e) => setActiveId(e.target.value)}
                  className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-sm"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
              <Button variant="secondary" size="md" onClick={createTemplate}>
                + Template
              </Button>
              <Button variant="secondary" size="md" onClick={save} disabled={!active || saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="md" onClick={publish} disabled={!active || publishing}>
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-[var(--color-fail)]">{error}</p>}
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[1.3fr_1fr]">
          <section className="overflow-y-auto p-6">
            {!active ? (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
                <p className="text-sm text-[var(--color-ink-muted)]">
                  This city has no templates yet.
                </p>
                <Button className="mt-4" onClick={createTemplate}>
                  Create the first template
                </Button>
              </div>
            ) : (
              <TemplateEditor
                steps={active.steps}
                onChange={(steps) => applyTemplate({ ...active, steps })}
              />
            )}
          </section>
          <aside className="border-t lg:border-t-0 lg:border-l border-[var(--color-border)] bg-[var(--color-bg-elev)] min-h-0 flex">
            {active && (
              <TemplateAssistant template={active} onTemplate={applyTemplate} />
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
