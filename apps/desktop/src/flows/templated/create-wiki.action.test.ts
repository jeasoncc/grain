/**
 * @file create-wiki.action.test.ts
 * @description Wiki 条目创建 Action 测试
 */

import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { type WikiTemplateParams, wikiConfig } from "./configs/wiki.config"
import { createWiki, createWikiAsync } from "./create-date-template.flow"
import type { TemplatedFileParams } from "./create-templated-file.flow"

vi.mock("@/io/log/logger.api", () => ({
	info: vi.fn(),
	success: vi.fn(),
}))

describe("createWiki", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("wikiConfig", () => {
		it("应该有正确的配置", () => {
			expect(wikiConfig.name).toBe("Wiki")
			expect(wikiConfig.rootFolder).toBe("Wiki")
			expect(wikiConfig.fileType).toBe("wiki")
			expect(wikiConfig.tag).toBe("wiki")
			expect(wikiConfig.foldersCollapsed).toBe(true)
		})

		it("generateTemplate 应该生成有效的 JSON", () => {
			const content = wikiConfig.generateTemplate({
				date: dayjs("2024-12-25").toDate(),
			})
			expect(() => JSON.parse(content)).not.toThrow()
		})

		it("generateFolderPath 应该生成年/月/日三级路径", () => {
			const path = wikiConfig.generateFolderPath({
				date: dayjs("2024-12-25").toDate(),
			})
			expect(path).toHaveLength(3)
			expect(path[0]).toMatch(/^year-2024/)
			expect(path[1]).toMatch(/^month-12/)
			expect(path[2]).toMatch(/^day-25/)
		})

		it("generateTitle 应该生成正确的标题", () => {
			const title = wikiConfig.generateTitle({
				date: dayjs("2024-12-25T14:30:00").toDate(),
			})
			expect(title).toMatch(/^wiki-/)
		})
	})

	describe("TaskEither 版本", () => {
		it("应该在工作区 ID 无效时返回错误", async () => {
			const params: TemplatedFileParams<WikiTemplateParams> = {
				templateParams: {
					date: dayjs("2024-12-25T00:00:00.000Z").toDate(),
				},
				workspaceId: "",
			}

			const result = await createWiki(params)()

			expect(E.isLeft(result)).toBe(true)
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR")
				expect(result.left.message).toContain("参数校验失败")
			}
		})
	})

	describe("Promise 版本", () => {
		it("应该在参数无效时抛出错误", async () => {
			const params: TemplatedFileParams<WikiTemplateParams> = {
				templateParams: {
					date: dayjs("2024-12-25T00:00:00.000Z").toDate(),
				},
				workspaceId: "",
			}

			await expect(createWikiAsync(params)).rejects.toThrow("参数校验失败")
		})
	})
})
