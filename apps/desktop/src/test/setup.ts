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
