import { render } from "@testing-library/react"
import { Search } from "lucide-react"
import { describe, expect, it, vi } from "vitest"
import type { CommandPaletteViewProps } from "./command-palette.types"
import { CommandPaletteView } from "./command-palette.view.fn"

describe("CommandPaletteView", () => {
	const defaultProps: CommandPaletteViewProps = {
		commands: [
			{
				group: "Actions",
				items: [
					{
						icon: <Search className="size-4" />,
						label: "Test Command",
						onSelect: vi.fn(),
						shortcut: "Ctrl+T",
					},
				],
			},
		],
		onOpenChange: vi.fn(),
		open: true,
	}

	it("should render without crashing", () => {
		const { container } = render(<CommandPaletteView {...defaultProps} />)
		expect(container).toBeTruthy()
	})

	it("should accept commands prop", () => {
		const props: CommandPaletteViewProps = {
			...defaultProps,
			commands: [
				{
					group: "Actions",
					items: [
						{
							icon: <Search className="size-4" />,
							label: "Action 1",
							onSelect: vi.fn(),
						},
					],
				},
				{
					group: "Settings",
					items: [
						{
							icon: <Search className="size-4" />,
							label: "Setting 1",
							onSelect: vi.fn(),
						},
					],
				},
			],
		}

		const { container } = render(<CommandPaletteView {...props} />)
		expect(container).toBeTruthy()
	})

	it("should handle open state changes", () => {
		const onOpenChange = vi.fn()
		const { rerender } = render(
			<CommandPaletteView {...defaultProps} onOpenChange={onOpenChange} />,
		)

		rerender(<CommandPaletteView {...defaultProps} open={false} onOpenChange={onOpenChange} />)

		expect(onOpenChange).not.toHaveBeenCalled()
	})
})
