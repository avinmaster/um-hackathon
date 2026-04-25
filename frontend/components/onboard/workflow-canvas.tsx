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

const NODE_W = 280;
const NODE_H = 104;
const COL_GAP = 140;
const ROW_GAP = 56;

/**
 * Auto-layout: a vertical spine for short workflows, a tidy two-column
 * snake for longer ones. Tighter than before so fit-view doesn't have
 * to zoom out and shrink the cards into illegibility.
 */
function autoLayout(
  nodes: GraphOut["nodes"],
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  if (nodes.length <= 6) {
    nodes.forEach((n, i) => {
      positions[n.id] = { x: 0, y: i * (NODE_H + ROW_GAP) };
    });
  } else {
    nodes.forEach((n, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      positions[n.id] = {
        x: col * (NODE_W + COL_GAP),
        y: row * (NODE_H + ROW_GAP) + (col === 1 ? (NODE_H + ROW_GAP) / 2 : 0),
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
        position: layout[n.id] ?? { x: 0, y: i * (NODE_H + ROW_GAP) },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph.nodes.length],
  );

  const [nodes, setNodes] = useState<Node<StepNodeData>[]>(initialNodes);

  useEffect(() => {
    setNodes((existing) => {
      const byId = new Map(existing.map((n) => [n.id, n]));
      return graph.nodes.map((n, i) => {
        const old = byId.get(n.id);
        return {
          id: n.id,
          type: "step",
          position:
            old?.position ?? layout[n.id] ?? { x: 0, y: i * (NODE_H + ROW_GAP) },
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

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<StepNodeData>>[]) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        const justDropped = new Set<string>();
        for (const c of changes) {
          if (c.type === "position" && c.dragging === false) {
            justDropped.add(c.id);
          }
        }
        if (justDropped.size === 0) return next;
        return next.map((n) =>
          justDropped.has(n.id)
            ? {
                ...n,
                position: { x: snap(n.position.x), y: snap(n.position.y) },
              }
            : n,
        );
      });
    },
    [],
  );

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
        position: layout[n.id] ?? { x: 0, y: i * (NODE_H + ROW_GAP) },
      })),
    );
    requestAnimationFrame(() =>
      flow.fitView({ padding: 0.2, duration: 400, minZoom: 0.85, maxZoom: 1 }),
    );
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
        flow.fitView({
          padding: 0.18,
          duration: 400,
          minZoom: 0.85,
          maxZoom: 1,
        });
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetLayout();
      } else if (e.key.toLowerCase() === "j" || e.key.toLowerCase() === "k") {
        e.preventDefault();
        const idx = graph.nodes.findIndex((n) => n.id === current);
        const dir = e.key.toLowerCase() === "j" ? 1 : -1;
        const next =
          graph.nodes[
            Math.max(0, Math.min(graph.nodes.length - 1, idx + dir))
          ];
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
        defaultViewport={{ x: 80, y: 24, zoom: 1 }}
        minZoom={0.6}
        maxZoom={1.8}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.85, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        panOnDrag={[0, 1, 2]}
        panOnScroll={false}
        zoomOnScroll
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
        <Controls className="!hidden" showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const status = (n.data as StepNodeData)?.status;
            if (status === "passed") return "#4ade80";
            if (status === "running") return "#ff6b3d";
            if (status === "awaiting_user") return "#fbbf24";
            if (status === "failed") return "#f43f5e";
            return "#545464";
          }}
          maskColor="color-mix(in srgb, var(--color-bg) 70%, transparent)"
          style={{ width: 180, height: 100 }}
        />
      </ReactFlow>

      <CanvasToolbar
        className="absolute right-3 top-3 z-10"
        onFit={() =>
          flow.fitView({
            padding: 0.18,
            duration: 400,
            minZoom: 0.85,
            maxZoom: 1,
          })
        }
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
      <Kbd>drag</Kbd>
      <span>to pan</span>
      <span className="opacity-40">·</span>
      <Kbd>J</Kbd>
      <Kbd>K</Kbd>
      <span>next / prev</span>
      <span className="opacity-40">·</span>
      <Kbd>F</Kbd>
      <span>fit</span>
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
