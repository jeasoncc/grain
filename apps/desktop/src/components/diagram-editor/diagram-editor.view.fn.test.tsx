/**
 * @file diagram-editor.view.fn.test.tsx
 * @description DiagramEditorView 组件单元测试
 *
 * 测试覆盖：
 * - PanelGroup 布局渲染
 * - resize handle 渲染
 * - 面板尺寸限制
 * - Kroki 未配置状态
 * - 主题传递
 *
 * @requirements 4.3, 4.4
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Theme, ThemeColors } from "@/lib/themes";
import type { DiagramEditorViewProps } from "./diagram-editor.types";
import { DiagramEditorView } from "./diagram-editor.view.fn";

// ============================================================================
// Mocks
// ============================================================================

// Mock CodeEditorView
vi.mock("@/components/code-editor", () => ({
	CodeEditorView: vi.fn(({ value, language, theme }) => {
		const React = require("react");
		return React.createElement("div", {
			"data-testid": "code-editor-view",
			"data-value": value,
			"data-language": language,
			"data-theme": theme?.key || "default",
		});
	}),
}));

// Mock DiagramPreviewView
vi.mock("./diagram-preview.view.fn", () => ({
	DiagramPreviewView: vi.fn(({ previewSvg, isLoading, error, className }) => {
		const React = require("react");
		return React.createElement("div", {
			"data-testid": "diagram-preview-view",
			"data-loading": isLoading ? "true" : "false",
			"data-has-error": error ? "true" : "false",
			"data-has-svg": previewSvg ? "true" : "false",
			className,
		});
	}),
}));

// Mock react-resizable-panels
vi.mock("react-resizable-panels", () => ({
	PanelGroup: vi.fn(
		({ children, direction, autoSaveId, className, ...props }) => {
			const React = require("react");
			return React.createElement(
				"div",
				{
					"data-testid": "panel-group",
					"data-direction": direction,
					"data-auto-save-id": autoSaveId,
					className,
					...props,
				},
				children,
			);
		},
	),
	Panel: vi.fn(
		({ children, id, order, defaultSize, minSize, maxSize, className }) => {
			const React = require("react");
			return React.createElement(
				"div",
				{
					"data-testid": `panel-${id}`,
					"data-panel-id": id,
					"data-order": order,
					"data-default-size": defaultSize,
					"data-min-size": minSize,
					"data-max-size": maxSize,
					className,
				},
				children,
			);
		},
	),
	PanelResizeHandle: vi.fn(({ className, ...props }) => {
		const React = require("react");
		return React.createElement("div", {
			"data-testid": "panel-resize-handle",
			className,
			...props,
		});
	}),
}));

// ============================================================================
// Test Fixtures
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

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建默认的 DiagramEditorViewProps
 */
function createDefaultProps(
	overrides: Partial<DiagramEditorViewProps> = {},
): DiagramEditorViewProps {
	return {
		code: overrides.code ?? "graph TD\n  A --> B",
		diagramType: overrides.diagramType ?? "mermaid",
		previewSvg: overrides.previewSvg ?? "<svg></svg>",
		isLoading: overrides.isLoading ?? false,
		error: overrides.error ?? null,
		isKrokiConfigured: overrides.isKrokiConfigured ?? true,
		theme: overrides.theme,
		onCodeChange: overrides.onCodeChange ?? vi.fn(),
		onSave: overrides.onSave ?? vi.fn(),
		onOpenSettings: overrides.onOpenSettings ?? vi.fn(),
		onRetry: overrides.onRetry ?? vi.fn(),
	};
}

// ============================================================================
// Unit Tests
// ============================================================================

describe("DiagramEditorView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("PanelGroup 布局", () => {
		it("should render PanelGroup with horizontal direction", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const panelGroup = screen.getByTestId("diagram-editor");
			expect(panelGroup).toBeInTheDocument();
			expect(panelGroup).toHaveAttribute("data-direction", "horizontal");
		});

		it("should render PanelGroup with autoSaveId for persistence", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const panelGroup = screen.getByTestId("diagram-editor");
			expect(panelGroup).toHaveAttribute(
				"data-auto-save-id",
				"diagram-editor-layout",
			);
		});

		it("should render code-editor panel", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const codeEditorPanel = screen.getByTestId("panel-code-editor");
			expect(codeEditorPanel).toBeInTheDocument();
			expect(codeEditorPanel).toHaveAttribute("data-panel-id", "code-editor");
		});

		it("should render preview panel", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const previewPanel = screen.getByTestId("panel-preview");
			expect(previewPanel).toBeInTheDocument();
			expect(previewPanel).toHaveAttribute("data-panel-id", "preview");
		});

		it("should render CodeEditorView inside code-editor panel", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const codeEditor = screen.getByTestId("code-editor-view");
			expect(codeEditor).toBeInTheDocument();
		});

		it("should render DiagramPreviewView inside preview panel", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const preview = screen.getByTestId("diagram-preview-view");
			expect(preview).toBeInTheDocument();
		});
	});

	describe("resize handle", () => {
		it("should render resize handle between panels", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const resizeHandle = screen.getByTestId("diagram-editor-resize-handle");
			expect(resizeHandle).toBeInTheDocument();
		});

		it("should have correct testid for resize handle", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			// 验证 resize handle 有正确的 data-testid
			const resizeHandle = screen.getByTestId("diagram-editor-resize-handle");
			expect(resizeHandle).toBeInTheDocument();
		});

		it("should have hover styles on resize handle", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const resizeHandle = screen.getByTestId("diagram-editor-resize-handle");
			// 验证 resize handle 有 hover 相关的 CSS 类
			expect(resizeHandle.className).toContain("hover:");
		});
	});

	describe("面板尺寸限制", () => {
		it("should set code-editor panel minSize to 20", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const codeEditorPanel = screen.getByTestId("panel-code-editor");
			expect(codeEditorPanel).toHaveAttribute("data-min-size", "20");
		});

		it("should set code-editor panel maxSize to 80", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const codeEditorPanel = screen.getByTestId("panel-code-editor");
			expect(codeEditorPanel).toHaveAttribute("data-max-size", "80");
		});

		it("should set preview panel minSize to 20", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const previewPanel = screen.getByTestId("panel-preview");
			expect(previewPanel).toHaveAttribute("data-min-size", "20");
		});

		it("should set preview panel maxSize to 80", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const previewPanel = screen.getByTestId("panel-preview");
			expect(previewPanel).toHaveAttribute("data-max-size", "80");
		});

		it("should set default size to 50 for both panels", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const codeEditorPanel = screen.getByTestId("panel-code-editor");
			const previewPanel = screen.getByTestId("panel-preview");

			expect(codeEditorPanel).toHaveAttribute("data-default-size", "50");
			expect(previewPanel).toHaveAttribute("data-default-size", "50");
		});

		it("should set correct order for panels", () => {
			const props = createDefaultProps();
			render(<DiagramEditorView {...props} />);

			const codeEditorPanel = screen.getByTestId("panel-code-editor");
			const previewPanel = screen.getByTestId("panel-preview");

			expect(codeEditorPanel).toHaveAttribute("data-order", "1");
			expect(previewPanel).toHaveAttribute("data-order", "2");
		});
	});

	describe("Kroki 未配置状态", () => {
		it("should show configuration prompt when Kroki is not configured", () => {
			const props = createDefaultProps({ isKrokiConfigured: false });
			render(<DiagramEditorView {...props} />);

			// 不应该渲染 PanelGroup
			expect(screen.queryByTestId("panel-group")).not.toBeInTheDocument();

			// 应该显示配置提示
			expect(
				screen.getByText("Kroki Server Not Configured"),
			).toBeInTheDocument();
		});

		it("should show Configure Kroki button when not configured", () => {
			const props = createDefaultProps({ isKrokiConfigured: false });
			render(<DiagramEditorView {...props} />);

			expect(
				screen.getByRole("button", { name: /Configure Kroki/i }),
			).toBeInTheDocument();
		});

		it("should call onOpenSettings when Configure Kroki button is clicked", async () => {
			const onOpenSettings = vi.fn();
			const props = createDefaultProps({
				isKrokiConfigured: false,
				onOpenSettings,
			});
			render(<DiagramEditorView {...props} />);

			const button = screen.getByRole("button", { name: /Configure Kroki/i });
			button.click();

			expect(onOpenSettings).toHaveBeenCalledTimes(1);
		});
	});

	describe("主题传递", () => {
		it("should pass theme to CodeEditorView", () => {
			const props = createDefaultProps({ theme: darkTheme });
			render(<DiagramEditorView {...props} />);

			const codeEditor = screen.getByTestId("code-editor-view");
			expect(codeEditor).toHaveAttribute("data-theme", "default-dark");
		});

		it("should pass light theme to CodeEditorView", () => {
			const props = createDefaultProps({ theme: lightTheme });
			render(<DiagramEditorView {...props} />);

			const codeEditor = screen.getByTestId("code-editor-view");
			expect(codeEditor).toHaveAttribute("data-theme", "default-light");
		});

		it("should handle undefined theme", () => {
			const props = createDefaultProps({ theme: undefined });
			render(<DiagramEditorView {...props} />);

			const codeEditor = screen.getByTestId("code-editor-view");
			expect(codeEditor).toHaveAttribute("data-theme", "default");
		});
	});

	describe("Props 传递", () => {
		it("should pass code to CodeEditorView", () => {
			const code = "sequenceDiagram\n  A->>B: Hello";
			const props = createDefaultProps({ code });
			render(<DiagramEditorView {...props} />);

			const codeEditor = screen.getByTestId("code-editor-view");
			expect(codeEditor).toHaveAttribute("data-value", code);
		});

		it("should pass diagramType as language to CodeEditorView", () => {
			const props = createDefaultProps({ diagramType: "plantuml" });
			render(<DiagramEditorView {...props} />);

			const codeEditor = screen.getByTestId("code-editor-view");
			expect(codeEditor).toHaveAttribute("data-language", "plantuml");
		});

		it("should pass previewSvg to DiagramPreviewView", () => {
			const props = createDefaultProps({ previewSvg: "<svg>test</svg>" });
			render(<DiagramEditorView {...props} />);

			const preview = screen.getByTestId("diagram-preview-view");
			expect(preview).toHaveAttribute("data-has-svg", "true");
		});

		it("should pass isLoading to DiagramPreviewView", () => {
			const props = createDefaultProps({ isLoading: true });
			render(<DiagramEditorView {...props} />);

			const preview = screen.getByTestId("diagram-preview-view");
			expect(preview).toHaveAttribute("data-loading", "true");
		});

		it("should pass error to DiagramPreviewView", () => {
			const error = {
				type: "syntax" as const,
				message: "Syntax error",
				retryable: false,
				retryCount: 0,
			};
			const props = createDefaultProps({ error });
			render(<DiagramEditorView {...props} />);

			const preview = screen.getByTestId("diagram-preview-view");
			expect(preview).toHaveAttribute("data-has-error", "true");
		});
	});

	describe("组件记忆化", () => {
		it("should be wrapped with memo", () => {
			expect(DiagramEditorView).toBeDefined();
			// memo 组件的 displayName 或 $$typeof 可以用来验证
			// 对于命名函数组件，检查组件是否存在即可
			expect(typeof DiagramEditorView).toBe("object");
		});
	});
});
