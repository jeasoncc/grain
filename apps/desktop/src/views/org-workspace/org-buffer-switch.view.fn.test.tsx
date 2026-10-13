import { act, fireEvent, screen } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { describe, expect, it, vi } from "vitest"
import type { OrgOpenBufferSummary } from "@/hooks/use-org-workspace"
import { OrgBufferSwitch } from "./org-buffer-switch.view.fn"
import { OrgQuickOpen } from "./org-quick-open.view.fn"

const buffer = (bufferId: string, relativePath: string, flags = {}): OrgOpenBufferSummary => ({
	bufferId,
	relativePath,
	isDirty: false,
	hasConflict: false,
	baseRevision: "one",
	...flags,
})
const buffers = [
	buffer("opaque-1", "current.org"),
	buffer("opaque-2", "deleted/dirty.org", { isDirty: true, hasConflict: true }),
	buffer("opaque-3", "projects/grain.org"),
]
const props = {
	buffers,
	activeBufferId: "opaque-1",
	sessionKey: "grant-one",
	open: true,
	onSelect: vi.fn(() => true),
	onOpenChange: vi.fn(),
}
const input = () => screen.getByRole("combobox", { name: "Search open buffers" })
const key = (key: string, extra = {}) => fireEvent.keyDown(input(), { key, ...extra })
const selected = () =>
	screen.getAllByRole("option").find((option) => option.getAttribute("aria-selected") === "true")!

describe("OrgBufferSwitch", () => {
	it("picks dirty missing-file summaries without filesystem filtering, exposes flags, and defaults away from current", async () => {
		const onSelect = vi.fn(() => true)
		render(<OrgBufferSwitch {...props} onSelect={onSelect} />)
		expect(selected()).toHaveAccessibleName("deleted/dirty.org · Unsaved · External conflict")
		expect(screen.getByRole("option", { name: "current.org · Current" })).toBeInTheDocument()
		await act(async () => key("Enter"))
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(buffers[1], expect.any(AbortSignal))
	})

	it("keeps current selectable, including as the sole buffer", async () => {
		const onSelect = vi.fn(() => true)
		const view = render(<OrgBufferSwitch {...props} onSelect={onSelect} />)
		key("ArrowDown")
		key("ArrowDown")
		expect(selected()).toHaveAccessibleName("current.org · Current")
		view.rerender(<OrgBufferSwitch {...props} buffers={[buffers[0]]} onSelect={onSelect} />)
		expect(selected()).toHaveAccessibleName("current.org · Current")
		await act(async () => key("Enter"))
		expect(onSelect).toHaveBeenCalledWith(buffers[0], expect.any(AbortSignal))
	})

	it("retains stable logical selection on reorder and rename, passes the latest summary, and clamps removal", async () => {
		const onSelect = vi.fn(() => false)
		const view = render(<OrgBufferSwitch {...props} onSelect={onSelect} />)
		key("n", { ctrlKey: true })
		const renamed = { ...buffers[2], relativePath: "renamed.org", isDirty: true }
		view.rerender(
			<OrgBufferSwitch
				{...props}
				buffers={[renamed, buffers[0], buffers[1]]}
				onSelect={onSelect}
			/>,
		)
		expect(selected()).toHaveAccessibleName("renamed.org · Unsaved")
		await act(async () => key("Enter"))
		expect(onSelect).toHaveBeenCalledWith(renamed, expect.any(AbortSignal))
		view.rerender(<OrgBufferSwitch {...props} buffers={[buffers[0]]} onSelect={onSelect} />)
		expect(selected()).toHaveAccessibleName("current.org · Current")
		view.rerender(<OrgBufferSwitch {...props} buffers={[]} onSelect={onSelect} />)
		key("Enter")
		expect(onSelect).toHaveBeenCalledTimes(1)
	})

	it("resets selection to the best result when the query changes", () => {
		render(<OrgBufferSwitch {...props} />)
		key("ArrowDown")
		expect(selected()).toHaveAccessibleName("projects/grain.org")
		fireEvent.change(input(), { target: { value: "org" } })
		expect(selected()).toHaveAccessibleName("current.org · Current")
	})

	it("uses the identical basename/path fuzzy ranking as Quick Open", () => {
		const paths = ["z/ab.org", "abc.org", "zab.org", "ab/x.org", "a/b.org"]
		render(
			<OrgBufferSwitch
				{...props}
				activeBufferId={null}
				buffers={[...paths].reverse().map((path) => buffer(path, path))}
			/>,
		)
		fireEvent.change(input(), { target: { value: " AB " } })
		expect(
			screen.getAllByRole("option").map((option) => option.getAttribute("aria-label")),
		).toEqual(paths)
		fireEvent.change(input(), { target: { value: "zx" } })
		expect(screen.queryAllByRole("option")).toHaveLength(0)
	})

	it("completes paths, navigates read-only with n/p and arrows, and never completes opaque IDs", () => {
		const onSelect = vi.fn()
		render(<OrgBufferSwitch {...props} onSelect={onSelect} />)
		key("n", { ctrlKey: true })
		key("p", { ctrlKey: true })
		key("ArrowDown")
		key("ArrowUp")
		key("Tab")
		expect(input()).toHaveValue("deleted/dirty.org")
		expect(input()).toHaveFocus()
		expect(onSelect).not.toHaveBeenCalled()
	})

	it.each(["isComposing", "keyCode"])(
		"suppresses Enter, cancellation, and completion during IME (%s)",
		(guard) => {
			const onSelect = vi.fn(),
				onOpenChange = vi.fn()
			render(<OrgBufferSwitch {...props} onSelect={onSelect} onOpenChange={onOpenChange} />)
			for (const command of ["Enter", "Escape", "g", "n", "p", "Tab", "ArrowDown"]) {
				key(command, { ctrlKey: command.length === 1, [guard]: guard === "keyCode" ? 229 : true })
			}
			expect(selected()).toHaveAccessibleName("deleted/dirty.org · Unsaved · External conflict")
			expect(input()).toHaveValue("")
			expect(onSelect).not.toHaveBeenCalled()
			expect(onOpenChange).not.toHaveBeenCalled()
		},
	)

	it("cancels busy navigation, aborts only the signal, restores origin and ignores old rejected promises", async () => {
		const origin = document.createElement("button")
		document.body.append(origin)
		origin.focus()
		let reject!: (error: Error) => void
		const onSelect = vi.fn(
			(_buffer: OrgOpenBufferSummary, _signal?: AbortSignal) =>
				new Promise<boolean>((_, fail) => {
					reject = fail
				}),
		)
		const onOpenChange = vi.fn()
		const view = render(
			<OrgBufferSwitch {...props} onSelect={onSelect} onOpenChange={onOpenChange} />,
		)
		key("Enter")
		key("Enter")
		key("ArrowDown")
		key("Tab")
		fireEvent.mouseEnter(screen.getAllByRole("option")[1])
		expect(onSelect).toHaveBeenCalledTimes(1)
		expect(selected()).toHaveAccessibleName("deleted/dirty.org · Unsaved · External conflict")
		key("g", { ctrlKey: true })
		expect(onSelect.mock.calls[0][1]?.aborted).toBe(true)
		expect(origin).toHaveFocus()
		view.rerender(
			<OrgBufferSwitch {...props} open={false} onSelect={onSelect} onOpenChange={onOpenChange} />,
		)
		view.rerender(<OrgBufferSwitch {...props} onSelect={onSelect} onOpenChange={onOpenChange} />)
		onOpenChange.mockClear()
		await act(async () => reject(new Error("late")))
		expect(input()).toHaveFocus()
		expect(onOpenChange).not.toHaveBeenCalled()
		expect(screen.queryByRole("alert")).not.toBeInTheDocument()
		origin.remove()
	})

	it("retires the previous native grant while a selection is pending", async () => {
		let resolve!: (value: boolean) => void
		const onSelect = vi.fn(
			(_buffer: OrgOpenBufferSummary, _signal?: AbortSignal) =>
				new Promise<boolean>((done) => {
					resolve = done
				}),
		)
		const onOpenChange = vi.fn()
		const view = render(
			<OrgBufferSwitch {...props} onSelect={onSelect} onOpenChange={onOpenChange} />,
		)
		key("Enter")
		view.rerender(
			<OrgBufferSwitch
				{...props}
				sessionKey="grant-two"
				onSelect={onSelect}
				onOpenChange={onOpenChange}
			/>,
		)
		expect(onSelect.mock.calls[0][1]?.aborted).toBe(true)
		await act(async () => resolve(true))
		expect(onOpenChange).not.toHaveBeenCalled()
		expect(input()).toHaveFocus()
		expect(input()).toHaveAttribute("aria-busy", "false")
	})

	it("does not close on a candidate removed during pending acceptance or blindly retry", async () => {
		let resolve!: (value: boolean) => void
		const onSelect = vi.fn(
			() =>
				new Promise<boolean>((done) => {
					resolve = done
				}),
		)
		const onOpenChange = vi.fn()
		const view = render(
			<OrgBufferSwitch {...props} onSelect={onSelect} onOpenChange={onOpenChange} />,
		)
		key("Enter")
		view.rerender(
			<OrgBufferSwitch
				{...props}
				buffers={[buffers[0]]}
				onSelect={onSelect}
				onOpenChange={onOpenChange}
			/>,
		)
		await act(async () => resolve(true))
		expect(onOpenChange).not.toHaveBeenCalled()
		expect(onSelect).toHaveBeenCalledTimes(1)
	})

	it("supersedes buffer candidates with Quick Open in the one nonmodal shared host", () => {
		const retired = vi.fn()
		render(<>
			<OrgBufferSwitch {...props} onOpenChange={retired} />
			<OrgQuickOpen documents={[{ relativePath: "current.org", revision: "one" }]}
				open onOpenChange={vi.fn()} onSelect={vi.fn()} />
		</>)
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		expect(screen.getAllByRole("combobox")).toHaveLength(1)
		expect(screen.getByRole("combobox", { name: "Search workspace notes" })).toBeInTheDocument()
		expect(retired).toHaveBeenCalledWith(false)
	})
})
