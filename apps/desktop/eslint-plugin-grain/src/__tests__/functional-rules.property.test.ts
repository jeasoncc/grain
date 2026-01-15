/**
 * Property-Based Tests for Functional Programming Rules
 *
 * Feature: eslint-plugin-enhancement
 * Property 1: Error Handling Pattern Detection
 * Property 2: Immutability Enforcement
 * Validates: Requirements 1.1-1.10, 17.1-17.7, 18.1-18.7, 19.1-19.7, 26.1-26.7
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
		},
	}

	return linter.verify(code, config)
}

/**
 * Property 1: Error Handling Pattern Detection
 *
 * For any code snippet containing try-catch, throw, or Promise.catch(),
 * the ESLint plugin SHALL detect and report an error with the correct
 * alternative suggestion.
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */
describe("Property 1: Error Handling Pattern Detection", () => {
	// Arbitrary for generating valid identifier names
	const identifierArb = fc
		.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/)
		.filter(
			(s) =>
				![
					"try",
					"catch",
					"throw",
					"if",
					"else",
					"for",
					"while",
					"function",
					"const",
					"let",
					"var",
					"return",
					"new",
					"Promise",
				].includes(s),
		)

	// Arbitrary for generating simple expressions
	const simpleExprArb = fc.oneof(
		fc.constant("someFunction()"),
		fc.constant("data"),
		fc.constant("result"),
		identifierArb.map((id) => `${id}()`),
	)

	describe("try-catch detection", () => {
		it("should detect all try-catch statements regardless of body content", () => {
			fc.assert(
				fc.property(simpleExprArb, simpleExprArb, (tryBody, catchBody) => {
					const code = `
            try {
              ${tryBody};
            } catch (e) {
              ${catchBody};
            }
          `

					const errors = runLint(code, { "grain/no-try-catch": "error" })

					// Should have at least one error for try-catch
					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-try-catch")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect try-catch-finally statements", () => {
			fc.assert(
				fc.property(simpleExprArb, (body) => {
					const code = `
            try {
              ${body};
            } catch (e) {
              console.error(e);
            } finally {
              cleanup();
            }
          `

					const errors = runLint(code, { "grain/no-try-catch": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-try-catch")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})
	})

	describe("throw detection", () => {
		it("should detect all throw statements", () => {
			fc.assert(
				fc.property(
					fc.oneof(
						fc.constant('new Error("error")'),
						fc.constant("error"),
						fc.constant('new TypeError("type error")'),
						fc.constant('"string error"'),
					),
					(throwExpr) => {
						const code = `
              function test() {
                throw ${throwExpr};
              }
            `

						const errors = runLint(code, { "grain/no-throw": "error" })

						expect(errors.length).toBeGreaterThan(0)
						expect(errors.some((e) => e.ruleId === "grain/no-throw")).toBe(true)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	describe("Promise methods detection", () => {
		it("should detect Promise.catch() calls", () => {
			fc.assert(
				fc.property(identifierArb, (varName) => {
					const code = `
            ${varName}().catch(err => console.error(err));
          `

					const errors = runLint(code, { "grain/no-promise-methods": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-promise-methods")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect Promise.then() calls", () => {
			fc.assert(
				fc.property(identifierArb, (varName) => {
					const code = `
            ${varName}().then(data => process(data));
          `

					const errors = runLint(code, { "grain/no-promise-methods": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-promise-methods")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect Promise.all() calls", () => {
			fc.assert(
				fc.property(fc.array(identifierArb, { minLength: 1, maxLength: 5 }), (promises) => {
					const promiseList = promises.map((p) => `${p}()`).join(", ")
					const code = `
              Promise.all([${promiseList}]);
            `

					const errors = runLint(code, { "grain/no-promise-methods": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-promise-methods")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect Promise.race() calls", () => {
			fc.assert(
				fc.property(fc.array(identifierArb, { minLength: 1, maxLength: 3 }), (promises) => {
					const promiseList = promises.map((p) => `${p}()`).join(", ")
					const code = `
              Promise.race([${promiseList}]);
            `

					const errors = runLint(code, { "grain/no-promise-methods": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-promise-methods")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect new Promise() constructor", () => {
			fc.assert(
				fc.property(fc.boolean(), (_) => {
					const code = `
            const p = new Promise((resolve, reject) => {
              setTimeout(() => resolve('done'), 1000);
            });
          `

					const errors = runLint(code, { "grain/no-promise-methods": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-promise-methods")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})
	})
})

/**
 * Property 2: Immutability Enforcement
 *
 * For any code snippet containing array mutation methods or direct object
 * property assignment, the ESLint plugin SHALL detect and report an error
 * with the immutable alternative.
 *
 * Validates: Requirements 1.5, 1.6, 1.7, 1.8, 18.1-18.7, 19.1-19.7
 */
describe("Property 2: Immutability Enforcement", () => {
	// Arbitrary for array mutation methods
	const arrayMutationMethodArb = fc.constantFrom(
		"push",
		"pop",
		"shift",
		"unshift",
		"splice",
		"sort",
		"reverse",
		"fill",
	)

	// Arbitrary for valid identifier names
	const identifierArb = fc
		.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/)
		.filter(
			(s) =>
				![
					"push",
					"pop",
					"shift",
					"unshift",
					"splice",
					"sort",
					"reverse",
					"fill",
					"forEach",
					"const",
					"let",
					"var",
					"function",
					"return",
					"if",
					"else",
				].includes(s),
		)

	describe("array mutation detection", () => {
		it("should detect all array mutation methods", () => {
			fc.assert(
				fc.property(arrayMutationMethodArb, identifierArb, (method, arrayName) => {
					// Generate appropriate arguments for each method
					const args =
						method === "push" || method === "unshift"
							? "1"
							: method === "splice"
								? "0, 1"
								: method === "fill"
									? "0"
									: ""

					const code = `
            const ${arrayName} = [1, 2, 3];
            ${arrayName}.${method}(${args});
          `

					const errors = runLint(code, { "grain/no-mutation": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-mutation")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect forEach usage", () => {
			fc.assert(
				fc.property(identifierArb, (arrayName) => {
					const code = `
            const ${arrayName} = [1, 2, 3];
            ${arrayName}.forEach(item => console.log(item));
          `

					const errors = runLint(code, { "grain/no-mutation": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-mutation")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect array index assignment", () => {
			fc.assert(
				fc.property(
					identifierArb,
					fc.integer({ min: 0, max: 100 }),
					fc.integer({ min: 0, max: 1000 }),
					(arrayName, index, value) => {
						const code = `
              const ${arrayName} = [1, 2, 3];
              ${arrayName}[${index}] = ${value};
            `

						const errors = runLint(code, { "grain/no-mutation": "error" })

						expect(errors.length).toBeGreaterThan(0)
						expect(errors.some((e) => e.ruleId === "grain/no-mutation")).toBe(true)
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	describe("object mutation detection", () => {
		it("should detect direct object property assignment", () => {
			fc.assert(
				fc.property(identifierArb, identifierArb, (objName, propName) => {
					const code = `
            const ${objName} = { name: 'test' };
            ${objName}.${propName} = 'new value';
          `

					const errors = runLint(code, { "grain/no-object-mutation": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-object-mutation")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect Object.assign() with non-empty first argument", () => {
			fc.assert(
				fc.property(identifierArb, (objName) => {
					const code = `
            const ${objName} = { a: 1 };
            Object.assign(${objName}, { b: 2 });
          `

					const errors = runLint(code, { "grain/no-object-mutation": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-object-mutation")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect delete operator", () => {
			fc.assert(
				fc.property(identifierArb, identifierArb, (objName, propName) => {
					const code = `
            const ${objName} = { ${propName}: 'value' };
            delete ${objName}.${propName};
          `

					const errors = runLint(code, { "grain/no-object-mutation": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-object-mutation")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect Object.defineProperty()", () => {
			fc.assert(
				fc.property(identifierArb, identifierArb, (objName, propName) => {
					const code = `
            const ${objName} = {};
            Object.defineProperty(${objName}, '${propName}', { value: 42 });
          `

					const errors = runLint(code, { "grain/no-object-mutation": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-object-mutation")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})

		it("should detect Object.setPrototypeOf()", () => {
			fc.assert(
				fc.property(identifierArb, (objName) => {
					const code = `
            const ${objName} = {};
            Object.setPrototypeOf(${objName}, Array.prototype);
          `

					const errors = runLint(code, { "grain/no-object-mutation": "error" })

					expect(errors.length).toBeGreaterThan(0)
					expect(errors.some((e) => e.ruleId === "grain/no-object-mutation")).toBe(true)
				}),
				{ numRuns: 100 },
			)
		})
	})

	describe("immutable patterns should pass", () => {
		it("should allow spread operator for arrays", () => {
			fc.assert(
				fc.property(identifierArb, (arrayName) => {
					const code = `
            const ${arrayName} = [1, 2, 3];
            const newArray = [...${arrayName}, 4];
          `

					const errors = runLint(code, {
						"grain/no-mutation": "error",
						"grain/no-object-mutation": "error",
					})

					// Should have no errors for immutable operations
					expect(
						errors.filter(
							(e) => e.ruleId === "grain/no-mutation" || e.ruleId === "grain/no-object-mutation",
						).length,
					).toBe(0)
				}),
				{ numRuns: 100 },
			)
		})

		it("should allow spread operator for objects", () => {
			fc.assert(
				fc.property(identifierArb, identifierArb, (objName, propName) => {
					const code = `
            const ${objName} = { a: 1 };
            const newObj = { ...${objName}, ${propName}: 2 };
          `

					const errors = runLint(code, {
						"grain/no-mutation": "error",
						"grain/no-object-mutation": "error",
					})

					// Should have no errors for immutable operations
					expect(
						errors.filter(
							(e) => e.ruleId === "grain/no-mutation" || e.ruleId === "grain/no-object-mutation",
						).length,
					).toBe(0)
				}),
				{ numRuns: 100 },
			)
		})

		it("should allow Object.assign with empty first argument", () => {
			fc.assert(
				fc.property(identifierArb, (objName) => {
					const code = `
            const ${objName} = { a: 1 };
            const newObj = Object.assign({}, ${objName}, { b: 2 });
          `

					const errors = runLint(code, { "grain/no-object-mutation": "error" })

					// Should have no errors when first arg is empty object
					expect(errors.filter((e) => e.ruleId === "grain/no-object-mutation").length).toBe(0)
				}),
				{ numRuns: 100 },
			)
		})

		it("should allow map/filter/reduce", () => {
			fc.assert(
				fc.property(identifierArb, (arrayName) => {
					const code = `
            const ${arrayName} = [1, 2, 3];
            const doubled = ${arrayName}.map(x => x * 2);
            const evens = ${arrayName}.filter(x => x % 2 === 0);
            const sum = ${arrayName}.reduce((a, b) => a + b, 0);
          `

					const errors = runLint(code, { "grain/no-mutation": "error" })

					// Should have no errors for functional array methods
					expect(errors.filter((e) => e.ruleId === "grain/no-mutation").length).toBe(0)
				}),
				{ numRuns: 100 },
			)
		})
	})
})
