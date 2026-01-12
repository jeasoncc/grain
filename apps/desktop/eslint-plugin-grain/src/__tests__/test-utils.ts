/**
 * Test utilities for ESLint plugin testing
 */

import { Linter } from 'eslint';
import * as parser from '@typescript-eslint/parser';
import plugin from '../index.js';

/**
 * Run ESLint with proper TypeScript and JSX support
 */
export function runLint(
  code: string,
  rules: Record<string, string | [string, unknown]>,
  filename?: string
): Linter.LintMessage[] {
  const linter = new Linter({ configType: 'flat' });
  
  // Define the parser
  linter.defineParser('@typescript-eslint/parser', parser as any);
  
  const config = {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      grain: plugin,
    },
    languageOptions: {
      parser: parser as any,
      ecmaVersion: 2022 as const,
      sourceType: 'module' as const,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: null, // Don't require tsconfig for tests
      },
    },
    rules,
  };

  return linter.verify(code, config, { filename: filename || 'test.tsx' });
}

/**
 * Check if errors contain a specific rule ID
 */
export function hasRuleError(
  errors: Linter.LintMessage[],
  ruleId: string
): boolean {
  return errors.some(e => e.ruleId === ruleId);
}

/**
 * Get errors for a specific rule
 */
export function getRuleErrors(
  errors: Linter.LintMessage[],
  ruleId: string
): Linter.LintMessage[] {
  return errors.filter(e => e.ruleId === ruleId);
}

/**
 * Count errors for a specific rule
 */
export function countRuleErrors(
  errors: Linter.LintMessage[],
  ruleId: string
): number {
  return getRuleErrors(errors, ruleId).length;
}
