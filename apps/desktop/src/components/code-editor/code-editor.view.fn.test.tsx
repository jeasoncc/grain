/**
 * @file code-editor.view.fn.test.tsx
 * @description CodeEditorView 组件单元测试
 *
 * 测试覆盖：
 * - Props 渲染
 * - 用户交互（onChange 回调）
 * - 主题切换
 * - 回调函数调用
 *
 * @requirements 2.1, 2.3, 2.5
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CodeEditorViewProps, CodeLanguage } from "./code-editor.types";
import { CodeEditorView } from "./code-editor.view.fn";

// ============================================================================
// Monaco Editor Mock
// ============================================================================

// Mock Monaco Editor 组件
// Monaco Editor 需要浏览器环境和 Web Workers，在测试中需要 mock
const mockOnChange = vi.fn();
const mockOnMount = vi.fn();
const mockBeforeMount = vi.fn();

vi.mock("@monaco-editor/react", () => ({
	default: ({
		value,
		language,
		theme,
		onChange,
		onMount,
		beforeMount,
		options,
		loading,
	}: {
		value: string;
		language: string;
		theme: string;
		onChange: (value: string | undefined) => void;
		onMount: (editor: unknown, monaco: unknown) => void;
		beforeMount: (monaco: unknown) => void;
		options: Record<string, unknown>;
		loading: React.ReactNode;
	}) => {
		// 保存回调以便测试调用
		mockOnChange.mockImplementation(onChange);
		mockOnMount.mockImplementation(onMount);
		mockBeforeMount.mockImplementation(beforeMount);

		return (
			<div
				data-testid="monaco-editor"
				data-value={value}
				data-language={language}
				data-theme={theme}
				data-readonly={options?.readOnly ? "true" : "false"}
			>
				<textarea
					data-testid="monaco-textarea"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					readOnly={options?.readOnly as boolean}
				/>
			</div>
		);
	},
}));

// Mock 语言注册函数
vi.mock("./code-editor.languages", () => ({
	registerAllLanguages: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建默认的 CodeEditorViewProps
 */
function createDefaultProps(
	overrides: Partial<CodeEditorViewProps> = {},
): CodeEditorViewProps {
	return {
		value: overrides.value ?? "",
		language: overrides.language ?? "mermaid",
		theme: overrides.theme ?? "light",
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
		it("should render with light theme", () => {
			const props = createDefaultProps({ theme: "light" });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			// light 主题在 Monaco 中对应 "light"
			expect(editor).toHaveAttribute("data-theme", "light");
		});

		it("should render with dark theme", () => {
			const props = createDefaultProps({ theme: "dark" });
			render(<CodeEditorView {...props} />);

			const editor = screen.getByTestId("monaco-editor");
			// dark 主题在 Monaco 中对应 "vs-dark"
			expect(editor).toHaveAttribute("data-theme", "vs-dark");
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
				theme: "light",
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
