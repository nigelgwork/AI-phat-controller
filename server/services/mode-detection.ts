import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { createLogger } from '../utils/logger';

const log = createLogger('ModeDetection');
const execAsync = promisify(exec);

export interface ModeStatus {
  current: 'linux' | 'windows-interop';
  linux: {
    available: boolean;
    claudePath?: string;
    version?: string;
  };
  windowsInterop: {
    available: boolean;
  };
}

export async function detectModes(): Promise<ModeStatus> {
  const status: ModeStatus = {
    current: 'linux',
    linux: { available: false },
    windowsInterop: { available: false },
  };

  // Check native Claude
  try {
    const { stdout: whichResult } = await execAsync('which claude', { timeout: 5000 });
    const claudePath = whichResult.trim();
    if (claudePath) {
      status.linux = {
        available: true,
        claudePath,
      };
      // Version check can be slow, so don't let it block detection
      try {
        const { stdout: version } = await execAsync('claude --version', { timeout: 5000 });
        status.linux.version = version.trim();
      } catch {
        log.info('Claude found but version check timed out');
      }
    }
  } catch {
    log.info('Claude not found in PATH');
  }

  // Check Windows interop (running inside WSL)
  try {
    if (fs.existsSync('/mnt/c/Windows/System32/cmd.exe')) {
      status.windowsInterop = { available: true };
    }
  } catch {
    // Not in WSL
  }

  return status;
}

export async function getDebugInfo() {
  const gastownPath = process.env.GASTOWN_PATH || '';
  let claudePath = 'Not found';

  try {
    const { stdout } = await execAsync('which claude', { timeout: 5000 });
    claudePath = stdout.trim() || 'Not found';
  } catch { /* ignore */ }

  const isDocker = fs.existsSync('/.dockerenv');

  return {
    isDocker,
    nodeVersion: process.version,
    platform: process.platform,
    claudePath,
    gastownPath,
    gastownExists: gastownPath ? fs.existsSync(gastownPath) : false,
    executionMode: 'linux' as const,
  };
}
