/**
 * @file monaco-theme.fn.test.ts
 * @description Monaco 主题生成模块单元测试
 *
 * 测试覆盖：
 * - getMonacoThemeName 函数
 * - generateMonacoTheme 函数（验证颜色映射）
 * - registerMonacoTheme 函数（验证缓存机制）
 * - clearRegisteredThemes 函数
 * - isThemeRegistered 函数
 *
 * @requirements 4.1, 4.2
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Theme } from "@/lib/themes";
import {
	clearRegisteredThemes,
	generateMonacoTheme,
	getMonacoThemeName,
	isThemeRegistered,
	registerMonacoTheme,
} from "./monaco-theme.fn";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * 创建测试用的 light 主题
 */
const createLightTheme = (overrides: Partial<Theme> = {}): Theme => ({
	key: "test-light",
	name: "Test Light",
	description: "A test light theme",
	type: "light",
	colors: {
		background: "#ffffff",
		foreground: "#1f2937",
		card: "#ffffff",
		cardForeground: "#1f2937",
		popover: "#ffffff",
		popoverForeground: "#1f2937",
		primary: "#2563eb",
		primaryForeground: "#ffffff",
		secondary: "#f3f4f6",
		secondaryForeground: "#1f2937",
		muted: "#f3f4f6",
		mutedForeground: "#6b7280",
		accent: "#eff6ff",
		accentForeground: "#1f2937",
		border: "#e5e7eb",
		input: "#e5e7eb",
		ring: "#2563eb",
		sidebar: "#f9fafb",
		sidebarForeground: "#1f2937",
		sidebarPrimary: "#2563eb",
		sidebarPrimaryForeground: "#ffffff",
		sidebarAccent: "#eff6ff",
		sidebarAccentForeground: "#1f2937",
		sidebarBorder: "#e5e7eb",
		folderColor: "#3b82f6",
		editorCursor: "#2563eb",
		editorSelection: "#bfdbfe",
		editorLineHighlight: "#f8fafc",
		success: "#22c55e",
		warning: "#f59e0b",
		syntaxComment: "#6a737d",
		syntaxHeading: "#005cc5",
		syntaxLink: "#0366d6",
	},
	...overrides,
});

/**
 * 创建测试用的 dark 主题
 */
const createDarkTheme = (overrides: Partial<Theme> = {}): Theme => ({
	key: "test-dark",
	name: "Test Dark",
	description: "A test dark theme",
	type: "dark",
	colors: {
		background: "#0f172a",
		foreground: "#f1f5f9",
		card: "#1e293b",
		cardForeground: "#f1f5f9",
		popover: "#1e293b",
		popoverForeground: "#f1f5f9",
		primary: "#3b82f6",
		primaryForeground: "#ffffff",
		secondary: "#1e293b",
		secondaryForeground: "#f1f5f9",
		muted: "#334155",
		mutedForeground: "#94a3b8",
		accent: "#1e3a5f",
		accentForeground: "#f1f5f9",
		border: "#334155",
		input: "#334155",
		ring: "#3b82f6",
		sidebar: "#0f172a",
		sidebarForeground: "#f1f5f9",
		sidebarPrimary: "#3b82f6",
		sidebarPrimaryForeground: "#ffffff",
		sidebarAccent: "#1e3a5f",
		sidebarAccentForeground: "#f1f5f9",
		sidebarBorder: "#334155",
		folderColor: "#3b82f6",
		editorCursor: "#60a5fa",
		editorSelection: "#1e3a5f",
		editorLineHighlight: "#1e293b",
		success: "#4ade80",
		warning: "#fbbf24",
		syntaxComment: "#94a3b8",
		syntaxHeading: "#60a5fa",
		syntaxLink: "#38bdf8",
	},
	...overrides,
});

/**
 * 创建 Mock Monaco 实例
 */
const createMockMonaco = () => ({
	editor: {
		defineTheme: vi.fn(),
		setTheme: vi.fn(),
	},
});

// ============================================================================
// Unit Tests
// ============================================================================

describe("monaco-theme.fn", () => {
	beforeEach(() => {
		// 每个测试前清除已注册的主题缓存
		clearRegisteredThemes();
		vi.clearAllMocks();
	});

	// ==========================================================================
	// getMonacoThemeName
	// ==========================================================================

	describe("getMonacoThemeName", () => {
		it("should generate correct theme name with grain prefix", () => {
			const result = getMonacoThemeName("default-dark");
			expect(result).toBe("grain-default-dark");
		});

		it("should handle theme keys with special characters", () => {
			const result = getMonacoThemeName("one-dark-pro");
			expect(result).toBe("grain-one-dark-pro");
		});

		it("should handle simple theme keys", () => {
			const result = getMonacoThemeName("dracula");
			expect(result).toBe("grain-dracula");
		});

		it("should handle empty string", () => {
			const result = getMonacoThemeName("");
			expect(result).toBe("grain-");
		});
	});

	// ==========================================================================
	// generateMonacoTheme
	// ==========================================================================

	describe("generateMonacoTheme", () => {
		describe("基础主题类型", () => {
			it("should generate vs base for light theme", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.base).toBe("vs");
				expect(result.inherit).toBe(true);
			});

			it("should generate vs-dark base for dark theme", () => {
				const theme = createDarkTheme();
				const result = generateMonacoTheme(theme);

				expect(result.base).toBe("vs-dark");
				expect(result.inherit).toBe(true);
			});
		});

		describe("编辑器颜色映射", () => {
			it("should map background color correctly", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["editor.background"]).toBe("#ffffff");
			});

			it("should map foreground color correctly", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["editor.foreground"]).toBe("#1f2937");
			});

			it("should map selection background correctly", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["editor.selectionBackground"]).toBe("#bfdbfe");
			});

			it("should map cursor color from editorCursor", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["editorCursor.foreground"]).toBe("#2563eb");
			});

			it("should fallback to primary color when editorCursor is not defined", () => {
				const theme = createLightTheme();
				// 移除 editorCursor
				const themeWithoutCursor = {
					...theme,
					colors: {
						...theme.colors,
						editorCursor: undefined,
					},
				} as Theme;

				const result = generateMonacoTheme(themeWithoutCursor);

				// 应该回退到 primary 颜色
				expect(result.colors["editorCursor.foreground"]).toBe("#2563eb");
			});

			it("should map line highlight background", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["editor.lineHighlightBackground"]).toBe("#f8fafc");
			});

			it("should use default line highlight for light theme when not defined", () => {
				const theme = createLightTheme();
				const themeWithoutLineHighlight = {
					...theme,
					colors: {
						...theme.colors,
						editorLineHighlight: undefined,
					},
				} as Theme;

				const result = generateMonacoTheme(themeWithoutLineHighlight);

				expect(result.colors["editor.lineHighlightBackground"]).toBe("#f5f5f5");
			});

			it("should use default line highlight for dark theme when not defined", () => {
				const theme = createDarkTheme();
				const themeWithoutLineHighlight = {
					...theme,
					colors: {
						...theme.colors,
						editorLineHighlight: undefined,
					},
				} as Theme;

				const result = generateMonacoTheme(themeWithoutLineHighlight);

				expect(result.colors["editor.lineHighlightBackground"]).toBe("#2a2a2a");
			});

			it("should map line number colors", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["editorLineNumber.foreground"]).toBe("#6b7280");
				expect(result.colors["editorLineNumber.activeForeground"]).toBe(
					"#1f2937",
				);
			});

			it("should map border and indent guide colors", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["editorIndentGuide.background"]).toBe("#e5e7eb");
				expect(result.colors["editorIndentGuide.activeBackground"]).toBe(
					"#6b7280",
				);
			});

			it("should map bracket match colors", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["editorBracketMatch.border"]).toBe("#2563eb");
			});

			it("should map widget colors", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["editorWidget.background"]).toBe("#ffffff");
				expect(result.colors["editorWidget.foreground"]).toBe("#1f2937");
				expect(result.colors["editorWidget.border"]).toBe("#e5e7eb");
			});

			it("should map input colors", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["input.background"]).toBe("#e5e7eb");
				expect(result.colors["input.foreground"]).toBe("#1f2937");
				expect(result.colors["input.border"]).toBe("#e5e7eb");
			});

			it("should map list colors", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["list.activeSelectionBackground"]).toBe("#eff6ff");
				expect(result.colors["list.activeSelectionForeground"]).toBe("#1f2937");
				expect(result.colors["list.hoverBackground"]).toBe("#f3f4f6");
			});
		});

		describe("语法高亮规则", () => {
			it("should include comment token rule", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				const commentRule = result.rules.find((r) => r.token === "comment");
				expect(commentRule).toBeDefined();
				expect(commentRule?.fontStyle).toBe("italic");
				// 颜色应该去掉 # 前缀
				expect(commentRule?.foreground).toBe("6a737d");
			});

			it("should include keyword token rule", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				const keywordRule = result.rules.find((r) => r.token === "keyword");
				expect(keywordRule).toBeDefined();
				expect(keywordRule?.fontStyle).toBe("bold");
				expect(keywordRule?.foreground).toBe("2563eb");
			});

			it("should include string token rule", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				const stringRule = result.rules.find((r) => r.token === "string");
				expect(stringRule).toBeDefined();
				expect(stringRule?.foreground).toBe("22c55e");
			});

			it("should include number token rule", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				const numberRule = result.rules.find((r) => r.token === "number");
				expect(numberRule).toBeDefined();
				expect(numberRule?.foreground).toBe("f59e0b");
			});

			it("should include type token rule", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				const typeRule = result.rules.find((r) => r.token === "type");
				expect(typeRule).toBeDefined();
				expect(typeRule?.foreground).toBe("005cc5");
			});

			it("should include function token rule", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				const functionRule = result.rules.find((r) => r.token === "function");
				expect(functionRule).toBeDefined();
				expect(functionRule?.foreground).toBe("0366d6");
			});

			it("should include mermaid-specific token rules", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				const mermaidKeyword = result.rules.find(
					(r) => r.token === "mermaid-keyword",
				);
				const mermaidNode = result.rules.find(
					(r) => r.token === "mermaid-node",
				);
				const mermaidArrow = result.rules.find(
					(r) => r.token === "mermaid-arrow",
				);
				const mermaidText = result.rules.find(
					(r) => r.token === "mermaid-text",
				);

				expect(mermaidKeyword).toBeDefined();
				expect(mermaidNode).toBeDefined();
				expect(mermaidArrow).toBeDefined();
				expect(mermaidText).toBeDefined();
			});

			it("should include plantuml-specific token rules", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				const plantumlKeyword = result.rules.find(
					(r) => r.token === "plantuml-keyword",
				);
				const plantumlType = result.rules.find(
					(r) => r.token === "plantuml-type",
				);
				const plantumlString = result.rules.find(
					(r) => r.token === "plantuml-string",
				);

				expect(plantumlKeyword).toBeDefined();
				expect(plantumlType).toBeDefined();
				expect(plantumlString).toBeDefined();
			});

			it("should use fallback colors for syntax when not defined", () => {
				const theme = createLightTheme();
				// 移除可选的语法颜色
				const themeWithoutSyntax = {
					...theme,
					colors: {
						...theme.colors,
						syntaxComment: undefined,
						syntaxHeading: undefined,
						syntaxLink: undefined,
						success: undefined,
						warning: undefined,
					},
				} as Theme;

				const result = generateMonacoTheme(themeWithoutSyntax);

				// 应该使用回退颜色
				const commentRule = result.rules.find((r) => r.token === "comment");
				expect(commentRule?.foreground).toBe("6b7280"); // mutedForeground

				const stringRule = result.rules.find((r) => r.token === "string");
				expect(stringRule?.foreground).toBe("22c55e"); // 默认 light success

				const numberRule = result.rules.find((r) => r.token === "number");
				expect(numberRule?.foreground).toBe("f59e0b"); // 默认 light warning
			});

			it("should use dark fallback colors for dark theme", () => {
				const theme = createDarkTheme();
				const themeWithoutSyntax = {
					...theme,
					colors: {
						...theme.colors,
						success: undefined,
						warning: undefined,
					},
				} as Theme;

				const result = generateMonacoTheme(themeWithoutSyntax);

				const stringRule = result.rules.find((r) => r.token === "string");
				expect(stringRule?.foreground).toBe("4ade80"); // 默认 dark success

				const numberRule = result.rules.find((r) => r.token === "number");
				expect(numberRule?.foreground).toBe("fbbf24"); // 默认 dark warning
			});
		});

		describe("滚动条颜色", () => {
			it("should set light scrollbar colors for light theme", () => {
				const theme = createLightTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["scrollbarSlider.background"]).toBe("#00000020");
				expect(result.colors["scrollbarSlider.hoverBackground"]).toBe(
					"#00000040",
				);
				expect(result.colors["scrollbarSlider.activeBackground"]).toBe(
					"#00000060",
				);
			});

			it("should set dark scrollbar colors for dark theme", () => {
				const theme = createDarkTheme();
				const result = generateMonacoTheme(theme);

				expect(result.colors["scrollbarSlider.background"]).toBe("#ffffff20");
				expect(result.colors["scrollbarSlider.hoverBackground"]).toBe(
					"#ffffff40",
				);
				expect(result.colors["scrollbarSlider.activeBackground"]).toBe(
					"#ffffff60",
				);
			});
		});
	});

	// ==========================================================================
	// registerMonacoTheme
	// ==========================================================================

	describe("registerMonacoTheme", () => {
		it("should register theme with monaco and return theme name", () => {
			const mockMonaco = createMockMonaco();
			const theme = createLightTheme();

			const result = registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				theme,
			);

			expect(result).toBe("grain-test-light");
			expect(mockMonaco.editor.defineTheme).toHaveBeenCalledTimes(1);
			expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
				"grain-test-light",
				expect.objectContaining({
					base: "vs",
					inherit: true,
				}),
			);
		});

		it("should cache registered themes and not re-register", () => {
			const mockMonaco = createMockMonaco();
			const theme = createLightTheme();

			// 第一次注册
			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				theme,
			);
			expect(mockMonaco.editor.defineTheme).toHaveBeenCalledTimes(1);

			// 第二次注册同一主题
			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				theme,
			);
			// 不应该再次调用 defineTheme
			expect(mockMonaco.editor.defineTheme).toHaveBeenCalledTimes(1);
		});

		it("should register different themes separately", () => {
			const mockMonaco = createMockMonaco();
			const lightTheme = createLightTheme();
			const darkTheme = createDarkTheme();

			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				lightTheme,
			);
			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				darkTheme,
			);

			expect(mockMonaco.editor.defineTheme).toHaveBeenCalledTimes(2);
		});

		it("should mark theme as registered after registration", () => {
			const mockMonaco = createMockMonaco();
			const theme = createLightTheme();

			expect(isThemeRegistered(theme.key)).toBe(false);

			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				theme,
			);

			expect(isThemeRegistered(theme.key)).toBe(true);
		});
	});

	// ==========================================================================
	// clearRegisteredThemes
	// ==========================================================================

	describe("clearRegisteredThemes", () => {
		it("should clear all registered themes", () => {
			const mockMonaco = createMockMonaco();
			const theme = createLightTheme();

			// 注册主题
			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				theme,
			);
			expect(isThemeRegistered(theme.key)).toBe(true);

			// 清除缓存
			clearRegisteredThemes();
			expect(isThemeRegistered(theme.key)).toBe(false);
		});

		it("should allow re-registration after clearing", () => {
			const mockMonaco = createMockMonaco();
			const theme = createLightTheme();

			// 第一次注册
			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				theme,
			);
			expect(mockMonaco.editor.defineTheme).toHaveBeenCalledTimes(1);

			// 清除缓存
			clearRegisteredThemes();

			// 再次注册
			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				theme,
			);
			expect(mockMonaco.editor.defineTheme).toHaveBeenCalledTimes(2);
		});
	});

	// ==========================================================================
	// isThemeRegistered
	// ==========================================================================

	describe("isThemeRegistered", () => {
		it("should return false for unregistered theme", () => {
			expect(isThemeRegistered("non-existent")).toBe(false);
		});

		it("should return true for registered theme", () => {
			const mockMonaco = createMockMonaco();
			const theme = createLightTheme();

			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				theme,
			);

			expect(isThemeRegistered(theme.key)).toBe(true);
		});

		it("should use getMonacoThemeName internally", () => {
			const mockMonaco = createMockMonaco();
			const theme = createLightTheme({ key: "custom-theme" });

			registerMonacoTheme(
				mockMonaco as unknown as typeof import("monaco-editor"),
				theme,
			);

			// 使用原始 key 检查
			expect(isThemeRegistered("custom-theme")).toBe(true);
			// 使用完整名称检查应该返回 false（因为内部会再次添加前缀）
			expect(isThemeRegistered("grain-custom-theme")).toBe(false);
		});
	});
});
