# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

AI Phat Controller is a local dashboard + backend for multi-agent orchestration with Claude Code. It consists of:

- **Frontend**: Vite + React 19 SPA for monitoring agents, tasks, sessions, and settings
- **Backend**: Express.js server with SQLite database, REST API, and WebSocket support
- **Claude Code Integration**: Spawns Claude Code CLI as child processes for AI operations
- **Gas Town Integration**: Optional support for Gas Town (gt) and Beads (bd) CLIs

## Quick Start

```bash
pnpm install          # Install dependencies
pnpm dev              # Start Vite (:5173) + Express (:3001)
pnpm start            # Build and start production server
pnpm test:run         # Run tests
```

## Architecture

```
Frontend (Vite + React)          Backend (Express.js)
:5173 (dev) / :3001 (prod)      :3001

  React 19 + TypeScript            REST API (21 routes)
  TanStack Query                   WebSocket (live updates)
  Zustand                          SQLite (better-sqlite3)
  @xyflow/react                    Claude Code CLI (spawned)
  Tailwind CSS 3                   Gas Town CLIs (optional)
```

In development, Vite runs on :5173 with HMR and proxies API calls to Express on :3001. In production, Express serves the built frontend from `dist/`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed diagrams.

## Development Commands

```bash
pnpm dev              # Start both Vite + Express (concurrently)
pnpm dev:server       # Start Express only (tsx watch)
pnpm build            # Build frontend + server + copy migration assets
pnpm build:frontend   # Build Vite frontend to dist/
pnpm build:server     # Compile server TypeScript to dist-server/
pnpm start            # Build everything then start server
pnpm test:run         # Run Vitest test suite
pnpm lint             # ESLint
pnpm typecheck        # TypeScript type check
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DATA_DIR` | `./data` | SQLite database directory |
| `GASTOWN_PATH` | `~/gt` | Gas Town workspace path |
| `EXECUTION_MODE` | `linux` | Execution mode |

---

## CRITICAL: Process Management Safety

**DO NOT spawn multiple concurrent processes.** Previous sessions crashed bash by spawning too many processes.

### Rules:

1. **NEVER run dev servers in background** - `pnpm dev` spawns multiple child processes via concurrently
2. **NEVER use `run_in_background: true`** for npm/pnpm commands in this project
3. **ONE process at a time** - Kill existing processes before starting new ones
4. **Check running processes first** - Run `pgrep -a node` before spawning new processes
5. **Use timeouts** - Always use timeout for any exec calls

### Safe Testing Workflow:

```bash
pgrep -a node                  # Check what's running
pkill -f "next dev" || true    # Kill any existing dev servers
pnpm dev                       # Run ONE command in foreground
```

---

## Project Structure

```
ai-controller/
├── frontend/                   # Vite + React SPA
│   ├── src/
│   │   ├── pages/              # Page components (16 pages)
│   │   │   ├── Dashboard.tsx   # Overview stats
│   │   │   ├── Controller.tsx  # AI Controller chat
│   │   │   ├── Tasks.tsx       # Task management
│   │   │   ├── Sessions.tsx    # Claude Code sessions
│   │   │   ├── Projects.tsx    # Project management
│   │   │   ├── Settings.tsx    # Configuration + debug
│   │   │   ├── Clawdbot.tsx    # AI assistant
│   │   │   ├── Agents.tsx      # Gas Town agents
│   │   │   ├── Beads.tsx       # Gas Town work items
│   │   │   ├── Convoys.tsx     # Grouped work
│   │   │   └── ...
│   │   ├── components/         # Shared UI (26+ components)
│   │   ├── api/                # API client (server-api.ts)
│   │   ├── hooks/              # Custom React hooks
│   │   └── types/              # TypeScript definitions
│   └── index.html
│
├── server/                     # Express.js backend
│   ├── index.ts                # Server entry point
│   ├── routes/                 # API routes (21 modules)
│   │   ├── tasks.ts
│   │   ├── claude.ts
│   │   ├── settings.ts
│   │   ├── projects.ts
│   │   ├── agents.ts
│   │   ├── controller.ts
│   │   ├── conversations.ts
│   │   ├── execution-sessions.ts
│   │   ├── claude-sessions.ts
│   │   ├── clawdbot.ts
│   │   ├── token-history.ts
│   │   ├── mode.ts
│   │   ├── system.ts
│   │   └── ...
│   ├── db/
│   │   ├── database.ts         # SQLite init + migrations
│   │   ├── repositories/       # Data access layer (13 repos)
│   │   └── migrations/         # SQL migration files
│   ├── services/               # Business logic
│   │   ├── executor/           # Claude Code execution
│   │   ├── mode-detection.ts   # Linux/Docker/WSL detection
│   │   ├── settings.ts         # Settings service
│   │   └── ...
│   ├── middleware/              # Express middleware
│   ├── utils/                  # Logger, paths, errors
│   └── websocket.ts            # WebSocket server
│
├── shared/                     # Types shared between frontend/server
│   └── types/index.ts
│
├── electron/                   # Electron desktop wrapper (legacy)
│
├── bin/cli.js                  # CLI entry point (npx)
├── Dockerfile                  # Docker build
├── docker-compose.yml          # Docker Compose
├── vite.config.ts              # Vite config
├── tsconfig.json               # Frontend TypeScript config
├── tsconfig.server.json        # Server TypeScript config
├── vitest.config.ts            # Test config
└── docs/                       # Documentation
    ├── ARCHITECTURE.md          # Detailed architecture diagrams
    ├── SECURITY.md              # Security model
    ├── folder-structure.md      # Naming conventions
    ├── clean-code.md            # Code quality guidelines
    └── gastown-reference.md     # Gas Town ecosystem guide
```

## Key Files

| File | Purpose |
|------|---------|
| `server/index.ts` | Express server entry, middleware, route registration |
| `server/db/database.ts` | SQLite init, migrations runner |
| `server/services/mode-detection.ts` | Detect Claude CLI, Docker, WSL |
| `server/services/settings.ts` | Settings service (SQLite-backed) |
| `frontend/src/api/server-api.ts` | Frontend API client |
| `frontend/src/App.tsx` | React Router setup |
| `shared/types/index.ts` | Shared TypeScript interfaces |
| `bin/cli.js` | npm/npx CLI entry point |

## API Routes

All routes mount under `/api/` in `server/index.ts`:

| Route | Source | Purpose |
|-------|--------|---------|
| `/api/tasks` | `routes/tasks.ts` | Task CRUD |
| `/api/projects` | `routes/projects.ts` | Project management |
| `/api/claude` | `routes/claude.ts` | Execute Claude Code |
| `/api/sessions` | `routes/execution-sessions.ts` | Session tracking |
| `/api/conversations` | `routes/conversations.ts` | Chat history |
| `/api/settings` | `routes/settings.ts` | App settings |
| `/api/mode` | `routes/mode.ts` | Mode detection |
| `/api/system` | `routes/system.ts` | Health, version, debug |
| `/api/controller` | `routes/controller.ts` | AI Controller ops |
| `/api/clawdbot` | `routes/clawdbot.ts` | Clawdbot agent |
| `/api/token-history` | `routes/token-history.ts` | Token analytics |
| `/api/activity` | `routes/activity.ts` | Activity log |
| `/api/mcp` | `routes/mcp.ts` | MCP server config |

## Tech Stack

### Frontend
- React 19 + TypeScript 5
- Vite 6 (build + HMR)
- Tailwind CSS 3
- TanStack Query 5 (data fetching)
- Zustand 5 (state management)
- @xyflow/react 12 (dependency graphs)
- React Router 7
- Lucide React (icons)

### Backend
- Express 4 + TypeScript
- SQLite via better-sqlite3
- Zod 4 (runtime validation)
- ws (WebSocket)

### Testing
- Vitest 4
- React Testing Library
- jsdom

## Database

SQLite database at `$DATA_DIR/controller.db` (default: `./data/controller.db`).

- Migrations in `server/db/migrations/*.sql`, applied automatically on startup
- Repository pattern in `server/db/repositories/`
- WAL mode enabled for concurrent read performance

## Build Outputs

| Command | Output | Contents |
|---------|--------|----------|
| `build:frontend` | `dist/` | Vite-built HTML + JS + CSS |
| `build:server` | `dist-server/` | Compiled TypeScript |
| `copy-assets` | `dist-server/server/db/` | SQL migration files |

In production, Express serves `dist/` as static files and handles API routes.
