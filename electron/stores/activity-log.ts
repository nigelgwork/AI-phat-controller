import Store from 'electron-store';
import { getEncryptionKey } from '../utils/encryption-key';
import { calculateCost } from '../services/cost-calculator';

export type ActivityCategory = 'execution' | 'user_action' | 'system' | 'error' | 'project';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  category: ActivityCategory;
  action: string;
  details: Record<string, unknown>;
  taskId?: string;
  projectId?: string;
  tokens?: { input: number; output: number };
  costUsd?: number;
  duration?: number;
}

interface ActivityLogStore {
  entries: ActivityLogEntry[];
  maxEntriesToKeep: number;
}

const defaults: ActivityLogStore = {
  entries: [],
  maxEntriesToKeep: 10000,
};

let store: Store<ActivityLogStore>;

export function initActivityLogStore(): void {
  store = new Store<ActivityLogStore>({
    name: 'activity-log',
    defaults,
    encryptionKey: getEncryptionKey(),
  });

  // Clean up old entries on init
  cleanupOldEntries();
}

function getStore(): Store<ActivityLogStore> {
  if (!store) initActivityLogStore();
  return store;
}

function cleanupOldEntries(): void {
  const entries = getStore().get('entries');
  const maxEntries = getStore().get('maxEntriesToKeep');

  if (entries.length > maxEntries) {
    // Keep most recent entries
    const trimmed = entries.slice(-maxEntries);
    getStore().set('entries', trimmed);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function logActivity(
  category: ActivityCategory,
  action: string,
  details: Record<string, unknown> = {},
  options?: {
    taskId?: string;
    projectId?: string;
    tokens?: { input: number; output: number };
    duration?: number;
  }
): ActivityLogEntry {
  const entry: ActivityLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    category,
    action,
    details,
    taskId: options?.taskId,
    projectId: options?.projectId,
    tokens: options?.tokens,
    duration: options?.duration,
  };

  // Calculate cost if tokens provided
  if (options?.tokens) {
    entry.costUsd = calculateCost(options.tokens.input, options.tokens.output);
  }

  const entries = getStore().get('entries');
  entries.push(entry);

  // Trim if necessary
  const maxEntries = getStore().get('maxEntriesToKeep');
  if (entries.length > maxEntries) {
    entries.splice(0, entries.length - maxEntries);
  }

  getStore().set('entries', entries);
  return entry;
}

export interface ActivityLogQueryOptions {
  category?: ActivityCategory;
  taskId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export function getActivityLogs(options: ActivityLogQueryOptions = {}): ActivityLogEntry[] {
  let entries = getStore().get('entries');

  // Apply filters
  if (options.category) {
    entries = entries.filter((e) => e.category === options.category);
  }

  if (options.taskId) {
    entries = entries.filter((e) => e.taskId === options.taskId);
  }

  if (options.projectId) {
    entries = entries.filter((e) => e.projectId === options.projectId);
  }

  if (options.startDate) {
    entries = entries.filter((e) => e.timestamp >= options.startDate!);
  }

  if (options.endDate) {
    entries = entries.filter((e) => e.timestamp <= options.endDate!);
  }

  // Sort by timestamp descending (most recent first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  const offset = options.offset || 0;
  const limit = options.limit || 100;

  return entries.slice(offset, offset + limit);
}

export function searchActivityLogs(
  query: string,
  filters: ActivityLogQueryOptions = {}
): ActivityLogEntry[] {
  const lowerQuery = query.toLowerCase();

  let entries = getActivityLogs({
    ...filters,
    limit: undefined, // Get all for search
  });

  // Search in action and details
  entries = entries.filter((entry) => {
    // Search in action
    if (entry.action.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Search in details
    const detailsStr = JSON.stringify(entry.details).toLowerCase();
    if (detailsStr.includes(lowerQuery)) {
      return true;
    }

    return false;
  });

  // Apply limit after search
  if (filters.limit) {
    entries = entries.slice(0, filters.limit);
  }

  return entries;
}

export interface ActivityLogExportData {
  exportedAt: string;
  totalEntries: number;
  entries: ActivityLogEntry[];
}

export function exportActivityLogs(
  format: 'json' | 'csv',
  dateRange?: { start?: string; end?: string }
): string {
  const entries = getActivityLogs({
    startDate: dateRange?.start,
    endDate: dateRange?.end,
    limit: undefined,
  });

  const exportData: ActivityLogExportData = {
    exportedAt: new Date().toISOString(),
    totalEntries: entries.length,
    entries,
  };

  if (format === 'json') {
    return JSON.stringify(exportData, null, 2);
  }

  // CSV format
  const headers = [
    'ID',
    'Timestamp',
    'Category',
    'Action',
    'Task ID',
    'Project ID',
    'Input Tokens',
    'Output Tokens',
    'Cost (USD)',
    'Duration (ms)',
    'Details',
  ];

  const rows = entries.map((entry) => [
    entry.id,
    entry.timestamp,
    entry.category,
    entry.action,
    entry.taskId || '',
    entry.projectId || '',
    entry.tokens?.input?.toString() || '',
    entry.tokens?.output?.toString() || '',
    entry.costUsd?.toFixed(6) || '',
    entry.duration?.toString() || '',
    JSON.stringify(entry.details).replace(/"/g, '""'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => (cell.includes(',') || cell.includes('"') ? `"${cell}"` : cell)).join(',')
    ),
  ].join('\n');

  return csvContent;
}

export interface ActivitySummary {
  totalEntries: number;
  totalCostUsd: number;
  totalTokens: { input: number; output: number };
  byCategory: Record<ActivityCategory, number>;
  averageDuration: number;
}

export function getActivitySummary(dateRange?: { start?: string; end?: string }): ActivitySummary {
  const entries = getActivityLogs({
    startDate: dateRange?.start,
    endDate: dateRange?.end,
    limit: undefined,
  });

  const summary: ActivitySummary = {
    totalEntries: entries.length,
    totalCostUsd: 0,
    totalTokens: { input: 0, output: 0 },
    byCategory: {
      execution: 0,
      user_action: 0,
      system: 0,
      error: 0,
      project: 0,
    },
    averageDuration: 0,
  };

  let totalDuration = 0;
  let durationCount = 0;

  for (const entry of entries) {
    // Count by category
    summary.byCategory[entry.category]++;

    // Sum costs
    if (entry.costUsd) {
      summary.totalCostUsd += entry.costUsd;
    }

    // Sum tokens
    if (entry.tokens) {
      summary.totalTokens.input += entry.tokens.input;
      summary.totalTokens.output += entry.tokens.output;
    }

    // Sum durations
    if (entry.duration) {
      totalDuration += entry.duration;
      durationCount++;
    }
  }

  if (durationCount > 0) {
    summary.averageDuration = totalDuration / durationCount;
  }

  return summary;
}

export function clearActivityLogs(): void {
  getStore().set('entries', []);
}

export function setMaxEntriesToKeep(max: number): void {
  getStore().set('maxEntriesToKeep', max);
  cleanupOldEntries();
}
