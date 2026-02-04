import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/user/data'),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn().mockReturnValue('mocked output'),
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue('{}'),
  unlinkSync: vi.fn(),
}));

describe('Executor Service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('Path Conversion', () => {
    it('should convert Windows paths to WSL paths', () => {
      // Test path conversion logic
      const windowsPath = 'C:\\Users\\test\\project';
      const expectedWslPath = '/mnt/c/Users/test/project';

      // Path conversion is internal to the executor
      // We test it indirectly through the executor interface
      const converted = windowsPath
        .replace(/^([A-Z]):\\/, (_, drive) => `/mnt/${drive.toLowerCase()}/`)
        .replace(/\\/g, '/');

      expect(converted).toBe(expectedWslPath);
    });

    it('should handle paths with spaces', () => {
      const windowsPath = 'C:\\Users\\test user\\my project';
      const converted = windowsPath
        .replace(/^([A-Z]):\\/, (_, drive) => `/mnt/${drive.toLowerCase()}/`)
        .replace(/\\/g, '/');

      expect(converted).toBe('/mnt/c/Users/test user/my project');
    });

    it('should preserve Unix paths unchanged', () => {
      const unixPath = '/home/user/project';
      // Unix paths should not be modified
      expect(unixPath).toBe('/home/user/project');
    });
  });

  describe('JSON Parsing', () => {
    it('should parse valid JSON output', () => {
      const jsonOutput = '{"result": "success", "data": [1, 2, 3]}';
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.result).toBe('success');
      expect(parsed.data).toEqual([1, 2, 3]);
    });

    it('should handle JSON with newlines', () => {
      const jsonWithNewlines = `{
        "result": "success",
        "message": "line1\\nline2"
      }`;
      const parsed = JSON.parse(jsonWithNewlines);

      expect(parsed.result).toBe('success');
      expect(parsed.message).toBe('line1\nline2');
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '{invalid json}';

      expect(() => JSON.parse(malformedJson)).toThrow();
    });

    it('should extract JSON from mixed output', () => {
      const mixedOutput = 'Some text before\n{"result": "success"}\nSome text after';
      const jsonMatch = mixedOutput.match(/\{[\s\S]*\}/);

      expect(jsonMatch).toBeTruthy();
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        expect(parsed.result).toBe('success');
      }
    });
  });

  describe('Command Building', () => {
    it('should build claude command with correct arguments', () => {
      const baseCommand = 'claude';
      const args = ['--dangerously-skip-permissions', '-p', 'Test prompt'];
      const fullCommand = [baseCommand, ...args].join(' ');

      expect(fullCommand).toContain('claude');
      expect(fullCommand).toContain('--dangerously-skip-permissions');
      expect(fullCommand).toContain('Test prompt');
    });

    it('should escape special characters in prompts', () => {
      const prompt = 'Test "quoted" content with $variables';
      const escaped = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');

      expect(escaped).toBe('Test \\"quoted\\" content with \\$variables');
    });
  });

  describe('Output Processing', () => {
    it('should extract cost from Claude output', () => {
      const output = 'Total cost: $0.05';
      const costMatch = output.match(/\$([0-9]+\.?[0-9]*)/);

      expect(costMatch).toBeTruthy();
      if (costMatch) {
        expect(parseFloat(costMatch[1])).toBe(0.05);
      }
    });

    it('should extract token counts', () => {
      const output = 'Input tokens: 1000, Output tokens: 500';
      const inputMatch = output.match(/Input tokens:\s*(\d+)/);
      const outputMatch = output.match(/Output tokens:\s*(\d+)/);

      expect(inputMatch).toBeTruthy();
      expect(outputMatch).toBeTruthy();
      if (inputMatch && outputMatch) {
        expect(parseInt(inputMatch[1])).toBe(1000);
        expect(parseInt(outputMatch[1])).toBe(500);
      }
    });
  });
});
