"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, MapPin, Plus, Sparkles, X } from "lucide-react";
import { TopBar } from "../../components/nav/topbar";
import { PageHeader } from "../../components/ui/page-header";
import { EmptyState } from "../../components/ui/empty-state";
import { Field } from "../../components/ui/field";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api, type City } from "../../lib/api";

type CityWithMeta = City & { templateCount?: number; published?: boolean };

export default function AdminIndex() {
  const [cities, setCities] = useState<CityWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", region: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const list = await api.listCities();
      // Pull template metadata in parallel so cards can show "n templates · v3 published".
      const enriched = await Promise.all(
        list.map(async (c) => {
          try {
            const ts = await api.listTemplates(c.id);
            return {
              ...c,
              templateCount: ts.length,
              published: ts.some((t) => t.status === "published"),
            } satisfies CityWithMeta;
          } catch {
            return { ...c, templateCount: 0, published: false };
          }
        }),
      );
      setCities(enriched);
      setLoading(false);
    })();
  }, []);

  const totalTemplates = useMemo(
    () => cities.reduce((n, c) => n + (c.templateCount ?? 0), 0),
    [cities],
  );

  const addCity = async () => {
    setBusy(true);
    setErr(null);
    try {
      const c = await api.createCity({
        name: form.name.trim(),
        region: form.region.trim() || undefined,
      });
      setCities((cs) => [...cs, { ...c, templateCount: 0, published: false }]);
      setForm({ name: "", region: "" });
      setCreating(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar current="admin" />
      <main className="flex-1">
        <PageHeader
          eyebrow={
            <>
              <Sparkles className="h-3 w-3 text-[var(--color-primary)]" />
              Cities
            </>
          }
          title="Workflows by city"
          lede="Each city has its own workflow. Owners run it when they submit a building."
          actions={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New city
            </Button>
          }
        />

        <section className="mx-auto w-full max-w-[1400px] px-6 py-10">
          {/* stat strip */}
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Cities" value={cities.length} />
            <Stat label="Workflows" value={totalTemplates} />
            <Stat
              label="Live"
              value={cities.filter((c) => c.published).length}
            />
          </div>

          {/* inline create form (drops in above the grid) */}
          {creating && (
            <CreateCityForm
              form={form}
              onChange={setForm}
              onCancel={() => {
                setCreating(false);
                setErr(null);
                setForm({ name: "", region: "" });
              }}
              onSubmit={addCity}
              busy={busy}
              error={err}
            />
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="shimmer h-[140px] rounded-[var(--r-lg)]"
                />
              ))}
            </div>
          ) : cities.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No cities yet"
              body="A city is the area whose rules a workflow follows. Add one to start."
              action={
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Create your first city
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((c) => (
                <CityCard key={c.id} city={c} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">
        {value}
      </div>
    </div>
  );
}

function CityCard({ city }: { city: CityWithMeta }) {
  return (
    <Link
      href={`/admin/cities/${city.id}`}
      className="group flex h-full flex-col justify-between rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift-md)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)]">
          <Building2 className="h-4 w-4" />
        </div>
        {city.published ? (
          <Badge tone="accent">live</Badge>
        ) : (
          <Badge tone="neutral">draft</Badge>
        )}
      </div>
      <div className="mt-4 min-w-0">
        <div className="truncate text-base font-semibold tracking-tight">
          {city.name}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-[var(--color-ink-muted)]">
          {city.region ? `${city.region} · ` : ""}
          {city.country}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between text-[12px]">
        <span className="text-[var(--color-ink-muted)]">
          {city.templateCount ?? 0} workflow
          {city.templateCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1 text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-primary)]">
          Open
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function CreateCityForm({
  form,
  onChange,
  onCancel,
  onSubmit,
  busy,
  error,
}: {
  form: { name: string; region: string };
  onChange: (next: { name: string; region: string }) => void;
  onCancel: () => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="mb-8 rounded-[var(--r-lg)] border border-[var(--color-primary)]/40 bg-[var(--color-bg-elev)] shadow-[var(--shadow-lift-md)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
        <div>
          <div className="text-[15px] font-semibold tracking-tight">
            New city
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
            Use the city's official name. You'll build its workflow next.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-ink)]"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field
          label="City name"
          htmlFor="city-name"
          required
          help="Shown to owners."
        >
          <Input
            id="city-name"
            placeholder="e.g. Kuala Lumpur"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            autoFocus
          />
        </Field>
        <Field
          label="Region"
          htmlFor="city-region"
          hint="optional"
          help="State or federal territory."
        >
          <Input
            id="city-region"
            placeholder="Federal Territory"
            value={form.region}
            onChange={(e) => onChange({ ...form, region: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_50%,transparent)] px-5 py-3">
        <div className="min-w-0">
          {error ? (
            <span className="text-[12px] text-[var(--color-fail)]">
              {error}
            </span>
          ) : (
            <span className="text-[12px] text-[var(--color-ink-subtle)]">
              You'll build the workflow next.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!form.name || busy}>
            {busy ? "Creating…" : "Create city"}
          </Button>
        </div>
      </div>
    </div>
  );
}
