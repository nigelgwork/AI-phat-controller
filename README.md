# AI Phat Controller

A local dashboard and orchestration server for managing Claude Code agents, built on the [Gas Town](https://github.com/steveyegge/gastown) multi-agent framework.

## What It Does

- **Dashboard**: Monitor agents, tasks, sessions, and token usage from a web UI
- **Controller**: Natural language interface to coordinate Claude Code across projects
- **Session Management**: Track, resume, and manage Claude Code sessions
- **Task Tracking**: Create and manage tasks with status workflows
- **Clawdbot**: Configurable AI assistant with personality profiles
- **MCP Support**: Configure Model Context Protocol servers for your agents

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Phat Controller                            │
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────────────┐  │
│  │   Frontend (Vite)    │     │   Backend (Express)          │  │
│  │                      │     │                              │  │
│  │  React 19 + TS       │────▶│  REST API (:3001)            │  │
│  │  Tailwind CSS        │     │  WebSocket (live updates)    │  │
│  │  TanStack Query      │     │  SQLite (better-sqlite3)     │  │
│  │  React Flow (graphs) │     │                              │  │
│  │  Zustand (state)     │     │  ┌────────────────────────┐  │  │
│  │                      │     │  │  Claude Code CLI       │  │  │
│  │  :5173 (dev)         │     │  │  (spawned as needed)   │  │  │
│  └──────────────────────┘     │  └────────────────────────┘  │  │
│                                │                              │  │
│                                │  ┌────────────────────────┐  │  │
│                                │  │  Gas Town (gt/bd CLIs) │  │  │
│                                │  │  (optional)            │  │  │
│                                │  └────────────────────────┘  │  │
│                                └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed diagrams.

## Quick Start

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

### Install & Run

```bash
# Install dependencies
pnpm install

# Development (Vite HMR + Express server)
pnpm dev
# Frontend: http://localhost:5173
# API: http://localhost:3001

# Production build & start
pnpm start
# Dashboard: http://localhost:3001
```

### Docker (alternative)

```bash
docker compose up --build controller
# Dashboard: http://localhost:3001
```

Note: Docker mode requires mounting the Claude Code CLI and its config into the container. See `docker-compose.yml` for volume mount examples.

## Project Structure

```
ai-controller/
├── frontend/               # Vite + React app
│   └── src/
│       ├── pages/          # 16 page components
│       ├── components/     # Shared UI components
│       ├── api/            # API client (server-api.ts)
│       ├── hooks/          # Custom React hooks
│       └── types/          # TypeScript definitions
├── server/                 # Express.js backend
│   ├── routes/             # 21 API route modules
│   ├── db/                 # SQLite database + migrations
│   │   └── repositories/   # Data access layer
│   ├── services/           # Business logic
│   ├── middleware/          # Validation, error handling
│   └── websocket.ts        # WebSocket server
├── shared/                 # Types shared between frontend/server
├── electron/               # Electron desktop wrapper (legacy)
├── bin/cli.js              # CLI entry point (npx support)
├── Dockerfile              # Docker image
└── docker-compose.yml      # Docker Compose config
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5, Vite 6, Tailwind CSS 3 |
| State | TanStack Query, Zustand |
| Visualization | @xyflow/react (React Flow) |
| Backend | Express 4, Node.js 20 |
| Database | SQLite (better-sqlite3) |
| Validation | Zod 4 |
| Real-time | WebSocket (ws) |
| Testing | Vitest, React Testing Library |

## Development Commands

```bash
pnpm dev              # Start dev servers (Vite + Express)
pnpm build            # Build frontend + server + copy assets
pnpm start            # Build and start production server
pnpm test:run         # Run test suite
pnpm lint             # Lint
pnpm typecheck        # Type check
```

## Configuration

The server auto-configures on first run. Settings are stored in SQLite at `./data/controller.db`.

Key environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DATA_DIR` | `./data` | Database directory |
| `GASTOWN_PATH` | `~/gt` | Gas Town workspace path |

## Gas Town Integration

This project builds on the [Gas Town](https://github.com/steveyegge/gastown) ecosystem for multi-agent orchestration. Gas Town concepts:

- **Rigs**: Git projects under management
- **Beads**: Atomic work items (issues) stored in JSONL
- **Convoys**: Grouped work packages for tracking
- **Agents**: Mayor (coordinator), Witness (monitor), Polecat (worker)

See [docs/gastown-reference.md](docs/gastown-reference.md) for the full Gas Town guide.

## License

MIT

## Credits

- [Steve Yegge](https://github.com/steveyegge) - Gas Town & Beads
- [Anthropic](https://anthropic.com) - Claude Code
