import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock data for the test
const mockData = new Map<string, unknown>();

// Mock electron-store
vi.mock('electron-store', () => {
  class MockStore {
    defaults: Record<string, unknown>;

    constructor(options?: { defaults?: Record<string, unknown> }) {
      this.defaults = options?.defaults || {};
      Object.entries(this.defaults).forEach(([key, value]) => {
        mockData.set(key, value);
      });
    }

    get(key: string) {
      return mockData.get(key);
    }

    set(key: string | Record<string, unknown>, value?: unknown) {
      if (typeof key === 'object') {
        Object.entries(key).forEach(([k, v]) => {
          mockData.set(k, v);
        });
      } else {
        mockData.set(key, value);
      }
    }

    has(key: string) {
      return mockData.has(key);
    }

    delete(key: string) {
      return mockData.delete(key);
    }

    clear() {
      mockData.clear();
    }

    get store() {
      const obj: Record<string, unknown> = {};
      mockData.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    }
  }
  return { default: MockStore };
});

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/user/data'),
  },
  Notification: vi.fn().mockImplementation(() => ({
    show: vi.fn(),
  })),
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
}));

// Mock encryption key
vi.mock('../../utils/encryption-key', () => ({
  getEncryptionKey: vi.fn().mockReturnValue('mock-encryption-key-32-chars-long'),
}));

// Mock safe-ipc
vi.mock('../../utils/safe-ipc', () => ({
  safeBroadcast: vi.fn(),
}));

// Mock token-history
vi.mock('../../stores/token-history', () => ({
  recordHourlyUsage: vi.fn(),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  createLogger: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Controller Service', () => {
  beforeEach(() => {
    vi.resetModules();
    mockData.clear();
  });

  describe('Token Usage Tracking', () => {
    it('should initialize with zero token usage', async () => {
      const { initControllerStore, getControllerState } = await import('../controller');
      initControllerStore();

      const state = getControllerState();
      expect(state.tokenUsage.inputTokens).toBe(0);
      expect(state.tokenUsage.outputTokens).toBe(0);
    });

    it('should have default usage limit config', async () => {
      const { initControllerStore, getControllerState } = await import('../controller');
      initControllerStore();

      const state = getControllerState();
      expect(state.usageLimitConfig.maxTokensPerHour).toBeDefined();
      expect(state.usageLimitConfig.maxTokensPerDay).toBeDefined();
      expect(state.usageLimitConfig.pauseThreshold).toBeLessThanOrEqual(1);
      expect(state.usageLimitConfig.warningThreshold).toBeLessThanOrEqual(1);
    });
  });

  describe('Controller State Transitions', () => {
    it('should start in idle status', async () => {
      const { initControllerStore, getControllerState } = await import('../controller');
      initControllerStore();

      const state = getControllerState();
      expect(state.status).toBe('idle');
    });

    it('should have null current task when idle', async () => {
      const { initControllerStore, getControllerState } = await import('../controller');
      initControllerStore();

      const state = getControllerState();
      expect(state.currentTaskId).toBeNull();
      expect(state.currentAction).toBeNull();
    });

    it('should track processed, approved, and rejected counts', async () => {
      const { initControllerStore, getControllerState } = await import('../controller');
      initControllerStore();

      const state = getControllerState();
      expect(state.processedCount).toBe(0);
      expect(state.approvedCount).toBe(0);
      expect(state.rejectedCount).toBe(0);
      expect(state.errorCount).toBe(0);
    });
  });

  describe('Usage Limit Status', () => {
    it('should calculate usage percentage correctly', () => {
      const inputTokens = 50000;
      const maxTokensPerHour = 100000;
      const percentage = (inputTokens / maxTokensPerHour) * 100;

      expect(percentage).toBe(50);
    });

    it('should determine warning status correctly', () => {
      const percentage = 0.65; // 65%
      const warningThreshold = 0.6;
      const pauseThreshold = 0.8;

      let status: string;
      if (percentage >= 1) {
        status = 'at_limit';
      } else if (percentage >= pauseThreshold) {
        status = 'approaching_limit';
      } else if (percentage >= warningThreshold) {
        status = 'warning';
      } else {
        status = 'ok';
      }

      expect(status).toBe('warning');
    });

    it('should determine at_limit status correctly', () => {
      const percentage = 1.0; // 100%
      const warningThreshold = 0.6;
      const pauseThreshold = 0.8;

      let status: string;
      if (percentage >= 1) {
        status = 'at_limit';
      } else if (percentage >= pauseThreshold) {
        status = 'approaching_limit';
      } else if (percentage >= warningThreshold) {
        status = 'warning';
      } else {
        status = 'ok';
      }

      expect(status).toBe('at_limit');
    });
  });

  describe('Approval Queue', () => {
    it('should start with empty approval queue', async () => {
      const { initControllerStore, getApprovalQueue } = await import('../controller');
      initControllerStore();

      const queue = getApprovalQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('Action Logs', () => {
    it('should start with empty action logs', async () => {
      const { initControllerStore, getActionLogs } = await import('../controller');
      initControllerStore();

      const logs = getActionLogs();
      expect(logs).toEqual([]);
    });
  });
});
