# Gas Town UI

Web dashboard for [Gas Town](https://github.com/steveyegge/gastown) - a multi-agent orchestrator for Claude Code.

![Gas Town Dashboard](docs/screenshot.png)

## Features

- **Town Overview**: Real-time stats on agents, work items, and system health
- **Mayor Chat**: AI-powered chat interface to coordinate work (requires Anthropic API key)
- **Agent Management**: Monitor agent status, context usage, and trigger handoffs
- **Convoy Tracking**: Track grouped work packages with progress visualization
- **Beads Browser**: Filter and search work items by status, type, and priority
- **Dependency Graph**: Interactive React Flow visualization of work dependencies
- **Insights Dashboard**: Graph analytics (bottlenecks, keystones, cycles)
- **Mail Center**: View agent communication and announcements

## Quick Start

### Prerequisites

- [Go 1.23+](https://go.dev/dl/) - for building Gas Town CLI
- [Git 2.25+](https://git-scm.com/) - for worktree support
- [pnpm](https://pnpm.io/) - package manager

### Installation

```bash
# Clone this repo
git clone https://github.com/yourusername/gastown-ui.git
cd gastown-ui

# One-command setup
pnpm setup
```

The setup script will:
1. ✅ Check prerequisites
2. ✅ Clone and build Gas Town (`gt`) and Beads (`bd`) CLIs
3. ✅ Install Node dependencies
4. ✅ Initialize a Gas Town workspace at `~/gt`

### Running

```bash
# Start the dashboard
pnpm dev

# Open http://localhost:3000
```

## Configuration

Create `.env.local`:

```bash
# Required: Path to your Gas Town workspace
GASTOWN_PATH=~/gt

# Optional: Enable AI-powered Mayor Chat
# Get your key at https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-...
```

### Mayor Chat

The Mayor Chat provides an AI-powered interface to coordinate work across your rigs. Without an API key, it runs in "command mode" where you can execute gt/bd commands directly. With an API key, you can use natural language to:

- Create and manage convoys
- Assign work to agents
- Check status and get recommendations
- Coordinate complex multi-rig operations

## Using with Gas Town

```bash
# Add the CLI tools to your PATH
export PATH="$PATH:$(pwd)/bin"

# Start the Mayor session (AI coordinator)
cd ~/gt && gt prime

# Or use individual commands
gt convoy create "Feature X" issue-123 issue-456
gt sling issue-123 myproject
gt convoy list
```

## Project Structure

```
gastown-ui/
├── src/
│   ├── app/              # Next.js pages
│   │   ├── page.tsx      # Town Overview
│   │   ├── terminal/     # Mayor Chat interface
│   │   ├── agents/       # Agent management
│   │   ├── beads/        # Work items
│   │   ├── convoys/      # Grouped work
│   │   ├── graph/        # Dependency graph
│   │   ├── insights/     # Analytics
│   │   ├── mail/         # Agent mail
│   │   └── api/          # Backend routes
│   ├── components/       # Shared UI
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
├── backend/              # Gas Town source (cloned)
├── beads-cli/            # Beads source (cloned)
├── bin/                  # Built CLI binaries
└── scripts/setup.sh      # Setup script
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Visualization**: @xyflow/react (React Flow)
- **Data Fetching**: TanStack Query
- **Icons**: Lucide React
- **Backend**: Gas Town (Go), Beads (Go)

## License

MIT - This project builds on [Gas Town](https://github.com/steveyegge/gastown) and [Beads](https://github.com/steveyegge/beads), both MIT licensed.

## Credits

- [Steve Yegge](https://github.com/steveyegge) - Gas Town & Beads
- [Anthropic](https://anthropic.com) - Claude Code
