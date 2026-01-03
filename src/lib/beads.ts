import { readFileSync, existsSync } from "fs";
import { Bead, TownEvent } from "@/types/gastown";

const GASTOWN_PATH = process.env.GASTOWN_PATH || "~/gt";

function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return path.replace("~", process.env.HOME || "");
  }
  return path;
}

export function getBeadsFilePath(rig?: string): string {
  const basePath = expandPath(GASTOWN_PATH);
  if (rig) {
    return `${basePath}/rigs/${rig}/.beads/issues.jsonl`;
  }
  return `${basePath}/.beads/issues.jsonl`;
}

export function parseBeadsFile(filePath: string): Bead[] {
  const expandedPath = expandPath(filePath);

  if (!existsSync(expandedPath)) {
    return [];
  }

  try {
    const content = readFileSync(expandedPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines.map((line) => {
      try {
        return JSON.parse(line) as Bead;
      } catch {
        console.error("Failed to parse bead line:", line);
        return null;
      }
    }).filter((bead): bead is Bead => bead !== null);
  } catch (error) {
    console.error("Failed to read beads file:", error);
    return [];
  }
}

export function getAllBeads(rig?: string): Bead[] {
  const filePath = getBeadsFilePath(rig);
  return parseBeadsFile(filePath);
}

export function getBeadById(id: string, rig?: string): Bead | undefined {
  const beads = getAllBeads(rig);
  return beads.find((bead) => bead.id === id);
}

export function getBeadsByStatus(status: string, rig?: string): Bead[] {
  const beads = getAllBeads(rig);
  return beads.filter((bead) => bead.status === status);
}

export function getActionableBeads(rig?: string): Bead[] {
  const beads = getAllBeads(rig);
  return beads.filter((bead) => {
    if (bead.status !== "open" && bead.status !== "ready") return false;
    if (!bead.depends_on || bead.depends_on.length === 0) return true;

    // Check if all dependencies are closed
    return bead.depends_on.every((depId) => {
      const dep = beads.find((b) => b.id === depId);
      return dep?.status === "closed";
    });
  });
}

export function getBeadsStats(rig?: string) {
  const beads = getAllBeads(rig);

  return {
    total: beads.length,
    open: beads.filter((b) => b.status === "open").length,
    in_progress: beads.filter((b) => b.status === "in_progress").length,
    blocked: beads.filter((b) => b.status === "blocked").length,
    closed: beads.filter((b) => b.status === "closed").length,
    ready: beads.filter((b) => b.status === "ready").length,
    actionable: getActionableBeads(rig).length,
  };
}

export function getEventsFilePath(): string {
  const basePath = expandPath(GASTOWN_PATH);
  return `${basePath}/.events.jsonl`;
}

interface RawEvent {
  ts: string;
  source: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  visibility: string;
}

export function getRecentEvents(limit = 10): TownEvent[] {
  const filePath = getEventsFilePath();
  const expandedPath = expandPath(filePath);

  if (!existsSync(expandedPath)) {
    return [];
  }

  try {
    const content = readFileSync(expandedPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    const events = lines
      .map((line) => {
        try {
          const raw = JSON.parse(line) as RawEvent;
          return {
            type: raw.type,
            timestamp: raw.ts,
            data: raw.payload,
            message: formatEventMessage(raw),
          } as TownEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is TownEvent => e !== null);

    // Return most recent events
    return events.slice(-limit).reverse();
  } catch (error) {
    console.error("Failed to read events file:", error);
    return [];
  }
}

function formatEventMessage(event: RawEvent): string {
  const payload = event.payload as Record<string, string>;
  switch (event.type) {
    case "session_start":
      return `${event.actor} session started (${payload.session_id || "unknown"})`;
    case "session_end":
      return `${event.actor} session ended`;
    case "bead_created":
      return `New bead created: ${payload.id || "unknown"}`;
    case "bead_closed":
      return `Bead closed: ${payload.id || "unknown"}`;
    case "convoy_created":
      return `Convoy created: ${payload.name || payload.id || "unknown"}`;
    case "convoy_closed":
      return `Convoy completed: ${payload.name || payload.id || "unknown"}`;
    case "agent_spawned":
      return `Agent spawned: ${payload.role || event.actor}`;
    case "handoff":
      return `Handoff: ${event.actor} → ${payload.to || "next session"}`;
    default:
      return `${event.type}: ${event.actor}`;
  }
}
