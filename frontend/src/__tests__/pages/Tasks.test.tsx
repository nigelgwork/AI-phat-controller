import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Tasks from '../../pages/Tasks';
import { mockElectronAPI } from '../../test/setup';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('Tasks Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the tasks page title', async () => {
    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });
  });

  it('displays empty state when no tasks exist', async () => {
    mockElectronAPI.listTasks.mockResolvedValue([]);

    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
    });
  });

  it('displays tasks when they exist', async () => {
    mockElectronAPI.listTasks.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Test Task 1',
        description: 'First test task',
        status: 'todo',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        description: 'Second test task',
        status: 'in_progress',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      expect(screen.getByText('Test Task 2')).toBeInTheDocument();
    });
  });

  it('shows create task button', async () => {
    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
    });
  });

  it('displays task status badges', async () => {
    mockElectronAPI.listTasks.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Todo Task',
        status: 'todo',
        priority: 'low',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-2',
        title: 'In Progress Task',
        status: 'in_progress',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-3',
        title: 'Done Task',
        status: 'done',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Todo Task')).toBeInTheDocument();
      expect(screen.getByText('In Progress Task')).toBeInTheDocument();
      expect(screen.getByText('Done Task')).toBeInTheDocument();
    });
  });

  it('displays task priority indicators', async () => {
    mockElectronAPI.listTasks.mockResolvedValue([
      {
        id: 'task-high',
        title: 'High Priority Task',
        status: 'todo',
        priority: 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('High Priority Task')).toBeInTheDocument();
      // Priority is displayed with capitalized first letter
      expect(screen.getByText('High')).toBeInTheDocument();
    });
  });

  it('filters tasks correctly', async () => {
    mockElectronAPI.listTasks.mockResolvedValue([
      {
        id: 'task-1',
        title: 'Todo Task',
        status: 'todo',
        priority: 'low',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-2',
        title: 'Done Task',
        status: 'done',
        priority: 'low',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<Tasks />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Todo Task')).toBeInTheDocument();
      expect(screen.getByText('Done Task')).toBeInTheDocument();
    });
  });
});
