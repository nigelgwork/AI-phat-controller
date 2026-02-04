import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Controller from '../../pages/Controller';
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

describe('Controller Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the controller page title', async () => {
    render(<Controller />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Phat Controller')).toBeInTheDocument();
    });
  });

  it('displays controller status', async () => {
    mockElectronAPI.getControllerState.mockResolvedValue({
      status: 'idle',
      currentTaskId: null,
      currentAction: null,
      startedAt: null,
      processedCount: 5,
      approvedCount: 3,
      rejectedCount: 1,
      errorCount: 1,
      currentProgress: null,
      conversationSessionId: null,
      tokenUsage: {
        inputTokens: 10000,
        outputTokens: 5000,
        limit: 200000,
        resetAt: new Date(Date.now() + 3600000).toISOString(),
      },
      usageLimitConfig: {
        maxTokensPerHour: 200000,
        maxTokensPerDay: 1000000,
        pauseThreshold: 0.8,
        warningThreshold: 0.6,
        autoResumeOnReset: true,
      },
      dailyTokenUsage: { input: 0, output: 0, date: new Date().toISOString().split('T')[0] },
      usageLimitStatus: 'ok',
      pausedDueToLimit: false,
    });

    render(<Controller />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/idle/i)).toBeInTheDocument();
    });
  });

  it('shows activate button when idle', async () => {
    mockElectronAPI.getControllerState.mockResolvedValue({
      status: 'idle',
      currentTaskId: null,
      currentAction: null,
      startedAt: null,
      processedCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      errorCount: 0,
      currentProgress: null,
      conversationSessionId: null,
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        limit: 200000,
        resetAt: new Date(Date.now() + 3600000).toISOString(),
      },
      usageLimitConfig: {
        maxTokensPerHour: 200000,
        maxTokensPerDay: 1000000,
        pauseThreshold: 0.8,
        warningThreshold: 0.6,
        autoResumeOnReset: true,
      },
      dailyTokenUsage: { input: 0, output: 0, date: new Date().toISOString().split('T')[0] },
      usageLimitStatus: 'ok',
      pausedDueToLimit: false,
    });

    render(<Controller />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
    });
  });

  it('displays conversations panel', async () => {
    mockElectronAPI.listConversationSessions.mockResolvedValue([]);

    render(<Controller />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The controller has a conversations sidebar
      expect(screen.getByText('Conversations')).toBeInTheDocument();
    });
  });

  it('displays conversation sessions when present', async () => {
    mockElectronAPI.listConversationSessions.mockResolvedValue([
      {
        id: 'session-1',
        projectId: 'project-1',
        projectName: 'Test Project',
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        entryCount: 5,
        totalTokens: { input: 1000, output: 500 },
      },
    ]);

    render(<Controller />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('displays the AI Project Manager subtitle', async () => {
    render(<Controller />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('AI Project Manager')).toBeInTheDocument();
    });
  });
});
