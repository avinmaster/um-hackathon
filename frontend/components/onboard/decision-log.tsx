"use client";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";

type LogEntry = Record<string, unknown>;

export function DecisionLog({
  entries,
  stepId,
}: {
  entries: LogEntry[];
  stepId?: string;
}) {
  const [open, setOpen] = useState(false);
  const scoped = useMemo(
    () =>
      (entries || []).filter((e) =>
        stepId ? e["step_id"] === stepId : true,
      ),
    [entries, stepId],
  );
  if (!scoped.length) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">Activity</span>
          <span className="text-xs text-[var(--color-ink-subtle)]">
            ({scoped.length} AI call{scoped.length === 1 ? "" : "s"})
          </span>
        </div>
        <span className="text-xs text-[var(--color-ink-muted)]">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <div className="max-h-[520px] space-y-3 overflow-y-auto border-t border-[var(--color-border)] p-4">
          {scoped.map((e, i) => (
            <LogEntryCard key={i} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogEntryCard({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const tool = String(entry["tool"] ?? "unknown");
  const duration = Number(entry["duration_ms"] ?? 0);
  const callId = String(entry["call_id"] ?? "");
  const response = entry["response"] as Record<string, unknown> | undefined;
  const toolCalls = (response?.["tool_calls"] as Array<Record<string, unknown>>) || [];
  const content = response?.["content"] as string | null | undefined;

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]">
      <button
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--color-accent)]">{tool}</span>
            <span className="text-[10px] text-[var(--color-ink-subtle)]">
              {duration}ms · {callId.slice(0, 8)}
            </span>
          </div>
        </div>
        <span className="text-xs text-[var(--color-ink-muted)]">
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-[var(--color-border)] p-3 text-xs">
          {toolCalls.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-ink-subtle)] mb-1">
                tool args
              </div>
              {toolCalls.map((tc, j) => (
                <pre
                  key={j}
                  className={cn(
                    "whitespace-pre-wrap break-all rounded bg-[var(--color-bg-elev)] p-2 font-mono text-[11px] text-[var(--color-ink-muted)]",
                  )}
                >
                  {prettyJson(tc["arguments"])}
                </pre>
              ))}
            </div>
          )}
          {content && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--color-ink-subtle)] mb-1">
                content
              </div>
              <pre className="whitespace-pre-wrap break-words rounded bg-[var(--color-bg-elev)] p-2 font-mono text-[11px] text-[var(--color-ink-muted)]">
                {content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function prettyJson(v: unknown): string {
  if (typeof v === "string") {
    try {
      return JSON.stringify(JSON.parse(v), null, 2);
    } catch {
      return v;
    }
  }
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
