import * as parser from "@typescript-eslint/parser"
import { Linter } from "eslint"
import { describe, expect, it } from "vitest"
import plugin from "../index.js"
import { legacyConfig, strictConfig } from "../configs/index.js"
import { runLint } from "./test-utils.js"

describe("ESLint flat-config consumers", () => {
	it.each(["strict", "recommended", "legacy"] as const)(
		"runs the %s preset and keeps dynamic-code execution forbidden",
		(preset) => {
			const config = {
				...plugin.configs[preset],
				files: ["**/*.ts"],
				languageOptions: { parser },
			} as unknown as Linter.Config
			const messages = new Linter().verify("eval('execute');", config, {
				filename: "src/pipes/consumer.pipe.ts",
			})

			expect(messages.filter((message) => message.fatal)).toEqual([])
			expect(messages).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ ruleId: "grain/no-eval", messageId: "noEval", severity: 2 }),
				]),
			)
		},
	)

	it.each([strictConfig, legacyConfig])(
		"accepts a directly imported rule preset with explicit plugin registration",
		(preset) => {
			const config = {
				plugins: { grain: plugin },
				...preset,
				files: ["**/*.ts"],
				languageOptions: { parser },
			} as unknown as Linter.Config
			const messages = new Linter().verify("new Function('execute');", config, {
				filename: "src/pipes/consumer.pipe.ts",
			})

			expect(messages.filter((message) => message.fatal)).toEqual([])
			expect(messages).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						ruleId: "grain/no-eval",
						messageId: "noFunctionConstructor",
						severity: 2,
					}),
				]),
			)
		},
	)

	it.each([
		{ rule: "grain/file-naming", options: "error" },
		{ rule: "grain/file-location", options: "error" },
		{ rule: "grain/max-file-lines", options: ["error", { max: 1 }] as [string, unknown] },
	])("honors a leading disable directive for $rule", ({ rule, options }) => {
		const code = `/* eslint-disable ${rule} */\nexport const value = 1;\n`
		expect(runLint(code, { [rule]: options }, "src/pipes/invalid.ts")).toEqual([])
	})
})
