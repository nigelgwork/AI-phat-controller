import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface TmuxSession {
  id: string;
  name: string;
  windows: number;
  created: Date;
  attached: boolean;
  projectId?: string;
  notes?: string;
}

export interface TmuxHistoryResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Hook to check if tmux is available on the system
 */
export function useTmuxAvailable() {
  return useQuery({
    queryKey: ['tmux-available'],
    queryFn: () => window.electronAPI?.isTmuxAvailable() ?? Promise.resolve(false),
    staleTime: 60000, // Cache for 1 minute
  });
}

/**
 * Hook to list all tmux sessions
 */
export function useTmuxSessions() {
  return useQuery({
    queryKey: ['tmux-sessions'],
    queryFn: async () => {
      const sessions = await window.electronAPI?.listTmuxSessions();
      return sessions || [];
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

/**
 * Hook to create a new tmux session
 */
export function useCreateTmuxSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      projectId,
      cwd,
    }: {
      name: string;
      projectId?: string;
      cwd?: string;
    }) => {
      const result = await window.electronAPI?.createTmuxSession(name, projectId, cwd);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to create session');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tmux-sessions'] });
    },
  });
}

/**
 * Hook to attach to a tmux session
 */
export function useAttachTmuxSession() {
  return useMutation({
    mutationFn: async (name: string) => {
      const result = await window.electronAPI?.attachTmuxSession(name);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to attach to session');
      }
      return result;
    },
  });
}

/**
 * Hook to kill a tmux session
 */
export function useKillTmuxSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const result = await window.electronAPI?.killTmuxSession(name);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to kill session');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tmux-sessions'] });
    },
  });
}

/**
 * Hook to get session history
 */
export function useTmuxSessionHistory(name: string | null, lines: number = 1000) {
  return useQuery({
    queryKey: ['tmux-history', name, lines],
    queryFn: async () => {
      if (!name) return null;
      return window.electronAPI?.getTmuxSessionHistory(name, lines);
    },
    enabled: !!name,
    staleTime: 5000, // Cache for 5 seconds
  });
}

/**
 * Hook to send keys to a tmux session
 */
export function useSendTmuxKeys() {
  return useMutation({
    mutationFn: async ({ name, keys }: { name: string; keys: string }) => {
      const result = await window.electronAPI?.sendTmuxKeys(name, keys);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to send keys');
      }
      return result;
    },
  });
}

/**
 * Hook to update session metadata
 */
export function useUpdateTmuxSessionMeta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      updates,
    }: {
      name: string;
      updates: { projectId?: string; notes?: string };
    }) => {
      return window.electronAPI?.updateTmuxSessionMeta(name, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tmux-sessions'] });
    },
  });
}

/**
 * Hook to rename a tmux session
 */
export function useRenameTmuxSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const result = await window.electronAPI?.renameTmuxSession(oldName, newName);
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to rename session');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tmux-sessions'] });
    },
  });
}
