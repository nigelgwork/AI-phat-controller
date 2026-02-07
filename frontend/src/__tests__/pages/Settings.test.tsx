import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Settings from '../../pages/Settings';
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

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the settings page title', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('displays execution mode options', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Execution Mode')).toBeInTheDocument();
    });
  });

  it('displays mode selection buttons', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /auto/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /windows/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /wsl/i })).toBeInTheDocument();
    });
  });

  it('displays Claude detection status', async () => {
    mockElectronAPI.detectModes.mockResolvedValue({
      current: 'windows',
      windows: { available: true, version: '1.0.0' },
      wsl: { available: false },
    });

    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Claude Detection')).toBeInTheDocument();
    });
  });

  it('displays ntfy notifications configuration', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('ntfy Notifications')).toBeInTheDocument();
    });
  });

  it('displays WSL configuration section', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('WSL Configuration')).toBeInTheDocument();
    });
  });

  it('displays save button', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });
  });

  it('displays about section with version', async () => {
    mockElectronAPI.getVersion.mockResolvedValue('1.0.0');

    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/about/i)).toBeInTheDocument();
    });
  });

  it('displays debug info section', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Debug Info')).toBeInTheDocument();
    });
  });

  it('displays log file path setting', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Log File Location')).toBeInTheDocument();
    });
  });

  it('displays usage limits section', async () => {
    render(<Settings />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Token Usage Limits')).toBeInTheDocument();
    });
  });
});
