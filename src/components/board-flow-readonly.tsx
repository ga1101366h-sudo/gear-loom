"use client";

import { useMemo, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { boardFlowNodeTypes, boardFlowEdgeTypes } from "@/components/board-flow-editor";

type BoardFlowReadonlyProps = {
  /** React Flow のノード配列（Board.nodes の JSON 文字列） */
  nodesJson: string | null;
  /** React Flow のエッジ配列（Board.edges の JSON 文字列） */
  edgesJson: string | null;
};

function BoardFlowReadonlyInner({ nodesJson, edgesJson }: BoardFlowReadonlyProps) {
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);

  const nodes = useMemo(() => {
    if (!nodesJson?.trim()) return [] as Node[];
    try {
      const parsed = JSON.parse(nodesJson) as unknown;
      return Array.isArray(parsed) ? (parsed as Node[]) : [];
    } catch {
      return [] as Node[];
    }
  }, [nodesJson]);

  const baseEdges = useMemo(() => {
    if (!edgesJson?.trim()) return [] as Edge[];
    try {
      const parsed = JSON.parse(edgesJson) as unknown;
      return Array.isArray(parsed) ? (parsed as Edge[]) : [];
    } catch {
      return [] as Edge[];
    }
  }, [edgesJson]);

  const edges = useMemo(() => {
    if (!highlightNodeId) {
      return baseEdges.map((edge) => ({
        ...edge,
        animated: true,
        style: { ...(edge.style ?? {}), stroke: "#22d3ee", strokeWidth: 2 },
      }));
    }

    return baseEdges.map((edge) => {
      const isRelated = edge.source === highlightNodeId || edge.target === highlightNodeId;
      if (isRelated) {
        return {
          ...edge,
          animated: true,
          style: {
            ...(edge.style ?? {}),
            stroke: "#06b6d4",
            strokeWidth: 3,
            opacity: 1,
          },
        };
      }
      return {
        ...edge,
        animated: false,
        style: {
          ...(edge.style ?? {}),
          stroke: "#4b5563",
          strokeWidth: 2,
          opacity: 0.2,
        },
      };
    });
  }, [baseEdges, highlightNodeId]);

  if (nodes.length === 0 && baseEdges.length === 0) {
    return null;
  }

  return (
    <div className="w-full h-[360px] sm:h-[420px] md:h-[480px] rounded-lg border border-surface-border bg-[#050709] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={boardFlowNodeTypes}
        edgeTypes={boardFlowEdgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        minZoom={0.1}
        maxZoom={2}
        fitView
        onNodeClick={(_, node) => setHighlightNodeId(node.id)}
        onPaneClick={() => setHighlightNodeId(null)}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} color="#111827" gap={32} />
      </ReactFlow>
    </div>
  );
}

export function BoardFlowReadonly(props: BoardFlowReadonlyProps) {
  return (
    <ReactFlowProvider>
      <BoardFlowReadonlyInner {...props} />
    </ReactFlowProvider>
  );
}

