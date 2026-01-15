/**
 * @file fn/content/content.template.fn.test.ts
 * @description 内容模板函数的单元测试
 */

import { describe, expect, it } from "vitest"
import {
	buildFileCreationParams,
	createCustomTemplate,
	DIARY_TEMPLATE,
	generateFilename,
	generateFileStructure,
	generateFileStructureByType,
	getAvailableTemplateTypes,
	getTemplateConfig,
	isValidTemplateType,
	LEDGER_TEMPLATE,
	TEMPLATE_CONFIGS,
	TODO_TEMPLATE,
	WIKI_TEMPLATE,
} from "./content.template.fn"

describe("content.template.fn", () => {
	// ==============================
	// Template Configuration Tests
	// ==============================

	describe("getTemplateConfig", () => {
		it("should return diary template config", () => {
			const config = getTemplateConfig("diary")
			expect(config).toEqual(DIARY_TEMPLATE)
			expect(config.rootFolder).toBe("Diary")
			expect(config.filePrefix).toBe("diary")
			expect(config.nodeType).toBe("diary")
		})

		it("should return todo template config", () => {
			const config = getTemplateConfig("todo")
			expect(config).toEqual(TODO_TEMPLATE)
			expect(config.rootFolder).toBe("Todo")
			expect(config.filePrefix).toBe("todo")
		})

		it("should return ledger template config", () => {
			const config = getTemplateConfig("ledger")
			expect(config).toEqual(LEDGER_TEMPLATE)
			expect(config.rootFolder).toBe("Ledger")
			expect(config.filePrefix).toBe("ledger")
		})

		it("should return wiki template config", () => {
			const config = getTemplateConfig("wiki")
			expect(config).toEqual(WIKI_TEMPLATE)
			expect(config.rootFolder).toBe("Wiki")
			expect(config.filePrefix).toBe("wiki")
		})
	})

	describe("isValidTemplateType", () => {
		it("should return true for valid template types", () => {
			expect(isValidTemplateType("diary")).toBe(true)
			expect(isValidTemplateType("todo")).toBe(true)
			expect(isValidTemplateType("ledger")).toBe(true)
			expect(isValidTemplateType("wiki")).toBe(true)
		})

		it("should return false for invalid template types", () => {
			expect(isValidTemplateType("invalid")).toBe(false)
			expect(isValidTemplateType("")).toBe(false)
			expect(isValidTemplateType("DIARY")).toBe(false)
		})
	})

	describe("getAvailableTemplateTypes", () => {
		it("should return all four template types", () => {
			const types = getAvailableTemplateTypes()
			expect(types).toHaveLength(4)
			expect(types).toContain("diary")
			expect(types).toContain("todo")
			expect(types).toContain("ledger")
			expect(types).toContain("wiki")
		})
	})

	// ==============================
	// Filename Generation Tests
	// ==============================

	describe("generateFilename", () => {
		it("should generate filename with prefix and timestamp", () => {
			const date = new Date("2024-12-20T14:30:45.000Z")
			const filename = generateFilename("diary", date)

			expect(filename).toMatch(/^diary-\d+-\d{2}-\d{2}-\d{2}$/)
			expect(filename).toContain("diary-")
		})

		it("should use different prefixes correctly", () => {
			const date = new Date("2024-12-20T10:00:00.000Z")

			expect(generateFilename("todo", date)).toMatch(/^todo-/)
			expect(generateFilename("ledger", date)).toMatch(/^ledger-/)
			expect(generateFilename("wiki", date)).toMatch(/^wiki-/)
		})

		it("should generate unique filenames for different times", () => {
			const date1 = new Date("2024-12-20T10:00:00.000Z")
			const date2 = new Date("2024-12-20T10:00:01.000Z")

			const filename1 = generateFilename("diary", date1)
			const filename2 = generateFilename("diary", date2)

			expect(filename1).not.toBe(filename2)
		})
	})

	// ==============================
	// File Structure Generation Tests
	// ==============================

	describe("generateFileStructure", () => {
		it("should generate correct folder structure for diary", () => {
			const date = new Date("2024-12-20T14:30:00.000Z")
			const structure = generateFileStructure(DIARY_TEMPLATE, date)

			expect(structure.rootFolder).toBe("Diary")
			expect(structure.yearFolder).toBe("year-2024-Dragon")
			expect(structure.monthFolder).toBe("month-12-December")
			expect(structure.dayFolder).toMatch(/^day-20-/)
			expect(structure.filename).toMatch(/^diary-/)
			expect(structure.folderPath).toHaveLength(4)
			expect(structure.folderPath[0]).toBe("Diary")
		})

		it("should generate correct folder path array", () => {
			const date = new Date("2024-06-15T10:00:00.000Z")
			const structure = generateFileStructure(TODO_TEMPLATE, date)

			expect(structure.folderPath).toEqual([
				"Todo",
				"year-2024-Dragon",
				"month-06-June",
				expect.stringMatching(/^day-15-/),
			])
		})

		it("should generate correct full path", () => {
			const date = new Date("2024-12-20T14:30:00.000Z")
			const structure = generateFileStructure(WIKI_TEMPLATE, date)

			expect(structure.fullPath).toMatch(
				/^Wiki\/year-2024-Dragon\/month-12-December\/day-20-\w+\/wiki-\d+-\d{2}-\d{2}-\d{2}$/,
			)
		})
	})

	describe("generateFileStructureByType", () => {
		it("should generate structure for each template type", () => {
			const date = new Date("2024-12-20T14:30:00.000Z")

			const diaryStructure = generateFileStructureByType("diary", date)
			expect(diaryStructure.rootFolder).toBe("Diary")

			const todoStructure = generateFileStructureByType("todo", date)
			expect(todoStructure.rootFolder).toBe("Todo")

			const ledgerStructure = generateFileStructureByType("ledger", date)
			expect(ledgerStructure.rootFolder).toBe("Ledger")

			const wikiStructure = generateFileStructureByType("wiki", date)
			expect(wikiStructure.rootFolder).toBe("Wiki")
		})
	})

	// ==============================
	// Custom Template Tests
	// ==============================

	describe("createCustomTemplate", () => {
		it("should create custom template with overrides", () => {
			const custom = createCustomTemplate("diary", {
				defaultTags: ["personal", "journal"],
				rootFolder: "MyDiary",
			})

			expect(custom.rootFolder).toBe("MyDiary")
			expect(custom.defaultTags).toEqual(["personal", "journal"])
			expect(custom.filePrefix).toBe("diary") // 保留原值
			expect(custom.type).toBe("diary") // 保留原值
		})

		it("should preserve base config values when not overridden", () => {
			const custom = createCustomTemplate("todo", {
				headingLevel: "h1",
			})

			expect(custom.rootFolder).toBe("Todo")
			expect(custom.filePrefix).toBe("todo")
			expect(custom.defaultTags).toEqual(["todo", "tasks"])
			expect(custom.headingLevel).toBe("h1")
		})
	})

	// ==============================
	// File Creation Params Tests
	// ==============================

	describe("buildFileCreationParams", () => {
		it("should build complete file creation params", () => {
			const date = new Date("2024-12-20T14:30:00.000Z")
			const content = '{"root":{}}'
			const params = buildFileCreationParams("workspace-123", "diary", content, date)

			expect(params.workspaceId).toBe("workspace-123")
			expect(params.content).toBe(content)
			expect(params.config).toEqual(DIARY_TEMPLATE)
			expect(params.structure.rootFolder).toBe("Diary")
		})

		it("should use current date when not provided", () => {
			const content = '{"root":{}}'
			const params = buildFileCreationParams("workspace-123", "todo", content)

			expect(params.structure).toBeDefined()
			expect(params.structure.filename).toMatch(/^todo-/)
		})
	})

	// ==============================
	// Template Config Completeness Tests
	// ==============================

	describe("TEMPLATE_CONFIGS", () => {
		it("should have all required fields for each template", () => {
			for (const [type, config] of Object.entries(TEMPLATE_CONFIGS)) {
				expect(config.type).toBe(type)
				expect(config.rootFolder).toBeTruthy()
				expect(config.filePrefix).toBeTruthy()
				expect(config.defaultTags).toBeInstanceOf(Array)
				expect(config.defaultTags.length).toBeGreaterThan(0)
				expect(["h1", "h2", "h3"]).toContain(config.headingLevel)
				expect(typeof config.includeEmptyLines).toBe("boolean")
				expect(["file", "diary", "canvas"]).toContain(config.nodeType)
			}
		})
	})
})
