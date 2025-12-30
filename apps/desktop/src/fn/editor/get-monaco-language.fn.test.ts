/**
 * @file get-monaco-language.fn.test.ts
 * @description Monaco 语言检测纯函数测试
 *
 * 包含单元测试和属性测试（Property-Based Testing）
 * 使用 fast-check 进行属性测试
 *
 * @requirements 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	getMonacoLanguage,
	getSupportedMonacoLanguages,
	isMonacoLanguageSupported,
} from "./get-monaco-language.fn";

// ============================================================================
// Unit Tests - getMonacoLanguage
// ============================================================================

describe("getMonacoLanguage", () => {
	describe("JavaScript / TypeScript", () => {
		it("should return javascript for .js files", () => {
			expect(getMonacoLanguage("script.js")).toBe("javascript");
		});

		it("should return javascript for .jsx files", () => {
			expect(getMonacoLanguage("component.jsx")).toBe("javascript");
		});

		it("should return typescript for .ts files", () => {
			expect(getMonacoLanguage("main.ts")).toBe("typescript");
		});

		it("should return typescript for .tsx files", () => {
			expect(getMonacoLanguage("component.tsx")).toBe("typescript");
		});
	});

	describe("Python", () => {
		it("should return python for .py files", () => {
			expect(getMonacoLanguage("script.py")).toBe("python");
		});

		it("should return python for .pyw files", () => {
			expect(getMonacoLanguage("gui.pyw")).toBe("python");
		});
	});

	describe("Data formats", () => {
		it("should return json for .json files", () => {
			expect(getMonacoLanguage("config.json")).toBe("json");
		});

		it("should return yaml for .yaml files", () => {
			expect(getMonacoLanguage("config.yaml")).toBe("yaml");
		});

		it("should return yaml for .yml files", () => {
			expect(getMonacoLanguage("config.yml")).toBe("yaml");
		});

		it("should return xml for .xml files", () => {
			expect(getMonacoLanguage("data.xml")).toBe("xml");
		});
	});

	describe("Markdown", () => {
		it("should return markdown for .md files", () => {
			expect(getMonacoLanguage("readme.md")).toBe("markdown");
		});

		it("should return markdown for .markdown files", () => {
			expect(getMonacoLanguage("readme.markdown")).toBe("markdown");
		});
	});

	describe("Web technologies", () => {
		it("should return html for .html files", () => {
			expect(getMonacoLanguage("index.html")).toBe("html");
		});

		it("should return html for .htm files", () => {
			expect(getMonacoLanguage("page.htm")).toBe("html");
		});

		it("should return css for .css files", () => {
			expect(getMonacoLanguage("styles.css")).toBe("css");
		});

		it("should return scss for .scss files", () => {
			expect(getMonacoLanguage("styles.scss")).toBe("scss");
		});

		it("should return less for .less files", () => {
			expect(getMonacoLanguage("styles.less")).toBe("less");
		});
	});

	describe("Shell", () => {
		it("should return shell for .sh files", () => {
			expect(getMonacoLanguage("script.sh")).toBe("shell");
		});

		it("should return shell for .bash files", () => {
			expect(getMonacoLanguage("script.bash")).toBe("shell");
		});

		it("should return shell for .zsh files", () => {
			expect(getMonacoLanguage("script.zsh")).toBe("shell");
		});
	});

	describe("SQL", () => {
		it("should return sql for .sql files", () => {
			expect(getMonacoLanguage("query.sql")).toBe("sql");
		});
	});

	describe("Other languages", () => {
		it("should return rust for .rs files", () => {
			expect(getMonacoLanguage("main.rs")).toBe("rust");
		});

		it("should return go for .go files", () => {
			expect(getMonacoLanguage("main.go")).toBe("go");
		});

		it("should return java for .java files", () => {
			expect(getMonacoLanguage("Main.java")).toBe("java");
		});

		it("should return c for .c files", () => {
			expect(getMonacoLanguage("main.c")).toBe("c");
		});

		it("should return cpp for .cpp files", () => {
			expect(getMonacoLanguage("main.cpp")).toBe("cpp");
		});
	});

	describe("Grain / Excalidraw", () => {
		it("should return json for .grain files", () => {
			expect(getMonacoLanguage("diary.grain")).toBe("json");
		});

		it("should return json for .excalidraw files", () => {
			expect(getMonacoLanguage("drawing.excalidraw")).toBe("json");
		});
	});

	describe("Diagram files", () => {
		it("should return plaintext for .mermaid files", () => {
			expect(getMonacoLanguage("flowchart.mermaid")).toBe("plaintext");
		});

		it("should return plaintext for .plantuml files", () => {
			expect(getMonacoLanguage("class.plantuml")).toBe("plaintext");
		});
	});

	describe("Unknown extensions fallback", () => {
		it("should return plaintext for unknown extensions", () => {
			expect(getMonacoLanguage("file.xyz")).toBe("plaintext");
			expect(getMonacoLanguage("file.unknown")).toBe("plaintext");
		});

		it("should return plaintext for files without extension", () => {
			expect(getMonacoLanguage("README")).toBe("plaintext");
			expect(getMonacoLanguage("Makefile")).toBe("plaintext");
		});

		it("should return plaintext for dotfiles", () => {
			expect(getMonacoLanguage(".gitignore")).toBe("plaintext");
			expect(getMonacoLanguage(".env")).toBe("plaintext");
		});
	});

	describe("Case insensitivity", () => {
		it("should handle uppercase extensions", () => {
			expect(getMonacoLanguage("script.JS")).toBe("javascript");
			expect(getMonacoLanguage("main.TS")).toBe("typescript");
			expect(getMonacoLanguage("config.JSON")).toBe("json");
		});

		it("should handle mixed case extensions", () => {
			expect(getMonacoLanguage("script.Js")).toBe("javascript");
			expect(getMonacoLanguage("readme.Md")).toBe("markdown");
		});
	});
});

// ============================================================================
// Unit Tests - Helper Functions
// ============================================================================

describe("getSupportedMonacoLanguages", () => {
	it("should return an array of unique languages", () => {
		const languages = getSupportedMonacoLanguages();
		expect(Array.isArray(languages)).toBe(true);
		expect(new Set(languages).size).toBe(languages.length);
	});

	it("should include common languages", () => {
		const languages = getSupportedMonacoLanguages();
		expect(languages).toContain("javascript");
		expect(languages).toContain("typescript");
		expect(languages).toContain("python");
		expect(languages).toContain("json");
		expect(languages).toContain("markdown");
	});

	it("should be sorted alphabetically", () => {
		const languages = getSupportedMonacoLanguages();
		const sorted = [...languages].sort();
		expect(languages).toEqual(sorted);
	});
});

describe("isMonacoLanguageSupported", () => {
	it("should return true for supported extensions", () => {
		expect(isMonacoLanguageSupported(".js")).toBe(true);
		expect(isMonacoLanguageSupported(".ts")).toBe(true);
		expect(isMonacoLanguageSupported(".py")).toBe(true);
		expect(isMonacoLanguageSupported(".json")).toBe(true);
	});

	it("should return false for unsupported extensions", () => {
		expect(isMonacoLanguageSupported(".xyz")).toBe(false);
		expect(isMonacoLanguageSupported(".unknown")).toBe(false);
	});

	it("should be case insensitive", () => {
		expect(isMonacoLanguageSupported(".JS")).toBe(true);
		expect(isMonacoLanguageSupported(".Ts")).toBe(true);
	});
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe("Property-Based Tests", () => {
	/**
	 * **Feature: file-extension-system, Property 4: Monaco Language Detection**
	 * **Validates: Requirements 5.2-5.12**
	 *
	 * *For any* filename with a known code extension, `getMonacoLanguage` SHALL return
	 * the correct Monaco language identifier.
	 */
	describe("Property 4: Monaco Language Detection", () => {
		// 定义已知扩展名及其预期 Monaco 语言
		const extensionToLanguage: [string, string][] = [
			[".js", "javascript"],
			[".jsx", "javascript"],
			[".ts", "typescript"],
			[".tsx", "typescript"],
			[".py", "python"],
			[".pyw", "python"],
			[".json", "json"],
			[".yaml", "yaml"],
			[".yml", "yaml"],
			[".md", "markdown"],
			[".markdown", "markdown"],
			[".html", "html"],
			[".htm", "html"],
			[".css", "css"],
			[".scss", "scss"],
			[".less", "less"],
			[".sql", "sql"],
			[".sh", "shell"],
			[".bash", "shell"],
			[".zsh", "shell"],
			[".rs", "rust"],
			[".go", "go"],
			[".java", "java"],
			[".c", "c"],
			[".cpp", "cpp"],
			[".xml", "xml"],
			[".graphql", "graphql"],
			[".gql", "graphql"],
		];

		it("should map all known extensions to correct Monaco languages", () => {
			fc.assert(
				fc.property(
					// 生成随机文件名前缀
					fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes(".")),
					// 从已知扩展名中随机选择
					fc.constantFrom(...extensionToLanguage),
					(prefix, [extension, expectedLanguage]) => {
						const filename = `${prefix}${extension}`;
						const result = getMonacoLanguage(filename);
						return result === expectedLanguage;
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return javascript for any .js filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.js`;
						return getMonacoLanguage(filename) === "javascript";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return typescript for any .ts filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.ts`;
						return getMonacoLanguage(filename) === "typescript";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return python for any .py filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.py`;
						return getMonacoLanguage(filename) === "python";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return json for any .json filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.json`;
						return getMonacoLanguage(filename) === "json";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return markdown for any .md filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.md`;
						return getMonacoLanguage(filename) === "markdown";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return html for any .html filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.html`;
						return getMonacoLanguage(filename) === "html";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return css for any .css filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.css`;
						return getMonacoLanguage(filename) === "css";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return sql for any .sql filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.sql`;
						return getMonacoLanguage(filename) === "sql";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return shell for any .sh filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					(prefix) => {
						const filename = `${prefix}.sh`;
						return getMonacoLanguage(filename) === "shell";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return yaml for any .yaml or .yml filename", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
					fc.constantFrom(".yaml", ".yml"),
					(prefix, extension) => {
						const filename = `${prefix}${extension}`;
						return getMonacoLanguage(filename) === "yaml";
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: file-extension-system, Property: Unknown Extension Fallback to Plaintext**
	 * **Validates: Requirements 5.12**
	 *
	 * *For any* filename with an unknown or missing extension, `getMonacoLanguage`
	 * SHALL return "plaintext" as the fallback.
	 */
	describe("Property: Unknown Extension Fallback to Plaintext", () => {
		// 定义已知扩展名集合
		const knownExtensions = new Set([
			".js", ".jsx", ".ts", ".tsx",
			".html", ".htm", ".css", ".scss", ".less",
			".json", ".yaml", ".yml", ".toml", ".xml",
			".md", ".markdown",
			".sh", ".bash", ".zsh",
			".py", ".pyw",
			".rs", ".go", ".java",
			".c", ".h", ".cpp", ".cc", ".cxx", ".hpp", ".hxx",
			".sql", ".graphql", ".gql",
			".dockerfile", ".txt",
			".mermaid", ".plantuml", ".puml",
			".grain", ".excalidraw",
		]);

		it("should return plaintext for any unknown extension", () => {
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
								/^[a-z]+$/.test(s) && !knownExtensions.has(`.${s.toLowerCase()}`),
						),
					(prefix, unknownExt) => {
						const filename = `${prefix}.${unknownExt}`;
						return getMonacoLanguage(filename) === "plaintext";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return plaintext for files without extension", () => {
			fc.assert(
				fc.property(
					// 生成不包含点号的文件名
					fc
						.string({ minLength: 1, maxLength: 50 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes(".")),
					(filename) => {
						return getMonacoLanguage(filename) === "plaintext";
					},
				),
				{ numRuns: 100 },
			);
		});

		it("should return plaintext for dotfiles", () => {
			fc.assert(
				fc.property(
					fc
						.string({ minLength: 1, maxLength: 20 })
						.filter((s) => /^[a-zA-Z0-9_-]+$/.test(s) && !s.includes(".")),
					(name) => {
						const filename = `.${name}`;
						return getMonacoLanguage(filename) === "plaintext";
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: file-extension-system, Property: Case Insensitivity**
	 * **Validates: Requirements 5.2-5.11**
	 *
	 * *For any* filename, the Monaco language should be the same regardless of
	 * the case of the extension.
	 */
	describe("Property: Case Insensitivity", () => {
		const knownExtensions = [
			".js", ".ts", ".py", ".json", ".md", ".html", ".css", ".sql", ".sh", ".yaml",
		];

		it("should return same Monaco language regardless of extension case", () => {
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

						const lowerResult = getMonacoLanguage(lowerFilename);
						const upperResult = getMonacoLanguage(upperFilename);

						return lowerResult === upperResult;
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	/**
	 * **Feature: file-extension-system, Property: Return Value Validity**
	 * **Validates: Requirements 5.1**
	 *
	 * *For any* filename, `getMonacoLanguage` SHALL always return a non-empty string.
	 */
	describe("Property: Return Value Validity", () => {
		it("should always return a non-empty string", () => {
			fc.assert(
				fc.property(
					// 生成任意文件名
					fc.string({ minLength: 0, maxLength: 100 }),
					(filename) => {
						const result = getMonacoLanguage(filename);
						return typeof result === "string" && result.length > 0;
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
