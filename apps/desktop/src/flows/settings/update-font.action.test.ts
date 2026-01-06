/**
 * @file update-font.action.test.ts
 * @description 更新字体设置 Action 的单元测试
 *
 * 测试覆盖：
 * - ✅ 编辑器字体设置更新
 * - ✅ UI 字体设置更新
 * - ✅ 排版设置更新
 * - ✅ 字体设置重置
 * - ✅ 参数校验
 * - ✅ 边界值测试
 *
 * 目标覆盖率：> 95%
 */

import * as E from "fp-ts/Either";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	getFontSettings,
	resetFontSettings,
	type UpdateEditorFontParams,
	type UpdateTypographyParams,
	type UpdateUiFontParams,
	updateEditorFont,
	updateTypography,
	updateUiFont,
} from "./update-font.action";

// ============================================================================
// Mocks
// ============================================================================

const mockFontStore = {
	setFontFamily: vi.fn(),
	setFontSize: vi.fn(),
	setLineHeight: vi.fn(),
	setLetterSpacing: vi.fn(),
	setUiFontFamily: vi.fn(),
	setUiFontSize: vi.fn(),
	setUiScale: vi.fn(),
	setCardSize: vi.fn(),
	setCardBorderRadius: vi.fn(),
	setParagraphSpacing: vi.fn(),
	setFirstLineIndent: vi.fn(),
	reset: vi.fn(),
	fontFamily: "Inter",
	fontSize: 14,
	lineHeight: 1.6,
	letterSpacing: 0,
	uiFontFamily: "Inter",
	uiFontSize: 13,
	uiScale: "100%",
	cardSize: "medium",
	cardBorderRadius: 8,
	paragraphSpacing: 16,
	firstLineIndent: 0,
};

vi.mock("@/state/font.state", () => ({
	useFontStore: {
		getState: () => mockFontStore,
	},
}));

vi.mock("@/log/index", () => ({
	default: {
		info: vi.fn(),
		success: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		start: vi.fn(),
	},
}));

// ============================================================================
// Test Data
// ============================================================================

const validEditorFontParams: UpdateEditorFontParams = {
	fontFamily: "JetBrains Mono",
	fontSize: 16,
	lineHeight: 1.8,
	letterSpacing: 0.5,
};

const validUiFontParams: UpdateUiFontParams = {
	uiFontFamily: "SF Pro Display",
	uiFontSize: 14,
	uiScale: "110%",
};

const validTypographyParams: UpdateTypographyParams = {
	cardSize: "large",
	cardBorderRadius: 12,
	paragraphSpacing: 20,
	firstLineIndent: 2,
};

// ============================================================================
// Tests
// ============================================================================

describe("updateEditorFont", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
	});

	// ==========================================================================
	// 成功更新测试
	// ==========================================================================

	describe("成功更新", () => {
		it("应该成功更新所有编辑器字体参数", () => {
			const result = updateEditorFont(validEditorFontParams);

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setFontFamily).toHaveBeenCalledWith(
				"JetBrains Mono",
			);
			expect(mockFontStore.setFontSize).toHaveBeenCalledWith(16);
			expect(mockFontStore.setLineHeight).toHaveBeenCalledWith(1.8);
			expect(mockFontStore.setLetterSpacing).toHaveBeenCalledWith(0.5);
		});

		it("应该只更新提供的字体族", () => {
			const result = updateEditorFont({ fontFamily: "Fira Code" });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setFontFamily).toHaveBeenCalledWith("Fira Code");
			expect(mockFontStore.setFontSize).not.toHaveBeenCalled();
			expect(mockFontStore.setLineHeight).not.toHaveBeenCalled();
			expect(mockFontStore.setLetterSpacing).not.toHaveBeenCalled();
		});

		it("应该只更新提供的字体大小", () => {
			const result = updateEditorFont({ fontSize: 18 });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setFontSize).toHaveBeenCalledWith(18);
			expect(mockFontStore.setFontFamily).not.toHaveBeenCalled();
		});

		it("应该只更新提供的行高", () => {
			const result = updateEditorFont({ lineHeight: 2.0 });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setLineHeight).toHaveBeenCalledWith(2.0);
		});

		it("应该只更新提供的字间距", () => {
			const result = updateEditorFont({ letterSpacing: 1.0 });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setLetterSpacing).toHaveBeenCalledWith(1.0);
		});
	});

	// ==========================================================================
	// 参数校验测试
	// ==========================================================================

	describe("参数校验", () => {
		it("应该拒绝空的字体族", () => {
			const result = updateEditorFont({ fontFamily: "" });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("fontFamily");
			}
		});

		it("应该拒绝只有空格的字体族", () => {
			const result = updateEditorFont({ fontFamily: "   " });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
			}
		});

		it("应该拒绝过小的字体大小", () => {
			const result = updateEditorFont({ fontSize: 5 });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("fontSize");
			}
		});

		it("应该拒绝过大的字体大小", () => {
			const result = updateEditorFont({ fontSize: 100 });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
			}
		});

		it("应该拒绝过小的行高", () => {
			const result = updateEditorFont({ lineHeight: 0.5 });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("lineHeight");
			}
		});

		it("应该拒绝过大的行高", () => {
			const result = updateEditorFont({ lineHeight: 5.0 });

			expect(E.isLeft(result)).toBe(true);
		});

		it("应该拒绝过小的字间距", () => {
			const result = updateEditorFont({ letterSpacing: -5 });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("letterSpacing");
			}
		});

		it("应该拒绝过大的字间距", () => {
			const result = updateEditorFont({ letterSpacing: 10 });

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// 边界值测试
	// ==========================================================================

	describe("边界值测试", () => {
		it("应该接受最小有效字体大小", () => {
			const result = updateEditorFont({ fontSize: 8 });
			expect(E.isRight(result)).toBe(true);
		});

		it("应该接受最大有效字体大小", () => {
			const result = updateEditorFont({ fontSize: 72 });
			expect(E.isRight(result)).toBe(true);
		});

		it("应该接受最小有效行高", () => {
			const result = updateEditorFont({ lineHeight: 1.0 });
			expect(E.isRight(result)).toBe(true);
		});

		it("应该接受最大有效行高", () => {
			const result = updateEditorFont({ lineHeight: 3.0 });
			expect(E.isRight(result)).toBe(true);
		});

		it("应该接受最小有效字间距", () => {
			const result = updateEditorFont({ letterSpacing: -2 });
			expect(E.isRight(result)).toBe(true);
		});

		it("应该接受最大有效字间距", () => {
			const result = updateEditorFont({ letterSpacing: 5 });
			expect(E.isRight(result)).toBe(true);
		});
	});
});

describe("updateUiFont", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("成功更新", () => {
		it("应该成功更新所有 UI 字体参数", () => {
			const result = updateUiFont(validUiFontParams);

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setUiFontFamily).toHaveBeenCalledWith(
				"SF Pro Display",
			);
			expect(mockFontStore.setUiFontSize).toHaveBeenCalledWith(14);
			expect(mockFontStore.setUiScale).toHaveBeenCalledWith("110%");
		});

		it("应该只更新提供的 UI 字体族", () => {
			const result = updateUiFont({ uiFontFamily: "Helvetica" });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setUiFontFamily).toHaveBeenCalledWith("Helvetica");
			expect(mockFontStore.setUiFontSize).not.toHaveBeenCalled();
			expect(mockFontStore.setUiScale).not.toHaveBeenCalled();
		});

		it("应该只更新提供的 UI 字体大小", () => {
			const result = updateUiFont({ uiFontSize: 15 });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setUiFontSize).toHaveBeenCalledWith(15);
		});

		it("应该只更新提供的 UI 缩放", () => {
			const result = updateUiFont({ uiScale: "125%" });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setUiScale).toHaveBeenCalledWith("125%");
		});
	});

	describe("参数校验", () => {
		it("应该拒绝空的 UI 字体族", () => {
			const result = updateUiFont({ uiFontFamily: "" });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("uiFontFamily");
			}
		});

		it("应该拒绝过小的 UI 字体大小", () => {
			const result = updateUiFont({ uiFontSize: 5 });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("uiFontSize");
			}
		});

		it("应该拒绝过大的 UI 字体大小", () => {
			const result = updateUiFont({ uiFontSize: 50 });

			expect(E.isLeft(result)).toBe(true);
		});
	});
});

describe("updateTypography", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("成功更新", () => {
		it("应该成功更新所有排版参数", () => {
			const result = updateTypography(validTypographyParams);

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setCardSize).toHaveBeenCalledWith("large");
			expect(mockFontStore.setCardBorderRadius).toHaveBeenCalledWith(12);
			expect(mockFontStore.setParagraphSpacing).toHaveBeenCalledWith(20);
			expect(mockFontStore.setFirstLineIndent).toHaveBeenCalledWith(2);
		});

		it("应该只更新提供的卡片大小", () => {
			const result = updateTypography({ cardSize: "small" });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setCardSize).toHaveBeenCalledWith("small");
			expect(mockFontStore.setCardBorderRadius).not.toHaveBeenCalled();
		});

		it("应该只更新提供的卡片圆角", () => {
			const result = updateTypography({ cardBorderRadius: 16 });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setCardBorderRadius).toHaveBeenCalledWith(16);
		});

		it("应该只更新提供的段落间距", () => {
			const result = updateTypography({ paragraphSpacing: 24 });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setParagraphSpacing).toHaveBeenCalledWith(24);
		});

		it("应该只更新提供的首行缩进", () => {
			const result = updateTypography({ firstLineIndent: 4 });

			expect(E.isRight(result)).toBe(true);
			expect(mockFontStore.setFirstLineIndent).toHaveBeenCalledWith(4);
		});
	});

	describe("参数校验", () => {
		it("应该拒绝过小的卡片圆角", () => {
			const result = updateTypography({ cardBorderRadius: -1 });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("cardBorderRadius");
			}
		});

		it("应该拒绝过大的卡片圆角", () => {
			const result = updateTypography({ cardBorderRadius: 100 });

			expect(E.isLeft(result)).toBe(true);
		});

		it("应该拒绝过小的段落间距", () => {
			const result = updateTypography({ paragraphSpacing: -1 });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("paragraphSpacing");
			}
		});

		it("应该拒绝过大的段落间距", () => {
			const result = updateTypography({ paragraphSpacing: 200 });

			expect(E.isLeft(result)).toBe(true);
		});

		it("应该拒绝过小的首行缩进", () => {
			const result = updateTypography({ firstLineIndent: -10 });

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("VALIDATION_ERROR");
				expect(result.left.message).toContain("firstLineIndent");
			}
		});

		it("应该拒绝过大的首行缩进", () => {
			const result = updateTypography({ firstLineIndent: 50 });

			expect(E.isLeft(result)).toBe(true);
		});
	});
});

describe("resetFontSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("应该成功重置所有字体设置", () => {
		const result = resetFontSettings();

		expect(E.isRight(result)).toBe(true);
		expect(mockFontStore.reset).toHaveBeenCalled();
	});
});

describe("getFontSettings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("应该返回当前字体设置快照", () => {
		const settings = getFontSettings();

		expect(settings).toEqual({
			fontFamily: "Inter",
			fontSize: 14,
			lineHeight: 1.6,
			letterSpacing: 0,
			uiFontFamily: "Inter",
			uiFontSize: 13,
			uiScale: "100%",
			cardSize: "medium",
			cardBorderRadius: 8,
			paragraphSpacing: 16,
			firstLineIndent: 0,
		});
	});
});

describe("边界情况", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("应该处理空参数对象", () => {
		const result1 = updateEditorFont({});
		const result2 = updateUiFont({});
		const result3 = updateTypography({});

		expect(E.isRight(result1)).toBe(true);
		expect(E.isRight(result2)).toBe(true);
		expect(E.isRight(result3)).toBe(true);

		// 不应该调用任何 store 方法
		expect(mockFontStore.setFontFamily).not.toHaveBeenCalled();
		expect(mockFontStore.setUiFontFamily).not.toHaveBeenCalled();
		expect(mockFontStore.setCardSize).not.toHaveBeenCalled();
	});

	it("应该处理 undefined 值", () => {
		const result1 = updateEditorFont({
			fontFamily: undefined,
			fontSize: undefined,
		});
		const result2 = updateUiFont({
			uiFontFamily: undefined,
			uiFontSize: undefined,
		});
		const result3 = updateTypography({
			cardSize: undefined,
			cardBorderRadius: undefined,
		});

		expect(E.isRight(result1)).toBe(true);
		expect(E.isRight(result2)).toBe(true);
		expect(E.isRight(result3)).toBe(true);
	});

	it("应该处理特殊字符的字体族名称", () => {
		const result1 = updateEditorFont({ fontFamily: "Source Code Pro-Regular" });
		const result2 = updateUiFont({ uiFontFamily: "SF Pro Display Medium" });

		expect(E.isRight(result1)).toBe(true);
		expect(E.isRight(result2)).toBe(true);
	});

	it("应该处理 Unicode 字符的字体族名称", () => {
		const result1 = updateEditorFont({ fontFamily: "思源黑体" });
		const result2 = updateUiFont({ uiFontFamily: "苹方-简" });

		expect(E.isRight(result1)).toBe(true);
		expect(E.isRight(result2)).toBe(true);
	});
});
