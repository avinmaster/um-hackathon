"use client";
import {
  Background,
  ConnectionLineType,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useMemo } from "react";
import type { GraphOut } from "../../lib/api";
import { StepNode, type StepNodeData } from "./step-node";

const nodeTypes = { step: StepNode };

export function WorkflowCanvas({
  graph,
  current,
  onPickStep,
}: {
  graph: GraphOut;
  current: string | null;
  onPickStep: (id: string) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node<StepNodeData>[] = graph.nodes.map((n, i) => ({
      id: n.id,
      type: "step",
      position: { x: i * 260, y: 0 },
      data: {
        id: n.id,
        title: n.title,
        primitive: n.primitive,
        status: n.status,
        onClick: () => onPickStep(n.id),
      },
      draggable: false,
      selectable: true,
      selected: n.id === current,
    }));
    const edges: Edge[] = graph.edges.map((e, i) => ({
      id: `e${i}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: graph.nodes.find((n) => n.id === e.source)?.status === "passed",
    }));
    return { nodes, edges };
  }, [graph, current, onPickStep]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.25, minZoom: 0.5, maxZoom: 1.5 }}
        proOptions={{ hideAttribution: true }}
        panOnDrag
        zoomOnScroll
      >
        <Background color="#262b32" gap={24} size={1} />
        <Controls className="!rounded-md !border-[var(--color-border)] !bg-[var(--color-bg-elev)]" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
