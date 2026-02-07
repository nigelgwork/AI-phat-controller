import { Router } from 'express';
import os from 'os';
import { asyncHandler } from '../middleware/error-handler';
import { getSystemStatus } from '../services/projects';
import { getDebugInfo } from '../services/mode-detection';

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

export default router;
