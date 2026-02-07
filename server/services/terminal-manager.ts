import { spawn, ChildProcess } from 'child_process';
import { createLogger } from '../utils/logger';
import { EventEmitter } from 'events';

const log = createLogger('TerminalManager');

export interface TerminalConfig {
  workingDir?: string;
  claudeArgs?: string[];
  systemPrompt?: string;
  dangerouslySkipPermissions?: boolean;
  sessionId?: string;
}

export interface TerminalSession {
  id: string;
  pid: number;
  status: 'running' | 'exited';
  workingDir: string;
  claudeArgs: string[];
  startedAt: string;
  exitCode?: number;
  outputLines: string[];
}

const MAX_OUTPUT_LINES = 500;

class TerminalManager extends EventEmitter {
  private sessions: Map<string, {
    process: ChildProcess;
    config: TerminalConfig;
    status: 'running' | 'exited';
    startedAt: string;
    exitCode?: number;
    outputLines: string[];
  }> = new Map();

  private nextId = 1;

  launch(config: TerminalConfig): TerminalSession {
    const id = `term-${this.nextId++}`;
    const args: string[] = [];

    if (config.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }
    if (config.systemPrompt) {
      args.push('--system-prompt', config.systemPrompt);
    }
    if (config.sessionId) {
      args.push('--resume', config.sessionId);
    }
    if (config.claudeArgs) {
      args.push(...config.claudeArgs);
    }

    const cwd = config.workingDir || process.cwd();

    log.info(`Launching terminal ${id}: claude ${args.join(' ')} in ${cwd}`);

    const child = spawn('claude', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    const session = {
      process: child,
      config,
      status: 'running' as 'running' | 'exited',
      startedAt: new Date().toISOString(),
      exitCode: undefined as number | undefined,
      outputLines: [] as string[],
    };

    const appendOutput = (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.length > 0) {
          session.outputLines.push(line);
          if (session.outputLines.length > MAX_OUTPUT_LINES) {
            session.outputLines.shift();
          }
          this.emit('output', { id, line });
        }
      }
    };

    child.stdout?.on('data', appendOutput);
    child.stderr?.on('data', appendOutput);

    child.on('exit', (code) => {
      session.status = 'exited';
      session.exitCode = code ?? undefined;
      log.info(`Terminal ${id} exited with code ${code}`);
      this.emit('exit', { id, exitCode: code });
    });

    child.on('error', (err) => {
      session.status = 'exited';
      session.outputLines.push(`Error: ${err.message}`);
      log.error(`Terminal ${id} error:`, err);
      this.emit('error', { id, error: err.message });
    });

    this.sessions.set(id, session);

    return this.toSessionInfo(id, session);
  }

  list(): TerminalSession[] {
    return Array.from(this.sessions.entries()).map(([id, s]) => this.toSessionInfo(id, s));
  }

  get(id: string): TerminalSession | null {
    const s = this.sessions.get(id);
    if (!s) return null;
    return this.toSessionInfo(id, s);
  }

  getOutput(id: string, sinceIndex?: number): string[] {
    const s = this.sessions.get(id);
    if (!s) return [];
    if (sinceIndex !== undefined) {
      return s.outputLines.slice(sinceIndex);
    }
    return [...s.outputLines];
  }

  sendInput(id: string, text: string): boolean {
    const s = this.sessions.get(id);
    if (!s || s.status !== 'running' || !s.process.stdin) return false;
    s.process.stdin.write(text + '\n');
    return true;
  }

  close(id: string): boolean {
    const s = this.sessions.get(id);
    if (!s) return false;
    if (s.status === 'running') {
      s.process.kill('SIGTERM');
      // Force kill after 5 seconds
      setTimeout(() => {
        if (s.status === 'running') {
          s.process.kill('SIGKILL');
        }
      }, 5000);
    }
    return true;
  }

  cleanup(): void {
    // Remove exited sessions older than 1 hour
    const cutoff = Date.now() - 3600000;
    for (const [id, s] of this.sessions) {
      if (s.status === 'exited' && new Date(s.startedAt).getTime() < cutoff) {
        this.sessions.delete(id);
      }
    }
  }

  private toSessionInfo(id: string, s: typeof this.sessions extends Map<string, infer V> ? V : never): TerminalSession {
    return {
      id,
      pid: s.process.pid || 0,
      status: s.status,
      workingDir: s.config.workingDir || process.cwd(),
      claudeArgs: s.config.claudeArgs || [],
      startedAt: s.startedAt,
      exitCode: s.exitCode,
      outputLines: s.outputLines,
    };
  }
}

export const terminalManager = new TerminalManager();

// Cleanup old sessions every 30 minutes
setInterval(() => terminalManager.cleanup(), 30 * 60 * 1000);
