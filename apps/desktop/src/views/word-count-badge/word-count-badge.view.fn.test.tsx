/**
 * @file word-count-badge.view.fn.test.tsx
 * @description 字数统计徽章组件测试
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { WordCountBadgeProps, WordCountDisplayProps } from "./word-count-badge.types"
import { WordCountBadge, WordCountDisplay } from "./word-count-badge.view.fn"

describe("WordCountBadge", () => {
	const defaultProps: WordCountBadgeProps = {
		countMode: "chinese",
		displayText: "100 words",
		show: true,
		wordCountResult: {
			characters: 100,
			chineseChars: 50,
			englishWords: 50,
			total: 100,
		},
	}

	it("should render with word count", () => {
		render(<WordCountBadge {...defaultProps} />)
		expect(screen.getByText(/100/)).toBeInTheDocument()
	})

	it("should not render when show is false", () => {
		const { container } = render(<WordCountBadge {...defaultProps} show={false} />)
		expect(container.firstChild).toBeNull()
	})

	it("should render detailed text supplied by the container", () => {
		render(<WordCountBadge {...defaultProps} displayText="Chinese 50 · English 50" />)
		expect(screen.getByText("Chinese 50 · English 50")).toBeInTheDocument()
	})

	it("should become visible when word count changes", async () => {
		const { rerender } = render(<WordCountBadge {...defaultProps} />)

		// 更新字数
		rerender(
			<WordCountBadge
				{...defaultProps}
				displayText="150 words"
				wordCountResult={{
					characters: 150,
					chineseChars: 75,
					englishWords: 75,
					total: 150,
				}}
			/>,
		)

		// 徽章应该变为可见
		const badge = screen.getByText("150 words").closest("div")
		expect(badge).toHaveClass("opacity-100")
	})

	it("should apply custom className", () => {
		render(<WordCountBadge {...defaultProps} className="custom-class" />)
		const badge = screen.getByText(/100/).closest("div")
		expect(badge).toHaveClass("custom-class")
	})
})

describe("WordCountDisplay", () => {
	const defaultProps: WordCountDisplayProps = {
		countMode: "chinese",
		displayText: "100 words",
		wordCountResult: {
			characters: 100,
			chineseChars: 50,
			englishWords: 50,
			total: 100,
		},
	}

	it("should render with word count", () => {
		render(<WordCountDisplay {...defaultProps} />)
		expect(screen.getByText(/100/)).toBeInTheDocument()
	})

	it("should show icon by default", () => {
		const { container } = render(<WordCountDisplay {...defaultProps} />)
		const icon = container.querySelector("svg")
		expect(icon).toBeInTheDocument()
	})

	it("should hide icon when showIcon is false", () => {
		const { container } = render(<WordCountDisplay {...defaultProps} showIcon={false} />)
		const icon = container.querySelector("svg")
		expect(icon).not.toBeInTheDocument()
	})

	it("should render detailed text supplied by the container", () => {
		render(<WordCountDisplay {...defaultProps} displayText="Chinese 50 · English 50" />)
		expect(screen.getByText("Chinese 50 · English 50")).toBeInTheDocument()
	})

	it("should apply custom className", () => {
		const { container } = render(<WordCountDisplay {...defaultProps} className="custom-class" />)
		const display = container.firstChild
		expect(display).toHaveClass("custom-class")
	})

	it("should update when the container supplies new display text", () => {
		const { rerender } = render(<WordCountDisplay {...defaultProps} />)
		expect(screen.getByText("100 words")).toBeInTheDocument()

		rerender(<WordCountDisplay {...defaultProps} countMode="english" displayText="50 words" />)
		expect(screen.getByText("50 words")).toBeInTheDocument()
	})
})
