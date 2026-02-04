# Gas Town: Complete Guide to Multi-Agent Orchestration

> A comprehensive guide to Steve Yegge's Gas Town ecosystem for multi-agent AI orchestration, including architecture deep-dive and web dashboard implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [The Gas Town Ecosystem](#the-gas-town-ecosystem)
3. [Core Concepts](#core-concepts)
4. [Architecture Deep Dive](#architecture-deep-dive)
5. [Agent Roles](#agent-roles)
6. [Data Model](#data-model)
7. [Key Workflows](#key-workflows)
8. [CLI Reference](#cli-reference)
9. [Web Dashboard Implementation](#web-dashboard-implementation)
10. [Getting Started](#getting-started)

---

## Overview

Gas Town is a **multi-agent orchestrator** for Claude Code that solves the fundamental problem of LLM context window limitations. When Claude Code sessions end (due to context filling up), work state is typically lost. Gas Town provides:

- **Persistent work state** via git-backed "Beads" (issues)
- **Agent identity & coordination** via mailboxes and hooks
- **Scalable orchestration** - comfortably manage 20-30 agents
- **Crash recovery** - work survives restarts, compaction, crashes

### The Stack

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           GAS TOWN ECOSYSTEM                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │     BEADS       │  │    GASTOWN      │  │  BEADS_VIEWER   │              │
│  │    (bd CLI)     │  │    (gt CLI)     │  │    (bv CLI)     │              │
│  │                 │  │                 │  │                 │              │
│  │  Git-backed     │  │  Multi-agent    │  │  TUI Dashboard  │              │
│  │  Issue Tracker  │  │  Orchestrator   │  │  + Graph Intel  │              │
│  │                 │  │                 │  │                 │              │
│  │  7.5k+ ⭐       │  │  450+ ⭐        │  │  230+ ⭐        │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                ▼                                            │
│                   ┌────────────────────────┐                                │
│                   │  .beads/beads.jsonl    │                                │
│                   │   (Source of Truth)    │                                │
│                   │   Git-tracked JSONL    │                                │
│                   └────────────────────────┘                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Prerequisites

| Tool        | Version | Purpose                   |
| ----------- | ------- | ------------------------- |
| Go          | 1.23+   | Build tools               |
| Git         | 2.25+   | Worktree support          |
| Claude Code | Latest  | AI agents                 |

### Installation

```bash
# Install Beads (issue tracker)
go install github.com/steveyegge/beads/cmd/bd@latest

# Install Gas Town (orchestrator)
go install github.com/steveyegge/gastown/cmd/gt@latest

# Install Beads Viewer (TUI dashboard)
curl -fsSL "https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/install.sh" | bash
# Or: go install github.com/Dicklesworthstone/beads_viewer/cmd/bv@latest
```

---

## The Gas Town Ecosystem

### Component Overview

| Component        | Binary | Repository                                                                          | Purpose                                     |
| ---------------- | ------ | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| **Beads**        | `bd`   | [steveyegge/beads](https://github.com/steveyegge/beads)                             | Git-backed issue tracker, atomic work units |
| **Gas Town**     | `gt`   | [steveyegge/gastown](https://github.com/steveyegge/gastown)                         | Multi-agent orchestration, convoys, mail    |
| **Beads Viewer** | `bv`   | [Dicklesworthstone/beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) | TUI + graph analytics (PageRank, etc.)      |

### Why This Architecture?

**The Problem**: Claude Code sessions end when context fills up. Work state lives in agent memory and is lost.

**The Solution**:

- Work state lives in **Beads** (git-backed, persistent)
- Agents have **Hooks** where work hangs
- On wake, agents check their hook and **run what's there**
- Any agent can continue where another left off

This is called **GUPP** (Gas Town Universal Propulsion Principle):

> **If there is work on your hook, YOU MUST RUN IT.**

---

## Core Concepts

### 1. Towns & Rigs

```
~/gt/                          # Your Town (workspace root)
├── town.toml                  # Town configuration
├── .beads/                    # Town-level beads
│   └── beads.jsonl
└── rigs/                      # Projects (git repos)
    ├── api/
    │   ├── .beads/
    │   │   └── beads.jsonl    # Rig-level beads
    │   └── .git/
    ├── web/
    │   ├── .beads/
    │   └── .git/
    └── shared/
```

- **Town**: Your workspace root (`~/gt`). Contains all rigs and town-level coordination.
- **Rig**: A git repository under Gas Town management. Each rig has its own beads and agents.

### 2. Beads

Beads are the **atomic unit of work**. Think of them as enhanced issues stored in a JSONL file.

```jsonl
{"id":"gt-abc123","title":"Fix auth flow","status":"open","type":"bug","priority":1,"blocks":["gt-def456"],"assignee":"polecat-1"}
{"id":"gt-def456","title":"Update login UI","status":"blocked","depends_on":["gt-abc123"]}
```

**Key Properties**:

- `id`: Unique identifier (prefix indicates rig)
- `title`: What needs to be done
- `status`: open | in_progress | blocked | closed | ready
- `type`: bug | feature | task | epic | chore
- `priority`: 0 (highest) to 3+ (lowest)
- `blocks` / `depends_on`: Dependency relationships
- `assignee`: Which agent is working on it

### 3. Hooks

Each agent has a **hook** where work hangs. When an agent wakes up:

1. Check the hook
2. If work exists, execute it
3. If no work, request more or idle

Hooks survive crashes - they're persisted in beads, not agent memory.

### 4. Convoys

A **Convoy** groups related work into a trackable unit:

```bash
# Create a convoy tracking multiple issues
gt convoy create "Auth System Overhaul" gt-001 gt-002 gt-003 --notify --human

# Track progress
gt convoy list
gt convoy status convoy-alpha
```

Convoys provide:

- Progress tracking (X/Y tasks complete)
- Milestone notifications
- Human oversight flags

### 5. Molecules & Formulas

**Formulas** define reusable workflows (like K8s manifests):

```toml
# .beads/formulas/shiny.formula.toml
formula = "shiny"
description = "Design before code, review before ship"

[[steps]]
id = "design"
description = "Think about architecture"

[[steps]]
id = "implement"
needs = ["design"]

[[steps]]
id = "test"
needs = ["implement"]

[[steps]]
id = "submit"
needs = ["test"]
```

**Molecules** are instantiated workflows:

```bash
bd formula list              # See available formulas
bd cook shiny                # Freeze into protomolecule
bd mol pour shiny --var feature=auth   # Create live molecule
gt sling gt-xyz myproject    # Assign to worker
```

### MEOW: Molecular Expression of Work

| Phase  | Name          | Storage            | Description            |
| ------ | ------------- | ------------------ | ---------------------- |
| Ice-9  | Formula       | `.beads/formulas/` | Source template        |
| Solid  | Protomolecule | `.beads/`          | Frozen, reusable       |
| Liquid | Molecule      | `.beads/`          | Live, flowing work     |
| Vapor  | Wisp          | `.beads/`          | Ephemeral, for patrols |

**Operators**:

- `cook`: Formula → Protomolecule
- `pour`: Protomolecule → Molecule
- `wisp`: Protomolecule → Wisp (ephemeral)
- `squash`: Mol/Wisp → Digest (permanent record)
- `burn`: Wisp → ∅ (discard)

---

## Architecture Deep Dive

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GAS TOWN RUNTIME                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          TOWN LEVEL                                  │   │
│  │                                                                      │   │
│  │   ┌──────────┐    ┌──────────┐    ┌──────────────────────────────┐  │   │
│  │   │  MAYOR   │    │  DEACON  │    │      TOWN BEADS              │  │   │
│  │   │          │    │ (Daemon) │    │  .beads/beads.jsonl          │  │   │
│  │   │ Cross-rig│    │          │    │  - Convoys                   │  │   │
│  │   │ dispatch │    │ Lifecycle│    │  - Agent identities          │  │   │
│  │   │          │    │ Plugins  │    │  - Town-level work           │  │   │
│  │   └──────────┘    └──────────┘    └──────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          RIG LEVEL (per project)                     │   │
│  │                                                                      │   │
│  │   ┌──────────┐    ┌──────────┐    ┌──────────────────────────────┐  │   │
│  │   │ WITNESS  │    │ REFINERY │    │       RIG BEADS              │  │   │
│  │   │          │    │          │    │  rigs/api/.beads/beads.jsonl │  │   │
│  │   │ Monitors │    │ Merge    │    │  - Issues for this project   │  │   │
│  │   │ polecats │    │ queue    │    │  - Local molecules           │  │   │
│  │   │          │    │ PR review│    │  - Work state                │  │   │
│  │   └──────────┘    └──────────┘    └──────────────────────────────┘  │   │
│  │                                                                      │   │
│  │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │   │
│  │   │POLECAT-1 │ │POLECAT-2 │ │POLECAT-3 │ │  CREW    │              │   │
│  │   │          │ │          │ │          │ │          │              │   │
│  │   │ Worker   │ │ Worker   │ │ Worker   │ │ Named    │              │   │
│  │   │ gt-abc   │ │ gt-def   │ │ (idle)   │ │ agents   │              │   │
│  │   └──────────┘ └──────────┘ └──────────┘ └──────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          COMMUNICATION                               │   │
│  │                                                                      │   │
│  │   ┌────────────────────────────────────────────────────────────┐    │   │
│  │   │                    MAIL SYSTEM                              │    │   │
│  │   │  Addresses: mayor@town, witness@api, polecat-1@api          │    │   │
│  │   │  Announces: all@api, all@town                               │    │   │
│  │   └────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   OVERSEER   │     │    MAYOR     │     │   WITNESS    │
│   (Human)    │     │              │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │ gt convoy create   │ dispatch work      │ monitor health
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                      BEADS STORE                        │
│                  .beads/beads.jsonl                     │
│                                                         │
│  Convoys ──────────────────────────────────────────────│
│  Molecules ────────────────────────────────────────────│
│  Issues ───────────────────────────────────────────────│
│  Agent Identities ─────────────────────────────────────│
│  Hooks ────────────────────────────────────────────────│
└─────────────────────────────────────────────────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  POLECAT-1   │     │  POLECAT-2   │     │   REFINERY   │
│              │     │              │     │              │
│  Execute     │     │  Execute     │     │  Merge PRs   │
│  gt-abc123   │     │  gt-def456   │     │  Review code │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Agent Roles

| Role         | Scope | Responsibilities                        | Count        |
| ------------ | ----- | --------------------------------------- | ------------ |
| **Overseer** | Human | Strategy, reviews, escalations          | 1            |
| **Mayor**    | Town  | Cross-rig coordination, dispatch        | 1            |
| **Deacon**   | Town  | Daemon process, lifecycle, plugins      | 1            |
| **Witness**  | Rig   | Monitor polecats, detect stuck agents   | 1 per rig    |
| **Refinery** | Rig   | Merge queue, PR review, integration     | 1 per rig    |
| **Polecat**  | Task  | Execute work, ephemeral                 | Many per rig |
| **Crew**     | Rig   | Named persistent agents for design work | Several      |

### Role Details

#### Overseer (Human)

- Sets strategic direction
- Reviews important output
- Handles escalations
- Uses `gt start`, `gt shutdown`, `gt status`

#### Mayor

- Global coordinator
- Dispatches work across rigs
- Handles cross-rig dependencies
- Receives escalations from witnesses

#### Deacon

- Daemon process
- Manages agent lifecycle
- Executes plugins
- Handles system events

#### Witness (per rig)

- Monitors polecat health
- Detects stuck agents (no activity for N minutes)
- Nudges or restarts stuck workers
- Reports to Mayor

#### Refinery (per rig)

- Manages merge queue
- Reviews PRs
- Handles rebase conflicts
- Ensures code quality

#### Polecat (ephemeral workers)

- Execute specific tasks
- Spawn → Work → Disappear
- Check hook on wake
- File discovered issues
- Request handoff when done

#### Crew (persistent workers)

- Named agents for design work
- Good for back-and-forth iteration
- Survive across sessions
- Have distinct personalities/focuses

---

## Data Model

### Bead Schema

```typescript
interface Bead {
  id: string; // Unique ID (e.g., "gt-abc123")
  title: string; // What needs to be done
  description?: string; // Detailed description
  status: BeadStatus; // open | in_progress | blocked | closed | ready
  type?: BeadType; // bug | feature | task | epic | chore
  priority?: number; // 0 = highest
  assignee?: string; // Agent ID
  labels?: string[]; // Tags
  blocks?: string[]; // IDs this bead blocks
  depends_on?: string[]; // IDs this bead depends on
  created_at?: string; // ISO timestamp
  updated_at?: string; // ISO timestamp
  closed_at?: string; // ISO timestamp
  comments?: Comment[]; // Discussion thread
  external_ref?: string; // Link to Jira/GitHub
  molecule_id?: string; // Part of workflow
  step_id?: string; // Step within molecule
}
```

### Convoy Schema

```typescript
interface Convoy {
  id: string; // Convoy ID
  name: string; // Human-readable name
  description?: string; // What this convoy delivers
  status: ConvoyStatus; // active | completed | paused | failed
  beads: string[]; // Tracked bead IDs
  created_at: string;
  updated_at: string;
  created_by?: string; // Who created it
  notify?: boolean; // Send notifications
  human_required?: boolean; // Needs human review
}
```

### Agent Schema

```typescript
interface Agent {
  id: string; // Agent ID
  role: AgentRole; // mayor | witness | refinery | polecat | crew
  rig?: string; // Assigned project
  status: AgentStatus; // idle | working | stuck | handoff_requested | offline
  current_task?: string; // Bead ID
  hook?: Hook; // Current work hook
  session_id?: string; // Claude Code session
  started_at?: string;
  context_usage?: number; // 0-100%
  last_activity?: string;
}

interface Hook {
  agent_id: string;
  work?: string[]; // Bead IDs
  molecule_id?: string;
  step_id?: string;
}
```

### Mail Schema

```typescript
interface Mail {
  id: string;
  from: string; // agent@rig format
  to: string;
  subject: string;
  body: string;
  sent_at: string;
  read?: boolean;
  thread_id?: string;
}
```

---

## Key Workflows

### 1. Basic Work Assignment

```bash
# Create work
bd create "Fix login bug" --type bug --priority 1

# Create convoy to track it
gt convoy create "Fix Auth Issues" gt-abc123 gt-def456

# Assign to a rig (spawns polecat automatically)
gt sling gt-abc123 api

# Monitor progress
gt convoy list
```

### 2. Molecule-Based Workflow

```bash
# List available formulas
bd formula list

# Cook a formula into a protomolecule
bd cook shiny

# Pour into a live molecule with variables
bd mol pour shiny --var feature=oauth

# Track with convoy
gt convoy create "OAuth Feature" gt-xyz

# Assign
gt sling gt-xyz api

# Worker executes each step, closing beads as it goes
# If worker crashes, new worker picks up at last completed step
```

### 3. Handoff Flow

```bash
# Agent requests handoff (context full)
gt handoff

# Or via slash command in Claude Code
/handoff

# Agent optionally sends itself work, then restarts session
# New session loads hook and continues
```

### 4. Stuck Agent Recovery

```
Witness detects polecat-3 unresponsive for 15 minutes
         │
         ▼
Witness sends mail to Mayor: "Stuck agent detected"
         │
         ▼
Mayor options:
  - Force handoff: gt handoff --agent polecat-3
  - Reassign work: gt sling gt-abc123 api (spawns new polecat)
  - Kill agent: gt polecat kill polecat-3
```

---

## CLI Reference

### Gas Town (gt)

```bash
# Town Management
gt install ~/gt                  # Create workspace
gt start                         # Start daemon + agents
gt shutdown                      # Graceful shutdown
gt status                        # Town overview
gt doctor                        # Health check
gt doctor --fix                  # Auto-repair

# Rig Management
gt rig add myproject --remote=https://github.com/you/repo.git
gt rig list
gt rig remove myproject

# Convoy Management
gt convoy create "name" issue-1 issue-2 --notify --human
gt convoy list                   # Dashboard view
gt convoy status <id>            # Detailed progress

# Work Assignment
gt sling <bead> <rig>            # Assign to polecat

# Agent Control
gt mayor attach                  # Jump into Mayor session
gt witness attach                # Jump into Witness session
gt handoff                       # Request session cycle
gt peek <agent>                  # Check agent health

# Mail
gt mail inbox                    # Check messages
gt mail send <addr> -s "..." -m "..."
gt mail announces                # Bulletin board
```

### Beads (bd)

```bash
# Issue Management
bd create "title" --type bug --priority 1 --assignee polecat-1
bd show <id>                     # View details
bd update <id> --status in_progress
bd close <id>
bd reopen <id>
bd list                          # All issues
bd list --status open            # Filtered
bd ready                         # Actionable (no blockers)

# Dependencies
bd block <id> --by <other-id>    # Add blocker
bd unblock <id> --from <other-id> # Remove blocker

# Formulas & Molecules
bd formula list
bd cook <formula>
bd mol pour <proto> --var key=value
bd mol status <mol-id>
```

### Beads Viewer (bv)

```bash
# Interactive TUI
bv                               # Launch dashboard

# Robot Protocol (JSON output for AI/scripts)
bv --robot-help                  # AI documentation
bv --robot-insights              # Graph metrics (PageRank, etc.)
bv --robot-plan                  # Execution plan
bv --robot-priority              # Priority recommendations
bv --robot-diff --diff-since HEAD~5  # Change tracking
bv --robot-recipes               # Available recipes

# Recipes (pre-configured filters)
bv --recipe actionable           # Ready to work
bv --recipe blocked              # Waiting on deps
bv --recipe high-impact          # Top PageRank
bv --recipe stale                # Untouched 30+ days

# Export
bv --export-md report.md         # Markdown with Mermaid

# Time Travel
bv --as-of HEAD~10               # Historical view
bv --diff-since v1.0.0           # Compare changes
```

### TUI Keyboard Shortcuts (bv)

| Key     | Action                     |
| ------- | -------------------------- |
| `j`/`k` | Navigate up/down           |
| `g`/`G` | Jump to top/bottom         |
| `/`     | Search                     |
| `o`     | Filter: Open               |
| `c`     | Filter: Closed             |
| `r`     | Filter: Ready (actionable) |
| `b`     | Toggle Kanban board        |
| `i`     | Toggle Insights dashboard  |
| `g`     | Toggle Graph view          |
| `t`     | Time-travel mode           |
| `T`     | Quick time-travel (HEAD~5) |
| `E`     | Export to Markdown         |
| `C`     | Copy to clipboard          |
| `?`     | Help                       |
| `q`     | Quit                       |

---

## Web Dashboard Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WEB DASHBOARD STACK                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────┐                                                     │
│   │    NEXT.JS 15     │                                                     │
│   │    React 19       │                                                     │
│   │    TypeScript     │                                                     │
│   └─────────┬─────────┘                                                     │
│             │                                                               │
│   ┌─────────▼─────────┐     ┌─────────────────────────────────────────────┐│
│   │    API ROUTES     │     │              DATA SOURCES                   ││
│   │                   │     │                                             ││
│   │  /api/beads      ─┼────▶│  Parse .beads/beads.jsonl directly         ││
│   │  /api/insights   ─┼────▶│  Call bv --robot-insights                  ││
│   │  /api/convoys    ─┼────▶│  Call gt convoy list --json                ││
│   │  /api/agents     ─┼────▶│  Call gt status --json                     ││
│   │  /api/mail       ─┼────▶│  Call gt mail inbox --json                 ││
│   │                   │     │                                             ││
│   └───────────────────┘     └─────────────────────────────────────────────┘│
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         REAL-TIME UPDATES                            │  │
│   │                                                                      │  │
│   │   File Watcher (chokidar) ──▶ WebSocket ──▶ React Query invalidate  │  │
│   │                                                                      │  │
│   │   Watch: .beads/beads.jsonl for changes                             │  │
│   │   Emit: { type: 'bead_change', data: [...] }                        │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Package        | Version | Purpose                         |
| -------------- | ------- | ------------------------------- |
| Next.js        | 15.x    | React framework with App Router |
| React          | 19.x    | UI library                      |
| TypeScript     | 5.x     | Type safety                     |
| Tailwind CSS   | 4.x     | Styling                         |
| @xyflow/react  | 12.x    | Dependency graph visualization  |
| TanStack Query | 5.x     | Data fetching & caching         |
| Zustand        | 5.x     | State management                |
| Lucide React   | Latest  | Icons                           |
| chokidar       | 4.x     | File watching                   |

### Dashboard Views

#### 1. Town Overview (Home)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏙️ GAS TOWN CONTROL CENTER                              [⚙️] [👤]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   AGENTS    │  │    WORK     │  │   CONVOYS   │  │   HEALTH    │   │
│  │     12      │  │     47      │  │      3      │  │    98%      │   │
│  │   active    │  │   pending   │  │   in-flight │  │   uptime    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  WORK DISTRIBUTION              │  │  RECENT EVENTS              │  │
│  │                                 │  │                             │  │
│  │  Open        ████████░░ 23     │  │  • polecat-3 completed task │  │
│  │  In Progress ███░░░░░░░  8     │  │  • convoy-2 milestone hit   │  │
│  │  Blocked     ██░░░░░░░░  5     │  │  • refinery merged PR #42   │  │
│  │  Actionable  ██████░░░░ 18     │  │  • polecat-5 spawned        │  │
│  │                                 │  │  • witness detected stuck   │  │
│  └─────────────────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 2. Agents View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  👥 AGENTS                                          [+ Spawn] [⟳]       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🎖️ MAYOR            │ Active │ Cross-rig dispatch   │ 2h up    │   │
│  │ Context: ████████████████████░░░░░░░░░░░░░░░░░░░ 45%           │   │
│  │ Current: Coordinating convoy-alpha across 3 rigs               │   │
│  │ [📧 Mail] [📋 Hook] [🔄 Handoff] [📊 Logs]                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🦡 POLECAT-1 (api)  │ Working │ gt-abc123          │ 25m up    │   │
│  │ Context: ████████████████████████████████████░░░░░░░ 78%       │   │
│  │ Current: Implementing OAuth flow - step 3/5                    │   │
│  │ [📧 Mail] [📋 Hook] [🔄 Handoff] [📊 Logs] [⏸️ Pause]          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3. Convoys View

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🚛 CONVOYS                                    [+ Create] [📊 Analytics]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ convoy-alpha: "Auth System Overhaul" ──────────────────────────┐   │
│  │ Progress: ████████████░░░░░░░░ 60% (6/10 tasks)                 │   │
│  │                                                                  │   │
│  │  ✅ gt-001 Setup OAuth provider        → polecat-1 (completed)  │   │
│  │  ✅ gt-002 Create user model           → polecat-2 (completed)  │   │
│  │  🔄 gt-003 Build login UI              → polecat-3 (working)    │   │
│  │  ⏳ gt-004 Write tests                 → unassigned             │   │
│  │  🚫 gt-005 Deploy to staging          → blocked by gt-003       │   │
│  │                                                                  │   │
│  │  [📊 Dependency Graph] [📧 Notify] [⏸️ Pause] [✓ Complete]      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 4. Insights Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 INSIGHTS                                              [⟳] [📥]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐           │
│  │ 🚧 BOTTLENECKS  │ │ 🏛️ KEYSTONES    │ │ 🔄 CYCLES       │           │
│  │ (Betweenness)   │ │ (Critical Path) │ │ (Circular Deps) │           │
│  │                 │ │                 │ │                 │           │
│  │ 0.45 gt-auth    │ │ 12.0 gt-schema  │ │ ⚠️ A → B → A    │           │
│  │ 0.38 gt-api     │ │ 10.0 gt-core    │ │                 │           │
│  │ 0.21 gt-deploy  │ │  8.0 gt-auth    │ │ 0 cycles found  │           │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘           │
│                                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐           │
│  │ 🛰️ HUBS         │ │ 📚 AUTHORITIES  │ │ 📈 HEALTH       │           │
│  │ (Aggregators)   │ │ (Dependencies)  │ │ (Metrics)       │           │
│  │                 │ │                 │ │                 │           │
│  │ 0.67 epic-auth  │ │ 0.91 gt-utils   │ │ Density: 0.045  │           │
│  │ 0.54 epic-ui    │ │ 0.78 gt-config  │ │ Velocity: +12/w │           │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 5. Dependency Graph

Interactive visualization using React Flow:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔗 DEPENDENCY GRAPH                      [🔍 Zoom] [⟳ Layout] [📥]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                    ┌─────────┐                                          │
│                    │ gt-001  │ ✅                                       │
│                    │ OAuth   │                                          │
│                    └────┬────┘                                          │
│                         │                                               │
│            ┌────────────┼────────────┐                                  │
│            ▼            ▼            ▼                                  │
│       ┌─────────┐  ┌─────────┐  ┌─────────┐                            │
│       │ gt-002  │  │ gt-003  │  │ gt-004  │ 🔄                         │
│       │ User    │  │ Token   │  │ Login   │                            │
│       └────┬────┘  └────┬────┘  └────┬────┘                            │
│            │            │            │                                  │
│            └────────────┼────────────┘                                  │
│                         ▼                                               │
│                    ┌─────────┐                                          │
│                    │ gt-005  │ 🚫                                       │
│                    │ Deploy  │                                          │
│                    └─────────┘                                          │
│                                                                         │
│  Legend: ✅ Complete  🔄 In Progress  ⏳ Pending  🚫 Blocked            │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Endpoints

```typescript
// Beads
GET    /api/beads                    // List all beads
GET    /api/beads?status=open        // Filter by status
GET    /api/beads?rig=api            // Filter by rig
GET    /api/beads/:id                // Get single bead
POST   /api/beads                    // Create bead
PATCH  /api/beads/:id                // Update bead

// Convoys
GET    /api/convoys                  // List convoys
GET    /api/convoys/:id              // Convoy details + progress
POST   /api/convoys                  // Create convoy
POST   /api/convoys/:id/sling        // Assign work

// Agents
GET    /api/agents                   // List all agents
GET    /api/agents/:id               // Agent details
POST   /api/agents/:id/handoff       // Trigger handoff
POST   /api/agents/spawn             // Spawn new polecat

// Mail
GET    /api/mail/:agent/inbox        // Get inbox
POST   /api/mail                     // Send mail
GET    /api/mail/announces           // Announcements

// Insights (from bv)
GET    /api/insights                 // Graph metrics
GET    /api/insights?type=plan       // Execution plan
GET    /api/insights?type=priority   // Priority recommendations
GET    /api/insights?type=diff&since=HEAD~5  // Diff

// Real-time
WS     /api/ws                       // WebSocket for live updates
```

### Project Structure

```
gastown-dashboard/
├── app/
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Town overview
│   ├── globals.css                 # Global styles
│   ├── agents/
│   │   └── page.tsx                # Agents list
│   ├── convoys/
│   │   ├── page.tsx                # Convoys list
│   │   └── [id]/page.tsx           # Convoy detail
│   ├── beads/
│   │   └── page.tsx                # Beads list
│   ├── insights/
│   │   └── page.tsx                # Graph analytics
│   ├── graph/
│   │   └── page.tsx                # Dependency visualization
│   ├── mail/
│   │   └── page.tsx                # Mail center
│   └── api/
│       ├── beads/route.ts
│       ├── convoys/route.ts
│       ├── agents/route.ts
│       ├── insights/route.ts
│       └── ws/route.ts
├── components/
│   ├── agents/
│   │   ├── agent-card.tsx
│   │   └── agent-list.tsx
│   ├── convoys/
│   │   ├── convoy-card.tsx
│   │   └── convoy-progress.tsx
│   ├── graph/
│   │   ├── dependency-graph.tsx
│   │   └── insights-panels.tsx
│   └── ui/
│       ├── stat-card.tsx
│       └── progress-bar.tsx
├── lib/
│   ├── beads.ts                    # JSONL parser
│   ├── gastown.ts                  # CLI wrapper
│   └── utils.ts
├── types/
│   └── gastown.ts                  # TypeScript types
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Set Up Gas Town

```bash
# Install tools
go install github.com/steveyegge/beads/cmd/bd@latest
go install github.com/steveyegge/gastown/cmd/gt@latest

# Create your town
gt install ~/gt
cd ~/gt

# Add a project
gt rig add myproject --remote=https://github.com/you/repo.git
```

### 2. Create Some Work

```bash
# Initialize beads in your project
cd ~/gt/rigs/myproject
bd init

# Create issues
bd create "Set up project structure" --type task --priority 0
bd create "Implement auth flow" --type feature --priority 1
bd create "Fix login bug" --type bug --priority 1

# Create convoy
gt convoy create "MVP Launch" gt-001 gt-002 gt-003 --notify
```

### 3. Start Working

```bash
# Option A: Manual
gt sling gt-001 myproject
claude --resume  # Agent reads hook, runs work

# Option B: Automated
gt daemon start
gt sling gt-001 myproject  # Spawns polecat automatically
gt convoy list             # Monitor progress
```

### 4. Set Up Dashboard (Optional)

```bash
# Clone dashboard starter
cd ~/gt
git clone <dashboard-repo> dashboard
cd dashboard

# Install dependencies
npm install

# Configure
export GASTOWN_PATH=~/gt

# Run
npm run dev
# Open http://localhost:3000
```

---

## Resources

- **Beads**: https://github.com/steveyegge/beads
- **Gas Town**: https://github.com/steveyegge/gastown
- **Beads Viewer**: https://github.com/Dicklesworthstone/beads_viewer
- **Steve Yegge's Blog Post**: "Welcome to Gas Town" (Medium)

---

## License

Gas Town ecosystem is MIT licensed.

This guide and dashboard implementation are provided as a starting point for building your own multi-agent orchestration system.
