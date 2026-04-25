"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input, Label } from "../ui/input";

type Field = {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  hint?: string;
};

export function StepForm({
  fields,
  onSubmit,
  submitting,
  prefill,
  submitLabel,
}: {
  fields: Field[];
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  submitting?: boolean;
  prefill?: Record<string, unknown>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      const v = (prefill as Record<string, unknown> | undefined)?.[f.name];
      init[f.name] = v == null ? "" : String(v);
    }
    return init;
  });

  const update = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const missing = fields.filter(
    (f) => f.required && !values[f.name]?.toString().trim(),
  );

  const submit = async () => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      let v: unknown = values[f.name];
      if (f.type === "number" && v !== "" && v != null) {
        const n = Number(v);
        if (!Number.isNaN(n)) v = n;
      }
      if (v !== "" && v != null) out[f.name] = v;
    }
    await onSubmit(out);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="grid gap-4"
    >
      {fields.map((f, i) => (
        <div key={f.name || `field-${i}`}>
          <Label htmlFor={f.name}>
            {f.label || f.name}
            {f.required ? <span className="text-[var(--color-fail)]"> *</span> : null}
          </Label>
          <Input
            id={f.name}
            type={f.type === "number" ? "number" : "text"}
            value={values[f.name] ?? ""}
            onChange={(e) => update(f.name, e.target.value)}
            placeholder={f.hint}
          />
        </div>
      ))}
      <div>
        <Button type="submit" disabled={missing.length > 0 || submitting}>
          {submitting ? "Submitting…" : submitLabel || "Submit step"}
        </Button>
        {missing.length > 0 && (
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Required: {missing.map((m) => m.label || m.name).join(", ")}
          </p>
        )}
      </div>
    </form>
  );
}
