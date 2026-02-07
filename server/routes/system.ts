import { Router } from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../middleware/error-handler';
import { getSystemStatus } from '../services/projects';
import { getDebugInfo } from '../services/mode-detection';
import { createLogger } from '../utils/logger';

const log = createLogger('SystemRoutes');

const router: Router = Router();

// GET /status - getSystemStatus
router.get('/status', asyncHandler(async (req, res) => {
  const status = await getSystemStatus();
  res.json(status);
}));

// GET /version - getVersion from package.json
router.get('/version', asyncHandler(async (req, res) => {
  const path = require('path');
  const packagePath = path.join(process.cwd(), 'package.json');
  const { version } = require(packagePath);
  res.json({ version });
}));

// GET /debug - getDebugInfo
router.get('/debug', asyncHandler(async (req, res) => {
  const debugInfo = await getDebugInfo();
  res.json(debugInfo);
}));

// GET /metrics - system and app metrics for diagnostics bar
router.get('/metrics', asyncHandler(async (_req, res) => {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Calculate system CPU usage from cpus info
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    const { user, nice, sys, idle, irq } = cpu.times;
    totalTick += user + nice + sys + idle + irq;
    totalIdle += idle;
  }
  const systemCpuPercent = Math.round(((totalTick - totalIdle) / totalTick) * 100);

  // App memory from process.memoryUsage()
  const appMem = process.memoryUsage();

  res.json({
    system: {
      cpuPercent: systemCpuPercent,
      cpuCores: cpus.length,
      memTotal: totalMem,
      memUsed: usedMem,
      memPercent: Math.round((usedMem / totalMem) * 100),
    },
    app: {
      memRss: appMem.rss,
      memHeapUsed: appMem.heapUsed,
      memHeapTotal: appMem.heapTotal,
      uptime: Math.round(process.uptime()),
    },
  });
}));

// GET /claude-usage - real Claude Code usage from ~/.claude/
router.get('/claude-usage', asyncHandler(async (_req, res) => {
  const homeDir = os.homedir();
  const claudeDir = path.join(homeDir, '.claude');

  // Read credentials for subscription info
  let subscriptionType = 'unknown';
  let rateLimitTier = 'unknown';
  try {
    const credsPath = path.join(claudeDir, '.credentials.json');
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    const oauth = creds.claudeAiOauth || {};
    subscriptionType = oauth.subscriptionType || 'unknown';
    rateLimitTier = oauth.rateLimitTier || 'unknown';
  } catch {
    // credentials not found
  }

  // Read stats-cache.json for actual usage
  let todayTokens = 0;
  let weekTokens = 0;
  let todayMessages = 0;
  let modelBreakdown: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {};
  let lastComputedDate = '';

  try {
    const statsPath = path.join(claudeDir, 'stats-cache.json');
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    lastComputedDate = stats.lastComputedDate || '';

    // Calculate today's and this week's token usage from dailyModelTokens
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    if (stats.dailyModelTokens) {
      for (const day of stats.dailyModelTokens) {
        const dayDate = new Date(day.date);
        if (day.date === todayStr || day.date === lastComputedDate) {
          for (const [, tokens] of Object.entries(day.tokensByModel)) {
            todayTokens += tokens as number;
          }
        }
        if (dayDate >= weekAgo) {
          for (const [, tokens] of Object.entries(day.tokensByModel)) {
            weekTokens += tokens as number;
          }
        }
      }
    }

    // Today's messages
    if (stats.dailyActivity) {
      for (const day of stats.dailyActivity) {
        if (day.date === todayStr || day.date === lastComputedDate) {
          todayMessages = day.messageCount || 0;
        }
      }
    }

    // Model breakdown from cumulative stats
    if (stats.modelUsage) {
      for (const [model, usage] of Object.entries(stats.modelUsage)) {
        const u = usage as any;
        modelBreakdown[model] = {
          input: u.inputTokens || 0,
          output: u.outputTokens || 0,
          cacheRead: u.cacheReadInputTokens || 0,
          cacheWrite: u.cacheCreationInputTokens || 0,
        };
      }
    }
  } catch (err) {
    log.warn('Could not read Claude stats-cache.json:', err);
  }

  // Also count active sessions from the jsonl files in the current project
  let activeSessionCount = 0;
  try {
    const projectsDir = path.join(claudeDir, 'projects');
    if (fs.existsSync(projectsDir)) {
      const projectDirs = fs.readdirSync(projectsDir);
      activeSessionCount = projectDirs.filter(d =>
        fs.statSync(path.join(projectsDir, d)).isDirectory()
      ).length;
    }
  } catch {
    // ignore
  }

  res.json({
    subscription: subscriptionType,
    rateLimitTier,
    today: {
      tokens: todayTokens,
      messages: todayMessages,
    },
    week: {
      tokens: weekTokens,
    },
    modelBreakdown,
    lastUpdated: lastComputedDate,
    projects: activeSessionCount,
  });
}));

export default router;
