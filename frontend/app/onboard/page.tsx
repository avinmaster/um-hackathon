"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building,
  CheckCircle2,
  ChevronRight,
  Layers,
  PlayCircle,
} from "lucide-react";
import { TopBar } from "../../components/nav/topbar";
import { PageHeader } from "../../components/ui/page-header";
import { EmptyState } from "../../components/ui/empty-state";
import { Field, Select } from "../../components/ui/field";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  api,
  type Building as BuildingT,
  type City,
  type Template,
} from "../../lib/api";
import { primitiveLabel, prettyStatus } from "../../components/status";

export default function OnboardIndex() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [buildings, setBuildings] = useState<BuildingT[]>([]);
  const [form, setForm] = useState({ name: "", address: "", city_id: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void Promise.all([api.listCities(), api.listBuildings()]).then(
      ([c, b]) => {
        setCities(c);
        setBuildings(b);
        if (c.length && !form.city_id) {
          setForm((f) => ({ ...f, city_id: c[0].id }));
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lookup the active template for the selected city so the form can preview
  // the steps the owner is about to run.
  useEffect(() => {
    if (!form.city_id) return;
    void api
      .listTemplates(form.city_id)
      .then((ts) => setTemplates(ts))
      .catch(() => setTemplates([]));
  }, [form.city_id]);

  const activeTemplate = useMemo(
    () =>
      templates.find((t) => t.status === "published") ??
      templates[0] ??
      null,
    [templates],
  );

  const submit = async () => {
    setError(null);
    try {
      const b = await api.createBuilding({
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city_id: form.city_id,
      });
      await api.startRun(b.id);
      startTransition(() => router.push(`/onboard/${b.id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <TopBar current="onboard" />
      <main className="flex-1">
        <PageHeader
          eyebrow={
            <>
              <Building className="h-3 w-3 text-[var(--color-primary)]" />
              Owner
            </>
          }
          title="Submit a building"
          lede="Pick the city, name your building, start. The city decides the steps."
        />

        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[1.1fr_1fr]">
          {/* LEFT — start a new run */}
          <section className="flex flex-col gap-5">
            <div className="rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
              <div className="flex items-start gap-3 border-b border-[var(--color-border)] px-5 py-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)]">
                  <PlayCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold tracking-tight">
                    New submission
                  </div>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
                    Once every step passes, your building goes live in the
                    public directory.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <Field
                  label="City"
                  htmlFor="bc"
                  help="Picks which workflow runs."
                  required
                >
                  <Select
                    id="bc"
                    value={form.city_id}
                    onChange={(e) =>
                      setForm({ ...form, city_id: e.target.value })
                    }
                  >
                    {cities.length === 0 && (
                      <option value="">— no cities yet —</option>
                    )}
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.region ? `, ${c.region}` : ""}, {c.country}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Building name"
                    htmlFor="bn"
                    help="Public name."
                    required
                  >
                    <Input
                      id="bn"
                      placeholder="e.g. Menara Demo"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Address"
                    htmlFor="ba"
                    hint="optional"
                  >
                    <Input
                      id="ba"
                      placeholder="12 Jalan Demo, Shah Alam"
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                  </Field>
                </div>

                {error && (
                  <p className="text-[12px] text-[var(--color-fail)]">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_50%,transparent)] px-5 py-3">
                <span className="text-[12px] text-[var(--color-ink-subtle)]">
                  You can pause and resume anytime.
                </span>
                <Button
                  onClick={submit}
                  disabled={!form.name || !form.city_id || pending}
                >
                  {pending ? "Starting…" : "Start"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <TemplatePreview template={activeTemplate} />
          </section>

          {/* RIGHT — your buildings */}
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold tracking-tight">
                Your buildings
              </h2>
              <span className="text-[11px] text-[var(--color-ink-subtle)]">
                {buildings.length} total
              </span>
            </div>
            {buildings.length === 0 ? (
              <EmptyState
                icon={Building}
                title="No buildings yet"
                body="Once you start, it shows up here so you can pick up where you left off."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {buildings.map((b) => (
                  <li key={b.id}>
                    <BuildingRow b={b} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function TemplatePreview({ template }: { template: Template | null }) {
  if (!template) {
    return (
      <div className="rounded-[var(--r-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev)] px-5 py-4">
        <div className="flex items-center gap-2 text-[12px] text-[var(--color-ink-muted)]">
          <Layers className="h-3.5 w-3.5" />
          This city has no workflow yet — an admin needs to build one first.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          <span className="text-[12px] font-medium">
            Steps you'll take
          </span>
          <Badge tone={template.status === "published" ? "accent" : "neutral"}>
            {template.status === "published" ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> Live
              </>
            ) : (
              "Draft"
            )}
          </Badge>
        </div>
        <span className="font-mono text-[10px] text-[var(--color-ink-subtle)]">
          {template.steps.length} step
          {template.steps.length === 1 ? "" : "s"}
        </span>
      </div>
      <ol className="divide-y divide-[var(--color-border)]">
        {template.steps.map((s, i) => (
          <li
            key={s.id}
            className="flex items-center gap-3 px-5 py-2.5 text-[13px]"
          >
            <span className="font-mono text-[10px] text-[var(--color-ink-subtle)] w-6">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 truncate">{s.title}</span>
            <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">
              {primitiveLabel[s.primitive]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BuildingRow({ b }: { b: BuildingT }) {
  return (
    <Link
      href={`/onboard/${b.id}`}
      className="group flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-3 transition-colors hover:border-[var(--color-border-strong)]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-primary)]">
        <Building className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-[var(--color-ink)]">
          {b.name}
        </div>
        <div className="truncate text-[12px] text-[var(--color-ink-muted)]">
          {b.address || "no address"}
        </div>
      </div>
      <Badge tone={statusTone(b.status)}>{prettyStatus(b.status)}</Badge>
      <ChevronRight className="h-3.5 w-3.5 text-[var(--color-ink-subtle)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]" />
    </Link>
  );
}

function statusTone(s: BuildingT["status"]) {
  switch (s) {
    case "published":
    case "verified":
      return "accent" as const;
    case "onboarding":
      return "info" as const;
    case "rejected":
      return "fail" as const;
    default:
      return "neutral" as const;
  }
}
