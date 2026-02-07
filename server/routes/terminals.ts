import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { terminalManager } from '../services/terminal-manager';

const router: Router = Router();

// GET / - list all terminal sessions
router.get('/', asyncHandler(async (_req, res) => {
  const sessions = terminalManager.list();
  res.json(sessions);
}));

// POST / - launch a new terminal
router.post('/', asyncHandler(async (req, res) => {
  const { workingDir, claudeArgs, systemPrompt, dangerouslySkipPermissions, sessionId } = req.body;
  const session = terminalManager.launch({
    workingDir,
    claudeArgs,
    systemPrompt,
    dangerouslySkipPermissions,
    sessionId,
  });
  res.status(201).json(session);
}));

// GET /:id - get a specific terminal session
router.get('/:id', asyncHandler(async (req, res) => {
  const session = terminalManager.get(String(req.params.id));
  if (!session) {
    res.status(404).json({ error: 'Terminal session not found' });
    return;
  }
  res.json(session);
}));

// GET /:id/output - get terminal output
router.get('/:id/output', asyncHandler(async (req, res) => {
  const sinceIndex = req.query.since ? Number(req.query.since) : undefined;
  const output = terminalManager.getOutput(String(req.params.id), sinceIndex);
  res.json({ lines: output });
}));

// POST /:id/send - send input to terminal
router.post('/:id/send', asyncHandler(async (req, res) => {
  const { text } = req.body;
  const success = terminalManager.sendInput(String(req.params.id), text);
  if (!success) {
    res.status(400).json({ error: 'Cannot send input to terminal' });
    return;
  }
  res.json({ success: true });
}));

// DELETE /:id - close a terminal session
router.delete('/:id', asyncHandler(async (req, res) => {
  const success = terminalManager.close(String(req.params.id));
  if (!success) {
    res.status(404).json({ error: 'Terminal session not found' });
    return;
  }
  res.json({ success: true });
}));

export default router;
