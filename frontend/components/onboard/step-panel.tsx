"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { api, type RunState, type TemplateStep } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { StepForm } from "./step-form";
import { UploadPanel } from "./upload-panel";
import { DecisionLog } from "./decision-log";
import { primitiveLabel } from "../status";

type Props = {
  buildingId: string;
  run: RunState;
  step: TemplateStep | null;
  onChange: (next: RunState) => void;
};

export function StepPanel({ buildingId, run, step, onChange }: Props) {
  if (!step) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center text-[var(--color-ink-subtle)] text-sm">
        Pick a step on the canvas to see its detail.
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)]/95 p-5 backdrop-blur">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)] text-[var(--color-primary-glow)]">
          <span className="font-mono text-xs">
            {primitiveLabel[step.primitive].slice(0, 2)}
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-primary-glow)]">
            {primitiveLabel[step.primitive]}
          </div>
          <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight">
            {step.title}
          </h2>
          <div className="mt-0.5 font-mono text-[10px] text-[var(--color-ink-subtle)]">
            {step.id}
          </div>
        </div>
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
              run={run}
              buildingId={buildingId}
              onChange={onChange}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function PrimitiveBody({
  step,
  run,
  buildingId,
  onChange,
}: {
  step: TemplateStep;
  run: RunState;
  buildingId: string;
  onChange: (next: RunState) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepOutputs = run.state.step_outputs || {};
  const stepOutput = (stepOutputs[step.id] as Record<string, unknown> | undefined) || {};
  const isActive = run.current_step_id === step.id;
  const decisionLog = (run.state.decision_log || []) as Record<string, unknown>[];

  const submit = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      const next = await api.submitStep(buildingId, step.id, payload);
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
      const next = await api.uploadStepDocs(buildingId, step.id, files);
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
    return (
      <div className="space-y-4">
        {alreadyDone ? (
          <SuccessBlock>
            <CheckCircle2 className="inline h-4 w-4 text-[var(--color-accent)] mr-2" />
            Submitted — form data is on the next steps.
            <pre className="mt-2 text-xs font-mono text-[var(--color-ink-muted)] whitespace-pre-wrap">
              {JSON.stringify(stepOutput, null, 2)}
            </pre>
          </SuccessBlock>
        ) : null}
        {isActive && (
          <StepForm
            fields={fields as never}
            onSubmit={submit}
            submitting={submitting}
            prefill={stepOutput}
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
    return (
      <div className="space-y-4">
        {cfg.criteria && (
          <div className="rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-ink-subtle)] mb-2">
              Verification criteria
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
        {verification.length > 0 && (
          <div className="space-y-2">
            {verification.map((v, i) => (
              <VerdictCard key={i} verdict={v} />
            ))}
          </div>
        )}
        {isActive && (
          <UploadPanel
            accepts={accepts}
            onUpload={uploadFiles}
            submitting={submitting}
            label={
              step.primitive === "upload_compliance"
                ? "These documents are verified by GLM against the criteria above. They are NOT shown publicly."
                : "These documents become part of the public listing. GLM extracts facts, the visitor assistant grounds on them."
            }
          />
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
            No contradictions detected across your documents.
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
          <article className="rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {summary}
          </article>
        ) : (
          <div className="rounded-[var(--r-md)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-ink-subtle)]">
            Summary will generate when this step is reached.
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
          </div>
        )}
        {isActive && (
          <Button
            onClick={() => submit({ confirmed: true })}
            disabled={submitting || !ready || confirmed}
          >
            {confirmed ? "Confirmed" : "Confirm and publish"}
          </Button>
        )}
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
                <span className="font-medium">Building published</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                The public listing is live — visitors can now explore the 3D
                scene and ask the grounded assistant.
              </p>
            </>
          ) : (
            <>Publish step fires automatically once the review is confirmed.</>
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
          {passed ? "Verification passed" : "Verification failed"}
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
