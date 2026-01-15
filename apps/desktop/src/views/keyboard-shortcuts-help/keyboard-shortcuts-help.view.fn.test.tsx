/**
 * @file keyboard-shortcuts-help.view.fn.test.tsx
 * @description KeyboardShortcutsHelpView 组件单元测试
 *
 * 测试覆盖：
 * - 组件渲染
 * - Popover 交互
 * - 快捷键列表显示
 * - 分类显示
 *
 * @requirements 7.2
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { KeyboardShortcutsHelpView } from "./keyboard-shortcuts-help.view.fn"

// ============================================================================
// Unit Tests
// ============================================================================

describe("KeyboardShortcutsHelpView", () => {
	describe("基本渲染", () => {
		it("should render trigger button", () => {
			render(<KeyboardShortcutsHelpView />)

			// 应该显示键盘图标按钮
			const button = screen.getByRole("button")
			expect(button).toBeInTheDocument()
		})

		it("should have keyboard icon", () => {
			const { container } = render(<KeyboardShortcutsHelpView />)

			// 应该包含 Keyboard 图标的 SVG
			const svg = container.querySelector("svg")
			expect(svg).toBeInTheDocument()
		})
	})

	describe("Popover 交互", () => {
		it("should show popover content when button clicked", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// 应该显示标题
			expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument()
		})

		it("should display all shortcut categories", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// 应该显示所有分类
			expect(screen.getByText("Global")).toBeInTheDocument()
			expect(screen.getByText("Navigation")).toBeInTheDocument()
			expect(screen.getByText("Edit")).toBeInTheDocument()
			expect(screen.getByText("Format")).toBeInTheDocument()
		})

		it("should display shortcut descriptions", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// 应该显示快捷键描述
			expect(screen.getByText("Command Palette")).toBeInTheDocument()
			expect(screen.getByText("Search Panel")).toBeInTheDocument()
			expect(screen.getByText("File Panel")).toBeInTheDocument()
			expect(screen.getByText("Save")).toBeInTheDocument()
		})

		it("should display keyboard keys", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// 应该显示键盘按键（使用 kbd 标签）
			const kbdElements = screen.getAllByText("Ctrl")
			expect(kbdElements.length).toBeGreaterThan(0)

			expect(screen.getByText("K")).toBeInTheDocument()
			expect(screen.getByText("S")).toBeInTheDocument()
			// "B" 出现多次（Bold 和 File Panel），使用 getAllByText
			const bElements = screen.getAllByText("B")
			expect(bElements.length).toBeGreaterThan(0)
		})

		it("should display multi-key shortcuts correctly", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// 应该显示组合键（Ctrl + Shift + F）
			const shiftElements = screen.getAllByText("Shift")
			expect(shiftElements.length).toBeGreaterThan(0)

			const fElements = screen.getAllByText("F")
			expect(fElements.length).toBeGreaterThan(0)
		})
	})

	describe("快捷键分组", () => {
		it("should group shortcuts by category", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// Global 分类下应该有多个快捷键
			const globalCategory = screen.getByText("Global")
			expect(globalCategory).toBeInTheDocument()

			// 验证 Global 分类下的快捷键
			expect(screen.getByText("Command Palette")).toBeInTheDocument()
			expect(screen.getByText("Search Panel")).toBeInTheDocument()
		})

		it("should display navigation shortcuts", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// Navigation 分类
			expect(screen.getByText("Navigation")).toBeInTheDocument()
			expect(screen.getByText("Next Tab")).toBeInTheDocument()
			expect(screen.getByText("Previous Tab")).toBeInTheDocument()
		})

		it("should display edit shortcuts", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// Edit 分类
			expect(screen.getByText("Edit")).toBeInTheDocument()
			expect(screen.getByText("Save")).toBeInTheDocument()
			expect(screen.getByText("Undo")).toBeInTheDocument()
			expect(screen.getByText("Redo")).toBeInTheDocument()
		})

		it("should display format shortcuts", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// Format 分类
			expect(screen.getByText("Format")).toBeInTheDocument()
			expect(screen.getByText("Bold")).toBeInTheDocument()
			expect(screen.getByText("Italic")).toBeInTheDocument()
			expect(screen.getByText("Underline")).toBeInTheDocument()
		})
	})

	describe("样式和布局", () => {
		it("should have scrollable content area", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// 应该有可滚动的内容区域
			const scrollableArea = document.querySelector(".overflow-y-auto")
			expect(scrollableArea).toBeInTheDocument()
		})

		it("should have custom scrollbar styling", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// 应该有自定义滚动条样式
			const scrollableArea = document.querySelector(".custom-scrollbar")
			expect(scrollableArea).toBeInTheDocument()
		})

		it("should render kbd elements for keys", () => {
			render(<KeyboardShortcutsHelpView />)

			const button = screen.getByRole("button")
			fireEvent.click(button)

			// 应该使用 kbd 标签显示按键
			const kbdElements = document.querySelectorAll("kbd")
			expect(kbdElements.length).toBeGreaterThan(0)
		})
	})
})
