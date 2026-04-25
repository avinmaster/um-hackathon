"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TopBar } from "../../components/nav/topbar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "../../components/ui/card";
import { Input, Label } from "../../components/ui/input";
import { api, type City } from "../../lib/api";

export default function AdminIndex() {
  const [cities, setCities] = useState<City[]>([]);
  const [form, setForm] = useState({ name: "", region: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.listCities().then(setCities);
  }, []);

  const addCity = async () => {
    setBusy(true);
    setErr(null);
    try {
      const c = await api.createCity({
        name: form.name.trim(),
        region: form.region.trim() || undefined,
      });
      setCities((cs) => [...cs, c]);
      setForm({ name: "", region: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar current="admin" />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8">
        <section>
          <Badge tone="brand">Admin workspace</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cities</h1>
          <p className="mt-2 text-[var(--color-ink-muted)]">
            Each city owns its own workflow template. Pick one to author — or
            add a new one and draft its template with GLM.
          </p>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>New city</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Kuala Lumpur"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Region (optional)</Label>
                <Input
                  placeholder="Federal Territory"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                />
              </div>
              {err && <p className="text-sm text-[var(--color-fail)]">{err}</p>}
              <div>
                <Button onClick={addCity} disabled={!form.name || busy}>
                  {busy ? "Creating…" : "Create city"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">Existing cities</h2>
          <div className="mt-4 grid gap-3">
            {cities.length === 0 && (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-ink-subtle)]">
                No cities yet. Create the first one →
              </div>
            )}
            {cities.map((c) => (
              <Link
                key={c.id}
                href={`/admin/cities/${c.id}`}
                className="group flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 hover:border-[var(--color-border-strong)] transition-colors"
              >
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                    {c.region ? `${c.region}, ${c.country}` : c.country}
                  </div>
                </div>
                <span className="text-xs text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)]">
                  open →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
