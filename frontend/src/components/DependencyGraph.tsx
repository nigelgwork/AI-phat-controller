import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Bot, CheckSquare, Package, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export interface DependencyNode {
  id: string;
  type: 'task' | 'agent' | 'convoy';
  label: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked';
  description?: string;
  dependencies?: string[];
}

interface DependencyGraphProps {
  nodes: DependencyNode[];
  onNodeClick?: (node: DependencyNode) => void;
  className?: string;
}

// Custom node component for tasks
function TaskNode({ data }: { data: { label: string; status?: string; description?: string } }) {
  const getStatusColor = () => {
    switch (data.status) {
      case 'completed':
        return 'border-green-500 bg-green-500/10';
      case 'in_progress':
        return 'border-cyan-500 bg-cyan-500/10';
      case 'blocked':
        return 'border-red-500 bg-red-500/10';
      default:
        return 'border-slate-600 bg-slate-800';
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'completed':
        return <CheckCircle size={14} className="text-green-400" />;
      case 'in_progress':
        return <Clock size={14} className="text-cyan-400" />;
      case 'blocked':
        return <AlertCircle size={14} className="text-red-400" />;
      default:
        return <Clock size={14} className="text-slate-500" />;
    }
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <div className={`px-3 py-2 rounded-lg border-2 ${getStatusColor()} min-w-[120px]`}>
        <div className="flex items-center gap-2">
          <CheckSquare size={14} className="text-cyan-400" />
          {getStatusIcon()}
          <span className="text-sm font-medium text-white truncate max-w-[150px]">{data.label}</span>
        </div>
        {data.description && (
          <p className="text-xs text-slate-400 mt-1 truncate max-w-[180px]">{data.description}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </>
  );
}

// Custom node component for agents
function AgentNode({ data }: { data: { label: string; status?: string } }) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <div className="px-3 py-2 rounded-lg border-2 border-purple-500 bg-purple-500/10 min-w-[100px]">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-purple-400" />
          <span className="text-sm font-medium text-white truncate max-w-[120px]">{data.label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </>
  );
}

// Custom node component for convoys
function ConvoyNode({ data }: { data: { label: string; status?: string } }) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-500" />
      <div className="px-3 py-2 rounded-lg border-2 border-amber-500 bg-amber-500/10 min-w-[100px]">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-amber-400" />
          <span className="text-sm font-medium text-white truncate max-w-[120px]">{data.label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500" />
    </>
  );
}

const nodeTypes = {
  task: TaskNode,
  agent: AgentNode,
  convoy: ConvoyNode,
};

export default function DependencyGraph({ nodes: inputNodes, onNodeClick, className = '' }: DependencyGraphProps) {
  // Convert input nodes to React Flow format and calculate positions
  const { flowNodes, flowEdges } = useMemo(() => {
    const nodeMap = new Map<string, DependencyNode>();
    inputNodes.forEach((n) => nodeMap.set(n.id, n));

    // Calculate levels (topological sort-ish)
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    const calculateLevel = (nodeId: string): number => {
      if (levels.has(nodeId)) return levels.get(nodeId)!;
      if (visited.has(nodeId)) return 0; // Circular dependency

      visited.add(nodeId);
      const node = nodeMap.get(nodeId);
      if (!node) return 0;

      const deps = node.dependencies || [];
      const maxDepLevel = deps.length > 0
        ? Math.max(...deps.map((d) => calculateLevel(d)))
        : -1;

      const level = maxDepLevel + 1;
      levels.set(nodeId, level);
      return level;
    };

    inputNodes.forEach((n) => calculateLevel(n.id));

    // Group nodes by level
    const levelGroups = new Map<number, DependencyNode[]>();
    inputNodes.forEach((n) => {
      const level = levels.get(n.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(n);
    });

    // Create flow nodes with positions
    const flowNodes: Node[] = [];
    const xSpacing = 200;
    const ySpacing = 100;

    levelGroups.forEach((nodesAtLevel, level) => {
      const startX = -(nodesAtLevel.length - 1) * xSpacing / 2;

      nodesAtLevel.forEach((node, index) => {
        flowNodes.push({
          id: node.id,
          type: node.type,
          position: {
            x: startX + index * xSpacing,
            y: level * ySpacing,
          },
          data: {
            label: node.label,
            status: node.status,
            description: node.description,
          },
        });
      });
    });

    // Create edges
    const flowEdges: Edge[] = [];
    inputNodes.forEach((node) => {
      (node.dependencies || []).forEach((depId) => {
        if (nodeMap.has(depId)) {
          flowEdges.push({
            id: `${depId}-${node.id}`,
            source: depId,
            target: node.id,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#64748b',
            },
            style: { stroke: '#64748b', strokeWidth: 2 },
            animated: node.status === 'in_progress',
          });
        }
      });
    });

    return { flowNodes, flowEdges };
  }, [inputNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const inputNode = inputNodes.find((n) => n.id === node.id);
      if (inputNode && onNodeClick) {
        onNodeClick(inputNode);
      }
    },
    [inputNodes, onNodeClick]
  );

  if (inputNodes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-slate-400 ${className}`}>
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No dependencies to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`} style={{ minHeight: '400px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#334155" gap={20} />
        <Controls className="!bg-slate-800 !border-slate-700" />
        <MiniMap
          nodeColor={(node) => {
            const type = node.type;
            switch (type) {
              case 'task':
                return '#22d3ee';
              case 'agent':
                return '#a855f7';
              case 'convoy':
                return '#f59e0b';
              default:
                return '#64748b';
            }
          }}
          className="!bg-slate-800 !border-slate-700"
        />
      </ReactFlow>
    </div>
  );
}
