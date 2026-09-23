import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaView } from "./org-agenda.view.fn"

const entries: readonly OrgAgendaEntry[] = [
	{
		column: 10,
		date: "2025-06-01",
		heading: "First task",
		kind: "deadline",
		level: 1,
		line: 2,
		relativePath: "first.org",
		todo: "TODO",
	},
	{
		column: 4,
		date: "2025-06-01",
		heading: "Meeting",
		kind: "timestamp",
		level: 2,
		line: 8,
		relativePath: "meetings.org",
		todo: null,
	},
]

describe("OrgAgendaView", () => {
	it("groups entries by date and opens the selected source", () => {
		const onOpenEntry = vi.fn()
		render(
			<OrgAgendaView entries={entries} error={null} isLoading={false} onOpenEntry={onOpenEntry} />,
		)

		expect(screen.getAllByRole("heading", { name: "2025-06-01" })).toHaveLength(1)
		expect(screen.getByText("first.org:2")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /Meeting/ }))
		expect(onOpenEntry).toHaveBeenCalledWith(entries[1])
	})

	it("renders loading, error, and empty states", () => {
		const props = { entries: [], error: null, isLoading: true, onOpenEntry: vi.fn() }
		const { rerender } = render(<OrgAgendaView {...props} />)
		expect(screen.getByText("Loading agenda…")).toBeInTheDocument()

		rerender(<OrgAgendaView {...props} isLoading={false} error="Could not read notes.org" />)
		expect(screen.getByRole("alert")).toHaveTextContent("Could not read notes.org")

		rerender(<OrgAgendaView {...props} isLoading={false} />)
		expect(screen.getByText("No active Org timestamps in this workspace.")).toBeInTheDocument()
	})
})
