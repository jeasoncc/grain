import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import plugin from '../index.js';

// Helper to run ESLint with our plugin
function runLint(code: string, rules: Record<string, string | [string, unknown]>): Linter.LintMessage[] {
  const linter = new Linter({ configType: 'flat' });
  
  const config = {
    plugins: {
      grain: plugin,
    },
    rules,
    languageOptions: {
      ecmaVersion: 2022 as const,
      sourceType: 'module' as const,
    },
  };

  return linter.verify(code, config);
}

describe('Conditional Rules', () => {
  describe('no-nested-ternary', () => {
    it('should allow simple ternary expressions', () => {
      const code = 'const result = condition ? "yes" : "no";';
      const errors = runLint(code, { 'grain/no-nested-ternary': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should allow if-else statements', () => {
      const code = `
        function getStatus(score) {
          if (score >= 90) return 'excellent';
          if (score >= 60) return 'pass';
          return 'fail';
        }
      `;
      const errors = runLint(code, { 'grain/no-nested-ternary': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should detect nested ternary in alternate', () => {
      const code = 'const status = score >= 90 ? "excellent" : score >= 60 ? "pass" : "fail";';
      const errors = runLint(code, { 'grain/no-nested-ternary': 'error' });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].ruleId).toBe('grain/no-nested-ternary');
    });

    it('should detect nested ternary in consequent', () => {
      const code = 'const result = condition1 ? (condition2 ? "a" : "b") : "c";';
      const errors = runLint(code, { 'grain/no-nested-ternary': 'error' });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].ruleId).toBe('grain/no-nested-ternary');
    });

    it('should detect nested ternary in JSX', () => {
      const code = `
        const component = isLoading 
          ? <Spinner /> 
          : hasError 
            ? <Error /> 
            : <Content />;
      `;
      const errors = runLint(code, { 'grain/no-nested-ternary': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('strict-equality', () => {
    it('should allow strict equality ===', () => {
      const code = 'if (value === 0) { }';
      const errors = runLint(code, { 'grain/strict-equality': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should allow strict inequality !==', () => {
      const code = 'if (value !== null) { }';
      const errors = runLint(code, { 'grain/strict-equality': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should detect == operator', () => {
      const code = 'if (value == 0) { }';
      const errors = runLint(code, { 'grain/strict-equality': 'error' });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].ruleId).toBe('grain/strict-equality');
    });

    it('should detect != operator', () => {
      const code = 'if (value != null) { }';
      const errors = runLint(code, { 'grain/strict-equality': 'error' });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].ruleId).toBe('grain/strict-equality');
    });

    it('should detect == in expressions', () => {
      const code = 'const isEqual = a == b;';
      const errors = runLint(code, { 'grain/strict-equality': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect != in while loops', () => {
      const code = 'while (count != 10) { }';
      const errors = runLint(code, { 'grain/strict-equality': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('require-switch-default', () => {
    it('should allow switch with default case', () => {
      const code = `
        switch (status) {
          case 'active':
            handleActive();
            break;
          case 'inactive':
            handleInactive();
            break;
          default:
            handleUnknown();
            break;
        }
      `;
      const errors = runLint(code, { 'grain/require-switch-default': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should allow switch with default throwing error', () => {
      const code = `
        switch (type) {
          case 'A':
            break;
          case 'B':
            break;
          default:
            throw new Error('Unknown type');
        }
      `;
      const errors = runLint(code, { 'grain/require-switch-default': 'error' });
      expect(errors).toHaveLength(0);
    });

    it('should detect switch without default', () => {
      const code = `
        switch (status) {
          case 'active':
            handleActive();
            break;
          case 'inactive':
            handleInactive();
            break;
        }
      `;
      const errors = runLint(code, { 'grain/require-switch-default': 'error' });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].ruleId).toBe('grain/require-switch-default');
    });

    it('should detect switch with only one case and no default', () => {
      const code = `
        switch (value) {
          case 1:
            doSomething();
            break;
        }
      `;
      const errors = runLint(code, { 'grain/require-switch-default': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect switch with fall-through cases but no default', () => {
      const code = `
        switch (type) {
          case 'A':
          case 'B':
            break;
        }
      `;
      const errors = runLint(code, { 'grain/require-switch-default': 'error' });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
