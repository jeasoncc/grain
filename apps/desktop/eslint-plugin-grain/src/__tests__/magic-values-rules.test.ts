import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import plugin from '../index.js';

// Helper to run ESLint with our plugin
function runLint(code: string, rules: Record<string, string | [string, unknown]>, filename = 'test.ts'): Linter.LintMessage[] {
  const linter = new Linter({ configType: 'flat' });
  
  const config = {
    plugins: {
      grain: plugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module' as const,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules,
  };

  // Don't pass filename as third parameter - it causes config matching issues
  return linter.verify(code, config);
}

describe('Magic Values Rules', () => {
  describe('no-magic-numbers', () => {
    it('should allow 0, 1, -1', () => {
      const code = `
        const count = 0;
        const increment = 1;
        const decrement = -1;
      `;
      const errors = runLint(code, { 'grain/no-magic-numbers': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should allow magic numbers in SCREAMING_SNAKE_CASE constants', () => {
      const code = `
        const MAX_RETRY_COUNT = 3;
        const DEFAULT_TIMEOUT_MS = 5000;
      `;
      const errors = runLint(code, { 'grain/no-magic-numbers': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should allow magic numbers in array indices', () => {
      const code = 'const item = array[2];';
      const errors = runLint(code, { 'grain/no-magic-numbers': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should detect magic numbers in function calls', () => {
      const code = 'setTimeout(callback, 5000);';
      const errors = runLint(code, { 'grain/no-magic-numbers': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect magic numbers in loops', () => {
      const code = 'for (let i = 0; i < 10; i++) {}';
      const errors = runLint(code, { 'grain/no-magic-numbers': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect magic numbers in conditions', () => {
      const code = 'if (count > 100) {}';
      const errors = runLint(code, { 'grain/no-magic-numbers': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect magic numbers in non-constant variables', () => {
      const code = 'const maxRetries = 3;';
      const errors = runLint(code, { 'grain/no-magic-numbers': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('no-hardcoded-values', () => {
    it('should allow URLs in SCREAMING_SNAKE_CASE constants', () => {
      const code = 'const API_BASE_URL = "https://api.example.com";';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should allow relative paths', () => {
      const code = 'const configPath = "./config.json";';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      // Debug: log errors if any
      if (errors.length > 0) {
        console.log('Unexpected errors:', errors.map(e => ({ message: e.message, line: e.line, column: e.column })));
      }
      // Relative paths should not be flagged
      expect(errors).toHaveLength(0);
    });

    it('should detect hardcoded URLs', () => {
      const code = 'fetch("https://api.example.com/users");';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect hardcoded WebSocket URLs', () => {
      const code = 'const ws = new WebSocket("wss://api.example.com");';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect hardcoded absolute paths (Unix)', () => {
      const code = 'const configPath = "/home/user/config.json";';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect hardcoded absolute paths (Windows)', () => {
      const code = 'const dataPath = "C:\\\\Users\\\\user\\\\data";';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect hardcoded timeout values', () => {
      const code = 'setTimeout(callback, 5000);';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect hardcoded interval values', () => {
      const code = 'setInterval(callback, 1000);';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect hardcoded color values (non-style files)', () => {
      const code = 'const color = "#3b82f6";';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect hardcoded RGB colors', () => {
      const code = 'ctx.fillStyle = "rgb(255, 0, 0)";';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect URLs in template literals', () => {
      const code = 'const url = `https://api.example.com/users/${id}`;';
      const errors = runLint(code, { 'grain/no-hardcoded-values': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
