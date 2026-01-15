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
		languageOptions: {
			ecmaVersion: 2020,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			sourceType: "module",
		},
		plugins: {
			grain: plugin,
		},
		rules,
	}

	return linter.verify(code, config)
}

/**
 * Feature: eslint-plugin-enhancement
 * Property 11: Security Pattern Detection
 * Validates: Requirements 24.1-24.7
 *
 * For any code containing security risks (eval, innerHTML, sensitive data logging),
 * the ESLint plugin SHALL report an error.
 */
describe("Property 11: Security Pattern Detection", () => {
	describe("no-eval rule", () => {
		/**
		 * Property: For any eval() call, the rule SHALL detect and report an error
		 */
		it("should detect all eval() calls", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant('eval("1 + 2")'),
						fc.constant('const x = eval("code")'),
						fc.constant("eval(`${expression}`)"),
						fc.constant("const result = eval(dynamicCode)"),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-eval": "error" })
						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-eval")
					},
				),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property: For any Function constructor call, the rule SHALL detect and report an error
		 */
		it("should detect all Function constructor calls", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant('new Function("a", "b", "return a + b")'),
						fc.constant('const fn = new Function("return 42")'),
						fc.constant("const f = new Function(code)"),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-eval": "error" })
						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-eval")
					},
				),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property: Safe alternatives should not trigger errors
		 */
		it("should not flag safe alternatives", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant("const data = JSON.parse(jsonString)"),
						fc.constant("const value = obj[key]"),
						fc.constant("function add(a, b) { return a + b; }"),
						fc.constant("const fn = (x) => x * 2"),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-eval": "error" })
						expect(errors.length).toBe(0)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	describe("no-innerhtml rule", () => {
		/**
		 * Property: For any innerHTML assignment, the rule SHALL detect and report an error
		 */
		it("should detect all innerHTML assignments", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant('element.innerHTML = "<div>content</div>"'),
						fc.constant("node.innerHTML = userInput"),
						fc.constant("div.innerHTML = `<span>${text}</span>`"),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-innerhtml": "error" })
						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-innerhtml")
					},
				),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property: For any outerHTML assignment, the rule SHALL detect and report an error
		 */
		it("should detect all outerHTML assignments", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant('element.outerHTML = "<div>content</div>"'),
						fc.constant("node.outerHTML = html"),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-innerhtml": "error" })
						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-innerhtml")
					},
				),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property: dangerouslySetInnerHTML without sanitization should be detected
		 */
		it("should detect dangerouslySetInnerHTML without sanitization", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant("<div dangerouslySetInnerHTML={{ __html: content }} />"),
						fc.constant("<span dangerouslySetInnerHTML={{ __html: userInput }} />"),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-innerhtml": "error" })
						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-innerhtml")
					},
				),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property: Safe alternatives should not trigger errors
		 */
		it("should not flag safe alternatives", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant("element.textContent = text"),
						fc.constant("const x = content"),
						fc.constant("<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />"),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-innerhtml": "error" })
						expect(errors.length).toBe(0)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	describe("no-sensitive-logging rule", () => {
		/**
		 * Property: For any logging of sensitive data, the rule SHALL detect and report an error
		 */
		it("should detect sensitive data in logging calls", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant("console.log(password)"),
						fc.constant("logger.info({ token })"),
						fc.constant('console.log("API Key:", apiKey)'),
						fc.constant("logger.debug({ secret, value })"),
						fc.constant("console.log({ authorization })"),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-sensitive-logging": "error" })
						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-sensitive-logging")
					},
				),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property: For any hardcoded credentials, the rule SHALL detect and report an error
		 */
		it("should detect hardcoded credentials", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant('const apiKey = "sk-1234567890abcdef"'),
						fc.constant('const password = "mySecretPassword"'),
						fc.constant('const token = "Bearer eyJhbGciOiJIUzI1NiJ9"'),
						fc.constant('const secret = "my-secret-key-123"'),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-sensitive-logging": "error" })
						expect(errors.length).toBeGreaterThan(0)
						expect(errors[0].ruleId).toBe("grain/no-sensitive-logging")
					},
				),
				{ numRuns: 100 },
			)
		})

		/**
		 * Property: Safe logging patterns should not trigger errors
		 */
		it("should not flag safe logging patterns", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant('console.log("User logged in")'),
						fc.constant("logger.info({ username })"),
						fc.constant("console.log({ hasAuth: !!token })"),
						fc.constant("const apiKey = process.env.API_KEY"),
						fc.constant("const password = config.password"),
					),
					(code) => {
						const errors = runLint(code, { "grain/no-sensitive-logging": "error" })
						expect(errors.length).toBe(0)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	/**
	 * Integration test: Multiple security violations in one file
	 */
	describe("Integration: Multiple security violations", () => {
		it("should detect all security violations in a file", () => {
			const code = `
        const apiKey = "sk-1234567890";
        const result = eval("1 + 2");
        element.innerHTML = userInput;
        console.log({ password });
      `

			const errors = runLint(code, {
				"grain/no-eval": "error",
				"grain/no-innerhtml": "error",
				"grain/no-sensitive-logging": "error",
			})

			// Should detect at least 3 violations (eval, innerHTML, sensitive logging)
			expect(errors.length).toBeGreaterThanOrEqual(3)

			const ruleIds = errors.map((e) => e.ruleId)
			expect(ruleIds).toContain("grain/no-eval")
			expect(ruleIds).toContain("grain/no-innerhtml")
			expect(ruleIds).toContain("grain/no-sensitive-logging")
		})
	})
})
