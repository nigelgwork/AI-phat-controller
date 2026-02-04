/**
 * Session Manager - Tracks active Claude Code execution sessions
 * Provides visibility into what the controller is doing
 */

import { safeBroadcast } from '../utils/safe-ipc';
import { createLogger } from '../utils/logger';

const log = createLogger('SessionManager');

export interface ExecutionSession {
  id: string;
  taskId: string;
  taskTitle: string;
  status: 'starting' | 'running' | 'waiting_input' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  endedAt?: string;
  logs: SessionLogEntry[];
  lastActivity: string;
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
  error?: string;
  result?: string;
  claudeCodeSessionId?: string;   // Claude CLI session ID for resuming
  claudeCodeSessionPath?: string; // Path to Claude CLI session file
}

export interface SessionLogEntry {
  timestamp: string;
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'info' | 'complete';
  content: string;
  details?: Record<string, unknown>;
}

// Active sessions
const activeSessions = new Map<string, ExecutionSession>();
const sessionHistory: ExecutionSession[] = [];
const MAX_HISTORY = 50;

/**
 * Create a new execution session
 */
export function createSession(id: string, taskId: string, taskTitle: string): ExecutionSession {
  const session: ExecutionSession = {
    id,
    taskId,
    taskTitle,
    status: 'starting',
    startedAt: new Date().toISOString(),
    logs: [],
    lastActivity: new Date().toISOString(),
    toolCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
  };

  activeSessions.set(id, session);
  notifySessionUpdate(session);

  log.info(`[SessionManager] Created session ${id} for task "${taskTitle}"`);

  return session;
}

/**
 * Update session status
 */
export function updateSessionStatus(
  id: string,
  status: ExecutionSession['status'],
  details?: { error?: string; result?: string }
): void {
  const session = activeSessions.get(id);
  if (!session) return;

  session.status = status;
  session.lastActivity = new Date().toISOString();

  if (details?.error) session.error = details.error;
  if (details?.result) session.result = details.result;

  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    session.endedAt = new Date().toISOString();
    // Move to history
    activeSessions.delete(id);
    sessionHistory.unshift(session);
    if (sessionHistory.length > MAX_HISTORY) {
      sessionHistory.pop();
    }
  }

  notifySessionUpdate(session);
  log.info(`[SessionManager] Session ${id} status: ${status}`);
}

/**
 * Add a log entry to a session
 */
export function addSessionLog(
  id: string,
  type: SessionLogEntry['type'],
  content: string,
  details?: Record<string, unknown>
): void {
  const session = activeSessions.get(id);
  if (!session) return;

  const entry: SessionLogEntry = {
    timestamp: new Date().toISOString(),
    type,
    content,
    details,
  };

  session.logs.push(entry);
  session.lastActivity = entry.timestamp;

  // Keep only last 200 log entries per session
  if (session.logs.length > 200) {
    session.logs.shift();
  }

  // Track tool calls
  if (type === 'tool-call') {
    session.toolCalls++;
  }

  notifySessionLogUpdate(session, entry);
}

/**
 * Update session token usage
 */
export function updateSessionTokens(
  id: string,
  inputTokens: number,
  outputTokens: number,
  costUsd?: number
): void {
  const session = activeSessions.get(id);
  if (!session) return;

  session.inputTokens = inputTokens;
  session.outputTokens = outputTokens;
  if (costUsd !== undefined) session.costUsd = costUsd;

  notifySessionUpdate(session);
}

/**
 * Get active sessions
 */
export function getActiveSessions(): ExecutionSession[] {
  return Array.from(activeSessions.values());
}

/**
 * Get a specific session
 */
export function getSession(id: string): ExecutionSession | undefined {
  return activeSessions.get(id) || sessionHistory.find(s => s.id === id);
}

/**
 * Get session history
 */
export function getSessionHistory(limit = 20): ExecutionSession[] {
  return sessionHistory.slice(0, limit);
}

/**
 * Cancel a session
 */
export function cancelSession(id: string): boolean {
  const session = activeSessions.get(id);
  if (!session) return false;

  updateSessionStatus(id, 'cancelled');
  return true;
}

/**
 * Notify frontend of session update
 */
function notifySessionUpdate(session: ExecutionSession): void {
  safeBroadcast('session:updated', {
    session: {
      id: session.id,
      taskId: session.taskId,
      taskTitle: session.taskTitle,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      lastActivity: session.lastActivity,
      toolCalls: session.toolCalls,
      inputTokens: session.inputTokens,
      outputTokens: session.outputTokens,
      costUsd: session.costUsd,
      error: session.error,
      logCount: session.logs.length,
      claudeCodeSessionId: session.claudeCodeSessionId,
      claudeCodeSessionPath: session.claudeCodeSessionPath,
    },
  });
}

/**
 * Notify frontend of new log entry
 */
function notifySessionLogUpdate(session: ExecutionSession, entry: SessionLogEntry): void {
  safeBroadcast('session:log', {
    sessionId: session.id,
    entry,
  });
}

/**
 * Get session logs
 */
export function getSessionLogs(id: string, limit = 50): SessionLogEntry[] {
  const session = activeSessions.get(id) || sessionHistory.find(s => s.id === id);
  if (!session) return [];
  return session.logs.slice(-limit);
}

/**
 * Link a Claude Code CLI session ID to an execution session
 * This allows resuming the Claude conversation later
 */
export function linkClaudeCodeSession(
  executionId: string,
  claudeSessionId: string,
  claudeSessionPath?: string
): void {
  const session = activeSessions.get(executionId) || sessionHistory.find(s => s.id === executionId);
  if (!session) {
    log.warn(`[SessionManager] Cannot link Claude session: execution ${executionId} not found`);
    return;
  }

  session.claudeCodeSessionId = claudeSessionId;
  if (claudeSessionPath) {
    session.claudeCodeSessionPath = claudeSessionPath;
  }

  notifySessionUpdate(session);
  log.info(`[SessionManager] Linked Claude session ${claudeSessionId} to execution ${executionId}`);
}

/**
 * Get sessions that can be resumed (have a Claude session ID)
 */
export function getResumableSessions(limit = 10): ExecutionSession[] {
  const resumable = sessionHistory.filter(s => s.claudeCodeSessionId);
  return resumable.slice(0, limit);
}

/**
 * Find a session by its Claude Code session ID
 */
export function findSessionByClaudeId(claudeSessionId: string): ExecutionSession | undefined {
  // Check active sessions first
  for (const session of activeSessions.values()) {
    if (session.claudeCodeSessionId === claudeSessionId) {
      return session;
    }
  }
  // Check history
  return sessionHistory.find(s => s.claudeCodeSessionId === claudeSessionId);
}
