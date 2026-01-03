import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
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
    // Rigs are stored directly in ~/gt/<rigname>/ not ~/gt/rigs/<rigname>/
    return `${basePath}/${rig}/.beads/issues.jsonl`;
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
  let allBeads: Bead[] = [];

  if (rig) {
    const filePath = getBeadsFilePath(rig);
    allBeads = parseBeadsFile(filePath);
  } else {
    // Aggregate beads from town level + all rigs
    // Town level beads
    const townBeads = parseBeadsFile(getBeadsFilePath());
    allBeads = allBeads.concat(townBeads);

    // All rig beads
    const rigs = getAvailableRigs();
    for (const rigName of rigs) {
      const rigBeads = parseBeadsFile(getBeadsFilePath(rigName));
      allBeads = allBeads.concat(rigBeads);
    }
  }

  // Filter out deleted/tombstone beads
  return allBeads.filter((b) => b.status !== "tombstone");
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

export function getEventsFilePath(rig?: string): string {
  const basePath = expandPath(GASTOWN_PATH);
  if (rig) {
    return `${basePath}/${rig}/.events.jsonl`;
  }
  return `${basePath}/.events.jsonl`;
}

export function getAvailableRigs(): string[] {
  const basePath = expandPath(GASTOWN_PATH);

  if (!existsSync(basePath)) {
    return [];
  }

  try {
    const entries = readdirSync(basePath);
    return entries.filter((entry) => {
      const rigPath = join(basePath, entry);
      const configPath = join(rigPath, "config.json");
      // A rig has a config.json file
      return statSync(rigPath).isDirectory() && existsSync(configPath);
    });
  } catch {
    return [];
  }
}

interface RawEvent {
  ts: string;
  source: string;
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  visibility: string;
}

function parseEventsFile(filePath: string): TownEvent[] {
  const expandedPath = expandPath(filePath);

  if (!existsSync(expandedPath)) {
    return [];
  }

  try {
    const content = readFileSync(expandedPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines
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
  } catch {
    return [];
  }
}

export function getRecentEvents(limit = 10): TownEvent[] {
  let allEvents: TownEvent[] = [];

  // Town level events
  allEvents = allEvents.concat(parseEventsFile(getEventsFilePath()));

  // All rig events
  const rigs = getAvailableRigs();
  for (const rigName of rigs) {
    const rigEvents = parseEventsFile(getEventsFilePath(rigName));
    allEvents = allEvents.concat(rigEvents);
  }

  // Sort by timestamp descending and return most recent
  allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return allEvents.slice(0, limit);
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
