"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  FileInput,
  GitCompare,
  Image,
  ScrollText,
  UploadCloud,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { api, type DemoPreview, type RunState, type TemplateStep } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { StepForm } from "./step-form";
import { UploadPanel } from "./upload-panel";
import { DecisionLog } from "./decision-log";
import { Markdown } from "../ui/markdown";
import { primitiveLabel, type Primitive } from "../status";
import { Sparkles, Undo2, Wand2 } from "lucide-react";

const AUTOFILLABLE_STEP_IDS = new Set([
  "basics",
  "ownership",
  "fire_safety",
  "zoning",
  "layout_and_content",
]);

const PRIMITIVE_ICON: Record<Primitive, LucideIcon> = {
  collect_form: FileInput,
  upload_compliance: UploadCloud,
  upload_content: Image,
  cross_check: GitCompare,
  human_review: ScrollText,
  publish: FileCheck,
};

type Props = {
  buildingId: string;
  run: RunState;
  step: TemplateStep | null;
  steps?: TemplateStep[];
  onChange: (next: RunState) => void;
  editingStepId?: string | null;
  startEdit?: (stepId: string) => void;
  cancelEdit?: () => void;
  processing?: boolean;
  setProcessing?: (b: boolean) => void;
};

export function StepPanel({
  buildingId,
  run,
  step,
  steps,
  onChange,
  editingStepId,
  startEdit,
  cancelEdit,
  processing,
  setProcessing,
}: Props) {
  if (!step) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center text-[var(--color-ink-subtle)] text-sm">
        Pick a step on the canvas to see its detail.
      </div>
    );
  }
  const isActive = run.current_step_id === step.id;
  const isEditing = editingStepId === step.id;
  const hasOutput = Boolean(
    (run.state.step_outputs as Record<string, unknown> | undefined)?.[step.id],
  );
  const editableHere =
    step.primitive === "collect_form" ||
    step.primitive === "upload_compliance" ||
    step.primitive === "upload_content";
  const canEdit = hasOutput && !isActive && !isEditing && editableHere;
  const editLabel = step.primitive === "collect_form" ? "Edit" : "Replace";
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]/95 p-5 backdrop-blur">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-primary)]">
          {(() => {
            const Icon = PRIMITIVE_ICON[step.primitive];
            return <Icon className="h-4 w-4" />;
          })()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-primary)]">
            {primitiveLabel[step.primitive]}
          </div>
          <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight">
            {step.title}
          </h2>
          <div className="mt-0.5 font-mono text-[10px] text-[var(--color-ink-subtle)]">
            {step.id}
          </div>
        </div>
        {processing ? (
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-ink-muted)]">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-primary)] opacity-60 pulse-dot" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
            </span>
            Processing…
          </span>
        ) : (
          <>
            {canEdit && startEdit && (
              <button
                type="button"
                onClick={() => startEdit(step.id)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)]"
              >
                <Undo2 className="h-3 w-3" />
                {editLabel}
              </button>
            )}
            {isEditing && cancelEdit && (
              <button
                type="button"
                onClick={cancelEdit}
                className="shrink-0 inline-flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Cancel edit
              </button>
            )}
          </>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <PrimitiveBody
              step={step}
              steps={steps}
              run={run}
              buildingId={buildingId}
              onChange={onChange}
              editingStepId={editingStepId ?? null}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              setProcessing={setProcessing}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function PrimitiveBody({
  step,
  steps,
  run,
  buildingId,
  onChange,
  editingStepId,
  startEdit,
  cancelEdit,
  setProcessing,
}: {
  step: TemplateStep;
  steps?: TemplateStep[];
  run: RunState;
  buildingId: string;
  onChange: (next: RunState) => void;
  editingStepId: string | null;
  startEdit?: (stepId: string) => void;
  cancelEdit?: () => void;
  setProcessing?: (b: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoPrefill, setDemoPrefill] = useState<Record<string, unknown> | null>(null);
  const [prefillKey, setPrefillKey] = useState(0);
  const stepOutputs = run.state.step_outputs || {};
  const stepOutput = (stepOutputs[step.id] as Record<string, unknown> | undefined) || {};
  const isActive = run.current_step_id === step.id;
  const isEditing = editingStepId === step.id;
  const decisionLog = (run.state.decision_log || []) as Record<string, unknown>[];

  const submit = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      const next = isEditing
        ? await api.editFormStep(buildingId, step.id, payload)
        : await api.submitStep(buildingId, step.id, payload);
      cancelEdit?.();
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setSubmitting(true);
    setError(null);
    try {
      const next = isEditing
        ? await api.editUploadStep(buildingId, step.id, files)
        : await api.uploadStepDocs(buildingId, step.id, files);
      cancelEdit?.();
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const verification = useMemo(() => {
    return ((run.state.verification_results as Array<Record<string, unknown>>) || []).filter(
      (v) => v["step_id"] === step.id,
    );
  }, [run.state.verification_results, step.id]);

  if (step.primitive === "collect_form") {
    const cfg = (step.config || {}) as { fields?: Array<Record<string, unknown>> };
    const fields = cfg.fields || [];
    const alreadyDone = Boolean(stepOutput && Object.keys(stepOutput).length);
    const showInput = isActive || isEditing;
    return (
      <div className="space-y-4">
        {isEditing && <EditBanner onCancel={cancelEdit} />}
        {alreadyDone && !isEditing ? (
          <SuccessBlock>
            <CheckCircle2 className="inline h-4 w-4 text-[var(--color-accent)] mr-2" />
            Submitted. Carrying this forward to the next step.
            <pre className="mt-2 text-xs font-mono text-[var(--color-ink-muted)] whitespace-pre-wrap">
              {JSON.stringify(stepOutput, null, 2)}
            </pre>
          </SuccessBlock>
        ) : null}
        {showInput && !alreadyDone && (
          <DemoFormPreview
            stepId={step.id}
            buildingId={buildingId}
            submitting={submitting}
            setError={setError}
            onPreview={(values) => {
              setDemoPrefill(values);
              setPrefillKey((k) => k + 1);
            }}
          />
        )}
        {showInput && (
          <StepForm
            key={prefillKey}
            fields={fields as never}
            onSubmit={submit}
            submitting={submitting}
            prefill={demoPrefill ?? stepOutput}
            submitLabel={isEditing ? "Save changes" : undefined}
          />
        )}
        {error && <p className="text-sm text-[var(--color-fail)]">{error}</p>}
        <DecisionLog entries={decisionLog} stepId={step.id} />
      </div>
    );
  }

  if (step.primitive === "upload_compliance" || step.primitive === "upload_content") {
    const cfg = (step.config || {}) as { accepts?: string[]; criteria?: string[] };
    const accepts = cfg.accepts;
    const showInput = isActive || isEditing;
    return (
      <div className="space-y-4">
        {isEditing && <EditBanner onCancel={cancelEdit} />}
        {cfg.criteria && (
          <div className="rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-ink-subtle)] mb-2">
              What we check
            </div>
            <ul className="space-y-1.5 text-sm">
              {cfg.criteria.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[var(--color-primary-glow)] font-mono">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {verification.length > 0 && !isEditing && (
          <div className="space-y-2">
            {verification.map((v, i) => (
              <VerdictCard key={i} verdict={v} />
            ))}
          </div>
        )}
        {showInput && (
          <>
            <DemoDocPreview
              stepId={step.id}
              buildingId={buildingId}
              submitting={submitting}
              setSubmitting={setSubmitting}
              setError={setError}
              onChange={onChange}
            />
            <UploadPanel
              accepts={accepts}
              onUpload={uploadFiles}
              submitting={submitting}
              label={
                isEditing
                  ? "Replace the existing document. Other steps stay as-is."
                  : step.primitive === "upload_compliance"
                    ? "Checked against the rules above. Not shown publicly."
                    : "Used in the public listing. Visitors can ask the assistant about them."
              }
            />
          </>
        )}
        {error && <p className="text-sm text-[var(--color-fail)]">{error}</p>}
        <DecisionLog entries={decisionLog} stepId={step.id} />
      </div>
    );
  }

  if (step.primitive === "cross_check") {
    const contradictions =
      (stepOutput["contradictions"] as Array<Record<string, unknown>>) || [];
    const resolved = Boolean(stepOutput["resolved"]);
    return (
      <div className="space-y-4">
        {contradictions.length === 0 && resolved && (
          <SuccessBlock>
            <CheckCircle2 className="inline h-4 w-4 text-[var(--color-accent)] mr-2" />
            No contradictions found across your documents.
          </SuccessBlock>
        )}
        {contradictions.length > 0 && (
          <div className="space-y-2">
            {contradictions.map((c, i) => (
              <ContradictionCard key={i} c={c} />
            ))}
          </div>
        )}
        {isActive && contradictions.length > 0 && (
          <Button onClick={() => submit({ acknowledged: true })} disabled={submitting}>
            {submitting ? "Confirming…" : "Acknowledge and continue"}
          </Button>
        )}
        <DecisionLog entries={decisionLog} stepId={step.id} />
      </div>
    );
  }

  if (step.primitive === "human_review") {
    const summary = String(stepOutput["summary_markdown"] || "");
    const gaps = (stepOutput["gaps"] as string[]) || [];
    const ready = Boolean(stepOutput["ready"]);
    const confirmed = Boolean(stepOutput["confirmed"]);
    return (
      <div className="space-y-4">
        {summary ? (
          <article className="rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm leading-relaxed">
            <Markdown>{summary}</Markdown>
          </article>
        ) : (
          <div className="rounded-[var(--r-md)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-ink-subtle)]">
            A summary will appear here when this step starts.
          </div>
        )}
        {gaps.length > 0 && (
          <div className="rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)] p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-[var(--color-warn)]" />
              <span className="font-medium">Gaps to resolve</span>
            </div>
            <ul className="list-disc pl-5 text-[var(--color-ink-muted)]">
              {gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
            <div className="mt-3">
              <AutoFixButton
                buildingId={buildingId}
                submitting={submitting}
                setSubmitting={setSubmitting}
                setError={setError}
                onChange={onChange}
                setProcessing={setProcessing}
              />
            </div>
          </div>
        )}
        <EditPanel
          steps={steps}
          currentStepId={step.id}
          stepOutputs={stepOutputs}
          startEdit={startEdit}
        />
        {isActive && (
          <Button
            onClick={() => submit({ confirmed: true })}
            disabled={submitting || !ready || confirmed}
          >
            {confirmed ? "Confirmed" : "Confirm and publish"}
          </Button>
        )}
        {error && <p className="text-sm text-[var(--color-fail)]">{error}</p>}
        <DecisionLog entries={decisionLog} stepId={step.id} />
      </div>
    );
  }

  if (step.primitive === "publish") {
    const done = Boolean(stepOutput["published"]);
    return (
      <div className="space-y-4">
        <div
          className={
            done
              ? "rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] p-4"
              : "rounded-[var(--r-md)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-ink-subtle)]"
          }
        >
          {done ? (
            <>
              <div className="flex items-center gap-2 text-[var(--color-accent)]">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Live</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                The listing is public — visitors can explore the 3D scene and
                ask the assistant.
              </p>
            </>
          ) : (
            <>Publishing happens automatically once you confirm the review.</>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function SuccessBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] p-3 text-sm">
      {children}
    </div>
  );
}

function VerdictCard({ verdict }: { verdict: Record<string, unknown> }) {
  const passed = Boolean(verdict["passed"]);
  const summary = String(verdict["summary"] || "");
  const reasons = (verdict["reasons"] as Array<Record<string, unknown>>) || [];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-[var(--r-md)] border p-3 text-sm ${
        passed
          ? "border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
          : "border-[color-mix(in_srgb,var(--color-fail)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-fail)_10%,transparent)]"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {passed ? (
          <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
        ) : (
          <XCircle className="h-4 w-4 text-[var(--color-fail)]" />
        )}
        <span className="font-medium">
          {passed ? "Looks good" : "Needs a fix"}
        </span>
      </div>
      <div className="text-[var(--color-ink-muted)]">{summary}</div>
      {reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs">
          {reasons.map((r, i) => {
            const v = String(r["verdict"] || "");
            return (
              <li key={i} className="flex gap-2">
                <Badge tone={v === "pass" ? "accent" : v === "fail" ? "fail" : "warn"}>
                  {v}
                </Badge>
                <div className="min-w-0">
                  <div className="truncate">{String(r["criterion"])}</div>
                  {r["evidence"] ? (
                    <div className="mt-0.5 text-[10px] text-[var(--color-ink-subtle)] truncate">
                      evidence: {String(r["evidence"])}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </motion.div>
  );
}

function ContradictionCard({ c }: { c: Record<string, unknown> }) {
  const severity = String(c["severity"] || "minor");
  const field = String(c["field"] || "");
  const explanation = String(c["explanation"] || "");
  const values = (c["values"] as Array<Record<string, unknown>>) || [];
  const tone = severity === "major" ? "fail" : "warn";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm"
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge tone={tone}>{severity}</Badge>
        <span className="font-medium">{field}</span>
      </div>
      <p className="text-[var(--color-ink-muted)]">{explanation}</p>
      {values.length > 0 && (
        <div className="mt-2 text-xs font-mono text-[var(--color-ink-subtle)]">
          {values.map((v, i) => (
            <div key={i}>
              {String(v["source"])}: {String(v["value"])}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function DemoFormPreview({
  stepId,
  buildingId,
  submitting,
  setError,
  onPreview,
}: {
  stepId: string;
  buildingId: string;
  submitting: boolean;
  setError: (s: string | null) => void;
  onPreview: (values: Record<string, unknown>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [filled, setFilled] = useState(false);
  if (!AUTOFILLABLE_STEP_IDS.has(stepId)) return null;

  const click = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await api.getDemoPreview(buildingId, stepId);
      if (p.primitive !== "collect_form") return;
      onPreview(p.form_values);
      setFilled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={submitting || loading}
      onClick={click}
      className="inline-flex items-center gap-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)] disabled:opacity-50"
      title="Fills the form with realistic demo data. Review the values, then submit."
    >
      <Wand2 className="h-3.5 w-3.5" />
      {loading
        ? "Loading…"
        : filled
          ? "Re-fill demo data"
          : "Fill with demo data"}
    </button>
  );
}

function DemoDocPreview({
  stepId,
  buildingId,
  submitting,
  setSubmitting,
  setError,
  onChange,
}: {
  stepId: string;
  buildingId: string;
  submitting: boolean;
  setSubmitting: (b: boolean) => void;
  setError: (s: string | null) => void;
  onChange: (next: RunState) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<
    Array<{ filename: string; mime: string; text: string; view_url: string }> | null
  >(null);
  if (!AUTOFILLABLE_STEP_IDS.has(stepId)) return null;

  const preview = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await api.getDemoPreview(buildingId, stepId);
      if (p.primitive === "upload_compliance" || p.primitive === "upload_content") {
        setDocs(p.docs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const next = await api.autofillStep(buildingId, stepId);
      onChange(next);
      setDocs(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!docs) {
    return (
      <button
        type="button"
        disabled={submitting || loading}
        onClick={preview}
        className="inline-flex items-center gap-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs text-[var(--color-ink-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)] disabled:opacity-50"
        title="Preview a realistic demo document. You'll confirm before it's submitted."
      >
        <Wand2 className="h-3.5 w-3.5" />
        {loading ? "Loading preview…" : "Preview demo document"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {docs.map((d) => (
        <div
          key={d.filename}
          className="rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2 text-xs">
            <span className="font-mono text-[var(--color-ink-muted)] truncate">
              {d.filename}
            </span>
            <a
              href={api.demoDocUrl(d.filename)}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-ink-subtle)] hover:text-[var(--color-primary-glow)]"
            >
              open raw ↗
            </a>
          </div>
          <div className="max-h-[360px] overflow-auto p-3 text-sm">
            {d.mime === "application/pdf" ? (
              <iframe
                src={api.demoDocUrl(d.filename)}
                title={d.filename}
                className="h-[360px] w-full"
              />
            ) : (
              <Markdown>{d.text}</Markdown>
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button onClick={commit} disabled={submitting}>
          {submitting ? "Uploading…" : "Use this document"}
        </Button>
        <button
          type="button"
          onClick={() => setDocs(null)}
          disabled={submitting}
          className="rounded-md px-2 py-1 text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AutoFixButton({
  buildingId,
  submitting,
  setSubmitting,
  setError,
  onChange,
  setProcessing,
}: {
  buildingId: string;
  submitting: boolean;
  setSubmitting: (b: boolean) => void;
  setError: (s: string | null) => void;
  onChange: (next: RunState) => void;
  setProcessing?: (b: boolean) => void;
}) {
  const click = async () => {
    setSubmitting(true);
    setProcessing?.(true);
    setError(null);
    try {
      const next = await api.autoFix(buildingId);
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
      setProcessing?.(false);
    }
  };

  return (
    <button
      type="button"
      onClick={click}
      disabled={submitting}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)] disabled:opacity-50"
      title="Asks GLM to reconcile the form with your uploaded documents and applies the fix."
    >
      <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
      {submitting ? "Fixing…" : "Auto-fix with AI"}
    </button>
  );
}

function EditBanner({ onCancel }: { onCancel?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <Undo2 className="h-4 w-4 text-[var(--color-primary)]" />
        <span>
          <span className="font-medium">Editing this step.</span>{" "}
          <span className="text-[var(--color-ink-muted)]">
            Cross-check and review will re-run; other steps stay as-is.
          </span>
        </span>
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function EditPanel({
  steps,
  currentStepId,
  stepOutputs,
  startEdit,
}: {
  steps?: TemplateStep[];
  currentStepId: string;
  stepOutputs: Record<string, unknown>;
  startEdit?: (stepId: string) => void;
}) {
  if (!steps || steps.length === 0 || !startEdit) return null;
  const currentIdx = steps.findIndex((s) => s.id === currentStepId);
  const editable = steps
    .slice(0, currentIdx === -1 ? steps.length : currentIdx)
    .filter(
      (s) =>
        stepOutputs[s.id] &&
        (s.primitive === "collect_form" ||
          s.primitive === "upload_compliance" ||
          s.primitive === "upload_content"),
    );
  if (editable.length === 0) return null;

  return (
    <div className="rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <Undo2 className="h-4 w-4 text-[var(--color-ink-muted)]" />
        <span className="font-medium">Edit a previous step</span>
      </div>
      <p className="text-xs text-[var(--color-ink-subtle)] mb-3">
        Change one form value or swap one document. Other steps keep their
        data; cross-check and review re-run on the updated state.
      </p>
      <ul className="space-y-1.5">
        {editable.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1.5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm">{s.title}</div>
              <div className="font-mono text-[10px] text-[var(--color-ink-subtle)]">
                {primitiveLabel[s.primitive]}
              </div>
            </div>
            <button
              type="button"
              onClick={() => startEdit(s.id)}
              className="shrink-0 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] hover:text-[var(--color-primary-glow)]"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
