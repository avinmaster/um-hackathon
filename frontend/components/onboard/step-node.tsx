"use client";
import { Handle, Position } from "@xyflow/react";
import {
  FileCheck,
  FileInput,
  GitCompare,
  Image,
  ScrollText,
  UploadCloud,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "../../lib/cn";
import {
  primitiveLabel,
  statusLabel,
  type Primitive,
  type StepStatus,
} from "../status";

const primitiveIcons: Record<
  Primitive,
  ComponentType<{ className?: string }>
> = {
  collect_form: FileInput,
  upload_compliance: UploadCloud,
  upload_content: Image,
  cross_check: GitCompare,
  human_review: ScrollText,
  publish: FileCheck,
};

// One color per status. Active step gets the only "warm" treatment so it
// pops at-a-glance even when the canvas is zoomed out.
const statusBorder: Record<StepStatus, string> = {
  pending: "border-[var(--color-border)]",
  running: "border-[var(--color-primary)]",
  awaiting_user: "border-[var(--color-warn)]",
  passed: "border-[color-mix(in_srgb,var(--color-accent)_60%,var(--color-border))]",
  failed: "border-[var(--color-fail)]",
};

const statusDot: Record<StepStatus, string> = {
  pending: "bg-[var(--color-ink-subtle)]",
  running: "bg-[var(--color-primary)]",
  awaiting_user: "bg-[var(--color-warn)]",
  passed: "bg-[var(--color-accent)]",
  failed: "bg-[var(--color-fail)]",
};

const statusAccent: Record<StepStatus, string> = {
  pending: "text-[var(--color-ink-subtle)]",
  running: "text-[var(--color-primary)]",
  awaiting_user: "text-[var(--color-warn)]",
  passed: "text-[var(--color-accent)]",
  failed: "text-[var(--color-fail)]",
};

export type StepNodeData = {
  id: string;
  title: string;
  primitive: Primitive;
  status: StepStatus;
  index: number;
  total: number;
  isProcessing?: boolean;
  onClick?: () => void;
};

export function StepNode({
  data,
  selected,
}: {
  data: StepNodeData;
  selected?: boolean;
}) {
  const Icon = primitiveIcons[data.primitive];
  const isActive = data.status === "running" || data.status === "awaiting_user";
  // During a global re-evaluation (e.g. Auto-fix), every node that isn't
  // the current paused/active one shows a subtle pulsing skeleton tint so
  // the owner can see "stuff is happening across the run."
  const showProcessing = Boolean(data.isProcessing) && !isActive;
  return (
    <div
      onClick={data.onClick}
      className={cn(
        "group relative w-[280px] cursor-pointer rounded-[var(--r-lg)] border bg-[var(--color-bg-elev)] transition-all duration-200 ease-out",
        statusBorder[data.status],
        isActive && "shadow-[var(--shadow-lift-md)]",
        showProcessing && "animate-pulse opacity-70",
        selected &&
          "ring-1 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-bg)]",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "var(--color-border-strong)",
          width: 8,
          height: 8,
        }}
      />

      {/* warm rail on the left for the active step */}
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r bg-[var(--color-primary)]"
        />
      )}

      <div className="flex items-start gap-3 p-3.5">
        <div
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-raised)] transition-colors",
            isActive
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)]",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
            <span>{String(data.index + 1).padStart(2, "0")}</span>
            <span>·</span>
            <span>{primitiveLabel[data.primitive]}</span>
          </div>
          <div className="mt-0.5 truncate text-[14px] font-medium leading-snug text-[var(--color-ink)]">
            {data.title}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              statusDot[data.status],
              data.status === "running" && "pulse-dot",
            )}
          />
          <span
            className={cn(
              "text-[11px]",
              data.status === "pending"
                ? "text-[var(--color-ink-muted)]"
                : statusAccent[data.status],
            )}
          >
            {statusLabel(data.status)}
          </span>
        </div>
        <span className="font-mono text-[10px] text-[var(--color-ink-subtle)]">
          {data.index + 1}/{data.total}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "var(--color-border-strong)",
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
}
