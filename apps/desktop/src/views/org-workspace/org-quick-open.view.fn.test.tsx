import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { parseOrgInspectorProperties } from "./org-inspector.view.fn"
import { OrgQuickOpen } from "./org-quick-open.view.fn"

describe("OrgQuickOpen", () => {
	const documents = [
		{ relativePath: "inbox.org", revision: "one" },
		{ relativePath: "projects/grain.org", revision: "two" },
	]

	it("filters notes and opens the selected result", () => {
		const onSelect = vi.fn()
		render(<OrgQuickOpen documents={documents} open onOpenChange={vi.fn()} onSelect={onSelect} />)

		fireEvent.change(screen.getByLabelText("Search workspace notes"), {
			target: { value: "grain" },
		})
		expect(screen.queryByText("inbox")).not.toBeInTheDocument()
		fireEvent.click(screen.getByText("grain"))
		expect(onSelect).toHaveBeenCalledWith(documents[1])
	})

	it("supports fuzzy path matching", () => {
		render(<OrgQuickOpen documents={documents} open onOpenChange={vi.fn()} onSelect={vi.fn()} />)
		fireEvent.change(screen.getByLabelText("Search workspace notes"), {
			target: { value: "pgn" },
		})
		expect(screen.getByText("grain")).toBeInTheDocument()
		expect(screen.queryByText("inbox")).not.toBeInTheDocument()
	})

	it("supports keyboard selection", () => {
		const onSelect = vi.fn()
		render(<OrgQuickOpen documents={documents} open onOpenChange={vi.fn()} onSelect={onSelect} />)
		fireEvent.keyDown(screen.getByLabelText("Search workspace notes"), { key: "ArrowDown" })
		fireEvent.keyDown(screen.getByLabelText("Search workspace notes"), { key: "Enter" })
		expect(onSelect).toHaveBeenCalledWith(documents[1])
	})
})

describe("parseOrgInspectorProperties", () => {
	it("reads directives and property rows without rewriting source", () => {
		const source =
			"#+title: Grain\n* Note\n:FAKE: body example\n:PROPERTIES:\n:ID: note-1\n:CUSTOM: exact value\n:END:\n:ALSO_FAKE: body text\n"
		expect(parseOrgInspectorProperties(source)).toEqual([
			{ key: "TITLE", value: "Grain" },
			{ key: "ID", value: "note-1" },
			{ key: "CUSTOM", value: "exact value" },
		])
		expect(source).toContain(":CUSTOM: exact value")
	})
})
