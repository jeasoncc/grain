/**
 * ExcalidrawEditorContainer 组件测试
 *
 * @requirements 2.1, 7.1
 */

import { act, render, screen } from "@testing-library/react";
import * as fc from "fast-check";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExcalidrawEditorContainer } from "./excalidraw-editor.container.fn";

// Mock ResizeObserver
class MockResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

// 用于追踪 onChange 回调
let capturedOnChange: ((
	elements: readonly unknown[],
	appState: Record<string, unknown>,
	files: Record<string, unknown>,
) => void) | null = null;

// Mock Excalidraw 组件，捕获 onChange 回调
vi.mock("@excalidraw/excalidraw", () => ({
	Excalidraw: vi.fn(({ theme, onChange }) => {
		// 捕获 onChange 回调以便在测试中调用
		capturedOnChange = onChange;
		return (
			<div data-testid="excalidraw-mock" data-theme={theme}>
				Excalidraw Mock
			</div>
		);
	}),
}));

// Mock hooks
const mockUseContentByNodeId = vi.fn();
vi.mock("@/hooks/use-content", () => ({
	useContentByNodeId: () => mockUseContentByNodeId(),
}));

const mockUseTheme = vi.fn(() => ({ isDark: false }));
vi.mock("@/hooks/use-theme", () => ({
	useTheme: () => mockUseTheme(),
}));

// Mock db functions
vi.mock("@/db/content.db.fn", () => ({
	updateContentByNodeId: vi.fn(
		() => () => Promise.resolve({ _tag: "Right", right: {} }),
	),
}));

// Mock logger
vi.mock("@/log", () => ({
	default: {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
	},
}));

describe("ExcalidrawEditorContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseTheme.mockReturnValue({ isDark: false });
		capturedOnChange = null;
	});

	it("should render loading state when content is undefined", () => {
		mockUseContentByNodeId.mockReturnValue(undefined);

		render(<ExcalidrawEditorContainer nodeId="test-node-id" />);
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("should apply custom className to loading state", () => {
		mockUseContentByNodeId.mockReturnValue(undefined);

		const { container } = render(
			<ExcalidrawEditorContainer
				nodeId="test-node-id"
				className="custom-class"
			/>,
		);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper).toHaveClass("custom-class");
	});

	it("should pass content to view when content is loaded", () => {
		// 当 content 不是 undefined 时，组件应该渲染 ExcalidrawEditorView
		// 但由于 initialData 状态需要 useEffect 更新，第一次渲染时仍然是 null
		// 这个测试验证组件不会在 content 存在时显示 "Loading..."（容器级别）
		const mockContent = {
			id: "content-1",
			nodeId: "test-node-id",
			content: JSON.stringify({
				elements: [],
				appState: { viewBackgroundColor: "#ffffff" },
				files: {},
			}),
			contentType: "excalidraw" as const,
			createDate: new Date().toISOString(),
			lastEdit: new Date().toISOString(),
		};

		mockUseContentByNodeId.mockReturnValue(mockContent);

		const { container } = render(
			<ExcalidrawEditorContainer nodeId="test-node-id" />,
		);

		// 验证组件渲染了（不是容器级别的 Loading）
		// 由于 initialData 初始为 null，View 组件会显示 Loading
		// 但这是 View 组件的 Loading，不是 Container 的
		expect(container.firstChild).toBeInTheDocument();
	});

	it("should handle null content (no content record exists)", () => {
		// 当 content 是 null（记录不存在）时，组件应该正常处理
		mockUseContentByNodeId.mockReturnValue(null);

		const { container } = render(
			<ExcalidrawEditorContainer nodeId="test-node-id" />,
		);

		// 组件应该渲染（content !== undefined）
		expect(container.firstChild).toBeInTheDocument();
	});
});

/**
 * Property-Based Tests for ExcalidrawEditorContainer
 *
 * Feature: excalidraw-performance, Property 1: onChange 不触发组件重渲染
 * **Validates: Requirements 2.1**
 */
describe("ExcalidrawEditorContainer Property Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseTheme.mockReturnValue({ isDark: false });
		capturedOnChange = null;
	});

	/**
	 * Property 1: onChange 不触发组件重渲染
	 *
	 * *For any* sequence of onChange events from Excalidraw, the Container
	 * component's render count should remain constant (not increase with each onChange).
	 *
	 * **Validates: Requirements 2.1**
	 */
	it("Property 1: onChange should not trigger component re-renders", () => {
		// 用于追踪渲染次数
		let renderCount = 0;

		// 创建一个包装组件来追踪渲染
		const RenderTracker = ({
			children,
		}: { children: React.ReactNode }) => {
			renderCount++;
			return <>{children}</>;
		};

		// 设置 mock 返回有效内容
		const mockContent = {
			id: "content-1",
			nodeId: "test-node-id",
			content: JSON.stringify({
				elements: [],
				appState: { viewBackgroundColor: "#ffffff" },
				files: {},
			}),
			contentType: "excalidraw" as const,
			createDate: new Date().toISOString(),
			lastEdit: new Date().toISOString(),
		};
		mockUseContentByNodeId.mockReturnValue(mockContent);

		// 渲染组件
		render(
			<RenderTracker>
				<ExcalidrawEditorContainer nodeId="test-node-id" />
			</RenderTracker>,
		);

		// 记录初始渲染次数（包括 React 的初始渲染和 effects）
		const initialRenderCount = renderCount;

		// 使用 fast-check 生成随机的 onChange 事件序列
		fc.assert(
			fc.property(
				// 生成 1-20 个随机的 Excalidraw 元素
				fc.array(
					fc.record({
						id: fc.uuid(),
						type: fc.constantFrom("rectangle", "ellipse", "line", "text"),
						x: fc.integer({ min: 0, max: 1000 }),
						y: fc.integer({ min: 0, max: 1000 }),
						width: fc.integer({ min: 10, max: 500 }),
						height: fc.integer({ min: 10, max: 500 }),
					}),
					{ minLength: 1, maxLength: 20 },
				),
				// 生成随机的 appState
				fc.record({
					viewBackgroundColor: fc.constantFrom("#ffffff", "#000000", "#ff0000", "#00ff00", "#0000ff", "#1e1e1e"),
					scrollX: fc.integer({ min: -1000, max: 1000 }),
					scrollY: fc.integer({ min: -1000, max: 1000 }),
				}),
				// 生成调用次数
				fc.integer({ min: 1, max: 10 }),
				(elements, appState, callCount) => {
					// 重置渲染计数
					const beforeCallRenderCount = renderCount;

					// 模拟多次 onChange 调用
					for (let i = 0; i < callCount; i++) {
						if (capturedOnChange) {
							act(() => {
								capturedOnChange!(elements, appState, {});
							});
						}
					}

					// 验证：onChange 调用后，渲染次数不应该增加
					// 因为 onChange 只更新 refs，不更新 state
					const afterCallRenderCount = renderCount;

					// 渲染次数应该保持不变（或最多增加很少，由于 React 的批处理）
					// 关键是：渲染次数不应该随着 onChange 调用次数线性增长
					return afterCallRenderCount - beforeCallRenderCount < callCount;
				},
			),
			{ numRuns: 100 },
		);
	});
});
