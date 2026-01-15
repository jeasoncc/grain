/**
 * Property-Based Tests for Complexity Rules
 *
 * Feature: eslint-plugin-enhancement
 * Property 9: Code Complexity Metrics Enforcement
 * Validates: Requirements 15.1-15.6
 */

import { Linter } from "eslint"
import fc from "fast-check"
import { describe, expect, it } from "vitest"
import plugin from "../index.js"

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
			parser: require("@typescript-eslint/parser"),
		},
	}

	return linter.verify(code, config)
}

/**
 * Property 9: Code Complexity Metrics Enforcement
 * For any function, if it exceeds complexity limits (lines > 20, params > 3,
 * nesting > 2, cyclomatic > 5), the ESLint plugin SHALL report an error.
 */
describe("Property 9: Code Complexity Metrics Enforcement", () => {
	// Arbitrary for generating valid identifier names
	const identifierArb = fc
		.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/)
		.filter(
			(s) =>
				!["function", "const", "let", "var", "return", "if", "else", "for", "while"].includes(s),
		)
	describe("max-function-lines", () => {
		it("should detect functions exceeding max lines", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 21, max: 50 }), // Lines exceeding limit
					identifierArb,
					(lines, funcName) => {
						// Generate a function with specified number of lines
						const bodyLines = Array(lines - 2)
							.fill('  console.log("line");')
							.join("\n")
						const code = `function ${funcName}() {\n${bodyLines}\n}`

						const errors = runLint(code, { "grain/max-function-lines": "error" })

						// Should report error for exceeding max lines
						expect(errors.length).toBeGreaterThan(0)
						expect(errors.some((e) => e.ruleId === "grain/max-function-lines")).toBe(true)
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should not report functions within limit", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 20 }), // Lines within limit
					identifierArb,
					(lines, funcName) => {
						const bodyLines = Array(Math.max(1, lines - 2))
							.fill('  console.log("line");')
							.join("\n")
						const code = `function ${funcName}() {\n${bodyLines}\n}`

						const errors = runLint(code, { "grain/max-function-lines": "error" })

						// Should not report error
						expect(errors.filter((e) => e.ruleId === "grain/max-function-lines").length).toBe(0)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	describe("max-params", () => {
		it("should detect functions with too many parameters", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 4, max: 10 }), // Params exceeding limit
					identifierArb,
					(paramCount, funcName) => {
						const params = Array(paramCount)
							.fill(0)
							.map((_, i) => `param${i}: string`)
							.join(", ")
						const code = `function ${funcName}(${params}) { return; }`

						const errors = runLint(code, { "grain/max-params": "error" })

						// Should report error for too many params
						expect(errors.length).toBeGreaterThan(0)
						expect(errors.some((e) => e.ruleId === "grain/max-params")).toBe(true)
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should not report functions with acceptable parameters", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 3 }), // Params within limit
					identifierArb,
					(paramCount, funcName) => {
						const params = Array(paramCount)
							.fill(0)
							.map((_, i) => `param${i}: string`)
							.join(", ")
						const code = `function ${funcName}(${params}) { return; }`

						const errors = runLint(code, { "grain/max-params": "error" })

						// Should not report error
						expect(errors.filter((e) => e.ruleId === "grain/max-params").length).toBe(0)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	describe("max-nesting", () => {
		it("should detect excessive nesting", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 3, max: 5 }), // Nesting exceeding limit
					(nestingLevel) => {
						// Generate nested if statements
						let code = "function test() {\n"
						for (let i = 0; i < nestingLevel; i++) {
							code += "  ".repeat(i + 1) + "if (true) {\n"
						}
						code += "  ".repeat(nestingLevel + 1) + 'console.log("nested");\n'
						for (let i = nestingLevel - 1; i >= 0; i--) {
							code += "  ".repeat(i + 1) + "}\n"
						}
						code += "}"

						const errors = runLint(code, { "grain/max-nesting": "error" })

						// Should report error for excessive nesting
						expect(errors.length).toBeGreaterThan(0)
						expect(errors.some((e) => e.ruleId === "grain/max-nesting")).toBe(true)
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should not report acceptable nesting", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 2 }), // Nesting within limit
					(nestingLevel) => {
						let code = "function test() {\n"
						for (let i = 0; i < nestingLevel; i++) {
							code += "  ".repeat(i + 1) + "if (true) {\n"
						}
						code += "  ".repeat(nestingLevel + 1) + 'console.log("nested");\n'
						for (let i = nestingLevel - 1; i >= 0; i--) {
							code += "  ".repeat(i + 1) + "}\n"
						}
						code += "}"

						const errors = runLint(code, { "grain/max-nesting": "error" })

						// Should not report error
						expect(errors.filter((e) => e.ruleId === "grain/max-nesting").length).toBe(0)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	describe("cyclomatic-complexity", () => {
		it("should detect high cyclomatic complexity", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 6, max: 10 }), // Complexity exceeding limit
					(branchCount) => {
						// Generate function with multiple if statements
						let code = "function test(x: number) {\n"
						for (let i = 0; i < branchCount; i++) {
							code += `  if (x === ${i}) { return ${i}; }\n`
						}
						code += "  return -1;\n}"

						const errors = runLint(code, { "grain/cyclomatic-complexity": "error" })

						// Should report error for high complexity
						expect(errors.length).toBeGreaterThan(0)
						expect(errors.some((e) => e.ruleId === "grain/cyclomatic-complexity")).toBe(true)
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should not report acceptable complexity", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 0, max: 4 }), // Complexity within limit (base 1 + branches)
					(branchCount) => {
						let code = "function test(x: number) {\n"
						for (let i = 0; i < branchCount; i++) {
							code += `  if (x === ${i}) { return ${i}; }\n`
						}
						code += "  return -1;\n}"

						const errors = runLint(code, { "grain/cyclomatic-complexity": "error" })

						// Should not report error
						expect(errors.filter((e) => e.ruleId === "grain/cyclomatic-complexity").length).toBe(0)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	describe("max-file-lines", () => {
		it("should detect files exceeding max lines", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 201, max: 300 }), // Lines exceeding limit
					(lines) => {
						// Generate file with specified number of lines
						const code = Array(lines).fill('console.log("line");').join("\n")

						const errors = runLint(code, { "grain/max-file-lines": "error" })

						// Should report error for exceeding max lines
						expect(errors.length).toBeGreaterThan(0)
						expect(errors.some((e) => e.ruleId === "grain/max-file-lines")).toBe(true)
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should not report files within limit", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 200 }), // Lines within limit
					(lines) => {
						const code = Array(lines).fill('console.log("line");').join("\n")

						const errors = runLint(code, { "grain/max-file-lines": "error" })

						// Should not report error
						expect(errors.filter((e) => e.ruleId === "grain/max-file-lines").length).toBe(0)
					},
				),
				{ numRuns: 100 },
			)
		})
	})
})
