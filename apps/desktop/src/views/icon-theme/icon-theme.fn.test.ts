/**
 * @file icon-theme.fn.test.ts
 * @description 图标主题纯函数的单元测试
 *
 * 测试覆盖：
 * - 主题查询函数
 * - 图标获取函数
 * - 主题验证函数
 */

import { describe, expect, it } from "vitest";
import {
	getActivityBarIconFromTheme,
	getAllIconThemes,
	getDefaultIconTheme,
	getIconForTypeFromTheme,
	getIconThemeByKey,
	getIconThemeCount,
	getIconThemeOrDefault,
	getSettingsPageIconFromTheme,
	getValidIconThemeKey,
	isValidIconThemeKey,
} from "./icon-theme.fn";

// ============================================================================
// getIconThemeByKey
// ============================================================================

describe("getIconThemeByKey", () => {
	it("应该返回匹配的主题", () => {
		const theme = getIconThemeByKey("default");
		expect(theme).toBeDefined();
		expect(theme?.key).toBe("default");
		expect(theme?.name).toBe("Default");
	});

	it("应该返回 minimal 主题", () => {
		const theme = getIconThemeByKey("minimal");
		expect(theme).toBeDefined();
		expect(theme?.key).toBe("minimal");
		expect(theme?.name).toBe("Minimal");
	});

	it("应该对无效 key 返回 undefined", () => {
		const theme = getIconThemeByKey("non-existent-theme");
		expect(theme).toBeUndefined();
	});

	it("应该对空字符串返回 undefined", () => {
		const theme = getIconThemeByKey("");
		expect(theme).toBeUndefined();
	});
});

// ============================================================================
// getDefaultIconTheme
// ============================================================================

describe("getDefaultIconTheme", () => {
	it("应该返回默认主题", () => {
		const theme = getDefaultIconTheme();
		expect(theme).toBeDefined();
		expect(theme.key).toBe("default");
	});

	it("应该返回完整的主题对象", () => {
		const theme = getDefaultIconTheme();
		expect(theme.name).toBeDefined();
		expect(theme.description).toBeDefined();
		expect(theme.author).toBeDefined();
		expect(theme.icons).toBeDefined();
	});

	it("应该包含所有必需的图标类型", () => {
		const theme = getDefaultIconTheme();
		expect(theme.icons.project).toBeDefined();
		expect(theme.icons.folder).toBeDefined();
		expect(theme.icons.file).toBeDefined();
		expect(theme.icons.character).toBeDefined();
		expect(theme.icons.world).toBeDefined();
		expect(theme.icons.activityBar).toBeDefined();
		expect(theme.icons.settingsPage).toBeDefined();
	});
});

// ============================================================================
// getAllIconThemes
// ============================================================================

describe("getAllIconThemes", () => {
	it("应该返回所有主题数组", () => {
		const themes = getAllIconThemes();
		expect(Array.isArray(themes)).toBe(true);
		expect(themes.length).toBeGreaterThan(0);
	});

	it("应该包含默认主题", () => {
		const themes = getAllIconThemes();
		const defaultTheme = themes.find((t) => t.key === "default");
		expect(defaultTheme).toBeDefined();
	});

	it("应该包含所有预定义主题", () => {
		const themes = getAllIconThemes();
		const expectedKeys = [
			"default",
			"minimal",
			"classic",
			"modern",
			"elegant",
			"writer",
			"technical",
			"nature",
			"code",
			"business",
			"creative",
			"academic",
			"hardware",
			"tools",
			"shapes",
			"love",
			"night",
		];

		for (const key of expectedKeys) {
			const theme = themes.find((t) => t.key === key);
			expect(theme).toBeDefined();
		}
	});
});

// ============================================================================
// getIconThemeCount
// ============================================================================

describe("getIconThemeCount", () => {
	it("应该返回正确的主题数量", () => {
		const count = getIconThemeCount();
		expect(count).toBe(17);
	});

	it("应该与 getAllIconThemes 长度一致", () => {
		const count = getIconThemeCount();
		const themes = getAllIconThemes();
		expect(count).toBe(themes.length);
	});
});

// ============================================================================
// getIconForTypeFromTheme
// ============================================================================

describe("getIconForTypeFromTheme", () => {
	it("应该返回默认状态的图标", () => {
		const theme = getDefaultIconTheme();
		const icon = getIconForTypeFromTheme(theme, "folder", "default");
		expect(icon).toBeDefined();
	});

	it("应该返回打开状态的图标", () => {
		const theme = getDefaultIconTheme();
		const icon = getIconForTypeFromTheme(theme, "folder", "open");
		expect(icon).toBeDefined();
	});

	it("应该在无打开状态时返回默认图标", () => {
		const theme = getDefaultIconTheme();
		const defaultIcon = getIconForTypeFromTheme(theme, "file", "default");
		const openIcon = getIconForTypeFromTheme(theme, "file", "open");
		// file 类型没有 open 状态，应该返回 default
		expect(openIcon).toBe(defaultIcon);
	});

	it("应该正确处理所有图标类型", () => {
		const theme = getDefaultIconTheme();
		const types = ["project", "character", "world", "folder", "file"] as const;

		for (const type of types) {
			const icon = getIconForTypeFromTheme(theme, type);
			expect(icon).toBeDefined();
		}
	});

	it("应该默认使用 default 状态", () => {
		const theme = getDefaultIconTheme();
		const iconWithState = getIconForTypeFromTheme(theme, "folder", "default");
		const iconWithoutState = getIconForTypeFromTheme(theme, "folder");
		expect(iconWithState).toBe(iconWithoutState);
	});
});

// ============================================================================
// getActivityBarIconFromTheme
// ============================================================================

describe("getActivityBarIconFromTheme", () => {
	it("应该返回 ActivityBar 图标", () => {
		const theme = getDefaultIconTheme();
		const icon = getActivityBarIconFromTheme(theme, "library");
		expect(icon).toBeDefined();
	});

	it("应该正确处理所有 ActivityBar 图标类型", () => {
		const theme = getDefaultIconTheme();
		const types = [
			"library",
			"search",
			"outline",
			"canvas",
			"chapters",
			"files",
			"diary",
			"tags",
			"statistics",
			"settings",
			"create",
			"import",
			"export",
			"more",
		] as const;

		for (const type of types) {
			const icon = getActivityBarIconFromTheme(theme, type);
			expect(icon).toBeDefined();
		}
	});
});

// ============================================================================
// getSettingsPageIconFromTheme
// ============================================================================

describe("getSettingsPageIconFromTheme", () => {
	it("应该返回 SettingsPage 图标", () => {
		const theme = getDefaultIconTheme();
		const icon = getSettingsPageIconFromTheme(theme, "appearance");
		expect(icon).toBeDefined();
	});

	it("应该正确处理所有 SettingsPage 图标类型", () => {
		const theme = getDefaultIconTheme();
		const types = [
			"appearance",
			"icons",
			"diagrams",
			"general",
			"editor",
			"data",
			"export",
			"scroll",
			"logs",
			"about",
		] as const;

		for (const type of types) {
			const icon = getSettingsPageIconFromTheme(theme, type);
			expect(icon).toBeDefined();
		}
	});
});

// ============================================================================
// isValidIconThemeKey
// ============================================================================

describe("isValidIconThemeKey", () => {
	it("应该对有效 key 返回 true", () => {
		expect(isValidIconThemeKey("default")).toBe(true);
		expect(isValidIconThemeKey("minimal")).toBe(true);
		expect(isValidIconThemeKey("classic")).toBe(true);
	});

	it("应该对无效 key 返回 false", () => {
		expect(isValidIconThemeKey("invalid-key")).toBe(false);
		expect(isValidIconThemeKey("")).toBe(false);
		expect(isValidIconThemeKey("DEFAULT")).toBe(false); // 区分大小写
	});

	it("应该对所有预定义主题返回 true", () => {
		const themes = getAllIconThemes();
		for (const theme of themes) {
			expect(isValidIconThemeKey(theme.key)).toBe(true);
		}
	});
});

// ============================================================================
// getValidIconThemeKey
// ============================================================================

describe("getValidIconThemeKey", () => {
	it("应该对有效 key 返回原值", () => {
		expect(getValidIconThemeKey("default")).toBe("default");
		expect(getValidIconThemeKey("minimal")).toBe("minimal");
	});

	it("应该对无效 key 返回默认主题 key", () => {
		const defaultKey = getDefaultIconTheme().key;
		expect(getValidIconThemeKey("invalid")).toBe(defaultKey);
		expect(getValidIconThemeKey("")).toBe(defaultKey);
	});
});

// ============================================================================
// getIconThemeOrDefault
// ============================================================================

describe("getIconThemeOrDefault", () => {
	it("应该对有效 key 返回对应主题", () => {
		const theme = getIconThemeOrDefault("minimal");
		expect(theme.key).toBe("minimal");
	});

	it("应该对无效 key 返回默认主题", () => {
		const theme = getIconThemeOrDefault("invalid-key");
		expect(theme.key).toBe("default");
	});

	it("应该对空字符串返回默认主题", () => {
		const theme = getIconThemeOrDefault("");
		expect(theme.key).toBe("default");
	});

	it("应该始终返回有效的主题对象", () => {
		const theme = getIconThemeOrDefault("any-random-string");
		expect(theme).toBeDefined();
		expect(theme.key).toBeDefined();
		expect(theme.icons).toBeDefined();
	});
});

// ============================================================================
// 纯函数特性测试
// ============================================================================

describe("纯函数特性", () => {
	it("相同输入应该产生相同输出", () => {
		const result1 = getIconThemeByKey("default");
		const result2 = getIconThemeByKey("default");
		expect(result1).toEqual(result2);
	});

	it("getAllIconThemes 多次调用应该返回相同结果", () => {
		const themes1 = getAllIconThemes();
		const themes2 = getAllIconThemes();
		expect(themes1).toEqual(themes2);
	});

	it("getIconThemeCount 多次调用应该返回相同结果", () => {
		const count1 = getIconThemeCount();
		const count2 = getIconThemeCount();
		expect(count1).toBe(count2);
	});
});

// ============================================================================
// 边界情况测试
// ============================================================================

describe("边界情况", () => {
	it("应该处理特殊字符的 key", () => {
		expect(getIconThemeByKey("default!@#$")).toBeUndefined();
		expect(isValidIconThemeKey("default!@#$")).toBe(false);
	});

	it("应该处理空白字符的 key", () => {
		expect(getIconThemeByKey(" default ")).toBeUndefined();
		expect(isValidIconThemeKey(" ")).toBe(false);
	});

	it("应该处理数字 key", () => {
		expect(getIconThemeByKey("123")).toBeUndefined();
		expect(isValidIconThemeKey("123")).toBe(false);
	});
});
