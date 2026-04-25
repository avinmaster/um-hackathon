"use client";
import { MousePointerClick } from "lucide-react";
import type { TemplateStep } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Field, Select } from "../ui/field";
import { Input, Textarea } from "../ui/input";
import { PRIMITIVES } from "./template-canvas";

type Primitive = TemplateStep["primitive"];

const PRIM_LABEL: Record<Primitive, string> = {
  collect_form: "Collect form",
  upload_compliance: "Upload compliance",
  upload_content: "Upload content",
  cross_check: "Cross-check",
  human_review: "Human review",
  publish: "Publish",
};

export function StepInspector({
  step,
  onChange,
}: {
  step: TemplateStep | null;
  onChange: (next: TemplateStep) => void;
}) {
  if (!step) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <div className="grid h-9 w-9 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink-muted)]">
          <MousePointerClick className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold tracking-tight">
          Pick a step
        </div>
        <p className="max-w-[280px] text-[12px] leading-relaxed text-[var(--color-ink-muted)]">
          Click a step on the canvas to edit it. Drag steps to reorder.
        </p>
      </div>
    );
  }

  const update = (patch: Partial<TemplateStep>) =>
    onChange({ ...step, ...patch });
  const updateConfig = (patch: Record<string, unknown>) =>
    onChange({ ...step, config: { ...(step.config || {}), ...patch } });

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-[var(--color-border)] px-5 py-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-ink-muted)]">
          step
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
            edit step
          </div>
          <h3 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight">
            {step.title || "Untitled step"}
          </h3>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge tone="brand">{PRIM_LABEL[step.primitive]}</Badge>
            <span className="font-mono text-[10px] text-[var(--color-ink-subtle)]">
              {step.id}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="grid gap-4">
          <Field
            label="Title"
            htmlFor="title"
            help="What the owner sees."
          >
            <Input
              id="title"
              value={step.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="ID"
              htmlFor="id"
              help="Internal key. Keep it stable."
            >
              <Input
                id="id"
                value={step.id}
                onChange={(e) => update({ id: e.target.value })}
              />
            </Field>
            <Field
              label="Step type"
              htmlFor="prim"
              help="What this step does."
            >
              <Select
                id="prim"
                value={step.primitive}
                onChange={(e) =>
                  update({ primitive: e.target.value as Primitive })
                }
              >
                {PRIMITIVES.map((p) => (
                  <option key={p} value={p}>
                    {PRIM_LABEL[p]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="border-t border-[var(--color-border)] pt-5">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
              Settings
            </div>
            <PrimitiveConfig step={step} onChange={updateConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PrimitiveConfig({
  step,
  onChange,
}: {
  step: TemplateStep;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const config = (step.config || {}) as Record<string, unknown>;

  if (step.primitive === "collect_form") {
    const fields = (config.fields as unknown[]) || [];
    return (
      <Field
        label="Fields"
        help="JSON array. Each entry needs name and label."
      >
        <Textarea
          className="min-h-[180px] font-mono text-[12px]"
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
      </Field>
    );
  }

  if (step.primitive === "upload_compliance") {
    const criteria = (config.criteria as string[]) || [];
    return (
      <div className="grid gap-4">
        <Field
          label="Document type"
          help="Internal label. Shown in logs."
        >
          <Input
            value={(config.doc_type as string) || ""}
            onChange={(e) => onChange({ doc_type: e.target.value })}
            placeholder="fire_safety_cert"
          />
        </Field>
        <Field
          label="What to check"
          help="One rule per line. The AI checks each one on every uploaded document."
        >
          <Textarea
            className="min-h-[120px]"
            value={criteria.join("\n")}
            onChange={(e) =>
              onChange({
                criteria: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
        {criteria.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {criteria.map((c, i) => (
              <Badge key={i} tone="brand">
                {c.length > 32 ? `${c.slice(0, 32)}…` : c}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step.primitive === "upload_content") {
    const extract = (config.extract_fields as string[]) || [];
    return (
      <Field
        label="Things to extract"
        help="Comma-separated. The AI reads the document and pulls these into the public listing."
      >
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
      </Field>
    );
  }

  if (step.primitive === "cross_check") {
    const compare = (config.compare as string[]) || [];
    return (
      <Field
        label="Steps to compare"
        help="Comma-separated step IDs. The AI looks for contradictions between them."
      >
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
          placeholder="collect-form-1, upload-compliance-2"
        />
      </Field>
    );
  }

  return (
    <p className="text-[12px] text-[var(--color-ink-subtle)]">
      Nothing to set for this step type.
    </p>
  );
}
