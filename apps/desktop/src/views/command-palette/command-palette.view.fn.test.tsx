import { render } from "@testing-library/react";
import { Search } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import type { CommandPaletteViewProps } from "./command-palette.types";
import { CommandPaletteView } from "./command-palette.view.fn";

describe("CommandPaletteView", () => {
	const defaultProps: CommandPaletteViewProps = {
		open: true,
		onOpenChange: vi.fn(),
		commands: [
			{
				group: "Actions",
				items: [
					{
						label: "Test Command",
						icon: <Search className="size-4" />,
						shortcut: "Ctrl+T",
						onSelect: vi.fn(),
					},
				],
			},
		],
	};

	it("should render without crashing", () => {
		const { container } = render(<CommandPaletteView {...defaultProps} />);
		expect(container).toBeTruthy();
	});

	it("should accept commands prop", () => {
		const props: CommandPaletteViewProps = {
			...defaultProps,
			commands: [
				{
					group: "Actions",
					items: [
						{
							label: "Action 1",
							icon: <Search className="size-4" />,
							onSelect: vi.fn(),
						},
					],
				},
				{
					group: "Settings",
					items: [
						{
							label: "Setting 1",
							icon: <Search className="size-4" />,
							onSelect: vi.fn(),
						},
					],
				},
			],
		};

		const { container } = render(<CommandPaletteView {...props} />);
		expect(container).toBeTruthy();
	});

	it("should handle open state changes", () => {
		const onOpenChange = vi.fn();
		const { rerender } = render(
			<CommandPaletteView {...defaultProps} onOpenChange={onOpenChange} />,
		);

		rerender(
			<CommandPaletteView
				{...defaultProps}
				open={false}
				onOpenChange={onOpenChange}
			/>,
		);

		expect(onOpenChange).not.toHaveBeenCalled();
	});
});
