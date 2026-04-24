"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "../../components/nav/topbar";
import { Card, CardBody, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { api, type Building, type City } from "../../lib/api";

export default function OnboardIndex() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
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
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8">
        <section>
          <div className="mb-6">
            <Badge tone="accent">Owner workspace</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Start onboarding a new building
            </h1>
            <p className="mt-2 text-[var(--color-ink-muted)]">
              Pick a city — its template takes over from there. Every AI
              decision is visible on the canvas and logged per step.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>New building</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4">
              <div>
                <Label htmlFor="bn">Building name</Label>
                <Input
                  id="bn"
                  placeholder="e.g. Menara Demo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ba">Address</Label>
                <Input
                  id="ba"
                  placeholder="12 Jalan Demo, Shah Alam"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bc">City</Label>
                <select
                  id="bc"
                  value={form.city_id}
                  onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                  className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}, {c.country}
                    </option>
                  ))}
                </select>
              </div>
              {error && (
                <p className="text-sm text-[var(--color-fail)]">{error}</p>
              )}
              <div className="pt-1">
                <Button onClick={submit} disabled={!form.name || !form.city_id || pending}>
                  {pending ? "Starting…" : "Start workflow"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold tracking-tight mb-3">Your buildings</h2>
          {buildings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-ink-subtle)]">
              Nothing onboarded yet. Start a new one →
            </div>
          ) : (
            <div className="grid gap-3">
              {buildings.map((b) => (
                <Link
                  key={b.id}
                  href={`/onboard/${b.id}`}
                  className="group flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 hover:border-[var(--color-border-strong)] transition-colors"
                >
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-[var(--color-ink-muted)] mt-1">
                      {b.address || "no address"}
                    </div>
                  </div>
                  <Badge tone={buildingTone(b.status)}>{b.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function buildingTone(s: Building["status"]) {
  switch (s) {
    case "published":
      return "accent" as const;
    case "onboarding":
      return "info" as const;
    case "rejected":
      return "fail" as const;
    case "verified":
      return "accent" as const;
    default:
      return "neutral" as const;
  }
}
