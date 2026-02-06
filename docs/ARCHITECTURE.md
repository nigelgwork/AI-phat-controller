# Architecture

## System Overview

AI Phat Controller is a local developer tool with a React frontend and Express backend. The primary run mode is plain Node.js; Docker is supported as an alternative.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI Phat Controller                                  │
│                                                                              │
│  ┌────────────────────────────┐       ┌────────────────────────────────┐    │
│  │      Frontend              │       │          Backend               │    │
│  │      (Vite + React)        │       │          (Express.js)          │    │
│  │                            │       │                                │    │
│  │  ┌──────────────────────┐  │       │  ┌──────────────────────────┐  │    │
│  │  │ Pages (16)           │  │ HTTP  │  │ REST API Routes (21)     │  │    │
│  │  │ Dashboard, Controller│  │──────▶│  │ /api/tasks               │  │    │
│  │  │ Tasks, Sessions,     │  │       │  │ /api/claude              │  │    │
│  │  │ Projects, Settings...│  │◀──────│  │ /api/settings            │  │    │
│  │  └──────────────────────┘  │  JSON │  │ /api/projects            │  │    │
│  │                            │       │  │ /api/sessions            │  │    │
│  │  ┌──────────────────────┐  │       │  │ /api/system  ...         │  │    │
│  │  │ State Management     │  │       │  └──────────────────────────┘  │    │
│  │  │ TanStack Query       │  │       │                                │    │
│  │  │ Zustand              │  │  WS   │  ┌──────────────────────────┐  │    │
│  │  └──────────────────────┘  │◀─────▶│  │ WebSocket Server         │  │    │
│  │                            │       │  │ (live updates)            │  │    │
│  │  ┌──────────────────────┐  │       │  └──────────────────────────┘  │    │
│  │  │ Visualization        │  │       │                                │    │
│  │  │ @xyflow/react        │  │       │  ┌──────────────────────────┐  │    │
│  │  │ (dependency graphs)  │  │       │  │ SQLite Database          │  │    │
│  │  └──────────────────────┘  │       │  │ (better-sqlite3)         │  │    │
│  │                            │       │  │                          │  │    │
│  │  Port: 5173 (dev)         │       │  │ Tables: tasks, sessions, │  │    │
│  │  Served from :3001 (prod) │       │  │ settings, conversations, │  │    │
│  └────────────────────────────┘       │  │ projects, token_history  │  │    │
│                                        │  └──────────────────────────┘  │    │
│                                        │                                │    │
│                                        │  ┌──────────────────────────┐  │    │
│                                        │  │ External Processes       │  │    │
│                                        │  │                          │  │    │
│                                        │  │ claude (Code CLI)        │  │    │
│                                        │  │ gt (Gas Town CLI)        │  │    │
│                                        │  │ bd (Beads CLI)           │  │    │
│                                        │  └──────────────────────────┘  │    │
│                                        │                                │    │
│                                        │  Port: 3001                   │    │
│                                        └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Request Flow

```
  Browser                    Express Server               External
  ───────                    ──────────────               ────────

  User clicks              ┌──────────────┐
  "Run Task"  ───────────▶ │ POST         │
                            │ /api/claude  │
                            │ /execute     │
                            └──────┬───────┘
                                   │
                            ┌──────▼───────┐
                            │ Validate     │
                            │ (Zod schema) │
                            └──────┬───────┘
                                   │
                            ┌──────▼───────┐            ┌──────────────┐
                            │ Spawn        │───────────▶│ claude       │
                            │ child_process│            │ --print      │
                            │              │◀───────────│ --output-fmt │
                            └──────┬───────┘   stdout   │ json         │
                                   │                    └──────────────┘
                            ┌──────▼───────┐
                            │ Parse JSON   │
                            │ response     │
                            └──────┬───────┘
                                   │
                            ┌──────▼───────┐
                            │ Store in     │
                            │ SQLite       │
                            │ (session,    │
                            │  tokens)     │
                            └──────┬───────┘
                                   │
  UI updates  ◀────────────────────┘
  via response
```

## Data Layer

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SQLite Database                              │
│                         ./data/controller.db                        │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ tasks           │  │ projects        │  │ settings            │ │
│  │                 │  │                 │  │                     │ │
│  │ id              │  │ id              │  │ key                 │ │
│  │ title           │  │ name            │  │ value               │ │
│  │ status          │  │ path            │  │ updated_at          │ │
│  │ description     │  │ created_at      │  └─────────────────────┘ │
│  │ created_at      │  └─────────────────┘                          │
│  └─────────────────┘                                                │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ conversations   │  │ execution_      │  │ token_history       │ │
│  │                 │  │ sessions        │  │                     │ │
│  │ id              │  │                 │  │ id                  │ │
│  │ project_id      │  │ id              │  │ session_id          │ │
│  │ messages (JSON) │  │ session_id      │  │ input_tokens        │ │
│  │ created_at      │  │ status          │  │ output_tokens       │ │
│  └─────────────────┘  │ started_at      │  │ timestamp           │ │
│                        └─────────────────┘  └─────────────────────┘ │
│                                                                      │
│  Migrations: server/db/migrations/*.sql                             │
│  Repository pattern: server/db/repositories/*-repo.ts               │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment Modes

### Native (primary)

```
┌────────────────────────────────────────────┐
│              Your Machine                   │
│                                             │
│  pnpm dev                                   │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Vite dev server  │  │ Express server  │  │
│  │ :5173 (HMR)      │  │ :3001           │  │
│  │                  │  │                 │  │
│  │ Proxies /api/*───┼─▶│ API + WebSocket │  │
│  │ to :3001         │  │ SQLite DB       │  │
│  └─────────────────┘  └────────┬────────┘  │
│                                 │           │
│                        ┌────────▼────────┐  │
│                        │ claude CLI      │  │
│                        │ (in PATH)       │  │
│                        └─────────────────┘  │
│                                             │
│  pnpm start (production)                    │
│  ┌──────────────────────────────────────┐   │
│  │ Express server :3001                 │   │
│  │ Serves built frontend from dist/     │   │
│  │ API + WebSocket + static files       │   │
│  └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### Docker (alternative)

```
┌────────────────────────────────────────────┐
│         Docker Container                    │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ node:20-slim                         │   │
│  │                                      │   │
│  │ Express :3001                        │   │
│  │ ├── Built frontend (dist/)           │   │
│  │ ├── API routes                       │   │
│  │ └── SQLite (mounted volume)          │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Volumes:                                   │
│  - ./data:/app/data         (database)      │
│  - ~/.claude:/root/.claude  (claude config) │
│  - claude binary mounted    (CLI access)    │
└────────────────────────────────────────────┘
```

## Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Overview stats, quick navigation |
| Controller | `/controller` | AI Controller chat interface |
| Tasks | `/tasks` | Task management with status workflows |
| Sessions | `/sessions` | Claude Code session tracking |
| Projects | `/projects` | Project management |
| Agents | `/agents` | Gas Town agent monitoring |
| Beads | `/beads` | Work items from Gas Town |
| Convoys | `/convoys` | Grouped work packages |
| Clawdbot | `/clawdbot` | AI assistant with personality |
| Settings | `/settings` | App configuration, debug info |
| Activity Log | `/activity` | Activity history |
| Terminal | `/terminal` | WebSocket terminal |
| Setup | `/setup` | First-run configuration |

## API Routes

All routes are under `/api/` and defined in `server/routes/`.

| Route | Method(s) | Purpose |
|-------|-----------|---------|
| `/api/tasks` | CRUD | Task management |
| `/api/projects` | CRUD | Project management |
| `/api/claude` | POST | Execute Claude Code commands |
| `/api/claude-sessions` | GET/POST | Claude session tracking |
| `/api/sessions` | CRUD | Execution session management |
| `/api/conversations` | CRUD | Conversation history |
| `/api/settings` | GET/PUT | App settings |
| `/api/mode` | GET | Execution mode detection |
| `/api/controller` | POST | AI Controller operations |
| `/api/clawdbot` | CRUD | Clawdbot agent config |
| `/api/token-history` | GET | Token usage analytics |
| `/api/activity` | GET | Activity log |
| `/api/mcp` | CRUD | MCP server configuration |
| `/api/ntfy` | POST | Push notifications |
| `/api/briefs` | CRUD | Project briefs |
| `/api/screenshots` | POST | Screenshot capture |
| `/api/images` | GET | Image serving |
| `/api/gui-tests` | POST | GUI test execution |
| `/api/agents` | GET | Gas Town agent status |
| `/api/beads` | GET | Gas Town beads |
| `/api/system` | GET | Health check, version, debug |

## Build Pipeline

```
pnpm run build
    │
    ├── pnpm run build:frontend
    │   └── vite build
    │       └── Output: dist/           (HTML + JS + CSS)
    │
    ├── pnpm run build:server
    │   └── tsc -p tsconfig.server.json
    │       └── Output: dist-server/    (compiled JS)
    │
    └── pnpm run copy-assets
        └── cp -r server/db/migrations dist-server/server/db/
            └── Copies .sql files tsc ignores
```

## Key Design Decisions

1. **Plain Node.js over Docker as primary**: Avoids volume mount complexity for Claude CLI, faster rebuild cycles, simpler developer experience.

2. **SQLite over file-based storage**: Atomic operations, proper migrations, repository pattern for data access. Single file at `./data/controller.db`.

3. **Express over Next.js**: Decoupled frontend/backend allows independent development. Vite for fast frontend HMR, Express for stable API server.

4. **Spawn over API for Claude**: Uses `claude` CLI directly via `child_process.spawn()` rather than the Anthropic HTTP API. This gives access to Claude Code's full toolset (file editing, bash, etc.).

5. **Electron kept as legacy**: The `electron/` directory contains the original desktop wrapper. It still works but is not the primary deployment target. Server mode is preferred.
