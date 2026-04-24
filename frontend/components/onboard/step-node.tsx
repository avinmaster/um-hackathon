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
import { primitiveLabel, statusLabel, type Primitive, type StepStatus } from "../status";

const primitiveIcons: Record<Primitive, ComponentType<{ className?: string }>> = {
  collect_form: FileInput,
  upload_compliance: UploadCloud,
  upload_content: Image,
  cross_check: GitCompare,
  human_review: ScrollText,
  publish: FileCheck,
};

const statusBorder: Record<StepStatus, string> = {
  pending: "border-[var(--color-border)]",
  running: "border-[var(--color-info)] pulse-ring",
  awaiting_user: "border-[var(--color-warn)] pulse-ring",
  passed: "border-[var(--color-accent)]",
  failed: "border-[var(--color-fail)]",
};

const statusDot: Record<StepStatus, string> = {
  pending: "bg-[var(--color-ink-subtle)]",
  running: "bg-[var(--color-info)]",
  awaiting_user: "bg-[var(--color-warn)]",
  passed: "bg-[var(--color-accent)]",
  failed: "bg-[var(--color-fail)]",
};

export type StepNodeData = {
  id: string;
  title: string;
  primitive: Primitive;
  status: StepStatus;
  onClick?: () => void;
};

export function StepNode({ data }: { data: StepNodeData }) {
  const Icon = primitiveIcons[data.primitive];
  return (
    <div
      onClick={data.onClick}
      className={cn(
        "group w-[220px] cursor-pointer rounded-lg border-2 bg-[var(--color-bg-elev)] transition-all",
        statusBorder[data.status],
      )}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#555" }} />
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-bg-raised)] text-[var(--color-ink-muted)] group-hover:text-[var(--color-accent)] transition-colors">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-[var(--color-ink-subtle)]">
            <span>{primitiveLabel[data.primitive]}</span>
          </div>
          <div className="mt-0.5 truncate text-sm font-medium text-[var(--color-ink)]">
            {data.title}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[data.status])} />
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            {statusLabel(data.status)}
          </span>
        </div>
        <span className="text-[10px] text-[var(--color-ink-subtle)] font-mono">{data.id}</span>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: "#555" }} />
    </div>
  );
}
