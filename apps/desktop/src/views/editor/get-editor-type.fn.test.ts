/**
 * @file get-editor-type.fn.test.ts
 * @description 编辑器类型判断纯函数测试
 *
 * Grain 统一使用 Lexical 编辑器处理所有文本文件。
 * 只有 .excalidraw 文件使用 Excalidraw 绘图编辑器。
 *
 * 包含单元测试和属性测试（Property-Based Testing）
 * 使用 fast-check 进行属性测试
 *
 * @requirements 2.2, 2.3, 2.4, 2.5, 2.6
 */

import * as fc from "fast-check"
import { describe, expect, it } from "vitest"
import { EXTENSION_TO_EDITOR_MAP, FILE_EXTENSIONS } from "./editor-extension.const"
import {
	getEditorTypeByFilename,
	getFileExtension,
	isDiagramFile,
	isExcalidrawFile,
	isGrainFile,
	isLexicalFile,
} from "./get-editor-type.fn"

// ============================================================================
// Unit Tests - getFileExtension
// ============================================================================

describe("getFileExtension", () => {
	it("should extract extension from filename", () => {
		expect(getFileExtension("test.js")).toBe(".js")
		expect(getFileExtension("test.ts")).toBe(".ts")
		expect(getFileExtension("test.grain")).toBe(".grain")
	})

	it("should handle multiple dots in filename", () => {
		expect(getFileExtension("test.spec.ts")).toBe(".ts")
		expect(getFileExtension("my.file.name.json")).toBe(".json")
	})

	it("should return empty string for files without extension", () => {
		expect(getFileExtension("README")).toBe("")
		expect(getFileExtension("Makefile")).toBe("")
	})

	it("should return empty string for dotfiles", () => {
		expect(getFileExtension(".gitignore")).toBe("")
		expect(getFileExtension(".env")).toBe("")
	})

	it("should convert extension to lowercase", () => {
		expect(getFileExtension("test.JS")).toBe(".js")
		expect(getFileExtension("test.GRAIN")).toBe(".grain")
		expect(getFileExtension("test.Ts")).toBe(".ts")
	})
})

// ============================================================================
// Unit Tests - getEditorTypeByFilename
// ============================================================================

describe("getEditorTypeByFilename", () => {
	describe("lexical editor (all text files)", () => {
		it("should return lexical for .grain files", () => {
			expect(getEditorTypeByFilename("diary-123.grain")).toBe("lexical")
			expect(getEditorTypeByFilename("wiki-456.grain")).toBe("lexical")
			expect(getEditorTypeByFilename("note.grain")).toBe("lexical")
		})

		it("should return lexical for .mermaid files", () => {
			expect(getEditorTypeByFilename("flowchart.mermaid")).toBe("lexical")
			expect(getEditorTypeByFilename("sequence.mermaid")).toBe("lexical")
		})

		it("should return lexical for .plantuml files", () => {
			expect(getEditorTypeByFilename("class.plantuml")).toBe("lexical")
			expect(getEditorTypeByFilename("activity.plantuml")).toBe("lexical")
		})

		it("should return lexical for JavaScript files", () => {
			expect(getEditorTypeByFilename("script.js")).toBe("lexical")
			expect(getEditorTypeByFilename("app.jsx")).toBe("lexical")
		})

		it("should return lexical for TypeScript files", () => {
			expect(getEditorTypeByFilename("main.ts")).toBe("lexical")
			expect(getEditorTypeByFilename("component.tsx")).toBe("lexical")
		})

		it("should return lexical for other text files", () => {
			expect(getEditorTypeByFilename("data.json")).toBe("lexical")
			expect(getEditorTypeByFilename("readme.md")).toBe("lexical")
			expect(getEditorTypeByFilename("index.html")).toBe("lexical")
			expect(getEditorTypeByFilename("styles.css")).toBe("lexical")
			expect(getEditorTypeByFilename("query.sql")).toBe("lexical")
			expect(getEditorTypeByFilename("script.sh")).toBe("lexical")
			expect(getEditorTypeByFilename("config.yaml")).toBe("lexical")
			expect(getEditorTypeByFilename("config.yml")).toBe("lexical")
			expect(getEditorTypeByFilename("main.py")).toBe("lexical")
		})
	})

	describe("excalidraw editor (.excalidraw)", () => {
		it("should return excalidraw for .excalidraw files", () => {
			expect(getEditorTypeByFilename("drawing.excalidraw")).toBe("excalidraw")
			expect(getEditorTypeByFilename("sketch-123.excalidraw")).toBe("excalidraw")
		})
	})

	describe("fallback to lexical editor", () => {
		it("should return lexical for unknown extensions", () => {
			expect(getEditorTypeByFilename("file.xyz")).toBe("lexical")
			expect(getEditorTypeByFilename("file.unknown")).toBe("lexical")
		})

		it("should return lexical for files without extension", () => {
			expect(getEditorTypeByFilename("README")).toBe("lexical")
			expect(getEditorTypeByFilename("Makefile")).toBe("lexical")
		})

		it("should return lexical for dotfiles", () => {
			expect(getEditorTypeByFilename(".gitignore")).toBe("lexical")
			expect(getEditorTypeByFilename(".env")).toBe("lexical")
		})
	})

	describe("case insensitivity", () => {
		it("should handle uppercase extensions", () => {
			expect(getEditorTypeByFilename("file.GRAIN")).toBe("lexical")
			expect(getEditorTypeByFilename("file.EXCALIDRAW")).toBe("excalidraw")
			expect(getEditorTypeByFilename("file.MERMAID")).toBe("lexical")
			expect(getEditorTypeByFilename("file.JS")).toBe("lexical")
		})

		it("should handle mixed case extensions", () => {
			expect(getEditorTypeByFilename("file.Grain")).toBe("lexical")
			expect(getEditorTypeByFilename("file.ExcaliDraw")).toBe("excalidraw")
		})
	})
})

// ============================================================================
// Unit Tests - Helper Functions
// ============================================================================

describe("isGrainFile", () => {
	it("should return true for .grain files", () => {
		expect(isGrainFile("diary.grain")).toBe(true)
		expect(isGrainFile("wiki.grain")).toBe(true)
	})

	it("should return false for non-.grain files", () => {
		expect(isGrainFile("script.js")).toBe(false)
		expect(isGrainFile("drawing.excalidraw")).toBe(false)
	})
})

describe("isExcalidrawFile", () => {
	it("should return true for .excalidraw files", () => {
		expect(isExcalidrawFile("drawing.excalidraw")).toBe(true)
	})

	it("should return false for non-.excalidraw files", () => {
		expect(isExcalidrawFile("script.js")).toBe(false)
		expect(isExcalidrawFile("diary.grain")).toBe(false)
	})
})

describe("isDiagramFile", () => {
	it("should return true for .mermaid files", () => {
		expect(isDiagramFile("flowchart.mermaid")).toBe(true)
	})

	it("should return true for .plantuml files", () => {
		expect(isDiagramFile("class.plantuml")).toBe(true)
	})

	it("should return false for non-diagram files", () => {
		expect(isDiagramFile("script.js")).toBe(false)
		expect(isDiagramFile("diary.grain")).toBe(false)
	})
})

describe("isLexicalFile", () => {
	it("should return true for all text files", () => {
		expect(isLexicalFile("diary.grain")).toBe(true)
		expect(isLexicalFile("script.js")).toBe(true)
		expect(isLexicalFile("main.ts")).toBe(true)
		expect(isLexicalFile("data.json")).toBe(true)
		expect(isLexicalFile("flowchart.mermaid")).toBe(true)
	})

	it("should return false for excalidraw files", () => {
		expect(isLexicalFile("drawing.excalidraw")).toBe(false)
	})
})

// ============================================================================
// Property-Based Tests - Lexical Unified Editor
// ============================================================================

describe("Property-Based Tests - Lexical Unified Editor", () => {
	/**
	 * **Feature: lexical-unified-editor, Property 1: Editor Type Selection Correctness**
	 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
	 *
	 * *For any* filename with extension, `getEditorTypeByFilename` SHALL return
	 * `"excalidraw"` if and only if the extension is `.excalidraw`,
	 * otherwise it SHALL return `"lexical"`.
	 *
	 * This property ensures:
	 * - Req 1.1: Desktop_App uses Lexical_Editor for all text file types
	 * - Req 1.2: Desktop_App uses Excalidraw_Editor only for .excalidraw files
	 * - Req 1.3: New files from ActivityBar open with Lexical_Editor (except .excalidraw)
	 * - Req 1.4: Any text file renders using MultiEditorContainer with Lexical_Editor
	 */
	describe("Property 1: Editor Type Selection Correctness", () => {
		it("should return excalidraw if and only if extension is .excalidraw", () => {
			fc.assert(
				fc.property(
					// 生成随机文件名前缀（非空，只包含有效字符）
					fc
						.string({ maxLength: 50, minLength: 1 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					// 生成随机扩展名（包括 .excalidraw 和其他扩展名）
					fc.oneof(
						// 50% 概率生成 .excalidraw
						fc.constant(".excalidraw"),
						// 50% 概率生成其他扩展名
						fc
							.string({ maxLength: 15, minLength: 1 })
							.filter((s) => /^[a-z]+$/.test(s) && s !== "excalidraw")
							.map((s) => `.${s}`),
					),
					(prefix, extension) => {
						const filename = `${prefix}${extension}`
						const result = getEditorTypeByFilename(filename)

						// 核心属性：excalidraw 当且仅当扩展名是 .excalidraw
						const isExcalidrawExtension = extension.toLowerCase() === ".excalidraw"
						const isExcalidrawResult = result === "excalidraw"

						// 双向蕴含：isExcalidrawExtension ⟺ isExcalidrawResult
						return isExcalidrawExtension === isExcalidrawResult
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should return lexical for all non-excalidraw files", () => {
			// 所有已知的非 excalidraw 扩展名
			const nonExcalidrawExtensions = Object.entries(EXTENSION_TO_EDITOR_MAP)
				.filter(([_, type]) => type === "lexical")
				.map(([ext]) => ext)

			fc.assert(
				fc.property(
					fc.string({ maxLength: 50, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					fc.constantFrom(...nonExcalidrawExtensions),
					(prefix, extension) => {
						const filename = `${prefix}${extension}`
						return getEditorTypeByFilename(filename) === "lexical"
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should return excalidraw only for .excalidraw files regardless of prefix", () => {
			fc.assert(
				fc.property(
					// 生成各种可能的文件名前缀
					fc.oneof(
						fc.string({ maxLength: 50, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
						fc.constant("drawing"),
						fc.constant("sketch"),
						fc.constant("diagram"),
						fc.constant("whiteboard"),
					),
					(prefix) => {
						const filename = `${prefix}.excalidraw`
						return getEditorTypeByFilename(filename) === "excalidraw"
					},
				),
				{ numRuns: 100 },
			)
		})
	})
})

// ============================================================================
// Property-Based Tests - File Extension System
// ============================================================================

describe("Property-Based Tests - File Extension System", () => {
	/**
	 * **Feature: file-extension-system, Property 1: Extension to Editor Type Mapping**
	 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
	 *
	 * *For any* filename with a known extension, `getEditorTypeByFilename` SHALL return
	 * the correct editor type: `.excalidraw` → "excalidraw", all others → "lexical".
	 */
	describe("Property 1: Extension to Editor Type Mapping", () => {
		// 定义已知扩展名及其预期编辑器类型
		const knownExtensions = Object.entries(EXTENSION_TO_EDITOR_MAP)

		it("should map all known extensions to correct editor types", () => {
			fc.assert(
				fc.property(
					// 生成随机文件名前缀
					fc
						.string({ maxLength: 20, minLength: 1 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes(".")),
					// 从已知扩展名中随机选择
					fc.constantFrom(...knownExtensions),
					(prefix, [extension, expectedEditorType]) => {
						const filename = `${prefix}${extension}`
						const result = getEditorTypeByFilename(filename)
						return result === expectedEditorType
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should return lexical for any .grain filename", () => {
			fc.assert(
				fc.property(
					fc.string({ maxLength: 50, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.grain`
						return getEditorTypeByFilename(filename) === "lexical"
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should return excalidraw for any .excalidraw filename", () => {
			fc.assert(
				fc.property(
					fc.string({ maxLength: 50, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.excalidraw`
						return getEditorTypeByFilename(filename) === "excalidraw"
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should return lexical for any .mermaid or .plantuml filename", () => {
			fc.assert(
				fc.property(
					fc.string({ maxLength: 50, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					fc.constantFrom(".mermaid", ".plantuml"),
					(prefix, extension) => {
						const filename = `${prefix}${extension}`
						return getEditorTypeByFilename(filename) === "lexical"
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should return lexical for any known code extension filename", () => {
			const codeExtensions = [
				FILE_EXTENSIONS.JS,
				FILE_EXTENSIONS.TS,
				FILE_EXTENSIONS.JSX,
				FILE_EXTENSIONS.TSX,
				FILE_EXTENSIONS.JSON,
				FILE_EXTENSIONS.MD,
				FILE_EXTENSIONS.HTML,
				FILE_EXTENSIONS.CSS,
				FILE_EXTENSIONS.SQL,
				FILE_EXTENSIONS.SH,
				FILE_EXTENSIONS.YAML,
				FILE_EXTENSIONS.YML,
				FILE_EXTENSIONS.PY,
			]

			fc.assert(
				fc.property(
					fc.string({ maxLength: 50, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					fc.constantFrom(...codeExtensions),
					(prefix, extension) => {
						const filename = `${prefix}${extension}`
						return getEditorTypeByFilename(filename) === "lexical"
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	/**
	 * **Feature: file-extension-system, Property 2: Unknown Extension Fallback**
	 * **Validates: Requirements 2.6**
	 *
	 * *For any* filename with an unknown or missing extension, `getEditorTypeByFilename`
	 * SHALL return "lexical" as the fallback editor type.
	 */
	describe("Property 2: Unknown Extension Fallback", () => {
		// 定义已知扩展名集合
		const knownExtensions = new Set(Object.keys(EXTENSION_TO_EDITOR_MAP))

		it("should return lexical for any unknown extension", () => {
			fc.assert(
				fc.property(
					fc.string({ maxLength: 50, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					// 生成不在已知扩展名列表中的扩展名
					fc
						.string({ maxLength: 10, minLength: 2 })
						.filter((s) => /^[a-z]+$/.test(s) && !knownExtensions.has(`.${s.toLowerCase()}`)),
					(prefix, unknownExt) => {
						const filename = `${prefix}.${unknownExt}`
						return getEditorTypeByFilename(filename) === "lexical"
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should return lexical for files without extension", () => {
			fc.assert(
				fc.property(
					// 生成不包含点号的文件名
					fc
						.string({ maxLength: 50, minLength: 1 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes(".")),
					(filename) => {
						return getEditorTypeByFilename(filename) === "lexical"
					},
				),
				{ numRuns: 100 },
			)
		})

		it("should return lexical for dotfiles (files starting with dot)", () => {
			fc.assert(
				fc.property(
					// 生成 dotfile 名称（以点开头，后面没有其他点）
					fc
						.string({ maxLength: 20, minLength: 1 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes(".")),
					(name) => {
						const filename = `.${name}`
						return getEditorTypeByFilename(filename) === "lexical"
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	/**
	 * **Feature: file-extension-system, Property: Case Insensitivity**
	 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
	 *
	 * *For any* filename, the editor type should be the same regardless of
	 * the case of the extension.
	 */
	describe("Property: Case Insensitivity", () => {
		it("should return same editor type regardless of extension case", () => {
			const knownExtensions = Object.keys(EXTENSION_TO_EDITOR_MAP)

			fc.assert(
				fc.property(
					fc.string({ maxLength: 20, minLength: 1 }).filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					fc.constantFrom(...knownExtensions),
					(prefix, extension) => {
						// 移除开头的点号
						const extWithoutDot = extension.slice(1)

						// 生成不同大小写的扩展名
						const lowerFilename = `${prefix}.${extWithoutDot.toLowerCase()}`
						const upperFilename = `${prefix}.${extWithoutDot.toUpperCase()}`

						const lowerResult = getEditorTypeByFilename(lowerFilename)
						const upperResult = getEditorTypeByFilename(upperFilename)

						return lowerResult === upperResult
					},
				),
				{ numRuns: 100 },
			)
		})
	})

	/**
	 * **Feature: file-extension-system, Property: Editor Type Validity**
	 * **Validates: Requirements 2.1**
	 *
	 * *For any* filename, `getEditorTypeByFilename` SHALL always return
	 * a valid EditorType value ("lexical" or "excalidraw").
	 */
	describe("Property: Editor Type Validity", () => {
		const validEditorTypes = ["lexical", "excalidraw"]

		it("should always return a valid editor type", () => {
			fc.assert(
				fc.property(
					// 生成任意文件名
					fc.string({ maxLength: 100, minLength: 0 }),
					(filename) => {
						const result = getEditorTypeByFilename(filename)
						return validEditorTypes.includes(result)
					},
				),
				{ numRuns: 100 },
			)
		})
	})
})
