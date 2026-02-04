import Store from 'electron-store';
import { getEncryptionKey } from '../utils/encryption-key';

// Generate a simple unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'failed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt: string;

  // Retry handling
  retryCount: number;
  maxRetries: number;           // Default: 3
  lastError?: string;
  lastAttemptAt?: string;
  nextRetryAt?: string;         // Exponential backoff

  // Dependencies
  blockedBy?: string[];         // Task IDs that must complete first

  // Scheduling
  scheduledAt?: string;         // Don't run before this time
}

export interface TasksStore {
  tasks: Task[];
}

const defaults: TasksStore = {
  tasks: [],
};

let store: Store<TasksStore>;

export function initTasksStore(): void {
  store = new Store<TasksStore>({
    name: 'tasks',
    defaults,
    encryptionKey: getEncryptionKey(),
  });
}

export function listTasks(): Task[] {
  if (!store) initTasksStore();
  return store.get('tasks') || [];
}

export function getTaskById(id: string): Task | null {
  const tasks = listTasks();
  return tasks.find((t) => t.id === id) || null;
}

export function getTasksByProject(projectId: string): Task[] {
  const tasks = listTasks();
  return tasks.filter((t) => t.projectId === projectId);
}

export function getTasksByStatus(status: TaskStatus): Task[] {
  const tasks = listTasks();
  return tasks.filter((t) => t.status === status);
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  projectName?: string;
  maxRetries?: number;
  blockedBy?: string[];
  scheduledAt?: string;
}

export function createTask(input: CreateTaskInput): Task {
  if (!store) initTasksStore();

  const now = new Date().toISOString();
  const task: Task = {
    id: generateId(),
    title: input.title,
    description: input.description,
    status: input.status || 'todo',
    priority: input.priority || 'medium',
    projectId: input.projectId,
    projectName: input.projectName,
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
    maxRetries: input.maxRetries ?? 3,
    blockedBy: input.blockedBy,
    scheduledAt: input.scheduledAt,
  };

  const tasks = listTasks();
  tasks.push(task);
  store.set('tasks', tasks);

  return task;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  projectName?: string;
  retryCount?: number;
  maxRetries?: number;
  lastError?: string;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  blockedBy?: string[];
  scheduledAt?: string;
}

export function updateTask(id: string, updates: UpdateTaskInput): Task | null {
  if (!store) initTasksStore();

  const tasks = listTasks();
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return null;
  }

  const updatedTask: Task = {
    ...tasks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  tasks[index] = updatedTask;
  store.set('tasks', tasks);

  return updatedTask;
}

export function deleteTask(id: string): boolean {
  if (!store) initTasksStore();

  const tasks = listTasks();
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return false;
  }

  tasks.splice(index, 1);
  store.set('tasks', tasks);

  return true;
}

export interface TasksStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  failed: number;
  blocked: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
  };
}

export function getTasksStats(): TasksStats {
  const tasks = listTasks();

  const stats: TasksStats = {
    total: tasks.length,
    todo: 0,
    inProgress: 0,
    done: 0,
    failed: 0,
    blocked: 0,
    byPriority: {
      low: 0,
      medium: 0,
      high: 0,
    },
  };

  for (const task of tasks) {
    switch (task.status) {
      case 'todo':
        stats.todo++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'done':
        stats.done++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'blocked':
        stats.blocked++;
        break;
    }

    stats.byPriority[task.priority]++;
  }

  return stats;
}

export function buildTaskPrompt(task: Task): string {
  let prompt = `Task: ${task.title}`;

  if (task.description) {
    prompt += `\n\n${task.description}`;
  }

  if (task.projectName) {
    prompt += `\n\nProject: ${task.projectName}`;
  }

  return prompt;
}

/**
 * Calculate exponential backoff delay for retry
 * Returns delay in milliseconds: 1min, 2min, 4min, 8min, 16min max
 */
export function calculateRetryDelay(retryCount: number): number {
  const baseDelay = 60 * 1000; // 1 minute
  const maxDelay = 16 * 60 * 1000; // 16 minutes
  return Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
}

/**
 * Schedule a retry for a failed task with exponential backoff
 */
export function scheduleRetry(id: string, error: string): Task | null {
  const task = getTaskById(id);
  if (!task) return null;

  const newRetryCount = task.retryCount + 1;

  if (newRetryCount >= task.maxRetries) {
    // Max retries exceeded - mark as failed
    return updateTask(id, {
      status: 'failed',
      retryCount: newRetryCount,
      lastError: error,
      lastAttemptAt: new Date().toISOString(),
    });
  }

  // Schedule retry with exponential backoff
  const delay = calculateRetryDelay(newRetryCount);
  const nextRetryAt = new Date(Date.now() + delay).toISOString();

  return updateTask(id, {
    status: 'todo', // Back to todo for retry
    retryCount: newRetryCount,
    lastError: error,
    lastAttemptAt: new Date().toISOString(),
    nextRetryAt,
  });
}

/**
 * Get tasks that are not blocked by uncompleted dependencies
 */
export function getUnblockedTasks(): Task[] {
  const tasks = listTasks();
  const completedIds = new Set(
    tasks.filter(t => t.status === 'done').map(t => t.id)
  );

  return tasks.filter(task => {
    if (!task.blockedBy || task.blockedBy.length === 0) {
      return true;
    }
    // Task is unblocked if all dependencies are completed
    return task.blockedBy.every(depId => completedIds.has(depId));
  });
}

/**
 * Update task status to 'blocked' if it has unfinished dependencies
 */
export function updateBlockedStatus(): void {
  const tasks = listTasks();
  const completedIds = new Set(
    tasks.filter(t => t.status === 'done').map(t => t.id)
  );

  for (const task of tasks) {
    // Skip tasks that are done or actively in progress
    if (task.status === 'done' || task.status === 'in_progress') {
      continue;
    }

    if (task.blockedBy && task.blockedBy.length > 0) {
      const hasUnfinishedDeps = task.blockedBy.some(depId => !completedIds.has(depId));
      if (hasUnfinishedDeps && task.status !== 'blocked') {
        // Task has unfinished dependencies - mark as blocked
        updateTask(task.id, { status: 'blocked' });
      } else if (!hasUnfinishedDeps && task.status === 'blocked') {
        // Dependencies are now complete - unblock the task
        updateTask(task.id, { status: 'todo' });
      }
    }
  }
}

/**
 * Get the next task to execute based on smart selection criteria:
 * 1. Filter to status === 'todo'
 * 2. Exclude tasks with unfinished blockedBy dependencies
 * 3. Exclude tasks in retry backoff (nextRetryAt > now)
 * 4. Exclude scheduled tasks (scheduledAt > now)
 * 5. Sort by priority (high → medium → low), then by creation date
 */
export function getNextExecutableTask(): Task | null {
  const tasks = listTasks();
  const now = new Date();
  const completedIds = new Set(
    tasks.filter(t => t.status === 'done').map(t => t.id)
  );

  // Filter to executable tasks
  const executable = tasks.filter(task => {
    // Must be in todo status
    if (task.status !== 'todo') return false;

    // Check dependencies - all must be completed
    if (task.blockedBy && task.blockedBy.length > 0) {
      const hasUnfinishedDeps = task.blockedBy.some(depId => !completedIds.has(depId));
      if (hasUnfinishedDeps) return false;
    }

    // Check retry backoff
    if (task.nextRetryAt && new Date(task.nextRetryAt) > now) {
      return false;
    }

    // Check scheduled time
    if (task.scheduledAt && new Date(task.scheduledAt) > now) {
      return false;
    }

    return true;
  });

  if (executable.length === 0) return null;

  // Sort by priority (high first) then by creation date (oldest first)
  const priorityOrder: Record<TaskPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  executable.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Same priority - oldest first
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return executable[0];
}

/**
 * Get time until the next task becomes executable (for scheduling)
 * Returns null if there are tasks ready now, or no tasks to wait for
 */
export function getNextExecutableTime(): Date | null {
  const tasks = listTasks();
  const now = new Date();
  const completedIds = new Set(
    tasks.filter(t => t.status === 'done').map(t => t.id)
  );

  let nextTime: Date | null = null;

  for (const task of tasks) {
    if (task.status !== 'todo') continue;

    // Check dependencies
    if (task.blockedBy && task.blockedBy.length > 0) {
      const hasUnfinishedDeps = task.blockedBy.some(depId => !completedIds.has(depId));
      if (hasUnfinishedDeps) continue; // Can't predict when deps will complete
    }

    // Check retry backoff
    if (task.nextRetryAt) {
      const retryTime = new Date(task.nextRetryAt);
      if (retryTime > now) {
        if (!nextTime || retryTime < nextTime) {
          nextTime = retryTime;
        }
        continue;
      }
    }

    // Check scheduled time
    if (task.scheduledAt) {
      const scheduledTime = new Date(task.scheduledAt);
      if (scheduledTime > now) {
        if (!nextTime || scheduledTime < nextTime) {
          nextTime = scheduledTime;
        }
        continue;
      }
    }

    // This task is ready now
    return null;
  }

  return nextTime;
}
