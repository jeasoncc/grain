/**
 * @file setup.ts
 * @description Vitest 测试环境配置
 */

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock document.queryCommandSupported for Monaco Editor
// Monaco Editor 需要这个 API，但在 jsdom 中不可用
if (typeof document !== "undefined") {
	document.queryCommandSupported =
		document.queryCommandSupported || (() => false);
}

// Mock Monaco Editor 模块
// Monaco Editor 需要浏览器环境和 Web Workers，在测试中需要 mock
vi.mock("monaco-editor", () => ({
	editor: {
		create: vi.fn(),
		setTheme: vi.fn(),
	},
	languages: {
		register: vi.fn(),
		setMonarchTokensProvider: vi.fn(),
	},
	KeyMod: {
		CtrlCmd: 2048,
	},
	KeyCode: {
		KeyS: 49,
	},
}));

// Mock @monaco-editor/react
vi.mock("@monaco-editor/react", () => ({
	default: vi.fn(({ value, language, theme, onChange, options }) => {
		const React = require("react");
		return React.createElement(
			"div",
			{
				"data-testid": "monaco-editor",
				"data-value": value,
				"data-language": language,
				// theme 现在是 Monaco 主题名称字符串（如 "grain-dracula" 或 "vs"）
				"data-theme": theme,
				"data-readonly": options?.readOnly ? "true" : "false",
			},
			React.createElement("textarea", {
				"data-testid": "monaco-textarea",
				value: value,
				onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
					onChange?.(e.target.value),
				readOnly: options?.readOnly,
			}),
		);
	}),
	loader: {
		config: vi.fn(),
	},
}));

// Mock monaco-theme.fn 模块
vi.mock("@/components/code-editor/monaco-theme.fn", () => ({
	registerMonacoTheme: vi.fn((_monaco, theme) => `grain-${theme?.key || "default"}`),
	getMonacoThemeName: vi.fn((key) => `grain-${key}`),
	generateMonacoTheme: vi.fn(),
	clearRegisteredThemes: vi.fn(),
	isThemeRegistered: vi.fn(() => false),
}));
