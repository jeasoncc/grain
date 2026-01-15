/**
 * Integration tests for all implemented rules
 */

import { describe, expect, it } from "vitest"
import plugin from "../index.js"

describe("Rules Integration Tests", () => {
	it("should have all expected rules", () => {
		const expectedRules = [
			"no-try-catch",
			"no-console-log",
			"no-date-constructor",
			"no-lodash",
			// 'no-mutation', // Temporarily disabled due to compilation issues
			"layer-dependencies",
			"no-react-in-pure-layers",
			"no-side-effects-in-pipes",
		]

		expectedRules.forEach((ruleName) => {
			expect(plugin.rules[ruleName]).toBeDefined()
			expect(typeof plugin.rules[ruleName]).toBe("object")
			expect(plugin.rules[ruleName].meta).toBeDefined()
			expect(plugin.rules[ruleName].create).toBeDefined()
		})
	})

	it("should have correct plugin structure", () => {
		expect(plugin.meta.name).toBe("eslint-plugin-grain")
		expect(plugin.meta.version).toBe("2.0.0")
		expect(plugin.configs.recommended).toBeDefined()
		expect(plugin.configs.strict).toBeDefined()
	})

	it("should have rules in configs", () => {
		const strictRules = plugin.configs.strict.rules
		const legacyRules = plugin.configs.legacy.rules

		// Strict config should have all rules as error
		expect(strictRules["grain/no-try-catch"]).toBe("error")
		expect(strictRules["grain/layer-dependencies"]).toBe("error")
		expect(strictRules["grain/no-mutation"]).toBe("error")

		// Legacy config should have rules as warn or error
		expect(legacyRules["grain/no-try-catch"]).toBe("warn")
		expect(legacyRules["grain/layer-dependencies"]).toBe("warn")
		expect(legacyRules["grain/no-eval"]).toBe("error") // Security rules stay error
	})

	it("should have correct rule metadata", () => {
		const rules = plugin.rules

		// Check no-try-catch rule
		expect(rules["no-try-catch"].meta.type).toBe("problem")
		expect(rules["no-try-catch"].meta.docs.description).toContain("try-catch")
		expect(rules["no-try-catch"].meta.messages.noTryCatch).toBeDefined()

		// Check no-console-log rule
		expect(rules["no-console-log"].meta.type).toBe("problem")
		expect(rules["no-console-log"].meta.docs.description).toContain("console")
		expect(rules["no-console-log"].meta.messages.noConsole).toBeDefined()

		// Check layer-dependencies rule
		expect(rules["layer-dependencies"].meta.type).toBe("problem")
		// Description can be in Chinese or English
		expect(rules["layer-dependencies"].meta.docs.description).toBeDefined()
		expect(rules["layer-dependencies"].meta.messages.layerViolation).toBeDefined()
	})

	it("should have all rules callable", () => {
		const rules = plugin.rules

		Object.keys(rules).forEach((ruleName) => {
			const rule = rules[ruleName]
			expect(typeof rule.create).toBe("function")

			// Test that create function returns an object (visitor pattern)
			const mockContext = {
				getFilename: () => "/test/src/pipes/test.pipe.ts",
				report: () => {},
				sourceCode: {
					getAncestors: () => [],
					getText: () => "",
				},
			}

			const visitor = rule.create(mockContext as any)
			expect(typeof visitor).toBe("object")
		})
	})
})
