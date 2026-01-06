/**
 * @file fn/diagram/mermaid.render.fn.test.ts
 * @description Mermaid 渲染纯函数测试
 *
 * 测试覆盖：
 * - initMermaid: 主题初始化
 * - renderMermaid: 图表渲染
 * - validateMermaidCode: 代码验证
 * - 错误处理
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getCurrentMermaidTheme,
	initMermaid,
	renderMermaid,
	resetMermaidState,
	validateMermaidCode,
} from "./mermaid.render.fn";

// ============================================================================
// Mocks
// ============================================================================

// Mock mermaid 库
vi.mock("mermaid", () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn(),
		parse: vi.fn(),
	},
}));

// 获取 mock 实例
const getMermaidMock = async () => {
	const mermaid = await import("mermaid");
	return {
		initialize: mermaid.default.initialize as ReturnType<typeof vi.fn>,
		render: mermaid.default.render as ReturnType<typeof vi.fn>,
		parse: mermaid.default.parse as ReturnType<typeof vi.fn>,
	};
};

// ============================================================================
// Test Setup
// ============================================================================

describe("mermaid.render.fn", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		resetMermaidState();
	});

	afterEach(() => {
		resetMermaidState();
	});

	// ==========================================================================
	// initMermaid Tests
	// ==========================================================================

	describe("initMermaid", () => {
		it("should initialize mermaid with light theme", async () => {
			const mermaid = await getMermaidMock();

			initMermaid("light");

			expect(mermaid.initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					startOnLoad: false,
					theme: "default",
					securityLevel: "loose",
					fontFamily: "inherit",
					logLevel: "error",
				}),
			);
			expect(getCurrentMermaidTheme()).toBe("light");
		});

		it("should initialize mermaid with dark theme", async () => {
			const mermaid = await getMermaidMock();

			initMermaid("dark");

			expect(mermaid.initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					theme: "dark",
				}),
			);
			expect(getCurrentMermaidTheme()).toBe("dark");
		});

		it("should not reinitialize if theme is the same", async () => {
			const mermaid = await getMermaidMock();

			initMermaid("light");
			initMermaid("light");

			expect(mermaid.initialize).toHaveBeenCalledTimes(1);
		});

		it("should reinitialize when theme changes", async () => {
			const mermaid = await getMermaidMock();

			initMermaid("light");
			initMermaid("dark");

			expect(mermaid.initialize).toHaveBeenCalledTimes(2);
			expect(getCurrentMermaidTheme()).toBe("dark");
		});

		it("should use custom fontFamily when provided", async () => {
			const mermaid = await getMermaidMock();

			initMermaid("light", { fontFamily: "monospace" });

			expect(mermaid.initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					fontFamily: "monospace",
				}),
			);
		});

		it("should use custom securityLevel when provided", async () => {
			const mermaid = await getMermaidMock();

			initMermaid("light", { securityLevel: "strict" });

			expect(mermaid.initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					securityLevel: "strict",
				}),
			);
		});
	});

	// ==========================================================================
	// renderMermaid Tests
	// ==========================================================================

	describe("renderMermaid", () => {
		it("should return error for empty code", async () => {
			const result = await renderMermaid("");

			expect(result).toEqual({ error: "图表代码为空" });
		});

		it("should return error for whitespace-only code", async () => {
			const result = await renderMermaid("   \n\t  ");

			expect(result).toEqual({ error: "图表代码为空" });
		});

		it("should render valid mermaid code successfully", async () => {
			const mermaid = await getMermaidMock();
			const mockSvg = "<svg>test diagram</svg>";
			mermaid.render.mockResolvedValue({ svg: mockSvg });

			const result = await renderMermaid("flowchart TD\n  A --> B");

			expect(result).toEqual({ svg: mockSvg });
		});

		it("should auto-initialize with light theme if not initialized", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockResolvedValue({ svg: "<svg></svg>" });

			await renderMermaid("flowchart TD\n  A --> B");

			expect(mermaid.initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					theme: "default",
				}),
			);
		});

		it("should use provided containerId", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockResolvedValue({ svg: "<svg></svg>" });

			await renderMermaid("flowchart TD\n  A --> B", "my-container-id");

			expect(mermaid.render).toHaveBeenCalledWith(
				"my-container-id",
				"flowchart TD\n  A --> B",
			);
		});

		it("should generate unique containerId if not provided", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockResolvedValue({ svg: "<svg></svg>" });

			await renderMermaid("flowchart TD\n  A --> B");

			expect(mermaid.render).toHaveBeenCalledWith(
				expect.stringMatching(/^mermaid-/),
				"flowchart TD\n  A --> B",
			);
		});

		it("should return friendly error for unknown diagram type", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockRejectedValue(new Error("Unknown diagram type"));

			const result = await renderMermaid("invalid diagram");

			expect(result).toHaveProperty("error");
			if ("error" in result) {
				expect(result.error).toContain("未知的图表类型");
			}
		});

		it("should return friendly error for no diagram type detected", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockRejectedValue(new Error("No diagram type detected"));

			const result = await renderMermaid("just some text");

			expect(result).toHaveProperty("error");
			if ("error" in result) {
				expect(result.error).toContain("未检测到图表类型");
			}
		});

		it("should return friendly error for syntax error with line number", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockRejectedValue(
				new Error("Syntax error on line 3: unexpected token"),
			);

			const result = await renderMermaid("flowchart TD\n  A --> B\n  invalid");

			expect(result).toHaveProperty("error");
			if ("error" in result) {
				expect(result.error).toContain("语法错误");
				expect(result.error).toContain("3");
			}
		});

		it("should return friendly error for parse error", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockRejectedValue(
				new Error("Parse error: invalid syntax"),
			);

			const result = await renderMermaid("flowchart TD\n  A -->");

			expect(result).toHaveProperty("error");
			if ("error" in result) {
				expect(result.error).toContain("解析错误");
			}
		});

		it("should return friendly error for lexical error", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockRejectedValue(
				new Error("Lexical error: unrecognized character"),
			);

			const result = await renderMermaid("flowchart TD\n  A @#$ B");

			expect(result).toHaveProperty("error");
			if ("error" in result) {
				expect(result.error).toContain("词法错误");
			}
		});

		it("should return friendly error for unterminated string", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockRejectedValue(new Error("unterminated string"));

			const result = await renderMermaid('flowchart TD\n  A["unclosed');

			expect(result).toHaveProperty("error");
			if ("error" in result) {
				expect(result.error).toContain("字符串未闭合");
			}
		});

		it("should handle non-Error exceptions", async () => {
			const mermaid = await getMermaidMock();
			mermaid.render.mockRejectedValue("string error");

			const result = await renderMermaid("flowchart TD\n  A --> B");

			expect(result).toHaveProperty("error");
			if ("error" in result) {
				expect(result.error).toContain("未知错误");
			}
		});
	});

	// ==========================================================================
	// validateMermaidCode Tests
	// ==========================================================================

	describe("validateMermaidCode", () => {
		it("should return false for empty code", async () => {
			const result = await validateMermaidCode("");

			expect(result).toBe(false);
		});

		it("should return false for whitespace-only code", async () => {
			const result = await validateMermaidCode("   \n\t  ");

			expect(result).toBe(false);
		});

		it("should return true for valid code", async () => {
			const mermaid = await getMermaidMock();
			mermaid.parse.mockResolvedValue(undefined);

			const result = await validateMermaidCode("flowchart TD\n  A --> B");

			expect(result).toBe(true);
			expect(mermaid.parse).toHaveBeenCalledWith("flowchart TD\n  A --> B");
		});

		it("should return false for invalid code", async () => {
			const mermaid = await getMermaidMock();
			mermaid.parse.mockRejectedValue(new Error("Parse error"));

			const result = await validateMermaidCode("invalid code");

			expect(result).toBe(false);
		});

		it("should auto-initialize if not initialized", async () => {
			const mermaid = await getMermaidMock();
			mermaid.parse.mockResolvedValue(undefined);

			await validateMermaidCode("flowchart TD\n  A --> B");

			expect(mermaid.initialize).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// getCurrentMermaidTheme Tests
	// ==========================================================================

	describe("getCurrentMermaidTheme", () => {
		it("should return null when not initialized", () => {
			expect(getCurrentMermaidTheme()).toBeNull();
		});

		it("should return current theme after initialization", () => {
			initMermaid("dark");

			expect(getCurrentMermaidTheme()).toBe("dark");
		});
	});

	// ==========================================================================
	// resetMermaidState Tests
	// ==========================================================================

	describe("resetMermaidState", () => {
		it("should reset theme to null", () => {
			initMermaid("dark");
			expect(getCurrentMermaidTheme()).toBe("dark");

			resetMermaidState();

			expect(getCurrentMermaidTheme()).toBeNull();
		});
	});
});
