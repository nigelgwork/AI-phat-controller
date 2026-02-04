import Store from 'electron-store';
import { getEncryptionKey } from '../utils/encryption-key';

// Generate a simple unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
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
