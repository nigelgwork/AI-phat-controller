"use client";

import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GitBranch,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
} from "lucide-react";
import { Bead, BeadStatus } from "@/types/gastown";

const STATUS_COLORS: Record<BeadStatus, string> = {
  open: "#3b82f6",
  in_progress: "#eab308",
  blocked: "#ef4444",
  ready: "#10b981",
  closed: "#22c55e",
};

async function fetchBeads() {
  const res = await fetch("/api/beads");
  return res.json();
}

export default function GraphPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["beads"],
    queryFn: fetchBeads,
  });

  const beads: Bead[] = data?.beads || [];

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const beadMap = new Map(beads.map((b) => [b.id, b]));
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create a simple force-directed layout
    const cols = Math.ceil(Math.sqrt(beads.length));
    const spacing = 200;

    beads.forEach((bead, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      nodes.push({
        id: bead.id,
        position: { x: col * spacing + Math.random() * 50, y: row * spacing + Math.random() * 50 },
        data: {
          label: bead.title,
          bead,
        },
        style: {
          background: STATUS_COLORS[bead.status] || "#71717a",
          color: "#fff",
          border: "2px solid #27272a",
          borderRadius: "8px",
          padding: "12px 16px",
          fontSize: "12px",
          fontWeight: 500,
          maxWidth: "180px",
          textAlign: "center" as const,
        },
      });

      // Create edges for dependencies (check both depends_on array and dependencies array)
      const depIds = new Set<string>();

      // From depends_on array
      if (bead.depends_on) {
        bead.depends_on.forEach((id) => depIds.add(id));
      }

      // From dependencies array (has depends_on_id field)
      if (bead.dependencies) {
        bead.dependencies.forEach((d) => depIds.add(d.depends_on_id));
      }

      depIds.forEach((depId) => {
        if (beadMap.has(depId)) {
          edges.push({
            id: `${depId}-${bead.id}`,
            source: depId,
            target: bead.id,
            type: "smoothstep",
            animated: bead.status === "in_progress",
            style: { stroke: "#52525b", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#52525b",
            },
          });
        }
      });
    });

    return { nodes, edges };
  }, [beads]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dependency Graph</h1>
          <p className="text-sm text-zinc-400">
            Visualize work item dependencies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <span className="text-xs font-medium text-zinc-400">Status:</span>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs capitalize text-zinc-400">
              {status.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>

      {beads.length === 0 ? (
        <div className="flex h-[calc(100vh-240px)] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50">
          <div className="text-center">
            <GitBranch className="mx-auto h-12 w-12 text-zinc-600" />
            <h3 className="mt-4 text-lg font-medium text-zinc-300">
              No beads to visualize
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              Create some beads with dependencies to see the graph.
            </p>
          </div>
        </div>
      ) : (
        <div className="h-[calc(100vh-240px)] rounded-lg border border-zinc-800 bg-zinc-900/50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
            <Controls
              style={{
                backgroundColor: "#18181b",
                borderColor: "#27272a",
                borderRadius: "8px",
              }}
            />
            <MiniMap
              style={{
                backgroundColor: "#18181b",
                borderRadius: "8px",
              }}
              nodeColor={(node) => {
                const bead = node.data.bead as Bead;
                return STATUS_COLORS[bead.status] || "#71717a";
              }}
            />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
