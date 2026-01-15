/**
 * @fileoverview Property-based tests for import rules
 * Feature: eslint-plugin-enhancement
 * Property 6: Banned Library Detection
 * Property 8: Import Organization Validation
 * Validates: Requirements 5.1-5.7, 7.1-7.6, 22.1-22.5, 29.1-29.5
 */

import { Linter } from "eslint"
import fc from "fast-check"
import { describe, expect, it } from "vitest"
import plugin from "../index.js"
import { BANNED_LIBRARIES } from "../types/config.types.js"

// Helper to run ESLint with our plugin
function runLint(
	code: string,
	rules: Record<string, string | [string, unknown]>,
): Linter.LintMessage[] {
	const linter = new Linter({ configType: "flat" })

	const config = {
		plugins: {
			grain: plugin,
		},
		rules,
		languageOptions: {
			ecmaVersion: 2022 as const,
			sourceType: "module" as const,
		},
	}

	return linter.verify(code, config)
}

describe("Import Rules Property Tests", () => {
	describe("Property 6: Banned Library Detection", () => {
		/**
		 * Property 6: Banned Library Detection
		 * For any import statement importing from a banned library,
		 * the ESLint plugin SHALL report an error with the modern alternative suggestion.
		 */

		it("should detect all lodash import variations", () => {
			fc.assert(
				fc.property(fc.constantFrom("lodash", "lodash-es", "underscore"), (library) => {
					const code = `import _ from '${library}';`
					const errors = runLint(code, { "grain/no-banned-imports": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors[0].ruleId).toBe("grain/no-banned-imports")
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect lodash submodule imports", () => {
			fc.assert(
				fc.property(
					fc.constantFrom("debounce", "throttle", "cloneDeep", "merge", "pick", "omit"),
					(submodule) => {
						const code = `import ${submodule} from 'lodash/${submodule}';`
						const errors = runLint(code, { "grain/no-banned-imports": "error" })

						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-banned-imports")
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should detect moment imports", () => {
			fc.assert(
				fc.property(fc.constantFrom("moment", "moment-timezone"), (library) => {
					const code = `import moment from '${library}';`
					const errors = runLint(code, { "grain/no-banned-imports": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors[0].ruleId).toBe("grain/no-banned-imports")
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect new Date() constructor", () => {
			fc.assert(
				fc.property(
					fc.constantFrom(
						"const now = new Date();",
						'const date = new Date("2024-01-01");',
						"const timestamp = new Date(Date.now());",
					),
					(code) => {
						const errors = runLint(code, { "grain/no-banned-imports": "error" })

						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-banned-imports")
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should detect Date.now() usage", () => {
			const code = "const timestamp = Date.now();"
			const errors = runLint(code, { "grain/no-banned-imports": "error" })

			expect(errors.length).toBeGreaterThan(0)
			expect(errors[0].ruleId).toBe("grain/no-banned-imports")
		})

		it("should detect all banned libraries from config", () => {
			const bannedLibs = Object.keys(BANNED_LIBRARIES).filter(
				(lib) => !["lodash", "lodash-es", "underscore", "moment", "moment-timezone"].includes(lib),
			)

			if (bannedLibs.length > 0) {
				fc.assert(
					fc.property(fc.constantFrom(...bannedLibs), (library) => {
						const code = `import something from '${library}';`
						const errors = runLint(code, { "grain/no-banned-imports": "error" })

						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-banned-imports")
					}),
					{ numRuns: Math.min(100, bannedLibs.length) },
				)
			}
		})
	})

	describe("Property 8: Import Organization Validation", () => {
		/**
		 * Property 8: Import Organization Validation
		 * For any file with imports, if imports are not properly grouped or do not use @/ alias,
		 * the ESLint plugin SHALL report an error with auto-fix capability.
		 */

		it("should detect default exports", () => {
			fc.assert(
				fc.property(
					fc.constantFrom(
						"export default MyComponent;",
						"export default function myFunction() {}",
						"export default class MyClass {}",
						"export default 42;",
					),
					(code) => {
						const errors = runLint(code, { "grain/no-default-export": "error" })

						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-default-export")
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should detect deprecated directory imports", () => {
			fc.assert(
				fc.property(
					fc.constantFrom(
						"@/fn/something",
						"@/components/MyComponent",
						"@/actions/myAction",
						"@/stores/myStore",
						"@/lib/helper",
					),
					(importPath) => {
						const code = `import { something } from '${importPath}';`
						const errors = runLint(code, { "grain/no-deprecated-imports": "error" })

						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-deprecated-imports")
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should detect wrong import order", () => {
			const wrongOrderCode = `
import { helper } from './helper';
import React from 'react';
import { MyComponent } from '@/views/my-component';
      `.trim()

			const errors = runLint(wrongOrderCode, { "grain/import-grouping": "error" })

			expect(errors.length).toBeGreaterThan(0)
			expect(errors[0].ruleId).toBe("grain/import-grouping")
		})

		it("should accept correct import order", () => {
			const correctOrderCode = `
import React from 'react';
import { pipe } from 'fp-ts/function';

import { MyComponent } from '@/views/my-component';
import { useWorkspace } from '@/hooks/use-workspace';

import { helper } from './helper';
      `.trim()

			const errors = runLint(correctOrderCode, { "grain/import-grouping": "error" })

			expect(errors.length).toBe(0)
		})
	})

	describe("Integration: Multiple Import Rules", () => {
		it("should detect multiple import violations in same file", () => {
			const code = `
import _ from 'lodash';
import moment from 'moment';
export default MyComponent;
import { old } from '@/fn/old-function';
      `.trim()

			const errors = runLint(code, {
				"grain/no-banned-imports": "error",
				"grain/no-default-export": "error",
				"grain/no-deprecated-imports": "error",
			})

			// Should have at least 4 errors: lodash, moment, default export, deprecated import
			expect(errors.length).toBeGreaterThanOrEqual(4)

			const ruleIds = errors.map((e) => e.ruleId)
			expect(ruleIds).toContain("grain/no-banned-imports")
			expect(ruleIds).toContain("grain/no-default-export")
			expect(ruleIds).toContain("grain/no-deprecated-imports")
		})
	})
})
