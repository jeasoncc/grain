/**
 * @file get-editor-type.fn.test.ts
 * @description 编辑器类型判断纯函数测试
 *
 * 包含单元测试和属性测试（Property-Based Testing）
 * 使用 fast-check 进行属性测试
 *
 * @requirements 2.2, 2.3, 2.4, 2.5, 2.6
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	EXTENSION_TO_EDITOR_MAP,
	FILE_EXTENSIONS,
} from "./editor-extension.const";
import {
	getEditorTypeByFilename,
	getFileExtension,
	isCodeFile,
	isDiagramFile,
	isExcalidrawFile,
	isGrainFile,
} from "./get-editor-type.fn";

// ============================================================================
// Unit Tests - getFileExtension
// ============================================================================

describe("getFileExtension", () => {
	it("should extract extension from filename", () => {
		expect(getFileExtension("test.js")).toBe(".js");
		expect(getFileExtension("test.ts")).toBe(".ts");
		expect(getFileExtension("test.grain")).toBe(".grain");
	});

	it("should handle multiple dots in filename", () => {
		expect(getFileExtension("test.spec.ts")).toBe(".ts");
		expect(getFileExtension("my.file.name.json")).toBe(".json");
	});

	it("should return empty string for files without extension", () => {
		expect(getFileExtension("README")).toBe("");
		expect(getFileExtension("Makefile")).toBe("");
	});

	it("should return empty string for dotfiles", () => {
		expect(getFileExtension(".gitignore")).toBe("");
		expect(getFileExtension(".env")).toBe("");
	});

	it("should convert extension to lowercase", () => {
		expect(getFileExtension("test.JS")).toBe(".js");
		expect(getFileExtension("test.GRAIN")).toBe(".grain");
		expect(getFileExtension("test.Ts")).toBe(".ts");
	});
});

// ============================================================================
// Unit Tests - getEditorTypeByFilename
// ============================================================================

describe("getEditorTypeByFilename", () => {
	describe("lexical editor (.grain)", () => {
		it("should return lexical for .grain files", () => {
			expect(getEditorTypeByFilename("diary-123.grain")).toBe("lexical");
			expect(getEditorTypeByFilename("wiki-456.grain")).toBe("lexical");
			expect(getEditorTypeByFilename("note.grain")).toBe("lexical");
		});
	});

	describe("excalidraw editor (.excalidraw)", () => {
		it("should return excalidraw for .excalidraw files", () => {
			expect(getEditorTypeByFilename("drawing.excalidraw")).toBe("excalidraw");
			expect(getEditorTypeByFilename("sketch-123.excalidraw")).toBe(
				"excalidraw",
			);
		});
	});

	describe("diagram editor (.mermaid, .plantuml)", () => {
		it("should return diagram for .mermaid files", () => {
			expect(getEditorTypeByFilename("flowchart.mermaid")).toBe("diagram");
			expect(getEditorTypeByFilename("sequence.mermaid")).toBe("diagram");
		});

		it("should return diagram for .plantuml files", () => {
			expect(getEditorTypeByFilename("class.plantuml")).toBe("diagram");
			expect(getEditorTypeByFilename("activity.plantuml")).toBe("diagram");
		});
	});

	describe("code editor (code extensions)", () => {
		it("should return code for JavaScript files", () => {
			expect(getEditorTypeByFilename("script.js")).toBe("code");
			expect(getEditorTypeByFilename("app.jsx")).toBe("code");
		});

		it("should return code for TypeScript files", () => {
			expect(getEditorTypeByFilename("main.ts")).toBe("code");
			expect(getEditorTypeByFilename("component.tsx")).toBe("code");
		});

		it("should return code for other code files", () => {
			expect(getEditorTypeByFilename("data.json")).toBe("code");
			expect(getEditorTypeByFilename("readme.md")).toBe("code");
			expect(getEditorTypeByFilename("index.html")).toBe("code");
			expect(getEditorTypeByFilename("styles.css")).toBe("code");
			expect(getEditorTypeByFilename("query.sql")).toBe("code");
			expect(getEditorTypeByFilename("script.sh")).toBe("code");
			expect(getEditorTypeByFilename("config.yaml")).toBe("code");
			expect(getEditorTypeByFilename("config.yml")).toBe("code");
			expect(getEditorTypeByFilename("main.py")).toBe("code");
		});
	});

	describe("fallback to code editor", () => {
		it("should return code for unknown extensions", () => {
			expect(getEditorTypeByFilename("file.xyz")).toBe("code");
			expect(getEditorTypeByFilename("file.unknown")).toBe("code");
		});

		it("should return code for files without extension", () => {
			expect(getEditorTypeByFilename("README")).toBe("code");
			expect(getEditorTypeByFilename("Makefile")).toBe("code");
		});

		it("should return code for dotfiles", () => {
			expect(getEditorTypeByFilename(".gitignore")).toBe("code");
			expect(getEditorTypeByFilename(".env")).toBe("code");
		});
	});

	describe("case insensitivity", () => {
		it("should handle uppercase extensions", () => {
			expect(getEditorTypeByFilename("file.GRAIN")).toBe("lexical");
			expect(getEditorTypeByFilename("file.EXCALIDRAW")).toBe("excalidraw");
			expect(getEditorTypeByFilename("file.MERMAID")).toBe("diagram");
			expect(getEditorTypeByFilename("file.JS")).toBe("code");
		});

		it("should handle mixed case extensions", () => {
			expect(getEditorTypeByFilename("file.Grain")).toBe("lexical");
			expect(getEditorTypeByFilename("file.ExcaliDraw")).toBe("excalidraw");
		});
	});
});

// ============================================================================
// Unit Tests - Helper Functions
// ============================================================================

describe("isGrainFile", () => {
	it("should return true for .grain files", () => {
		expect(isGrainFile("diary.grain")).toBe(true);
		expect(isGrainFile("wiki.grain")).toBe(true);
	});

	it("should return false for non-.grain files", () => {
		expect(isGrainFile("script.js")).toBe(false);
		expect(isGrainFile("drawing.excalidraw")).toBe(false);
	});
});

describe("isExcalidrawFile", () => {
	it("should return true for .excalidraw files", () => {
		expect(isExcalidrawFile("drawing.excalidraw")).toBe(true);
	});

	it("should return false for non-.excalidraw files", () => {
		expect(isExcalidrawFile("script.js")).toBe(false);
		expect(isExcalidrawFile("diary.grain")).toBe(false);
	});
});

describe("isDiagramFile", () => {
	it("should return true for .mermaid files", () => {
		expect(isDiagramFile("flowchart.mermaid")).toBe(true);
	});

	it("should return true for .plantuml files", () => {
		expect(isDiagramFile("class.plantuml")).toBe(true);
	});

	it("should return false for non-diagram files", () => {
		expect(isDiagramFile("script.js")).toBe(false);
		expect(isDiagramFile("diary.grain")).toBe(false);
	});
});

describe("isCodeFile", () => {
	it("should return true for code files", () => {
		expect(isCodeFile("script.js")).toBe(true);
		expect(isCodeFile("main.ts")).toBe(true);
		expect(isCodeFile("data.json")).toBe(true);
	});

	it("should return false for non-code files", () => {
		expect(isCodeFile("diary.grain")).toBe(false);
		expect(isCodeFile("drawing.excalidraw")).toBe(false);
		expect(isCodeFile("flowchart.mermaid")).toBe(false);
	});
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe("Property-Based Tests", () => {
	/**
	 * **Feature: file-extension-system, Property 1: Extension to Editor Type Mapping**
	 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
	 *
	 * *For any* filename with a known extension, `getEditorTypeByFilename` SHALL return
	 * the correct editor type: `.grain` → "lexical", `.excalidraw` → "excalidraw",
	 * `.mermaid`/`.plantuml` → "diagram", code extensions → "code".
	 */
	describe("Property 1: Extension to Editor Type Mapping", () => {
		// 定义已知扩展名及其预期编辑器类型
		const knownExtensions = Object.entries(EXTENSION_TO_EDITOR_MAP);

		it("should map all known extensions to correct editor types", () => {
			fc.assert(
				fc.property(
					// 生成随机文件名前缀
					fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes(".")),
					// 从已知扩展名中随机选择
					fc.constantFrom(...knownExtensions),
					(prefix, [extension, expectedEditorType]) => {
						const filename = `${prefix}${extension}`;
						const result = getEditorTypeByFilename(filename);
						return result === expectedEditorType;
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return lexical for any .grain filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.grain`;
						return getEditorTypeByFilename(filename) === "lexical";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return excalidraw for any .excalidraw filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.excalidraw`;
						return getEditorTypeByFilename(filename) === "excalidraw";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return diagram for any .mermaid or .plantuml filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					fc.constantFrom(".mermaid", ".plantuml"),
					(prefix, extension) => {
						const filename = `${prefix}${extension}`;
						return getEditorTypeByFilename(filename) === "diagram";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return code for any known code extension filename", () => {
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
			];

			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					fc.constantFrom(...codeExtensions),
					(prefix, extension) => {
						const filename = `${prefix}${extension}`;
						return getEditorTypeByFilename(filename) === "code";
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: file-extension-system, Property 2: Unknown Extension Fallback**
	 * **Validates: Requirements 2.6**
	 *
	 * *For any* filename with an unknown or missing extension, `getEditorTypeByFilename`
	 * SHALL return "code" as the fallback editor type.
	 */
	describe("Property 2: Unknown Extension Fallback", () => {
		// 定义已知扩展名集合
		const knownExtensions = new Set(Object.keys(EXTENSION_TO_EDITOR_MAP));

		it("should return code for any unknown extension", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					// 生成不在已知扩展名列表中的扩展名
					fc
						.string({ minLength: 2, maxLength: 10 })
						.filter(
							(s) =>
								/^[a-z]+$/.test(s) &&
								!knownExtensions.has(`.${s.toLowerCase()}`),
						),
					(prefix, unknownExt) => {
						const filename = `${prefix}.${unknownExt}`;
						return getEditorTypeByFilename(filename) === "code";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return code for files without extension", () => {
			fc.assert(
				fc.property(
					// 生成不包含点号的文件名
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes(".")),
					(filename) => {
						return getEditorTypeByFilename(filename) === "code";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return code for dotfiles (files starting with dot)", () => {
			fc.assert(
				fc.property(
					// 生成 dotfile 名称（以点开头，后面没有其他点）
					fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes(".")),
					(name) => {
						const filename = `.${name}`;
						return getEditorTypeByFilename(filename) === "code";
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: file-extension-system, Property: Case Insensitivity**
	 * **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
	 *
	 * *For any* filename, the editor type should be the same regardless of
	 * the case of the extension.
	 */
	describe("Property: Case Insensitivity", () => {
		it("should return same editor type regardless of extension case", () => {
			const knownExtensions = Object.keys(EXTENSION_TO_EDITOR_MAP);

			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					fc.constantFrom(...knownExtensions),
					(prefix, extension) => {
						// 移除开头的点号
						const extWithoutDot = extension.slice(1);

						// 生成不同大小写的扩展名
						const lowerFilename = `${prefix}.${extWithoutDot.toLowerCase()}`;
						const upperFilename = `${prefix}.${extWithoutDot.toUpperCase()}`;

						const lowerResult = getEditorTypeByFilename(lowerFilename);
						const upperResult = getEditorTypeByFilename(upperFilename);

						return lowerResult === upperResult;
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: file-extension-system, Property: Editor Type Validity**
	 * **Validates: Requirements 2.1**
	 *
	 * *For any* filename, `getEditorTypeByFilename` SHALL always return
	 * a valid EditorType value.
	 */
	describe("Property: Editor Type Validity", () => {
		const validEditorTypes = ["lexical", "excalidraw", "diagram", "code"];

		it("should always return a valid editor type", () => {
			fc.assert(
				fc.property(
					// 生成任意文件名
					fc.string({ minLength: 0, maxLength: 100 }),
					(filename) => {
						const result = getEditorTypeByFilename(filename);
						return validEditorTypes.includes(result);
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
