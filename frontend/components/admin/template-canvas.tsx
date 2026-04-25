"use client";
import {
  Background,
  ConnectionLineType,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import {
  FileCheck,
  FileInput,
  GitCompare,
  Image,
  Maximize2,
  Plus,
  ScrollText,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import type { TemplateStep } from "../../lib/api";

type Primitive = TemplateStep["primitive"];

const PRIMITIVE_META: Record<
  Primitive,
  { label: string; blurb: string; icon: LucideIcon }
> = {
  collect_form: {
    label: "Collect form",
    blurb: "Structured fields the owner fills in.",
    icon: FileInput,
  },
  upload_compliance: {
    label: "Upload compliance",
    blurb: "GLM verifies criterion-by-criterion. Not public.",
    icon: UploadCloud,
  },
  upload_content: {
    label: "Upload content",
    blurb: "Public-facing facts; assistant grounds on these.",
    icon: Image,
  },
  cross_check: {
    label: "Cross-check",
    blurb: "GLM looks for contradictions across prior steps.",
    icon: GitCompare,
  },
  human_review: {
    label: "Human review",
    blurb: "Owner sees a summary + gaps and confirms.",
    icon: ScrollText,
  },
  publish: {
    label: "Publish",
    blurb: "Building lands in the directory.",
    icon: FileCheck,
  },
};

export const PRIMITIVES = Object.keys(PRIMITIVE_META) as Primitive[];

/* ============================================================== */
/* Editable step node                                               */
/* ============================================================== */

type StepNodeData = {
  index: number;
  total: number;
  step: TemplateStep;
  selected: boolean;
  onRemove: () => void;
};

const NODE_W = 300;
const NODE_H = 96;
const ROW_GAP = 60;
const ADD_NODE_ID = "__add_step__";

function EditableStepNode({ data }: { data: StepNodeData }) {
  const meta = PRIMITIVE_META[data.step.primitive];
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "group relative flex w-[300px] cursor-grab items-stretch gap-3 rounded-[var(--r-lg)] border bg-[var(--color-bg-elev)] p-3 pl-2.5 transition-colors duration-200 active:cursor-grabbing",
        data.selected
          ? "border-[var(--color-primary)]"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
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

      <div className="flex shrink-0 flex-col items-center justify-center pl-1">
        <span className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] font-mono text-[10px] text-[var(--color-ink-muted)]">
          {String(data.index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              data.selected
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-ink-muted)]",
            )}
          />
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
            {meta.label}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[14px] font-medium leading-snug text-[var(--color-ink)]">
          {data.step.title || "Untitled step"}
        </div>
        <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--color-ink-subtle)]">
          {data.step.id}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onRemove();
        }}
        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-md text-[var(--color-ink-subtle)] opacity-0 transition-opacity hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-fail)] group-hover:opacity-100"
        title="Remove step"
      >
        <Trash2 className="h-3 w-3" />
      </button>

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

/* ============================================================== */
/* "Add step" ghost node — sits below the last real node            */
/* ============================================================== */

type AddNodeData = { onClick: () => void };

function AddStepNode({ data }: { data: AddNodeData }) {
  return (
    <button
      type="button"
      onClick={data.onClick}
      className="group flex w-[300px] items-center justify-center gap-2 rounded-[var(--r-lg)] border-2 border-dashed border-[var(--color-border-strong)] bg-[color-mix(in_srgb,var(--color-bg-elev)_70%,transparent)] px-4 py-5 text-[13px] font-medium text-[var(--color-ink-muted)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-primary)]"
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
      <span className="grid h-6 w-6 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] transition-colors group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white">
        <Plus className="h-3.5 w-3.5" />
      </span>
      Add step here
    </button>
  );
}

const nodeTypes = { step: EditableStepNode, addStep: AddStepNode };

/* ============================================================== */
/* Canvas                                                           */
/* ============================================================== */

export function TemplateCanvas({
  steps,
  selectedId,
  onSelect,
  onChange,
}: {
  steps: TemplateStep[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (steps: TemplateStep[]) => void;
}) {
  return (
    <ReactFlowProvider>
      <Inner
        steps={steps}
        selectedId={selectedId}
        onSelect={onSelect}
        onChange={onChange}
      />
    </ReactFlowProvider>
  );
}

function layoutFor(steps: TemplateStep[]) {
  const out: Record<string, { x: number; y: number }> = {};
  steps.forEach((s, i) => {
    out[s.id] = { x: 0, y: i * (NODE_H + ROW_GAP) };
  });
  return out;
}

function Inner({
  steps,
  selectedId,
  onSelect,
  onChange,
}: {
  steps: TemplateStep[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (steps: TemplateStep[]) => void;
}) {
  const flow = useReactFlow();
  const layout = useMemo(() => layoutFor(steps), [steps]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const onRemove = useCallback(
    (id: string) => {
      onChange(steps.filter((s) => s.id !== id));
      if (selectedId === id) onSelect(null);
    },
    [steps, selectedId, onChange, onSelect],
  );

  const buildStepNode = useCallback(
    (
      s: TemplateStep,
      i: number,
      position: { x: number; y: number },
    ): Node<StepNodeData> => ({
      id: s.id,
      type: "step",
      position,
      data: {
        index: i,
        total: steps.length,
        step: s,
        selected: s.id === selectedId,
        onRemove: () => onRemove(s.id),
      },
      draggable: true,
    }),
    [selectedId, onRemove, steps.length],
  );

  const buildAddNode = useCallback(
    (y: number): Node<AddNodeData> => ({
      id: ADD_NODE_ID,
      type: "addStep",
      position: { x: 0, y },
      data: { onClick: () => setPickerOpen(true) },
      draggable: false,
      selectable: false,
    }),
    [],
  );

  type AnyNode = Node<StepNodeData> | Node<AddNodeData>;
  const [nodes, setNodes] = useState<AnyNode[]>(() => {
    const seeded: AnyNode[] = steps.map((s, i) => buildStepNode(s, i, layout[s.id]));
    seeded.push(buildAddNode(steps.length * (NODE_H + ROW_GAP)));
    return seeded;
  });

  const draggingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setNodes((existing) => {
      const oldById = new Map(existing.map((n) => [n.id, n]));
      const next: AnyNode[] = steps.map((s, i) => {
        const old = oldById.get(s.id) as Node<StepNodeData> | undefined;
        const pos =
          old && draggingRef.current.has(s.id) ? old.position : layout[s.id];
        return buildStepNode(s, i, pos);
      });
      next.push(buildAddNode(steps.length * (NODE_H + ROW_GAP)));
      return next;
    });
  }, [steps, layout, buildStepNode, buildAddNode]);

  const onNodesChange = useCallback(
    (changes: NodeChange<AnyNode>[]) => {
      // Skip changes targeting the add-step ghost node.
      const filtered = changes.filter((c) => {
        if ("id" in c) return c.id !== ADD_NODE_ID;
        return true;
      });

      let dragEnded = false;
      for (const c of filtered) {
        if (c.type === "position" && "id" in c) {
          if (c.dragging === true) draggingRef.current.add(c.id);
          if (c.dragging === false) {
            draggingRef.current.delete(c.id);
            dragEnded = true;
          }
        }
      }
      setNodes((nds) => applyNodeChanges(filtered, nds));

      if (dragEnded) {
        setNodes((nds) => {
          const stepNodes = nds.filter(
            (n) => n.id !== ADD_NODE_ID,
          ) as Node<StepNodeData>[];
          const order = [...stepNodes].sort(
            (a, b) => a.position.y - b.position.y,
          );
          const orderedIds = order.map((n) => n.id);
          const stepById = new Map(steps.map((s) => [s.id, s]));
          const reordered = orderedIds
            .map((id) => stepById.get(id))
            .filter((s): s is TemplateStep => Boolean(s));
          if (
            reordered.length === steps.length &&
            reordered.some((s, i) => s.id !== steps[i].id)
          ) {
            onChange(reordered);
          }
          return nds;
        });
      }
    },
    [steps, onChange],
  );

  const edges = useMemo<Edge[]>(() => {
    const out: Edge[] = steps.slice(0, -1).map((s, i) => ({
      id: `e-${s.id}-${steps[i + 1].id}`,
      source: s.id,
      target: steps[i + 1].id,
      type: "smoothstep",
      animated: false,
    }));
    if (steps.length > 0) {
      const last = steps[steps.length - 1];
      out.push({
        id: `e-${last.id}-add`,
        source: last.id,
        target: ADD_NODE_ID,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "var(--color-border-strong)",
          strokeDasharray: "4 4",
        },
      });
    }
    return out;
  }, [steps]);

  const onNodeClick: NodeMouseHandler<AnyNode> = useCallback(
    (_, node) => {
      if (node.id === ADD_NODE_ID) return;
      onSelect(node.id);
    },
    [onSelect],
  );

  const addStep = useCallback(
    (prim: Primitive) => {
      const baseId = prim.replace(/_/g, "-");
      const taken = new Set(steps.map((s) => s.id));
      let n = steps.length + 1;
      let id = `${baseId}-${n}`;
      while (taken.has(id)) {
        n += 1;
        id = `${baseId}-${n}`;
      }
      const next: TemplateStep = {
        id,
        primitive: prim,
        title: PRIMITIVE_META[prim].label,
        config: {},
      };
      onChange([...steps, next]);
      onSelect(id);
      setPickerOpen(false);
      requestAnimationFrame(() =>
        flow.fitView({ padding: 0.22, duration: 400 }),
      );
    },
    [steps, onChange, onSelect, flow],
  );

  /* Empty state — full-canvas welcome with the picker visible */
  if (steps.length === 0) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-[640px]">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-primary)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Pick the first step
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-muted)]">
              Drag steps to reorder. Or ask the AI helper to draft a workflow
              from a description.
            </p>
          </div>
          <PrimitivePicker onPick={addStep} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Canvas toolbar — primary CTA always visible */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-deep)]"
          >
            <Plus className="h-3.5 w-3.5" /> Add step
          </button>
          <span className="text-[11px] text-[var(--color-ink-subtle)]">
            {steps.length} step{steps.length === 1 ? "" : "s"} ·{" "}
            <span className="font-mono">drag</span> to reorder ·{" "}
            <span className="font-mono">click</span> to edit
          </span>
        </div>
        <button
          onClick={() => flow.fitView({ padding: 0.22, duration: 400 })}
          title="Fit view"
          className="grid h-8 w-8 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-primary)]"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onPaneClick={() => onSelect(null)}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultViewport={{ x: 80, y: 24, zoom: 1 }}
          minZoom={0.6}
          maxZoom={1.8}
          fitView
          fitViewOptions={{ padding: 0.22, minZoom: 0.85, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
          panOnDrag={[1, 2]}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          selectionOnDrag={false}
        >
          <Background
            color="var(--color-border)"
            gap={28}
            size={1.2}
            style={{ opacity: 0.7 }}
          />
        </ReactFlow>

        {/* Picker overlay */}
        {pickerOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg)_60%,transparent)] px-6 backdrop-blur-sm">
            <div className="w-full max-w-[680px] rounded-[var(--r-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] shadow-[var(--shadow-lift-lg)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
                <div>
                  <div className="text-[14px] font-semibold tracking-tight">
                    Add a step
                  </div>
                  <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
                    What should happen at this point?
                  </p>
                </div>
                <button
                  onClick={() => setPickerOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-ink)]"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-4">
                <PrimitivePicker onPick={addStep} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PrimitivePicker({ onPick }: { onPick: (p: Primitive) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {PRIMITIVES.map((p) => {
        const m = PRIMITIVE_META[p];
        const Icon = m.icon;
        return (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="group flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-left transition-colors hover:border-[var(--color-primary)]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-raised)] text-[var(--color-ink-muted)] transition-colors group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-primary)]">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-[var(--color-ink)]">
                {m.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-ink-muted)]">
                {m.blurb}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
