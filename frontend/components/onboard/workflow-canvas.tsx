"use client";
import {
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GraphOut } from "../../lib/api";
import { StepNode, type StepNodeData } from "./step-node";
import { CanvasToolbar } from "./canvas-toolbar";

const nodeTypes = { step: StepNode };

const NODE_W = 260;
const NODE_H_GAP = 24;
const NODE_V_GAP = 56;

function autoLayout(nodes: GraphOut["nodes"]): Record<string, { x: number; y: number }> {
  // Vertical spine if ≤6, two-column zig-zag otherwise. Both keep nodes inside
  // a column-ish area so the canvas doesn't sprawl horizontally.
  const positions: Record<string, { x: number; y: number }> = {};
  if (nodes.length <= 6) {
    nodes.forEach((n, i) => {
      positions[n.id] = { x: 0, y: i * (96 + NODE_V_GAP) };
    });
  } else {
    nodes.forEach((n, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      positions[n.id] = {
        x: col * (NODE_W + NODE_H_GAP),
        y: row * (96 + NODE_V_GAP) + (col === 1 ? 60 : 0),
      };
    });
  }
  return positions;
}

function snap(x: number, grid = 24) {
  return Math.round(x / grid) * grid;
}

export function WorkflowCanvas({
  graph,
  current,
  onPickStep,
}: {
  graph: GraphOut;
  current: string | null;
  onPickStep: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <Inner graph={graph} current={current} onPickStep={onPickStep} />
    </ReactFlowProvider>
  );
}

function Inner({
  graph,
  current,
  onPickStep,
}: {
  graph: GraphOut;
  current: string | null;
  onPickStep: (id: string) => void;
}) {
  const flow = useReactFlow();
  const layout = useMemo(() => autoLayout(graph.nodes), [graph]);

  const initialNodes = useMemo<Node<StepNodeData>[]>(
    () =>
      graph.nodes.map((n, i) => ({
        id: n.id,
        type: "step",
        position: layout[n.id] ?? { x: 0, y: i * 152 },
        data: {
          id: n.id,
          title: n.title,
          primitive: n.primitive,
          status: n.status,
          index: i,
          total: graph.nodes.length,
          onClick: () => onPickStep(n.id),
        },
        draggable: true,
        selectable: true,
        selected: n.id === current,
      })),
    // initialNodes is just the seed; we then own positions in local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.nodes.length],
  );

  const [nodes, setNodes] = useState<Node<StepNodeData>[]>(initialNodes);

  // Keep node `data` and `selected` in sync with parent props without
  // overwriting user-dragged positions.
  useEffect(() => {
    setNodes((existing) => {
      const byId = new Map(existing.map((n) => [n.id, n]));
      return graph.nodes.map((n, i) => {
        const existing = byId.get(n.id);
        return {
          id: n.id,
          type: "step",
          position: existing?.position ?? layout[n.id] ?? { x: 0, y: i * 152 },
          data: {
            id: n.id,
            title: n.title,
            primitive: n.primitive,
            status: n.status,
            index: i,
            total: graph.nodes.length,
            onClick: () => onPickStep(n.id),
          },
          draggable: true,
          selectable: true,
          selected: n.id === current,
        };
      });
    });
  }, [graph, layout, current, onPickStep]);

  const onNodesChange = useCallback((changes: NodeChange<Node<StepNodeData>>[]) => {
    setNodes((nds) => {
      const next = applyNodeChanges(changes, nds);
      // Collect ids of nodes whose drag just ended so we can snap them.
      const justDropped = new Set<string>();
      for (const c of changes) {
        if (c.type === "position" && c.dragging === false) {
          justDropped.add(c.id);
        }
      }
      if (justDropped.size === 0) return next;
      return next.map((n) =>
        justDropped.has(n.id)
          ? { ...n, position: { x: snap(n.position.x), y: snap(n.position.y) } }
          : n,
      );
    });
  }, []);

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((e, i) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated:
          graph.nodes.find((n) => n.id === e.source)?.status === "passed",
      })),
    [graph],
  );

  const resetLayout = useCallback(() => {
    setNodes((nds) =>
      nds.map((n, i) => ({
        ...n,
        position: layout[n.id] ?? { x: 0, y: i * 152 },
      })),
    );
    requestAnimationFrame(() => flow.fitView({ padding: 0.4, duration: 400 }));
  }, [flow, layout]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        flow.fitView({ padding: 0.4, duration: 400 });
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetLayout();
      } else if (e.key.toLowerCase() === "j" || e.key.toLowerCase() === "k") {
        e.preventDefault();
        const idx = graph.nodes.findIndex((n) => n.id === current);
        const dir = e.key.toLowerCase() === "j" ? 1 : -1;
        const next = graph.nodes[Math.max(0, Math.min(graph.nodes.length - 1, idx + dir))];
        if (next) onPickStep(next.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, graph.nodes, flow, onPickStep, resetLayout]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultViewport={{ x: 60, y: 32, zoom: 1 }}
        minZoom={0.4}
        maxZoom={1.6}
        fitView
        fitViewOptions={{ padding: 0.4, minZoom: 0.6, maxZoom: 1.2 }}
        proOptions={{ hideAttribution: true }}
        panOnDrag
        zoomOnScroll
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        selectionOnDrag={false}
      >
        <Background color="#1f222b" gap={24} size={1.2} />
        <Controls
          className="!hidden"
          showInteractive={false}
        />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const status = (n.data as StepNodeData)?.status;
            if (status === "passed") return "#7df9c5";
            if (status === "running") return "#a78bfa";
            if (status === "awaiting_user") return "#ffb547";
            if (status === "failed") return "#ff5d6e";
            return "#5a6172";
          }}
          maskColor="rgba(5,5,7,0.7)"
          style={{ width: 160, height: 96 }}
        />
      </ReactFlow>

      <CanvasToolbar
        className="absolute right-3 top-3 z-10"
        onFit={() => flow.fitView({ padding: 0.4, duration: 400 })}
        onActual={() => flow.zoomTo(1, { duration: 240 })}
        onZoomIn={() => flow.zoomIn({ duration: 200 })}
        onZoomOut={() => flow.zoomOut({ duration: 200 })}
        onReset={resetLayout}
      />

      <KeyboardLegend />
    </div>
  );
}

function KeyboardLegend() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-translucent)] px-3 py-1.5 text-[10px] text-[var(--color-ink-subtle)] backdrop-blur transition-opacity duration-500">
      <Kbd>J</Kbd>
      <Kbd>K</Kbd>
      <span>step</span>
      <span className="opacity-40">·</span>
      <Kbd>F</Kbd>
      <span>fit</span>
      <span className="opacity-40">·</span>
      <Kbd>R</Kbd>
      <span>reset</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-ink)]">
      {children}
    </kbd>
  );
}
