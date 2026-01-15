import { Linter } from "eslint"
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
			ecmaVersion: 2022 as const,
			parser: require("@typescript-eslint/parser"),
			parserOptions: {
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

	return linter.verify(code, config)
}

describe("Type Safety Rules", () => {
	describe("no-any", () => {
		it("should allow explicit types", () => {
			const code = "function processData(data: UserData): Result { return transform(data); }"
			const errors = runLint(code, { "grain/no-any": "error" })
			expect(errors).toHaveLength(0)
		})

		it("should allow generic types", () => {
			const code = "function identity<T>(value: T): T { return value; }"
			const errors = runLint(code, { "grain/no-any": "error" })
			expect(errors).toHaveLength(0)
		})

		it("should allow unknown type", () => {
			const code = "function parseJson(json: string): unknown { return JSON.parse(json); }"
			const errors = runLint(code, { "grain/no-any": "error" })
			expect(errors).toHaveLength(0)
		})

		it("should detect any type in function parameters", () => {
			const code = "function processData(data: any): any { return data.something; }"
			const errors = runLint(code, { "grain/no-any": "error" })
			expect(errors.length).toBeGreaterThan(0)
			expect(errors[0].ruleId).toBe("grain/no-any")
		})

		it("should detect any in array type", () => {
			const code = "const items: any[] = [];"
			const errors = runLint(code, { "grain/no-any": "error" })
			expect(errors.length).toBeGreaterThan(0)
			expect(errors[0].ruleId).toBe("grain/no-any")
		})
	})

	describe("no-non-null-assertion", () => {
		it("should allow optional chaining", () => {
			const code = 'const name = user?.name ?? "默认名称";'
			const errors = runLint(code, { "grain/no-non-null-assertion": "error" })
			expect(errors).toHaveLength(0)
		})

		it("should allow type guards", () => {
			const code = `
function processUser(user: User | null) {
  if (user === null) return;
  console.log(user.name);
}
      `
			const errors = runLint(code, { "grain/no-non-null-assertion": "error" })
			expect(errors).toHaveLength(0)
		})

		it("should detect non-null assertion", () => {
			const code = "const name = user!.name;"
			const errors = runLint(code, { "grain/no-non-null-assertion": "error" })
			expect(errors.length).toBeGreaterThan(0)
			expect(errors[0].ruleId).toBe("grain/no-non-null-assertion")
		})

		it("should detect chained non-null assertions", () => {
			const code = "const value = obj!.prop!.value;"
			const errors = runLint(code, { "grain/no-non-null-assertion": "error" })
			expect(errors.length).toBeGreaterThanOrEqual(2)
			expect(errors[0].ruleId).toBe("grain/no-non-null-assertion")
		})
	})

	describe("require-return-type", () => {
		it("should allow functions with return types", () => {
			const code = "function getUserName(user: User): string { return user.name; }"
			const errors = runLint(code, { "grain/require-return-type": "error" })
			expect(errors).toHaveLength(0)
		})

		it("should allow arrow functions with return types", () => {
			const code = "const transform = (data: Data): Result => { return process(data); };"
			const errors = runLint(code, { "grain/require-return-type": "error" })
			expect(errors).toHaveLength(0)
		})

		it("should allow async functions with return types", () => {
			const code = "async function fetchData(): Promise<Data> { return await api.getData(); }"
			const errors = runLint(code, { "grain/require-return-type": "error" })
			expect(errors).toHaveLength(0)
		})

		it("should allow simple arrow functions in callbacks", () => {
			const code = "const result = items.map(x => x * 2);"
			const errors = runLint(code, { "grain/require-return-type": "error" })
			expect(errors).toHaveLength(0)
		})

		it("should detect missing return type in named function", () => {
			const code = "function getUserName(user: User) { return user.name; }"
			const errors = runLint(code, { "grain/require-return-type": "error" })
			expect(errors.length).toBeGreaterThan(0)
			expect(errors[0].ruleId).toBe("grain/require-return-type")
		})

		it("should detect missing return type in exported arrow function", () => {
			const code = "export const transform = (data: Data) => { return process(data); };"
			const errors = runLint(code, { "grain/require-return-type": "error" })
			expect(errors.length).toBeGreaterThan(0)
			expect(errors[0].ruleId).toBe("grain/require-return-type")
		})
	})
})
