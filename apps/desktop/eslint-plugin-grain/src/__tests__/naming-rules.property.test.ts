/**
 * Property-Based Tests for Naming Rules
 *
 * Feature: eslint-plugin-enhancement
 * Property 5: File Naming Convention Validation
 * Property 10: Naming Convention Enforcement
 * Validates: Requirements 4.1-4.10, 16.1-16.7
 */

import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { DEFAULT_NAMING_CONFIG, FILE_NAMING_PATTERNS } from "../types/config.types"
import { countRuleErrors, hasRuleError, runLint } from "./test-utils.js"

describe("Property 5: File Naming Convention Validation", () => {
	/**
	 * Property: For any file in a known architecture layer,
	 * if the filename does not match the expected pattern for that layer,
	 * the ESLint plugin SHALL report a warning with the correct naming convention.
	 */

	it("should detect all invalid file names in pipes/ layer", () => {
		const pipesPattern = FILE_NAMING_PATTERNS.find((p) => p.layer === "pipes")
		if (!pipesPattern) throw new Error("pipes pattern not found")

		// Generate invalid filenames (not ending with .pipe.ts or .fn.ts)
		const invalidFilenameArb = fc
			.string({ minLength: 1, maxLength: 20 })
			.filter((s) => /^[a-z][a-z0-9-]*$/.test(s))
			.map((s) => `${s}.ts`) // Missing .pipe or .fn

		fc.assert(
			fc.property(invalidFilenameArb, (filename) => {
				const fullPath = `/src/pipes/${filename}`

				// Skip if accidentally matches pattern
				if (pipesPattern.pattern.test(filename)) {
					return true
				}

				const code = "const x = 1;"
				const errors = runLint(code, { "grain/file-naming": "error" }, fullPath)

				return errors.length > 0 && errors[0].ruleId === "grain/file-naming"
			}),
			{ numRuns: 50 },
		)
	})

	it("should accept all valid file names in pipes/ layer", () => {
		const validSuffixes = [".pipe.ts", ".fn.ts"]

		const validFilenameArb = fc
			.tuple(
				fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-z][a-z0-9-]*$/.test(s)),
				fc.constantFrom(...validSuffixes),
			)
			.map(([name, suffix]) => `${name}${suffix}`)

		fc.assert(
			fc.property(validFilenameArb, (filename) => {
				const fullPath = `/src/pipes/${filename}`
				const code = "const x = 1;"
				const errors = runLint(code, { "grain/file-naming": "error" }, fullPath)

				return errors.length === 0 || errors[0].ruleId !== "grain/file-naming"
			}),
			{ numRuns: 50 },
		)
	})

	it("should detect invalid file names in flows/ layer", () => {
		const flowsPattern = FILE_NAMING_PATTERNS.find((p) => p.layer === "flows")
		if (!flowsPattern) throw new Error("flows pattern not found")

		const invalidFilenameArb = fc
			.string({ minLength: 1, maxLength: 20 })
			.filter((s) => /^[a-z][a-z0-9-]*$/.test(s))
			.map((s) => `${s}.ts`) // Missing .flow or .action

		fc.assert(
			fc.property(invalidFilenameArb, (filename) => {
				const fullPath = `/src/flows/${filename}`

				if (flowsPattern.pattern.test(filename)) {
					return true
				}

				const code = "const x = 1;"
				const errors = runLint(code, { "grain/file-naming": "error" }, fullPath)

				return errors.length > 0 && errors[0].ruleId === "grain/file-naming"
			}),
			{ numRuns: 50 },
		)
	})
})

describe("Property 10: Naming Convention Enforcement", () => {
	/**
	 * Property: For any identifier (variable, function, constant, boolean),
	 * if it does not follow the naming convention,
	 * the ESLint plugin SHALL report an error.
	 */

	describe("Variable Naming", () => {
		it("should detect all variables shorter than minimum length", () => {
			const { minVariableLength, allowedShortNames } = DEFAULT_NAMING_CONFIG

			// Generate short variable names (1-2 chars) that are not in allowed list
			const shortNameArb = fc
				.string({ minLength: 1, maxLength: minVariableLength - 1 })
				.filter((s) => /^[a-z][a-z0-9]*$/i.test(s))
				.filter((s) => !allowedShortNames.includes(s))
				.filter((s) => !s.startsWith("_")) // Skip private variables

			fc.assert(
				fc.property(shortNameArb, (varName) => {
					const code = `const ${varName} = 123;`
					const errors = runLint(code, { "grain/variable-naming": "error" })

					return errors.length > 0 && errors[0].ruleId === "grain/variable-naming"
				}),
				{ numRuns: 50 },
			)
		})

		it("should accept all allowed short variable names", () => {
			const { allowedShortNames } = DEFAULT_NAMING_CONFIG

			fc.assert(
				fc.property(fc.constantFrom(...allowedShortNames), (varName) => {
					const code = `const ${varName} = 123;`
					const errors = runLint(code, { "grain/variable-naming": "error" })

					return errors.length === 0 || errors[0].ruleId !== "grain/variable-naming"
				}),
				{ numRuns: allowedShortNames.length },
			)
		})
	})

	describe("Function Naming", () => {
		it("should warn for functions not starting with verb", () => {
			const { verbPrefixes } = DEFAULT_NAMING_CONFIG

			// Generate function names that don't start with verbs
			const nonVerbNameArb = fc
				.string({ minLength: 3, maxLength: 15 })
				.filter((s) => /^[a-z][a-z0-9]*$/i.test(s))
				.filter((s) => !verbPrefixes.some((v) => s.toLowerCase().startsWith(v.toLowerCase())))
				.filter((s) => !/^[A-Z]/.test(s)) // Skip React components
				.filter((s) => !s.startsWith("_")) // Skip private functions
				.filter((s) => !s.includes("handler") && !s.includes("Handler")) // Skip event handlers

			fc.assert(
				fc.property(nonVerbNameArb, (funcName) => {
					const code = `const ${funcName} = () => {};`
					const errors = runLint(code, { "grain/function-naming": "error" })

					return errors.length > 0 && errors[0].ruleId === "grain/function-naming"
				}),
				{ numRuns: 50 },
			)
		})

		it("should accept functions starting with verbs", () => {
			const { verbPrefixes } = DEFAULT_NAMING_CONFIG

			const verbFunctionArb = fc
				.tuple(
					fc.constantFrom(...verbPrefixes.slice(0, 10)),
					fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[A-Z][a-z0-9]*$/.test(s)),
				)
				.map(([verb, suffix]) => `${verb}${suffix}`)

			fc.assert(
				fc.property(verbFunctionArb, (funcName) => {
					const code = `const ${funcName} = () => {};`
					const errors = runLint(code, { "grain/function-naming": "error" })

					return errors.length === 0 || errors[0].ruleId !== "grain/function-naming"
				}),
				{ numRuns: 50 },
			)
		})
	})

	describe("Boolean Naming", () => {
		it("should detect booleans without proper prefix", () => {
			const { booleanPrefixes } = DEFAULT_NAMING_CONFIG

			// Generate boolean variable names without proper prefix
			const invalidBooleanArb = fc
				.string({ minLength: 3, maxLength: 15 })
				.filter((s) => /^[a-z][a-z0-9]*$/i.test(s))
				.filter((s) => !booleanPrefixes.some((p) => s.toLowerCase().startsWith(p.toLowerCase())))
				.filter((s) => !s.startsWith("_"))

			fc.assert(
				fc.property(invalidBooleanArb, (varName) => {
					const code = `const ${varName}: boolean = true;`
					const errors = runLint(code, { "grain/boolean-naming": "error" })

					return errors.length > 0 && errors[0].ruleId === "grain/boolean-naming"
				}),
				{ numRuns: 50 },
			)
		})

		it("should accept booleans with proper prefix", () => {
			const { booleanPrefixes } = DEFAULT_NAMING_CONFIG

			const validBooleanArb = fc
				.tuple(
					fc.constantFrom(...booleanPrefixes),
					fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[A-Z][a-z0-9]*$/.test(s)),
				)
				.map(([prefix, suffix]) => `${prefix}${suffix}`)

			fc.assert(
				fc.property(validBooleanArb, (varName) => {
					const code = `const ${varName}: boolean = true;`
					const errors = runLint(code, { "grain/boolean-naming": "error" })

					return errors.length === 0 || errors[0].ruleId !== "grain/boolean-naming"
				}),
				{ numRuns: 50 },
			)
		})
	})

	describe("Constant Naming", () => {
		it("should detect constants not in SCREAMING_SNAKE_CASE", () => {
			// Generate camelCase constant names
			const camelCaseArb = fc
				.string({ minLength: 3, maxLength: 15 })
				.filter((s) => /^[a-z][a-zA-Z0-9]*$/.test(s))
				.filter((s) => !/^[A-Z][A-Z0-9_]*$/.test(s)) // Not SCREAMING_SNAKE_CASE

			fc.assert(
				fc.property(camelCaseArb, (constName) => {
					const code = `const ${constName} = 'value';`
					const errors = runLint(code, { "grain/constant-naming": "error" })

					return errors.length > 0 && errors[0].ruleId === "grain/constant-naming"
				}),
				{ numRuns: 50 },
			)
		})

		it("should accept constants in SCREAMING_SNAKE_CASE", () => {
			// Generate SCREAMING_SNAKE_CASE names
			const screamingSnakeArb = fc
				.array(
					fc.string({ minLength: 1, maxLength: 8 }).filter((s) => /^[A-Z][A-Z0-9]*$/.test(s)),
					{ minLength: 1, maxLength: 3 },
				)
				.map((parts) => parts.join("_"))

			fc.assert(
				fc.property(screamingSnakeArb, (constName) => {
					const code = `const ${constName} = 'value';`
					const errors = runLint(code, { "grain/constant-naming": "error" })

					return errors.length === 0 || errors[0].ruleId !== "grain/constant-naming"
				}),
				{ numRuns: 50 },
			)
		})
	})
})
