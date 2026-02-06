# AI Controller - Electron Migration Plan

> **STATUS: ARCHIVED** - This migration is complete. The project has since moved to a plain Node.js server as primary run mode (see [ARCHITECTURE.md](ARCHITECTURE.md)). Electron code remains in `electron/` as legacy but is no longer the primary deployment target. This document is preserved as historical reference.

## Overview

Migrate AI Controller from a Next.js web app to a **self-contained Electron desktop application** for Windows 11. Everything bundled in a single .exe installer, with support for connecting to Claude Code installed either natively on Windows or within WSL.

## What's Bundled vs External

### Bundled in .exe (via electron-builder)
| Component | Notes |
|-----------|-------|
| Electron runtime | ~150MB |
| React frontend | ~5MB |
| gt.exe | Windows binary, compiled from Go source |
| bd.exe | Windows binary, compiled from Go source |
| All Node.js dependencies | Bundled by Electron |

### External Dependencies (User Must Have)
| Component | Notes |
|-----------|-------|
| Claude Code CLI | Must be installed by user (Windows npm or WSL) |
| WSL (optional) | Only if user wants WSL mode, comes with Windows 11 |

## Target Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         AI Controller (Electron) - Windows 11                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌────────────────────────────┐       ┌─────────────────────────────────────┐   │
│  │     Renderer Process       │  IPC  │          Main Process               │   │
│  │     (React + Vite)         │◄─────►│                                     │   │
│  │                            │       │                                     │   │
│  │  ┌──────────────────────┐  │       │  ┌───────────────────────────────┐  │   │
│  │  │ [Windows] [WSL] ←toggle │       │  │      Execution Bridge         │  │   │
│  │  └──────────────────────┘  │       │  │                               │  │   │
│  │                            │       │  │  Mode: Windows                │  │   │
│  │  - Dashboard               │       │  │  ┌─────────────────────────┐  │  │   │
│  │  - Terminal/Chat           │       │  │  │ claude.cmd ────────────────┼──┼───┼──► Claude (Win)
│  │  - Agents view             │       │  │  │ resources/gt.exe ──────────┼──┼───┼──► bundled
│  │  - Beads view              │       │  │  │ resources/bd.exe ──────────┼──┼───┼──► bundled
│  │  - Convoys view            │       │  │  └─────────────────────────┘  │  │   │
│  │  - Graph view              │       │  │                               │  │   │
│  │  - Settings                │       │  │  Mode: WSL                    │  │   │
│  │                            │       │  │  ┌─────────────────────────┐  │  │   │
│  └────────────────────────────┘       │  │  │ wsl -e claude ─────────────┼──┼───┼──► Claude (WSL)
│                                       │  │  │ wsl -e gt ─────────────────┼──┼───┼──► gt in WSL
│                                       │  │  │ wsl -e bd ─────────────────┼──┼───┼──► bd in WSL
│                                       │  │  └─────────────────────────┘  │  │   │
│                                       │  └───────────────────────────────┘  │   │
│                                       │                                     │   │
│                                       │  ┌───────────────────────────────┐  │   │
│                                       │  │   Bundled Binaries            │  │   │
│                                       │  │   resources/bin/gt.exe        │  │   │
│                                       │  │   resources/bin/bd.exe        │  │   │
│                                       │  └───────────────────────────────┘  │   │
│                                       │                                     │   │
│                                       │  ┌───────────────────────────────┐  │   │
│                                       │  │   Services                    │  │   │
│                                       │  │   - Settings (electron-store) │  │   │
│                                       │  │   - Auto-updater              │  │   │
│                                       │  │   - System tray               │  │   │
│                                       │  └───────────────────────────────┘  │   │
│                                       └─────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Mode Selection

### Quick Toggle (Header Bar)
```
┌─────────────────────────────────────────────────────────────────┐
│  AI Controller                    [Windows ▼] [WSL]    [⚙️]     │
├─────────────────────────────────────────────────────────────────┤
```

The toggle switches ALL execution between modes:
- **Windows Mode**: Uses `claude.cmd` + bundled `gt.exe`/`bd.exe`
- **WSL Mode**: Uses `wsl -e claude` + `wsl -e gt`/`wsl -e bd`

### Settings Page (Default + Advanced)
```
┌─────────────────────────────────────────────────────────────────┐
│  Settings > Execution Mode                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Default Mode:  ○ Windows (Recommended)                         │
│                 ○ WSL                                            │
│                 ○ Auto-detect on startup                         │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  Advanced                                                        │
│                                                                  │
│  Windows Claude Path: [C:\Users\...\npm\claude.cmd    ] [Browse]│
│  WSL Distro:          [Ubuntu-22.04                 ▼]          │
│  Gas Town Workspace:  [C:\Users\nigel\gt              ] [Browse]│
│                                                                  │
│  Status:                                                         │
│  ✅ Windows: Claude Code v2.1.17 detected                       │
│  ✅ WSL: Claude Code v2.1.17 detected (Ubuntu-22.04)            │
│  ✅ Bundled: gt v1.0.0, bd v1.0.0                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Execution Modes

The app supports two execution modes, switchable via quick toggle or settings:

### Windows Mode

All tools run natively on Windows.

| Tool | Source | Execution |
|------|--------|-----------|
| Claude Code | User's Windows install | `spawn('claude.cmd', [...])` |
| gt | Bundled in app | `spawn(resources/bin/gt.exe, [...])` |
| bd | Bundled in app | `spawn(resources/bin/bd.exe, [...])` |

```typescript
// Windows mode execution
class WindowsExecutor {
  private claudePath: string;  // Auto-detected or from settings
  private gtPath: string;      // app.getPath('resources') + '/bin/gt.exe'
  private bdPath: string;      // app.getPath('resources') + '/bin/bd.exe'

  async runClaude(args: string[]): Promise<string> {
    return this.spawn(this.claudePath, args, { shell: true });
  }

  async runGt(args: string[]): Promise<string> {
    return this.spawn(this.gtPath, args);
  }

  async runBd(args: string[]): Promise<string> {
    return this.spawn(this.bdPath, args);
  }

  private spawn(cmd: string, args: string[], opts = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, GASTOWN_PATH: this.gastownPath },
        ...opts
      });
      // ... handle stdout/stderr/close
    });
  }
}
```

### WSL Mode

All tools run inside WSL.

| Tool | Source | Execution |
|------|--------|-----------|
| Claude Code | User's WSL install | `spawn('wsl.exe', ['-e', 'claude', ...])` |
| gt | User's WSL install | `spawn('wsl.exe', ['-e', 'gt', ...])` |
| bd | User's WSL install | `spawn('wsl.exe', ['-e', 'bd', ...])` |

```typescript
// WSL mode execution
class WslExecutor {
  private distro?: string;  // From settings, or use default

  async runClaude(args: string[]): Promise<string> {
    return this.wslExec('claude', args);
  }

  async runGt(args: string[]): Promise<string> {
    return this.wslExec('gt', args);
  }

  async runBd(args: string[]): Promise<string> {
    return this.wslExec('bd', args);
  }

  private wslExec(cmd: string, args: string[]): Promise<string> {
    const wslArgs = this.distro
      ? ['-d', this.distro, '-e', cmd, ...args]
      : ['-e', cmd, ...args];

    return new Promise((resolve, reject) => {
      const child = spawn('wsl.exe', wslArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          WSLENV: 'GASTOWN_PATH/p',  // Auto-translate paths
        }
      });
      // ... handle stdout/stderr/close
    });
  }
}
```

### Path Translation (WSL Mode)

```typescript
// Windows path → WSL path
function toWslPath(windowsPath: string): string {
  // C:\Users\nigel\gt → /mnt/c/Users/nigel/gt
  return windowsPath
    .replace(/^([A-Z]):/i, (_, drive) => `/mnt/${drive.toLowerCase()}`)
    .replace(/\\/g, '/');
}

// WSL path → Windows path
function toWindowsPath(wslPath: string): string {
  // /mnt/c/Users/nigel/gt → C:\Users\nigel\gt
  return wslPath
    .replace(/^\/mnt\/([a-z])/i, (_, drive) => `${drive.toUpperCase()}:`)
    .replace(/\//g, '\\');
}

// Alternative: Use WSLENV for automatic translation
// Setting WSLENV=GASTOWN_PATH/p tells WSL to translate the path automatically
```

### Auto-Detection (Startup)

```typescript
interface DetectionResult {
  windowsClaude: { available: boolean; path?: string; version?: string };
  wslClaude: { available: boolean; distro?: string; version?: string };
  recommended: 'windows' | 'wsl' | null;
}

async function detectAvailability(): Promise<DetectionResult> {
  const result: DetectionResult = {
    windowsClaude: { available: false },
    wslClaude: { available: false },
    recommended: null,
  };

  // Check Windows
  try {
    const path = await findWindowsClaude();
    if (path) {
      const version = await exec(`"${path}" --version`);
      result.windowsClaude = { available: true, path, version: version.trim() };
    }
  } catch {}

  // Check WSL
  try {
    const distros = await getWslDistros();
    for (const distro of distros) {
      const check = await exec(`wsl.exe -d ${distro} -e which claude`);
      if (check.trim()) {
        const version = await exec(`wsl.exe -d ${distro} -e claude --version`);
        result.wslClaude = { available: true, distro, version: version.trim() };
        break;
      }
    }
  } catch {}

  // Recommend based on what's available
  if (result.windowsClaude.available) {
    result.recommended = 'windows';
  } else if (result.wslClaude.available) {
    result.recommended = 'wsl';
  }

  return result;
}
```

## Building Go Binaries for Bundling

The gt and bd tools are Go applications that need to be cross-compiled for Windows.

### Source Repositories
- **gt (Gas Town)**: https://github.com/steveyegge/gastown (MIT)
- **bd (Beads)**: https://github.com/steveyegge/beads (MIT)

### Build Script (scripts/build-go-tools.sh)

```bash
#!/bin/bash
# Cross-compile gt and bd for Windows from Linux/WSL

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/resources/bin"
TEMP_DIR="$PROJECT_DIR/.go-build-temp"

mkdir -p "$BUILD_DIR" "$TEMP_DIR"

echo "Building gt for Windows..."
cd "$TEMP_DIR"
if [ ! -d "gastown" ]; then
  git clone --depth 1 https://github.com/steveyegge/gastown.git
fi
cd gastown
GOOS=windows GOARCH=amd64 go build -o "$BUILD_DIR/gt.exe" ./cmd/gt

echo "Building bd for Windows..."
cd "$TEMP_DIR"
if [ ! -d "beads" ]; then
  git clone --depth 1 https://github.com/steveyegge/beads.git
fi
cd beads
GOOS=windows GOARCH=amd64 go build -o "$BUILD_DIR/bd.exe" ./cmd/bd

echo "Done! Binaries in $BUILD_DIR:"
ls -la "$BUILD_DIR"
```

### GitHub Actions (build in CI)

```yaml
# Part of build-windows.yml
- name: Build Go tools
  run: |
    # Install Go
    - uses: actions/setup-go@v5
      with:
        go-version: '1.23'

    # Clone and build gt
    - run: |
        git clone --depth 1 https://github.com/steveyegge/gastown.git
        cd gastown
        GOOS=windows GOARCH=amd64 go build -o ../resources/bin/gt.exe ./cmd/gt

    # Clone and build bd
    - run: |
        git clone --depth 1 https://github.com/steveyegge/beads.git
        cd beads
        GOOS=windows GOARCH=amd64 go build -o ../resources/bin/bd.exe ./cmd/bd
```

## Project Structure

```
ai-controller-electron/
├── package.json              # Electron app config
├── electron-builder.yml      # Build configuration
├── electron/
│   ├── main.ts              # Main process entry
│   ├── preload.ts           # Preload script (IPC bridge)
│   ├── services/
│   │   ├── executor.ts      # Windows/WSL executor factory
│   │   ├── windows-executor.ts
│   │   ├── wsl-executor.ts
│   │   ├── settings.ts      # electron-store settings
│   │   ├── auto-updater.ts  # GitHub releases updates
│   │   └── tray.ts          # System tray
│   └── ipc/
│       ├── handlers.ts      # IPC handler registration
│       └── channels.ts      # Channel type definitions
├── frontend/                 # React app (from current src/)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/           # Dashboard, Terminal, Agents, etc.
│   │   ├── components/
│   │   │   └── ModeToggle.tsx  # Windows/WSL quick toggle
│   │   ├── api/             # IPC client calls
│   │   └── types/
│   ├── index.html
│   └── vite.config.ts
├── resources/
│   ├── icon.ico             # App icon
│   └── bin/                 # Bundled Go binaries
│       ├── gt.exe           # Gas Town CLI (built from source)
│       └── bd.exe           # Beads CLI (built from source)
├── scripts/
│   └── build-go-tools.sh    # Cross-compile Go tools
└── .github/
    └── workflows/
        └── build-windows.yml
```

## IPC Channels

```typescript
// channels.ts
export const IPC_CHANNELS = {
  // Execution Mode
  'mode:get': 'mode:get',                     // Get current mode (windows/wsl)
  'mode:set': 'mode:set',                     // Set mode
  'mode:detect': 'mode:detect',               // Run auto-detection
  'mode:status': 'mode:status',               // Get detailed status of both modes

  // Claude Code
  'claude:execute': 'claude:execute',         // Run natural language command

  // Gas Town CLI
  'gt:execute': 'gt:execute',                 // Run gt command
  'bd:execute': 'bd:execute',                 // Run bd command

  // Beads (direct file read for performance)
  'beads:list': 'beads:list',
  'beads:stats': 'beads:stats',
  'beads:events': 'beads:events',

  // Settings
  'settings:get': 'settings:get',
  'settings:set': 'settings:set',
  'settings:getAll': 'settings:getAll',

  // App
  'app:version': 'app:version',
  'app:checkUpdates': 'app:checkUpdates',
  'app:installUpdate': 'app:installUpdate',
  'app:quit': 'app:quit',
  'app:minimize': 'app:minimize',
  'app:toggleTray': 'app:toggleTray',
} as const;
```

## Electron Builder Configuration

```yaml
# electron-builder.yml
appId: com.aicontroller.app
productName: AI Controller
copyright: Copyright © 2025

directories:
  output: release
  buildResources: resources

files:
  - "!**/.git"
  - "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}"
  - "!**/*.{ts,tsx,map}"

# Include bundled Go binaries
extraResources:
  - from: "resources/bin"
    to: "bin"
    filter:
      - "**/*"

win:
  target:
    - target: nsis
      arch: [x64]
  icon: resources/icon.ico
  artifactName: "${productName}-Setup-${version}.${ext}"

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: true
  shortcutName: AI Controller

publish:
  provider: github
  owner: nigelgwork
  repo: AI-phat-controller
```

## Settings Schema

```typescript
interface AppSettings {
  // Execution Mode (applies to all tools)
  executionMode: 'windows' | 'wsl';           // Current active mode
  defaultMode: 'windows' | 'wsl' | 'auto';    // Mode on startup

  // Windows Mode Settings
  windows: {
    claudePath?: string;           // Override Claude path (auto-detected if empty)
    // gt and bd paths are always bundled, no override needed
  };

  // WSL Mode Settings
  wsl: {
    distro?: string;               // Specific distro (uses default if empty)
    // Claude, gt, bd must be installed in WSL by user
  };

  // Gas Town Workspace
  gastownPath: string;             // Windows path: C:\Users\nigel\gt
                                   // Auto-translated to /mnt/c/Users/nigel/gt in WSL mode

  // UI
  theme: 'dark' | 'light' | 'system';
  startMinimized: boolean;
  minimizeToTray: boolean;
  showModeToggle: boolean;         // Show Windows/WSL toggle in header

  // Updates
  autoCheckUpdates: boolean;
  updateChannel: 'stable' | 'beta';

  // Window State (auto-saved)
  windowBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
    isMaximized: boolean;
  };

  // First Run
  hasCompletedSetup: boolean;      // Show setup wizard on first run
}

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  executionMode: 'windows',
  defaultMode: 'auto',
  windows: {},
  wsl: {},
  gastownPath: '',  // Set during first-run setup
  theme: 'dark',
  startMinimized: false,
  minimizeToTray: true,
  showModeToggle: true,
  autoCheckUpdates: true,
  updateChannel: 'stable',
  hasCompletedSetup: false,
};
```

## Migration Steps

### Phase 1: Project Setup

1. **Create new Electron project structure**
   - Initialize new repo or branch
   - Copy electron-builder.yml pattern from cw-dashboard-dist
   - Set up package.json with Electron + Vite dependencies
   - Configure TypeScript

2. **Build Go binaries**
   - Create scripts/build-go-tools.sh
   - Cross-compile gt and bd for Windows (GOOS=windows GOARCH=amd64)
   - Place in resources/bin/

3. **Set up main process skeleton**
   - electron/main.ts - window creation, tray
   - electron/preload.ts - IPC bridge
   - Basic BrowserWindow with Vite dev server

4. **Port React frontend**
   - Move src/ to frontend/src/
   - Replace Next.js App Router with React Router
   - Update imports for IPC instead of fetch
   - Keep Tailwind, React Query, React Flow

### Phase 2: Executor Implementation

1. **Create executor abstraction**
   - electron/services/executor.ts - factory/interface
   - electron/services/windows-executor.ts
   - electron/services/wsl-executor.ts

2. **Windows Executor**
   - Spawn Claude Code directly
   - Use bundled gt.exe/bd.exe from resources/bin
   - Handle Windows paths natively

3. **WSL Executor**
   - Spawn via wsl.exe -e
   - Path translation (WSLENV or manual)
   - Distro selection support

4. **Auto-detection**
   - Detect Windows Claude Code installation
   - Detect WSL distros with Claude Code
   - Return availability status for both

### Phase 3: IPC & Frontend Integration

1. **IPC handlers**
   - mode:get/set/detect/status
   - claude:execute
   - gt:execute, bd:execute
   - beads:list/stats/events
   - settings:get/set/getAll

2. **Frontend API layer**
   - frontend/src/api/ipc.ts - typed IPC client
   - Replace all fetch() calls with IPC calls

3. **Mode Toggle component**
   - Header bar toggle [Windows] [WSL]
   - Visual indicator of current mode
   - Status indicator (connected/error)

### Phase 4: Settings & First-Run

1. **Settings service**
   - electron-store configuration
   - Default settings
   - Migration for future versions

2. **Settings page**
   - Mode selection (default mode)
   - Windows path override
   - WSL distro selection
   - Gas Town workspace path
   - Theme, tray options

3. **First-run setup wizard**
   - Detect available Claude Code installations
   - Guide user through mode selection
   - Set up Gas Town workspace

### Phase 5: Polish & System Integration

1. **System tray**
   - Minimize to tray
   - Tray menu (show, quit, mode toggle)
   - Startup on login option

2. **Auto-updater**
   - electron-updater setup
   - GitHub Releases integration
   - Update notification UI

3. **Error handling**
   - Friendly error messages
   - "Claude Code not found" guidance
   - WSL not available handling

### Phase 6: Build & Release

1. **electron-builder configuration**
   - NSIS installer for Windows
   - Include resources/bin/* in extraResources
   - Code signing (optional, can add later)

2. **GitHub Actions workflow**
   ```yaml
   - Build Go tools (cross-compile)
   - Build Electron app on windows-latest
   - Create GitHub Release
   - Upload installer + blockmap + latest.yml
   ```

3. **Testing checklist**
   - [ ] Fresh Windows 11 install
   - [ ] Windows mode with bundled tools
   - [ ] WSL mode with Ubuntu
   - [ ] Mode switching
   - [ ] Auto-update flow
   - [ ] First-run wizard

## File Migration Map

| Current (Next.js) | New (Electron) |
|-------------------|----------------|
| `src/app/page.tsx` | `frontend/src/pages/Dashboard.tsx` |
| `src/app/terminal/page.tsx` | `frontend/src/pages/Terminal.tsx` |
| `src/app/agents/page.tsx` | `frontend/src/pages/Agents.tsx` |
| `src/app/beads/page.tsx` | `frontend/src/pages/Beads.tsx` |
| `src/app/convoys/page.tsx` | `frontend/src/pages/Convoys.tsx` |
| `src/app/graph/page.tsx` | `frontend/src/pages/Graph.tsx` |
| `src/app/api/mayor/route.ts` | `electron/services/claude-bridge.ts` |
| `src/app/api/beads/route.ts` | `electron/services/beads.ts` |
| `src/app/api/agents/route.ts` | `electron/services/gastown.ts` |
| `src/lib/beads.ts` | `electron/services/beads.ts` |
| `src/lib/gastown.ts` | `electron/services/gastown.ts` |
| `src/components/*` | `frontend/src/components/*` |

## Dependencies

```json
{
  "dependencies": {
    "electron-store": "^8.1.0",
    "electron-updater": "^6.1.0"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@xyflow/react": "^12.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

## First-Run Setup Wizard

On first launch (when `hasCompletedSetup: false`), show a setup wizard:

```
┌─────────────────────────────────────────────────────────────────┐
│  Welcome to AI Controller                              Step 1/3 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Let's set up your environment.                                 │
│                                                                  │
│  Detecting Claude Code installation...                          │
│                                                                  │
│  ✅ Found: Windows (C:\Users\nigel\AppData\Roaming\npm\claude)  │
│  ✅ Found: WSL Ubuntu-22.04 (/usr/bin/claude)                   │
│                                                                  │
│  Which would you like to use by default?                        │
│                                                                  │
│  ○ Windows (faster, uses bundled gt/bd)                         │
│  ● WSL (uses your existing WSL development environment)         │
│                                                                  │
│                                              [Back] [Next →]    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Gas Town Workspace                                    Step 2/3 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Where is your Gas Town workspace?                              │
│                                                                  │
│  [C:\Users\nigel\gt                              ] [Browse...]   │
│                                                                  │
│  ℹ️  This is where your rigs, beads, and convoys are stored.    │
│      If you don't have one yet, we'll create it for you.        │
│                                                                  │
│  □ Create new workspace at this location                        │
│                                                                  │
│                                              [Back] [Next →]    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Ready to Go!                                          Step 3/3 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Your AI Controller is configured:                              │
│                                                                  │
│  Mode:       WSL (Ubuntu-22.04)                                 │
│  Workspace:  C:\Users\nigel\gt                                  │
│  Claude:     v2.1.17                                            │
│  gt/bd:      Using WSL installation                             │
│                                                                  │
│  You can change these settings anytime in Settings → Execution. │
│                                                                  │
│                                              [Back] [Finish ✓]  │
└─────────────────────────────────────────────────────────────────┘
```

## Resolved Decisions

| Question | Decision |
|----------|----------|
| Bundle gt/bd binaries? | **Yes** - Cross-compile for Windows, include in resources/bin |
| WSL support? | **Yes** - Full support with quick toggle |
| Mode selection? | **Settings + quick toggle** in header bar |
| CLI tools in WSL mode? | **Use WSL versions** - User installs gt/bd in WSL |

## Open Questions

1. **Support macOS/Linux?**
   - Current plan is Windows-only
   - Architecture supports it, just need builds
   - Recommendation: Windows first, expand later

2. **Single instance?**
   - Should we prevent multiple instances?
   - Recommendation: Yes, with "show window" on second launch

3. **Portable mode?**
   - Store settings alongside exe instead of AppData?
   - Recommendation: Support via `--portable` command-line flag

4. **WSL distro with gt/bd not installed?**
   - What if user selects WSL mode but doesn't have gt/bd installed?
   - Recommendation: Show warning with install instructions, offer to switch to Windows mode

## Success Criteria

### Core Functionality
- [ ] App installs on Windows 11 via single .exe installer
- [ ] First-run setup wizard detects Claude Code installations
- [ ] Quick toggle switches between Windows and WSL modes
- [ ] Natural language commands via Claude Code work in <10s
- [ ] Direct gt/bd commands work in both modes

### Windows Mode
- [ ] Uses Windows-installed Claude Code CLI
- [ ] Uses bundled gt.exe and bd.exe from resources/bin
- [ ] No external dependencies beyond Claude Code

### WSL Mode
- [ ] Calls Claude Code via `wsl.exe -e claude`
- [ ] Calls gt/bd via `wsl.exe -e gt` / `wsl.exe -e bd`
- [ ] Path translation works correctly (C:\ ↔ /mnt/c)
- [ ] Supports distro selection

### Polish
- [ ] Settings persist across restarts
- [ ] Auto-updates from GitHub Releases
- [ ] System tray with minimize option
- [ ] Window position/size remembered
- [ ] Error messages guide user to fix issues
