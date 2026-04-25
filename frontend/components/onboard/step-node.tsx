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

const primitiveIcons: Record<Primitive, ComponentType<{ className?: string }>> = {
  collect_form: FileInput,
  upload_compliance: UploadCloud,
  upload_content: Image,
  cross_check: GitCompare,
  human_review: ScrollText,
  publish: FileCheck,
};

// Per-status visual identity. The active step gets the violet halo so it
// pops at-a-glance even when the canvas is zoomed out.
const statusBorder: Record<StepStatus, string> = {
  pending: "border-[var(--color-border)]",
  running: "border-[var(--color-primary)] pulse-ring",
  awaiting_user: "border-[var(--color-warn)] pulse-ring",
  passed: "border-[var(--color-accent)]",
  failed: "border-[var(--color-fail)]",
};

const statusDot: Record<StepStatus, string> = {
  pending: "bg-[var(--color-ink-subtle)]",
  running: "bg-[var(--color-primary-glow)]",
  awaiting_user: "bg-[var(--color-warn)]",
  passed: "bg-[var(--color-accent)]",
  failed: "bg-[var(--color-fail)]",
};

const statusGlow: Record<StepStatus, string> = {
  pending: "",
  running: "shadow-[0_0_28px_-2px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]",
  awaiting_user: "shadow-[0_0_22px_-2px_color-mix(in_srgb,var(--color-warn)_50%,transparent)]",
  passed: "shadow-[0_0_18px_-4px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]",
  failed: "shadow-[0_0_22px_-2px_color-mix(in_srgb,var(--color-fail)_50%,transparent)]",
};

export type StepNodeData = {
  id: string;
  title: string;
  primitive: Primitive;
  status: StepStatus;
  index: number;
  total: number;
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
  return (
    <div
      onClick={data.onClick}
      className={cn(
        "group relative w-[260px] cursor-pointer overflow-hidden rounded-[var(--r-lg)] border-2 bg-[var(--color-bg-elev)] transition-all duration-200 ease-out",
        statusBorder[data.status],
        statusGlow[data.status],
        selected && "ring-2 ring-[var(--color-primary-glow)] ring-offset-2 ring-offset-[var(--color-bg)]",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "var(--color-border-strong)", width: 8, height: 8 }}
      />
      <div className="flex items-center gap-3 p-3">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[var(--color-bg-raised)] transition-colors",
            data.status === "running" || data.status === "awaiting_user"
              ? "text-[var(--color-primary-glow)]"
              : "text-[var(--color-ink-muted)] group-hover:text-[var(--color-primary-glow)]",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
            <span>step {data.index + 1}</span>
            <span>·</span>
            <span>{primitiveLabel[data.primitive]}</span>
          </div>
          <div className="mt-0.5 truncate text-[14px] font-medium text-[var(--color-ink)]">
            {data.title}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              statusDot[data.status],
              data.status === "running" && "pulse-dot",
            )}
          />
          <span className="text-[11px] text-[var(--color-ink-muted)]">
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
        style={{ background: "var(--color-border-strong)", width: 8, height: 8 }}
      />
    </div>
  );
}
