import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { describe, expect, it, vi } from "vitest"
import { parseOrgInspectorProperties } from "./org-inspector.view.fn"
import { OrgQuickOpen } from "./org-quick-open.view.fn"

describe("OrgQuickOpen", () => {
	const documents = [
		{ relativePath: "inbox.org", revision: "one" },
		{ relativePath: "projects/grain.org", revision: "two" },
	]

	it("filters notes and opens the selected result", async () => {
		const onSelect = vi.fn()
		render(<OrgQuickOpen documents={documents} open onOpenChange={vi.fn()} onSelect={onSelect} />)

		fireEvent.change(screen.getByLabelText("Search workspace notes"), {
			target: { value: "grain" },
		})
		expect(screen.queryByText("inbox.org")).not.toBeInTheDocument()
		await act(async () => {
			fireEvent.click(screen.getByRole("option", { name: "projects/grain.org" }))
		})
		expect(onSelect).toHaveBeenCalledWith(documents[1], expect.any(AbortSignal))
	})

	it("supports fuzzy path matching", () => {
		render(<OrgQuickOpen documents={documents} open onOpenChange={vi.fn()} onSelect={vi.fn()} />)
		fireEvent.change(screen.getByLabelText("Search workspace notes"), {
			target: { value: "pgn" },
		})
		expect(screen.getByRole("option", { name: "projects/grain.org" })).toBeInTheDocument()
		expect(screen.queryByRole("option", { name: "inbox.org" })).not.toBeInTheDocument()
	})

	it("supports keyboard selection", async () => {
		const onSelect = vi.fn()
		render(<OrgQuickOpen documents={documents} open onOpenChange={vi.fn()} onSelect={onSelect} />)
		fireEvent.keyDown(screen.getByLabelText("Search workspace notes"), { key: "ArrowDown" })
		await act(async () => {
			fireEvent.keyDown(screen.getByLabelText("Search workspace notes"), { key: "Enter" })
		})
		expect(onSelect).toHaveBeenCalledWith(documents[1], expect.any(AbortSignal))
	})
	it("has one nonmodal root host when a newer navigation request supersedes another", () => {
		const superseded = vi.fn()
		render(<>
			<OrgQuickOpen documents={documents} open onOpenChange={superseded} onSelect={vi.fn()} />
			<OrgQuickOpen documents={documents} open onOpenChange={vi.fn()} onSelect={vi.fn()} />
		</>)
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		expect(screen.getAllByRole("combobox")).toHaveLength(1)
		expect(superseded).toHaveBeenCalledWith(false)
		const input = screen.getByRole("combobox")
		const list = document.getElementById(input.getAttribute("aria-controls")!)!
		expect(list).toHaveAttribute("role", "listbox")
		expect(document.getElementById(input.getAttribute("aria-activedescendant")!)).toHaveAttribute("aria-selected", "true")
	})

	it("preserves basename, substring, path and fuzzy ranking", () => {
		const ranked = ["z/ab.org", "abc.org", "zab.org", "ab/x.org", "a/b.org"].map(
			(relativePath) => ({ relativePath, revision: "one" }),
		)
		render(
			<OrgQuickOpen
				documents={[...ranked].reverse()}
				open
				onOpenChange={vi.fn()}
				onSelect={vi.fn()}
			/>,
		)
		fireEvent.change(screen.getByRole("combobox"), { target: { value: " AB " } })
		expect(screen.getAllByRole("option").map((option) => option.getAttribute("aria-label"))).toEqual([
			"z/ab.org", "abc.org", "zab.org", "ab/x.org", "a/b.org",
		])
	})

	it.each([false, "throw"])("retains query and reports a failed open (%s)", async (outcome) => {
		const onOpenChange = vi.fn()
		const onSelect = vi.fn(() => {
			if (outcome === "throw") throw new Error("failure")
			return false
		})
		render(
			<OrgQuickOpen documents={documents} open onOpenChange={onOpenChange} onSelect={onSelect} />,
		)
		fireEvent.change(screen.getByRole("combobox"), { target: { value: "grain" } })
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		expect(await screen.findByRole("alert")).toHaveTextContent("Could not open note")
		expect(screen.getByRole("combobox")).toHaveValue("grain")
		expect(onOpenChange).not.toHaveBeenCalled()
		await waitFor(() => expect(screen.getByRole("option")).not.toBeDisabled())
	})

	it("allows only one submission in flight", async () => {
		let resolve!: (value: boolean) => void
		const onSelect = vi.fn(
			() =>
				new Promise<boolean>((done) => {
					resolve = done
				}),
		)
		const onOpenChange = vi.fn()
		render(
			<OrgQuickOpen documents={documents} open onOpenChange={onOpenChange} onSelect={onSelect} />,
		)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		fireEvent.click(screen.getAllByRole("option")[1])
		expect(onSelect).toHaveBeenCalledTimes(1)
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-busy", "true")
		await act(async () => resolve(true))
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
	})

	it.each([
		"close",
		"cancel",
		"root",
		"unmount",
	])("ignores stale selection after %s", async (transition) => {
		let resolve!: (value: boolean) => void
		const onSelect = vi.fn(
			() =>
				new Promise<boolean>((done) => {
					resolve = done
				}),
		)
		const onOpenChange = vi.fn()
		const props = { documents, onSelect, onOpenChange, open: true, sessionKey: "one" }
		const view = render(<OrgQuickOpen {...props} />)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		if (transition === "cancel") fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
		if (transition === "close" || transition === "cancel") {
			view.rerender(<OrgQuickOpen {...props} open={false} />)
			view.rerender(<OrgQuickOpen {...props} />)
		} else if (transition === "root") view.rerender(<OrgQuickOpen {...props} sessionKey="two" />)
		else view.unmount()
		onOpenChange.mockClear()
		await act(async () => resolve(true))
		expect(onOpenChange).not.toHaveBeenCalled()
		if (transition !== "unmount")
			expect(screen.getByRole("combobox")).toHaveAttribute("aria-busy", "false")
	})

	it("aborts the in-flight signal when cancelled with Escape", async () => {
		let resolve!: (value: boolean) => void
		const onSelect = vi.fn(
			(_document: (typeof documents)[number], _signal?: AbortSignal) =>
				new Promise<boolean>((done) => {
					resolve = done
				}),
		)
		const onOpenChange = vi.fn()
		render(
			<OrgQuickOpen documents={documents} open onOpenChange={onOpenChange} onSelect={onSelect} />,
		)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		const signal = onSelect.mock.calls[0][1]!
		expect(signal).toBeInstanceOf(AbortSignal)
		expect(signal.aborted).toBe(false)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" })
		expect(signal.aborted).toBe(true)
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		onOpenChange.mockClear()
		await act(async () => resolve(true))
		expect(onOpenChange).not.toHaveBeenCalled()
		expect(screen.queryByRole("alert")).not.toBeInTheDocument()
	})

	it("aborts the previous request when sessionKey changes", async () => {
		const resolvers: Array<(value: boolean) => void> = []
		const onSelect = vi.fn(
			(_document: (typeof documents)[number], _signal?: AbortSignal) =>
				new Promise<boolean>((resolve) => {
					resolvers.push(resolve)
				}),
		)
		const onOpenChange = vi.fn()
		const props = { documents, onSelect, onOpenChange, open: true, sessionKey: "one" }
		const view = render(<OrgQuickOpen {...props} />)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		const previousSignal = onSelect.mock.calls[0][1]!
		expect(previousSignal).toBeInstanceOf(AbortSignal)
		expect(previousSignal.aborted).toBe(false)
		view.rerender(<OrgQuickOpen {...props} sessionKey="two" />)
		expect(previousSignal.aborted).toBe(true)
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-busy", "false")
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		expect(onSelect).toHaveBeenCalledTimes(2)
		const currentSignal = onSelect.mock.calls[1][1]!
		expect(currentSignal).toBeInstanceOf(AbortSignal)
		expect(currentSignal).not.toBe(previousSignal)
		expect(currentSignal.aborted).toBe(false)
		await act(async () => resolvers[0](true))
		expect(onOpenChange).not.toHaveBeenCalled()
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-busy", "true")
		expect(currentSignal.aborted).toBe(false)
		await act(async () => resolvers[1](true))
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
	})

	it("moves candidates without opening and cancels with focus restoration", () => {
		const previous = document.createElement("button")
		document.body.append(previous)
		previous.focus()
		const onSelect = vi.fn()
		const onOpenChange = vi.fn()
		render(
			<OrgQuickOpen documents={documents} open onOpenChange={onOpenChange} onSelect={onSelect} />,
		)
		const input = screen.getByRole("combobox")
		expect(input).toHaveFocus()
		fireEvent.keyDown(input, { key: "n", ctrlKey: true })
		expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true")
		fireEvent.keyDown(input, { key: "p", ctrlKey: true })
		expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true")
		fireEvent.keyDown(input, { key: "ArrowDown" })
		fireEvent.keyDown(input, { key: "ArrowUp" })
		fireEvent.mouseEnter(screen.getAllByRole("option")[1])
		expect(onSelect).not.toHaveBeenCalled()
		fireEvent.keyDown(input, { key: "g", ctrlKey: true })
		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(previous).toHaveFocus()
		previous.remove()
	})

	it("does not restore focus after a successful opening", async () => {
		const target = document.createElement("button")
		document.body.append(target)
		const onSelect = vi.fn(() => {
			target.focus()
			return true
		})
		const onOpenChange = vi.fn()
		const props = { documents, onSelect, onOpenChange }
		const view = render(<OrgQuickOpen {...props} open />)
		fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
		view.rerender(<OrgQuickOpen {...props} open={false} />)
		expect(target).toHaveFocus()
		target.remove()
	})

	it.each(["isComposing", "keyCode"])("ignores all commands during IME (%s)", (guard) => {
		const onSelect = vi.fn()
		const onOpenChange = vi.fn()
		render(
			<OrgQuickOpen documents={documents} open onSelect={onSelect} onOpenChange={onOpenChange} />,
		)
		for (const key of ["ArrowDown", "ArrowUp", "Enter", "Escape", "n", "p", "g"]) {
			fireEvent.keyDown(screen.getByRole("combobox"), {
				key,
				ctrlKey: key.length === 1,
				[guard]: guard === "keyCode" ? 229 : true,
			})
		}
		expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true")
		expect(onSelect).not.toHaveBeenCalled()
		expect(onOpenChange).not.toHaveBeenCalled()
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
