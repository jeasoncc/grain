/**
 * ExcalidrawEditorView 组件测试
 *
 * @requirements 7.1
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExcalidrawEditorViewProps } from "./excalidraw-editor.types";
import { ExcalidrawEditorView } from "./excalidraw-editor.view.fn";

// Mock Excalidraw 组件
vi.mock("@excalidraw/excalidraw", () => ({
	Excalidraw: vi.fn(({ theme, viewModeEnabled }) => (
		<div
			data-testid="excalidraw-mock"
			data-theme={theme}
			data-view-mode={viewModeEnabled?.toString()}
		>
			Excalidraw Mock
		</div>
	)),
}));

// 测试辅助函数：创建测试数据
function createTestData() {
	return {
		elements: [],
		appState: { viewBackgroundColor: "#ffffff" },
		files: {},
	};
}

describe("ExcalidrawEditorView", () => {
	const defaultProps: ExcalidrawEditorViewProps = {
		initialData: createTestData(),
		theme: "light",
		onChange: vi.fn(),
		containerSize: { width: 800, height: 600 },
	};

	it("should render loading state when initialData is null", () => {
		render(<ExcalidrawEditorView {...defaultProps} initialData={null} />);
		expect(screen.getByText("Loading...")).toBeInTheDocument();
	});

	it("should render Excalidraw when initialData is provided", () => {
		render(<ExcalidrawEditorView {...defaultProps} />);
		expect(screen.getByTestId("excalidraw-mock")).toBeInTheDocument();
	});

	it("should pass theme prop to Excalidraw", () => {
		render(<ExcalidrawEditorView {...defaultProps} theme="dark" />);
		const excalidraw = screen.getByTestId("excalidraw-mock");
		expect(excalidraw).toHaveAttribute("data-theme", "dark");
	});

	it("should pass light theme to Excalidraw", () => {
		render(<ExcalidrawEditorView {...defaultProps} theme="light" />);
		const excalidraw = screen.getByTestId("excalidraw-mock");
		expect(excalidraw).toHaveAttribute("data-theme", "light");
	});

	it("should pass viewModeEnabled prop to Excalidraw", () => {
		render(<ExcalidrawEditorView {...defaultProps} viewModeEnabled={true} />);
		const excalidraw = screen.getByTestId("excalidraw-mock");
		expect(excalidraw).toHaveAttribute("data-view-mode", "true");
	});

	it("should default viewModeEnabled to false", () => {
		render(<ExcalidrawEditorView {...defaultProps} />);
		const excalidraw = screen.getByTestId("excalidraw-mock");
		expect(excalidraw).toHaveAttribute("data-view-mode", "false");
	});

	it("should apply custom className", () => {
		const { container } = render(
			<div className="custom-class">
				<ExcalidrawEditorView {...defaultProps} />
			</div>,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper).toHaveClass("custom-class");
	});

	it("should apply className to loading state", () => {
		const { container } = render(
			<div className="custom-class">
				<ExcalidrawEditorView {...defaultProps} initialData={null} />
			</div>,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper).toHaveClass("custom-class");
	});
});
