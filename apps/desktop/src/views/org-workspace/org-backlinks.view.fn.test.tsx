import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { OrgBacklink } from "@/flows/org-workspace"
import { OrgBacklinksView, type OrgBacklinksViewProps } from "./org-backlinks.view.fn"

const backlink: OrgBacklink = {
	column: 4,
	label: "Project plan",
	line: 12,
	sourceHeading: "Next steps",
	sourceRelativePath: "projects/source.org",
	sourceTitle: "Source document",
	targetKind: "file",
}

const props = (overrides: Partial<OrgBacklinksViewProps> = {}): OrgBacklinksViewProps => ({
	backlinks: [],
	error: null,
	isExpanded: true,
	isLoading: false,
	onOpenBacklink: vi.fn(),
	onToggle: vi.fn(),
	...overrides,
})

describe("OrgBacklinksView", () => {
	it("renders backlink details and opens the selected source", () => {
		const onOpenBacklink = vi.fn()
		render(<OrgBacklinksView {...props({ backlinks: [backlink], onOpenBacklink })} />)

		expect(screen.getByText("Next steps")).toBeInTheDocument()
		expect(screen.getByText("projects/source.org:12")).toBeInTheDocument()
		expect(screen.getByText("file · Project plan")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /Next steps/ }))
		expect(onOpenBacklink).toHaveBeenCalledWith(backlink)
	})

	it("shows title and filename fallbacks", () => {
		const titleFallback = { ...backlink, sourceHeading: null }
		const filenameFallback = {
			...backlink,
			line: 13,
			sourceHeading: null,
			sourceTitle: null,
		}
		render(<OrgBacklinksView {...props({ backlinks: [titleFallback, filenameFallback] })} />)

		expect(screen.getByText("Source document")).toBeInTheDocument()
		expect(screen.getByText("source.org")).toBeInTheDocument()
	})

	it("renders collapsed, loading, error, and empty states", () => {
		const onToggle = vi.fn()
		const { rerender } = render(<OrgBacklinksView {...props({ isExpanded: false, onToggle })} />)
		const toggle = screen.getByRole("button", { name: /Backlinks/ })
		expect(toggle).toHaveAttribute("aria-expanded", "false")
		fireEvent.click(toggle)
		expect(onToggle).toHaveBeenCalledOnce()

		rerender(<OrgBacklinksView {...props({ isLoading: true })} />)
		expect(screen.getByText("Loading backlinks…")).toBeInTheDocument()

		rerender(<OrgBacklinksView {...props({ error: "Cannot read source.org" })} />)
		expect(screen.getByRole("alert")).toHaveTextContent("Cannot read source.org")

		rerender(<OrgBacklinksView {...props()} />)
		expect(screen.getByText("No backlinks to this document.")).toBeInTheDocument()
	})
})
