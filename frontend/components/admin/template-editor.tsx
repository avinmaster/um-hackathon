"use client";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import type { TemplateStep } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input, Label, Textarea } from "../ui/input";
import { primitiveLabel } from "../status";

const PRIMITIVES = [
  "collect_form",
  "upload_compliance",
  "upload_content",
  "cross_check",
  "human_review",
  "publish",
] as const;

export function TemplateEditor({
  steps,
  onChange,
}: {
  steps: TemplateStep[];
  onChange: (next: TemplateStep[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => {
    const next = steps.filter((_, j) => j !== i);
    onChange(next);
  };
  const update = (i: number, patch: Partial<TemplateStep>) => {
    const next = steps.map((s, j) => (i === j ? { ...s, ...patch } : s));
    onChange(next);
  };
  const updateConfig = (i: number, patch: Record<string, unknown>) => {
    const next = steps.map((s, j) =>
      i === j ? { ...s, config: { ...(s.config || {}), ...patch } } : s,
    );
    onChange(next);
  };
  const addStep = () => {
    const id = `step_${steps.length + 1}`;
    onChange([
      ...steps,
      { id, primitive: "collect_form", title: "New step", config: {} },
    ]);
  };

  if (!steps.length) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-10 text-center">
        <p className="text-sm text-[var(--color-ink-muted)]">
          No steps yet. Describe your city's requirements in the panel to the right and
          let GLM draft a starter template.
        </p>
        <Button className="mt-4" onClick={addStep} variant="secondary">
          Or start from scratch
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const open = openId === s.id;
        return (
          <div
            key={s.id}
            className={cn(
              "rounded-lg border bg-[var(--color-bg-elev)] transition-colors",
              open
                ? "border-[var(--color-accent)]"
                : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
            )}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="text-xs font-mono text-[var(--color-ink-subtle)] w-6 text-right">
                {i + 1}.
              </div>
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => setOpenId(open ? null : s.id)}
              >
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{primitiveLabel[s.primitive]}</Badge>
                  <span className="text-xs text-[var(--color-ink-subtle)] font-mono">
                    {s.id}
                  </span>
                </div>
                <div className="mt-0.5 font-medium truncate">{s.title}</div>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn onClick={() => move(i, -1)} disabled={i === 0} label="Move up">
                  <ChevronUp className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  onClick={() => move(i, 1)}
                  disabled={i === steps.length - 1}
                  label="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn onClick={() => remove(i)} label="Remove">
                  <Trash2 className="h-3.5 w-3.5 text-[var(--color-fail)]" />
                </IconBtn>
              </div>
            </div>
            {open && (
              <div className="grid gap-3 border-t border-[var(--color-border)] p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Step id</Label>
                    <Input
                      value={s.id}
                      onChange={(e) => update(i, { id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Primitive</Label>
                    <select
                      value={s.primitive}
                      onChange={(e) =>
                        update(i, { primitive: e.target.value as TemplateStep["primitive"] })
                      }
                      className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
                    >
                      {PRIMITIVES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={s.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                  />
                </div>
                <PrimitiveConfigEditor
                  primitive={s.primitive}
                  config={(s.config || {}) as Record<string, unknown>}
                  onChange={(patch) => updateConfig(i, patch)}
                />
              </div>
            )}
          </div>
        );
      })}
      <div className="pt-2">
        <Button variant="secondary" onClick={addStep}>
          + Add step
        </Button>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      title={label}
      className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-ink)] disabled:opacity-30 disabled:pointer-events-none"
      {...rest}
    >
      {children}
    </button>
  );
}

function PrimitiveConfigEditor({
  primitive,
  config,
  onChange,
}: {
  primitive: TemplateStep["primitive"];
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  if (primitive === "collect_form") {
    const fields = ((config.fields as unknown[]) || []) as Array<{
      name?: string;
      label?: string;
      type?: string;
      required?: boolean;
    }>;
    return (
      <div>
        <Label>Fields (JSON)</Label>
        <Textarea
          className="font-mono text-xs min-h-[160px]"
          value={JSON.stringify(fields, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange({ fields: parsed });
            } catch {
              /* ignore until valid */
            }
          }}
        />
      </div>
    );
  }
  if (primitive === "upload_compliance") {
    const criteria = (config.criteria as string[]) || [];
    return (
      <div className="grid gap-3">
        <div>
          <Label>Doc type</Label>
          <Input
            value={(config.doc_type as string) || ""}
            onChange={(e) => onChange({ doc_type: e.target.value })}
            placeholder="e.g. fire_safety_cert"
          />
        </div>
        <div>
          <Label>Verification criteria (one per line)</Label>
          <Textarea
            className="min-h-[120px]"
            value={criteria.join("\n")}
            onChange={(e) =>
              onChange({
                criteria: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </div>
      </div>
    );
  }
  if (primitive === "upload_content") {
    const extract = (config.extract_fields as string[]) || [];
    return (
      <div>
        <Label>Fields to extract (comma-separated)</Label>
        <Input
          value={extract.join(", ")}
          onChange={(e) =>
            onChange({
              extract_fields: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="floor_layout, amenities, photo_captions"
        />
      </div>
    );
  }
  if (primitive === "cross_check") {
    const compare = (config.compare as string[]) || [];
    return (
      <div>
        <Label>Step IDs to compare (comma-separated)</Label>
        <Input
          value={compare.join(", ")}
          onChange={(e) =>
            onChange({
              compare: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
    );
  }
  return (
    <p className="text-xs text-[var(--color-ink-subtle)]">
      This primitive has no additional configuration.
    </p>
  );
}
