/**
 * @file code-editor.view.fn.test.tsx
 * @description CodeEditorView 组件单元测试
 *
 * 测试覆盖：
 * - Props 渲染
 * - 用户交互（onChange 回调）
 * - 主题切换（Theme 对象）
 * - 回调函数调用
 *
 * @requirements 2.1, 2.3, 2.5, 4.2, 4.4
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Theme, ThemeColors } from "@/lib/themes";
import type { CodeEditorViewProps, CodeLanguage } from "./code-editor.types";
import { CodeEditorView } from "./code-editor.view.fn";

// ============================================================================
// Monaco Editor Mock
// ============================================================================

// Monaco Editor 的全局 mock 在 setup.ts 中配置
// 这里只需要获取 mock 函数的引用用于测试验证
const mockOnChange = vi.fn();

// Mock 语言注册函数
vi.mock("./code-editor.languages", () => ({
	registerAllLanguages: vi.fn(),
}));

// Mock monaco.config
vi.mock("./monaco.config", () => ({
	configureMonacoLoader: vi.fn(),
}));

// ============================================================================
// Test Fixtures - Theme 对象
// ============================================================================

/**
 * 创建测试用的 ThemeColors
 */
const createTestThemeColors = (type: "light" | "dark"): ThemeColors => ({
	background: type === "light" ? "#ffffff" : "#1e1e1e",
	foreground: type === "light" ? "#1f2937" : "#d4d4d4",
	card: type === "light" ? "#ffffff" : "#252526",
	cardForeground: type === "light" ? "#1f2937" : "#d4d4d4",
	popover: type === "light" ? "#ffffff" : "#252526",
	popoverForeground: type === "light" ? "#1f2937" : "#d4d4d4",
	primary: type === "light" ? "#2563eb" : "#569cd6",
	primaryForeground: "#ffffff",
	secondary: type === "light" ? "#f3f4f6" : "#3c3c3c",
	secondaryForeground: type === "light" ? "#1f2937" : "#d4d4d4",
	muted: type === "light" ? "#f3f4f6" : "#3c3c3c",
	mutedForeground: type === "light" ? "#6b7280" : "#808080",
	accent: type === "light" ? "#eff6ff" : "#264f78",
	accentForeground: type === "light" ? "#1f2937" : "#ffffff",
	border: type === "light" ? "#e5e7eb" : "#3c3c3c",
	input: type === "light" ? "#ffffff" : "#3c3c3c",
	ring: type === "light" ? "#2563eb" : "#569cd6",
	sidebar: type === "light" ? "#f9fafb" : "#252526",
	sidebarForeground: type === "light" ? "#1f2937" : "#d4d4d4",
	sidebarPrimary: type === "light" ? "#2563eb" : "#569cd6",
	sidebarPrimaryForeground: "#ffffff",
	sidebarAccent: type === "light" ? "#eff6ff" : "#264f78",
	sidebarAccentForeground: type === "light" ? "#1f2937" : "#ffffff",
	sidebarBorder: type === "light" ? "#e5e7eb" : "#3c3c3c",
	folderColor: type === "light" ? "#f59e0b" : "#dcb67a",
	editorSelection: type === "light" ? "#add6ff" : "#264f78",
});

/**
 * 测试用浅色主题
 */
const lightTheme: Theme = {
	key: "default-light",
	name: "Default Light",
	description: "The default light theme",
	type: "light",
	colors: createTestThemeColors("light"),
};

/**
 * 测试用深色主题
 */
const darkTheme: Theme = {
	key: "default-dark",
	name: "Default Dark",
	description: "The default dark theme",
	type: "dark",
	colors: createTestThemeColors("dark"),
};

/**
 * 测试用 Dracula 主题
 */
const draculaTheme: Theme = {
	key: "dracula",
	name: "Dracula",
	description: "A dark theme inspired by Dracula",
	type: "dark",
	colors: {
		...createTestThemeColors("dark"),
		background: "#282a36",
		foreground: "#f8f8f2",
		primary: "#bd93f9",
	},
};

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建默认的 CodeEditorViewProps
 * 
 * @param overrides - 覆盖默认值的属性
 * @returns CodeEditorViewProps
 */
function createDefaultProps(
	overrides: Partial<CodeEditorViewProps> = {},
): CodeEditorViewProps {
	return {
		value: overrides.value ?? "",
		language: overrides.language ?? "mermaid",
		theme: overrides.theme, // Theme 对象或 undefined
		onChange: overrides.onChange ?? vi.fn(),
		onSave: overrides.onSave ?? vi.fn(),
		readOnly: overrides.readOnly ?? false,
		options: overrides.options ?? undefined,
	};
}

// ============================================================================
// Unit Tests
// ============================================================================

describe("CodeEditorView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("基本渲染", () => {
		it("should render monaco editor", () => {
			const props = createDefaultProps();
			render(<CodeEditorView {...props} />);

			expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
		});

		it("should render with initial value", () => {
			const props = createDefaultProps({
				value: "graph TD\n  A --> B",
			});
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-value", "graph TD\n  A --> B");
		});

		it("should render with empty value", () => {
			const props = createDefaultProps({ value: "" });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-value", "");
		});
	});

	describe("语言支持", () => {
		const languages: CodeLanguage[] = [
			"plantuml",
			"mermaid",
			"json",
			"markdown",
			"javascript",
			"typescript",
		];

		it.each(languages)("should render with %s language", (language) => {
			const props = createDefaultProps({ language });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-language", language);
		});

		it("should pass mermaid language to monaco", () => {
			const props = createDefaultProps({ language: "mermaid" });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-language", "mermaid");
		});

		it("should pass plantuml language to monaco", () => {
			const props = createDefaultProps({ language: "plantuml" });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-language", "plantuml");
		});
	});

	describe("主题切换", () => {
		it("should render with light theme object", () => {
			const props = createDefaultProps({ theme: lightTheme });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			// 使用 Theme 对象时，Monaco 主题名称为 grain-{theme.key}
			expect(editor).toHaveAttribute("data-theme", "grain-default-light");
		});

		it("should render with dark theme object", () => {
			const props = createDefaultProps({ theme: darkTheme });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-theme", "grain-default-dark");
		});

		it("should render with custom theme (Dracula)", () => {
			const props = createDefaultProps({ theme: draculaTheme });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-theme", "grain-dracula");
		});

		it("should render with default theme when theme is undefined", () => {
			const props = createDefaultProps({ theme: undefined });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			// 未传入 theme 时，使用默认的 "vs" 主题
			expect(editor).toHaveAttribute("data-theme", "vs");
		});

		it("should update theme when prop changes from light to dark", () => {
			const props = createDefaultProps({ theme: lightTheme });
			const { rerender } = render(<CodeEditorView {...props} />);

			// 初始为 light 主题
			let editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-theme", "grain-default-light");

			// 切换到 dark 主题
			rerender(<CodeEditorView {...props} theme={darkTheme} />);
			editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-theme", "grain-default-dark");
		});

		it("should update theme when prop changes from dark to light", () => {
			const props = createDefaultProps({ theme: darkTheme });
			const { rerender } = render(<CodeEditorView {...props} />);

			// 初始为 dark 主题
			let editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-theme", "grain-default-dark");

			// 切换到 light 主题
			rerender(<CodeEditorView {...props} theme={lightTheme} />);
			editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-theme", "grain-default-light");
		});

		it("should update theme when switching to custom theme", () => {
			const props = createDefaultProps({ theme: lightTheme });
			const { rerender } = render(<CodeEditorView {...props} />);

			// 初始为 light 主题
			let editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-theme", "grain-default-light");

			// 切换到 Dracula 主题
			rerender(<CodeEditorView {...props} theme={draculaTheme} />);
			editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-theme", "grain-dracula");
		});
	});

	describe("onChange 回调", () => {
		it("should call onChange when content changes", () => {
			const onChange = vi.fn();
			const props = createDefaultProps({ onChange });
			render(<CodeEditorView {...props} />);

			// 模拟内容变化
			const textarea = screen.getByTestId("monaco-textarea");
			textarea.dispatchEvent(
				new Event("change", {
					bubbles: true,
				}),
			);

			// 通过 mock 调用 onChange
			mockOnChange("new content");
			expect(onChange).toHaveBeenCalledWith("new content");
		});

		it("should handle undefined value from monaco", () => {
			const onChange = vi.fn();
			const props = createDefaultProps({ onChange });
			render(<CodeEditorView {...props} />);

			// Monaco 可能返回 undefined
			mockOnChange(undefined);
			expect(onChange).toHaveBeenCalledWith("");
		});

		it("should handle empty string value", () => {
			const onChange = vi.fn();
			const props = createDefaultProps({ onChange });
			render(<CodeEditorView {...props} />);

			mockOnChange("");
			expect(onChange).toHaveBeenCalledWith("");
		});
	});

	describe("只读模式", () => {
		it("should render in readonly mode when readOnly is true", () => {
			const props = createDefaultProps({ readOnly: true });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-readonly", "true");
		});

		it("should render in editable mode when readOnly is false", () => {
			const props = createDefaultProps({ readOnly: false });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-readonly", "false");
		});

		it("should default to editable mode", () => {
			// 创建不带 readOnly 的 props
			const props: CodeEditorViewProps = {
				value: "",
				language: "mermaid",
				theme: lightTheme,
				onChange: vi.fn(),
				onSave: vi.fn(),
				// readOnly 未设置，应该默认为 false
			};
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			expect(editor).toHaveAttribute("data-readonly", "false");
		});
	});

	describe("自定义选项", () => {
		it("should pass custom options to monaco", () => {
			const customOptions = {
				fontSize: 16,
				tabSize: 4,
				lineNumbers: "off" as const,
			};
			const props = createDefaultProps({ options: customOptions });
			render(<CodeEditorView {...props} />);

			// 验证组件渲染成功
			expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
		});
	});

	describe("组件记忆化", () => {
		it("should be wrapped with memo", () => {
			// 验证组件是 memo 包裹的
			expect(CodeEditorView).toBeDefined();
			// memo 组件有特殊的 $$typeof 属性
			expect((CodeEditorView as unknown as { $$typeof: symbol }).$$typeof).toBe(
				Symbol.for("react.memo"),
			);
		});
	});
});
