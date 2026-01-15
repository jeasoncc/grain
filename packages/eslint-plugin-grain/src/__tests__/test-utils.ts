/**
 * Test utilities for ESLint plugin testing
 */

import * as parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import plugin from "../index.js"

/**
 * Run ESLint with proper TypeScript and JSX support
 */
export function runLint(
	code: string,
	rules: Record<string, string | [string, unknown]>,
	filename?: string,
): Linter.LintMessage[] {
	const linter = new Linter({ configType: "flat" })

	const config = {
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			ecmaVersion: 2022 as const,
			parser: parser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
				ecmaVersion: 2022,
				sourceType: "module",
			},
			sourceType: "module" as const,
		},
		plugins: {
			grain: plugin,
		},
		rules,
	}

	// Type assertion needed because our plugin's configs use legacy format
	return linter.verify(code, config as any, { filename: filename || "test.tsx" })
}

/**
 * Check if errors contain a specific rule ID
 */
export function hasRuleError(errors: Linter.LintMessage[], ruleId: string): boolean {
	return errors.some((e) => e.ruleId === ruleId)
}

/**
 * Get errors for a specific rule
 */
export function getRuleErrors(errors: Linter.LintMessage[], ruleId: string): Linter.LintMessage[] {
	return errors.filter((e) => e.ruleId === ruleId)
}

/**
 * Count errors for a specific rule
 */
export function countRuleErrors(errors: Linter.LintMessage[], ruleId: string): number {
	return getRuleErrors(errors, ruleId).length
}
