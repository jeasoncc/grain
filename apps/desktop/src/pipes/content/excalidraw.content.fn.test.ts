/**
 * @file fn/content/excalidraw.content.fn.test.ts
 * @description Excalidraw JSON 内容生成函数的单元测试
 */

import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"
import {
	createDefaultAppState,
	createExcalidrawDocument,
	DEFAULT_HEIGHT,
	DEFAULT_WIDTH,
	EXCALIDRAW_SOURCE,
	EXCALIDRAW_VERSION,
	generateExcalidrawContent,
	isValidExcalidrawContent,
	parseExcalidrawContent,
} from "./excalidraw.content.fn"

describe("excalidraw.content.fn", () => {
	// ==============================
	// Constants Tests
	// ==============================

	describe("constants", () => {
		it("should have correct default dimensions", () => {
			expect(DEFAULT_WIDTH).toBe(1920)
			expect(DEFAULT_HEIGHT).toBe(1080)
		})

		it("should have correct version and source", () => {
			expect(EXCALIDRAW_VERSION).toBe(2)
			expect(EXCALIDRAW_SOURCE).toBe("grain-editor")
		})
	})

	// ==============================
	// createDefaultAppState Tests
	// ==============================

	describe("createDefaultAppState", () => {
		it("should create app state with correct structure", () => {
			const appState = createDefaultAppState()

			expect(appState.viewBackgroundColor).toBe("#ffffff")
			expect(appState.currentItemStrokeColor).toBe("#000000")
			expect(appState.currentItemBackgroundColor).toBe("transparent")
			expect(appState.zoom).toEqual({ value: 1 })
			expect(appState.scrollX).toBe(0)
			expect(appState.scrollY).toBe(0)
		})

		it("should have all required fields", () => {
			const appState = createDefaultAppState()

			expect(appState).toHaveProperty("viewBackgroundColor")
			expect(appState).toHaveProperty("currentItemStrokeColor")
			expect(appState).toHaveProperty("currentItemBackgroundColor")
			expect(appState).toHaveProperty("currentItemFillStyle")
			expect(appState).toHaveProperty("currentItemStrokeWidth")
			expect(appState).toHaveProperty("currentItemStrokeStyle")
			expect(appState).toHaveProperty("currentItemRoughness")
			expect(appState).toHaveProperty("currentItemOpacity")
			expect(appState).toHaveProperty("currentItemFontFamily")
			expect(appState).toHaveProperty("currentItemFontSize")
			expect(appState).toHaveProperty("currentItemTextAlign")
			expect(appState).toHaveProperty("currentItemStartArrowhead")
			expect(appState).toHaveProperty("currentItemEndArrowhead")
			expect(appState).toHaveProperty("scrollX")
			expect(appState).toHaveProperty("scrollY")
			expect(appState).toHaveProperty("zoom")
			expect(appState).toHaveProperty("currentItemRoundness")
			expect(appState).toHaveProperty("gridSize")
			expect(appState).toHaveProperty("colorPalette")
		})
	})

	// ==============================
	// createExcalidrawDocument Tests
	// ==============================

	describe("createExcalidrawDocument", () => {
		it("should create document with correct type and version", () => {
			const doc = createExcalidrawDocument()

			expect(doc.type).toBe("excalidraw")
			expect(doc.version).toBe(EXCALIDRAW_VERSION)
			expect(doc.source).toBe(EXCALIDRAW_SOURCE)
		})

		it("should create document with empty elements by default", () => {
			const doc = createExcalidrawDocument()

			expect(doc.elements).toEqual([])
		})

		it("should create document with empty files by default", () => {
			const doc = createExcalidrawDocument()

			expect(doc.files).toEqual({})
		})

		it("should create document with default appState", () => {
			const doc = createExcalidrawDocument()

			expect(doc.appState).toBeDefined()
			expect(doc.appState.viewBackgroundColor).toBe("#ffffff")
		})

		it("should accept custom elements", () => {
			const elements = [{ id: "test-element" }]
			const doc = createExcalidrawDocument(elements)

			expect(doc.elements).toEqual(elements)
		})

		it("should accept custom appState", () => {
			const customAppState = {
				...createDefaultAppState(),
				viewBackgroundColor: "#000000",
			}
			const doc = createExcalidrawDocument([], customAppState)

			expect(doc.appState.viewBackgroundColor).toBe("#000000")
		})

		it("should accept custom files", () => {
			const files = { "file-1": { data: "test" } }
			const doc = createExcalidrawDocument([], createDefaultAppState(), files)

			expect(doc.files).toEqual(files)
		})
	})

	// ==============================
	// generateExcalidrawContent Tests
	// ==============================

	describe("generateExcalidrawContent", () => {
		it("should generate valid JSON string", () => {
			const content = generateExcalidrawContent()

			expect(() => JSON.parse(content)).not.toThrow()
		})

		it("should generate content with correct type", () => {
			const content = generateExcalidrawContent()
			const parsed = JSON.parse(content)

			expect(parsed.type).toBe("excalidraw")
		})

		it("should generate content with correct version", () => {
			const content = generateExcalidrawContent()
			const parsed = JSON.parse(content)

			expect(parsed.version).toBe(EXCALIDRAW_VERSION)
		})

		it("should generate content with correct source", () => {
			const content = generateExcalidrawContent()
			const parsed = JSON.parse(content)

			expect(parsed.source).toBe(EXCALIDRAW_SOURCE)
		})

		it("should generate content with empty elements array", () => {
			const content = generateExcalidrawContent()
			const parsed = JSON.parse(content)

			expect(parsed.elements).toEqual([])
		})

		it("should generate content with appState object", () => {
			const content = generateExcalidrawContent()
			const parsed = JSON.parse(content)

			expect(parsed.appState).toBeDefined()
			expect(typeof parsed.appState).toBe("object")
		})

		it("should generate content with empty files object", () => {
			const content = generateExcalidrawContent()
			const parsed = JSON.parse(content)

			expect(parsed.files).toEqual({})
		})

		it("should accept custom width parameter", () => {
			const content = generateExcalidrawContent({ width: 2560 })

			// 内容应该仍然有效
			expect(() => JSON.parse(content)).not.toThrow()
		})

		it("should accept custom height parameter", () => {
			const content = generateExcalidrawContent({ height: 1440 })

			// 内容应该仍然有效
			expect(() => JSON.parse(content)).not.toThrow()
		})

		it("should accept both width and height parameters", () => {
			const content = generateExcalidrawContent({ height: 1440, width: 2560 })

			// 内容应该仍然有效
			expect(() => JSON.parse(content)).not.toThrow()
		})

		it("should generate formatted JSON with indentation", () => {
			const content = generateExcalidrawContent()

			// 格式化的 JSON 应该包含换行符
			expect(content).toContain("\n")
		})
	})

	// ==============================
	// parseExcalidrawContent Tests
	// ==============================

	describe("parseExcalidrawContent", () => {
		it("should parse valid Excalidraw JSON", () => {
			const content = generateExcalidrawContent()
			const result = parseExcalidrawContent(content)

			if (E.isRight(result)) {
				expect(result.right.type).toBe("excalidraw")
			} else {
				throw new Error("Failed to parse valid content")
			}
		})

		it("should return Left for invalid JSON", () => {
			const result = parseExcalidrawContent("invalid json")

			expect(E.isLeft(result)).toBe(true)
		})

		it("should return Left for empty string", () => {
			const result = parseExcalidrawContent("")

			expect(E.isLeft(result)).toBe(true)
		})

		it("should return Left for JSON without type field", () => {
			const result = parseExcalidrawContent(
				JSON.stringify({ appState: {}, elements: [], files: {} }),
			)

			expect(E.isLeft(result)).toBe(true)
		})

		it("should return Left for JSON with wrong type", () => {
			const result = parseExcalidrawContent(
				JSON.stringify({
					appState: {},
					elements: [],
					files: {},
					type: "not-excalidraw",
				}),
			)

			expect(E.isLeft(result)).toBe(true)
		})

		it("should return Left for JSON without elements array", () => {
			const result = parseExcalidrawContent(
				JSON.stringify({ appState: {}, files: {}, type: "excalidraw" }),
			)

			expect(E.isLeft(result)).toBe(true)
		})

		it("should return Left for JSON without appState object", () => {
			const result = parseExcalidrawContent(
				JSON.stringify({ elements: [], files: {}, type: "excalidraw" }),
			)

			expect(E.isLeft(result)).toBe(true)
		})

		it("should return Left for JSON without files object", () => {
			const result = parseExcalidrawContent(
				JSON.stringify({ appState: {}, elements: [], type: "excalidraw" }),
			)

			expect(E.isLeft(result)).toBe(true)
		})

		it("should parse content with elements", () => {
			const doc = createExcalidrawDocument([{ id: "test" }])
			const content = JSON.stringify(doc)
			const result = parseExcalidrawContent(content)

			if (E.isRight(result)) {
				expect(result.right.elements).toHaveLength(1)
			} else {
				throw new Error("Failed to parse content with elements")
			}
		})
	})

	// ==============================
	// isValidExcalidrawContent Tests
	// ==============================

	describe("isValidExcalidrawContent", () => {
		it("should return true for valid Excalidraw content", () => {
			const content = generateExcalidrawContent()

			expect(isValidExcalidrawContent(content)).toBe(true)
		})

		it("should return false for invalid JSON", () => {
			expect(isValidExcalidrawContent("invalid")).toBe(false)
		})

		it("should return false for empty string", () => {
			expect(isValidExcalidrawContent("")).toBe(false)
		})

		it("should return false for non-Excalidraw JSON", () => {
			expect(isValidExcalidrawContent('{"foo": "bar"}')).toBe(false)
		})

		it("should return true for manually constructed valid content", () => {
			const validContent = JSON.stringify({
				appState: { viewBackgroundColor: "#fff" },
				elements: [],
				files: {},
				source: "test",
				type: "excalidraw",
				version: 2,
			})

			expect(isValidExcalidrawContent(validContent)).toBe(true)
		})
	})

	// ==============================
	// Integration Tests
	// ==============================

	describe("integration", () => {
		it("should generate content that can be parsed back", () => {
			const content = generateExcalidrawContent()
			const result = parseExcalidrawContent(content)

			if (E.isRight(result)) {
				expect(result.right.type).toBe("excalidraw")
				expect(result.right.elements).toEqual([])
				expect(result.right.files).toEqual({})
			} else {
				throw new Error("Failed to parse generated content")
			}
		})

		it("should generate content that passes validation", () => {
			const content = generateExcalidrawContent()

			expect(isValidExcalidrawContent(content)).toBe(true)
		})

		it("should maintain data integrity through parse cycle", () => {
			const original = generateExcalidrawContent()
			const result1 = parseExcalidrawContent(original)
			
			if (E.isLeft(result1)) {
				throw new Error("Failed to parse original content")
			}
			
			const reparsed = JSON.stringify(result1.right, null, 2)
			const result2 = parseExcalidrawContent(reparsed)

			if (E.isLeft(result2)) {
				throw new Error("Failed to parse reparsed content")
			}

			expect(result2.right.type).toBe(result1.right.type)
			expect(result2.right.version).toBe(result1.right.version)
			expect(result2.right.source).toBe(result1.right.source)
		})
	})
})
