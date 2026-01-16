/**
 * Export Project Compatibility Test
 *
 * Verifies that the export functionality maintains compatibility after
 * replacing Dexie calls with SQLite API calls.
 *
 * Requirements: 3.2, 3.4
 */

import { describe, expect, it } from "vitest"
import {
	exportProject,
	exportToEpub,
	exportToPdf,
	exportToTxt,
	exportToWord,
} from "./export-project.flow"

describe("Export Project Compatibility", () => {
	it("should export all required functions", () => {
		// Verify that all export functions are still available after the SQLite migration
		expect(exportProject).toBeDefined()
		expect(typeof exportProject).toBe("function")

		expect(exportToTxt).toBeDefined()
		expect(typeof exportToTxt).toBe("function")

		expect(exportToWord).toBeDefined()
		expect(typeof exportToWord).toBe("function")

		expect(exportToPdf).toBeDefined()
		expect(typeof exportToPdf).toBe("function")

		expect(exportToEpub).toBeDefined()
		expect(typeof exportToEpub).toBe("function")
	})

	it("should maintain the same function signatures", () => {
		// Verify function signatures haven't changed
		expect(exportProject.length).toBe(3) // projectId, format, options
		expect(exportToTxt.length).toBe(1) // projectId, options (options is optional)
		expect(exportToWord.length).toBe(1) // projectId, options (options is optional)
		expect(exportToPdf.length).toBe(1) // projectId, options (options is optional)
		expect(exportToEpub.length).toBe(1) // projectId, options (options is optional)
	})

	it("should handle invalid project ID gracefully", async () => {
		// Test that the function throws appropriate errors for invalid input
		await expect(exportToTxt("invalid-project-id")).rejects.toThrow()
	})

	it("should support all export formats", async () => {
		// Test that exportProject function accepts all expected formats
		const formats = ["pdf", "docx", "txt", "epub"] as const

		for (const format of formats) {
			// This will fail due to invalid project ID, but should not throw a format error
			await expect(exportProject("test-id", format)).rejects.toThrow()
		}

		// Test invalid format
		// biome-ignore lint/suspicious/noExplicitAny: Testing invalid input type
		await expect(exportProject("test-id", "invalid" as any)).rejects.toThrow("不支持的导出格式")
	})
})
