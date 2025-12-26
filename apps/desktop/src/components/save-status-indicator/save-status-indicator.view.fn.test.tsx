/**
 * @file save-status-indicator.view.fn.test.tsx
 * @description SaveStatusIndicatorView 组件单元测试
 *
 * 测试覆盖：
 * - 组件渲染
 * - 不同保存状态显示
 * - 手动保存状态
 * - 最后保存时间显示
 * - 错误信息显示
 *
 * @requirements 7.2
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaveStatusIndicatorView } from "./save-status-indicator.view.fn";
import type { SaveStatusIndicatorViewProps } from "./save-status-indicator.types";

// ============================================================================
// Unit Tests
// ============================================================================

describe("SaveStatusIndicatorView", () => {
	const defaultProps: SaveStatusIndicatorViewProps = {
		status: "saved",
		lastSaveTime: null,
		errorMessage: null,
		hasUnsavedChanges: false,
		isManualSaving: false,
	};

	describe("基本渲染", () => {
		it("should render with default props", () => {
			render(<SaveStatusIndicatorView {...defaultProps} />);

			// 应该显示 "Saved" 文本
			expect(screen.getByText("Saved")).toBeInTheDocument();
		});

		it("should render with custom className", () => {
			const { container } = render(
				<SaveStatusIndicatorView {...defaultProps} className="custom-class" />,
			);

			const element = container.querySelector(".custom-class");
			expect(element).toBeInTheDocument();
		});
	});

	describe("保存状态显示", () => {
		it('should display "Saved" when status is saved', () => {
			render(<SaveStatusIndicatorView {...defaultProps} status="saved" />);

			expect(screen.getByText("Saved")).toBeInTheDocument();
		});

		it('should display "Auto-saving..." when status is saving', () => {
			render(<SaveStatusIndicatorView {...defaultProps} status="saving" />);

			expect(screen.getByText("Auto-saving...")).toBeInTheDocument();
		});

		it('should display "Save failed" when status is error', () => {
			render(<SaveStatusIndicatorView {...defaultProps} status="error" />);

			expect(screen.getByText("Save failed")).toBeInTheDocument();
		});

		it('should display "Unsaved changes" when status is unsaved', () => {
			render(<SaveStatusIndicatorView {...defaultProps} status="unsaved" />);

			expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
		});

		it('should display "Unsaved changes" when saved but hasUnsavedChanges is true', () => {
			render(
				<SaveStatusIndicatorView
					{...defaultProps}
					status="saved"
					hasUnsavedChanges={true}
				/>,
			);

			expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
		});
	});

	describe("手动保存状态", () => {
		it('should display "Saving manually..." when isManualSaving is true', () => {
			render(
				<SaveStatusIndicatorView
					{...defaultProps}
					isManualSaving={true}
					status="saved"
				/>,
			);

			expect(screen.getByText("Saving manually...")).toBeInTheDocument();
		});

		it("should prioritize manual saving over other statuses", () => {
			render(
				<SaveStatusIndicatorView
					{...defaultProps}
					isManualSaving={true}
					status="error"
				/>,
			);

			// 应该显示手动保存，而不是错误状态
			expect(screen.getByText("Saving manually...")).toBeInTheDocument();
			expect(screen.queryByText("Save failed")).not.toBeInTheDocument();
		});
	});

	describe("最后保存时间显示", () => {
		it("should not display last save time by default", () => {
			const now = Date.now();
			render(
				<SaveStatusIndicatorView
					{...defaultProps}
					status="saved"
					lastSaveTime={now}
				/>,
			);

			// 不应该显示时间（因为 showLastSaveTime 默认为 false）
			expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
		});

		it('should display "just now" for recent saves', () => {
			const now = Date.now();
			render(
				<SaveStatusIndicatorView
					{...defaultProps}
					status="saved"
					lastSaveTime={now}
					showLastSaveTime={true}
				/>,
			);

			expect(screen.getByText(/just now/)).toBeInTheDocument();
		});

		it('should display "Xm ago" for saves within an hour', () => {
			const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
			render(
				<SaveStatusIndicatorView
					{...defaultProps}
					status="saved"
					lastSaveTime={fiveMinutesAgo}
					showLastSaveTime={true}
				/>,
			);

			expect(screen.getByText(/5m ago/)).toBeInTheDocument();
		});

		it("should not display time when status is not saved", () => {
			const now = Date.now();
			render(
				<SaveStatusIndicatorView
					{...defaultProps}
					status="saving"
					lastSaveTime={now}
					showLastSaveTime={true}
				/>,
			);

			// 不应该显示时间（因为状态不是 saved）
			expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
		});

		it("should not display time when lastSaveTime is null", () => {
			render(
				<SaveStatusIndicatorView
					{...defaultProps}
					status="saved"
					lastSaveTime={null}
					showLastSaveTime={true}
				/>,
			);

			// 不应该显示时间
			expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
		});
	});

	describe("错误信息显示", () => {
		it("should set title attribute with error message", () => {
			const errorMessage = "Network error occurred";
			const { container } = render(
				<SaveStatusIndicatorView
					{...defaultProps}
					status="error"
					errorMessage={errorMessage}
				/>,
			);

			const element = container.querySelector('[title="Network error occurred"]');
			expect(element).toBeInTheDocument();
		});

		it("should not set title attribute when no error message", () => {
			const { container } = render(
				<SaveStatusIndicatorView {...defaultProps} status="error" />,
			);

			const element = container.querySelector("div");
			expect(element?.getAttribute("title")).toBeNull();
		});
	});

	describe("图标显示", () => {
		it("should render Check icon when saved", () => {
			const { container } = render(
				<SaveStatusIndicatorView {...defaultProps} status="saved" />,
			);

			// Check 图标应该存在
			const svg = container.querySelector("svg");
			expect(svg).toBeInTheDocument();
		});

		it("should render Loader2 icon when saving", () => {
			const { container } = render(
				<SaveStatusIndicatorView {...defaultProps} status="saving" />,
			);

			// Loader2 图标应该存在且有 animate-spin 类
			const svg = container.querySelector("svg.animate-spin");
			expect(svg).toBeInTheDocument();
		});

		it("should render AlertCircle icon when error", () => {
			const { container } = render(
				<SaveStatusIndicatorView {...defaultProps} status="error" />,
			);

			// AlertCircle 图标应该存在
			const svg = container.querySelector("svg");
			expect(svg).toBeInTheDocument();
		});

		it("should render Save icon when unsaved", () => {
			const { container } = render(
				<SaveStatusIndicatorView {...defaultProps} status="unsaved" />,
			);

			// Save 图标应该存在
			const svg = container.querySelector("svg");
			expect(svg).toBeInTheDocument();
		});

		it("should render Loader2 icon when manually saving", () => {
			const { container } = render(
				<SaveStatusIndicatorView
					{...defaultProps}
					isManualSaving={true}
				/>,
			);

			// Loader2 图标应该存在且有 animate-spin 类
			const svg = container.querySelector("svg.animate-spin");
			expect(svg).toBeInTheDocument();
		});
	});
});
