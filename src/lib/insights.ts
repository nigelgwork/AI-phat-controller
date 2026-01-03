import { Bead, Insights, InsightMetric } from "@/types/gastown";
import { getAllBeads, getAvailableRigs } from "./beads";

// Compute graph insights from beads data
export function computeInsights(rig?: string): Insights | null {
  // Get beads from specified rig or all rigs
  let allBeads: Bead[] = [];

  if (rig) {
    allBeads = getAllBeads(rig);
  } else {
    // Get town-level beads
    allBeads = getAllBeads();

    // Also get beads from all rigs
    const rigs = getAvailableRigs();
    for (const rigName of rigs) {
      const rigBeads = getAllBeads(rigName);
      allBeads = allBeads.concat(rigBeads);
    }
  }

  // Filter to only work items (not agents, molecules, etc.)
  const workBeads = allBeads.filter(
    (b) => !b.issue_type || ["task", "bug", "feature", "epic", "chore"].includes(b.issue_type)
  );

  if (workBeads.length === 0) {
    return null;
  }

  // Build dependency graph
  const graph = buildDependencyGraph(workBeads);

  // Compute metrics
  const bottlenecks = computeBottlenecks(graph, workBeads);
  const keystones = computeKeystones(graph, workBeads);
  const hubs = computeHubs(graph, workBeads);
  const authorities = computeAuthorities(graph, workBeads);
  const cycles = detectCycles(graph);
  const health = computeHealth(workBeads, graph);

  return {
    bottlenecks,
    keystones,
    hubs,
    authorities,
    cycles,
    health,
  };
}

interface DependencyGraph {
  // id -> list of ids this bead depends on
  dependsOn: Map<string, string[]>;
  // id -> list of ids that depend on this bead
  dependedBy: Map<string, string[]>;
}

function buildDependencyGraph(beads: Bead[]): DependencyGraph {
  const dependsOn = new Map<string, string[]>();
  const dependedBy = new Map<string, string[]>();

  const beadIds = new Set(beads.map((b) => b.id));

  for (const bead of beads) {
    dependsOn.set(bead.id, []);
    dependedBy.set(bead.id, []);
  }

  for (const bead of beads) {
    const deps = bead.depends_on || [];
    const depsFromDependencies = bead.dependencies?.map((d) => d.depends_on_id) || [];
    const allDeps = [...new Set([...deps, ...depsFromDependencies])];

    for (const depId of allDeps) {
      if (beadIds.has(depId)) {
        dependsOn.get(bead.id)?.push(depId);
        dependedBy.get(depId)?.push(bead.id);
      }
    }
  }

  return { dependsOn, dependedBy };
}

// Bottlenecks: nodes that many paths go through (approximated by in-degree * out-degree)
function computeBottlenecks(graph: DependencyGraph, beads: Bead[]): InsightMetric[] {
  const scores: InsightMetric[] = [];

  for (const bead of beads) {
    const inDegree = graph.dependedBy.get(bead.id)?.length || 0;
    const outDegree = graph.dependsOn.get(bead.id)?.length || 0;

    // Betweenness approximation: nodes with both incoming and outgoing edges
    if (inDegree > 0 && outDegree > 0) {
      scores.push({
        id: bead.id,
        score: inDegree * outDegree,
      });
    }
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Keystones: items on the critical path (blocked items with most dependents)
function computeKeystones(graph: DependencyGraph, beads: Bead[]): InsightMetric[] {
  const scores: InsightMetric[] = [];

  for (const bead of beads) {
    if (bead.status === "open" || bead.status === "in_progress") {
      const dependentCount = graph.dependedBy.get(bead.id)?.length || 0;
      if (dependentCount > 0) {
        scores.push({
          id: bead.id,
          score: dependentCount,
        });
      }
    }
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Hubs: nodes with many outgoing dependencies
function computeHubs(graph: DependencyGraph, beads: Bead[]): InsightMetric[] {
  const scores: InsightMetric[] = [];

  for (const bead of beads) {
    const outDegree = graph.dependsOn.get(bead.id)?.length || 0;
    if (outDegree > 0) {
      scores.push({
        id: bead.id,
        score: outDegree,
      });
    }
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Authorities: nodes that are highly depended upon
function computeAuthorities(graph: DependencyGraph, beads: Bead[]): InsightMetric[] {
  const scores: InsightMetric[] = [];

  for (const bead of beads) {
    const inDegree = graph.dependedBy.get(bead.id)?.length || 0;
    if (inDegree > 0) {
      scores.push({
        id: bead.id,
        score: inDegree,
      });
    }
  }

  return scores.sort((a, b) => b.score - a.score).slice(0, 10);
}

// Detect cycles using DFS
function detectCycles(graph: DependencyGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const deps = graph.dependsOn.get(nodeId) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        dfs(dep);
      } else if (recursionStack.has(dep)) {
        // Found a cycle
        const cycleStart = path.indexOf(dep);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          if (cycle.length > 1 && cycles.length < 5) {
            cycles.push(cycle);
          }
        }
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
  }

  for (const nodeId of graph.dependsOn.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return cycles;
}

// Compute health metrics
function computeHealth(beads: Bead[], graph: DependencyGraph): { density: number; velocity: number } {
  const nodeCount = beads.length;
  let edgeCount = 0;

  for (const deps of graph.dependsOn.values()) {
    edgeCount += deps.length;
  }

  // Graph density: ratio of actual edges to possible edges
  const maxEdges = nodeCount * (nodeCount - 1);
  const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

  // Velocity: items closed in the last week
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const closedRecently = beads.filter((b) => {
    if (b.status !== "closed" || !b.closed_at) return false;
    return new Date(b.closed_at) >= oneWeekAgo;
  }).length;

  return {
    density,
    velocity: closedRecently,
  };
}
