import { EditorView } from "@codemirror/view"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { StrictMode } from "react"
import { describe, expect, it, vi } from "vitest"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import { OrgCaptureWorkflow } from "./org-capture-workflow.view.fn"

vi.mock("@/views/org-editor", () => ({
	OrgEditor: (props: {
		value: string
		onChange: (value: string) => void
		onSave: () => void
		readOnly: boolean
		initialCursor: number
		onPrefixChange: (prefix: OrgPrefixSession | null) => void
	}) => {
		return (
			<textarea
				aria-label="Capture Org draft"
				value={props.value}
				readOnly={props.readOnly}
				data-cursor={props.initialCursor}
				onChange={(event) => props.onChange(event.target.value)}
				onKeyDown={(event) => {
					if (
						!event.defaultPrevented &&
						!event.nativeEvent.defaultPrevented &&
						!event.nativeEvent.isComposing &&
						event.keyCode !== 229 &&
						event.key === "s" &&
						event.ctrlKey
					) {
						event.preventDefault()
						props.onSave()
					}
					if (!event.defaultPrevented && !event.nativeEvent.defaultPrevented) {
						props.onPrefixChange(
							event.ctrlKey && event.key === "c"
								? { bindings: [], expiresAt: null, id: 1, label: "C-c" }
								: null,
						)
					}
					if (event.key === "x") {
						event.preventDefault()
					}
				}}
			/>
		)
	},
}))
const controller = () =>
	({
		activeBufferId: "origin",
		captureEntry: vi.fn(async () => ({ kind: "success" })),
		isSaving: false,
		openBuffers: [{ bufferId: "origin" }, { bufferId: "other" }],
		setTransientDirty: vi.fn(),
		switchBuffer: vi.fn(async () => true),
		workspace: { capabilityToken: "token", rootPath: "/root" },
		workspaceSessionId: "g1",
	}) as unknown as OrgWorkspaceController
const draft = () => screen.getByRole("textbox", { name: "Capture Org draft" })
const target = () => screen.getByRole("textbox", { name: "Capture target file" })
const choose = (value = "todo") => {
	const input = screen.getByRole("combobox")
	fireEvent.change(input, { target: { value } })
	fireEvent.keyDown(input, { key: "Enter" })
}
const edit = (value = "* TODO 标题 %? ${literal}\nbody\n** child") =>
	fireEvent.change(draft(), { target: { value } })
const deferred = () => {
	let resolve!: (value: { kind: "success" | "rejected" | "uncertain"; message?: string }) => void
	const promise = new Promise<{ kind: "success" | "rejected" | "uncertain"; message?: string }>(
		(r) => {
			resolve = r
		},
	)
	return { promise, resolve }
}

describe("OrgCaptureWorkflow", () => {
	it("restores cancel through the bound origin even after the palette input disconnects, once", async () => {
		const palette = document.createElement("input")
		document.body.append(palette)
		palette.focus()
		const originEditor = document.createElement("textarea")
		document.body.append(originEditor)
		const c = controller(),
			close = vi.fn(),
			restore = vi.fn(() => {
				originEditor.focus()
			})
		let resolve!: (value: boolean) => void
		vi.mocked(c.switchBuffer).mockReturnValue(
			new Promise<boolean>((r) => {
				resolve = r
			}),
		)
		render(
			<OrgCaptureWorkflow controller={c} open onOpenChange={close} onRestoreOrigin={restore} />,
		)
		palette.remove()
		choose()
		fireEvent.click(screen.getByText("Cancel"))
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "g" })
		expect(c.switchBuffer).toHaveBeenCalledTimes(1)
		expect(close).not.toHaveBeenCalled()
		await act(async () => resolve(true))
		expect(restore).toHaveBeenCalledWith(
			expect.objectContaining({ bufferId: "origin" }),
			expect.any(AbortSignal),
		)
		expect(close).toHaveBeenCalledTimes(1)
		expect(originEditor).toHaveFocus()
		originEditor.remove()
		expect(c.captureEntry).not.toHaveBeenCalled()
	})
	it("does not let late cancel restoration close a new scope", async () => {
		const c = controller(),
			close = vi.fn(),
			restore = vi.fn()
		let resolve!: (value: boolean) => void
		vi.mocked(c.switchBuffer).mockReturnValue(
			new Promise<boolean>((r) => {
				resolve = r
			}),
		)
		const view = render(
			<OrgCaptureWorkflow controller={c} open onOpenChange={close} onRestoreOrigin={restore} />,
		)
		choose()
		fireEvent.click(screen.getByText("Cancel"))
		view.rerender(
			<OrgCaptureWorkflow
				controller={{ ...controller(), workspaceSessionId: "g2" }}
				open
				onOpenChange={close}
				onRestoreOrigin={restore}
			/>,
		)
		await act(async () => resolve(true))
		expect(close).not.toHaveBeenCalled()
		expect(restore).not.toHaveBeenCalled()
	})
	it("lets other Org prefixes reach the editor and target C-c remain native", () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		choose()
		edit()
		const received: string[] = []
		draft().addEventListener("keydown", (event) => received.push((event as KeyboardEvent).key))
		for (const key of ["c", "t", "c", "l"]) {
			const event = new KeyboardEvent("keydown", {
				bubbles: true,
				cancelable: true,
				ctrlKey: true,
				key,
			})
			fireEvent(draft(), event)
			expect(event.defaultPrevented).toBe(false)
		}
		expect(received).toEqual(["c", "t", "c", "l"])
		for (let i = 0; i < 2; i++) {
			const event = new KeyboardEvent("keydown", {
				bubbles: true,
				cancelable: true,
				ctrlKey: true,
				key: "c",
			})
			fireEvent(target(), event)
			expect(event.defaultPrevented).toBe(false)
		}
		expect(c.captureEntry).not.toHaveBeenCalled()
	})
	it("uses public CodeMirror multi-selection, not window selection, and rejects held repeat", () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		choose()
		edit()
		const selection = { ranges: [{ empty: true }, { empty: false }] }
		const find = vi
			.spyOn(EditorView, "findFromDOM")
			.mockReturnValue({ state: { selection } } as unknown as EditorView)
		const key = (repeat = false) => fireEvent.keyDown(draft(), { ctrlKey: true, key: "c", repeat })
		key() // Selected first press must not arm.
		selection.ranges[1].empty = true
		key()
		key(true) // A held repeat must not finish.
		key()
		selection.ranges[1].empty = false
		key() // Selection appearing after the prefix also preserves copy.
		expect(c.captureEntry).not.toHaveBeenCalled()
		find.mockRestore()
	})
	it.each(["blur", "click", "input"])("clears a pending prefix on %s", (interaction) => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		choose()
		edit()
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		if (interaction === "blur") {
			fireEvent.blur(draft())
		} else if (interaction === "click") {
			fireEvent.click(draft())
		} else {
			fireEvent.input(draft())
		}
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		expect(c.captureEntry).not.toHaveBeenCalled()
	})
	it.each([
		"draft",
		"target",
	])("ignores held Mod-S before the %s save path, including after rejection", async (source) => {
		const c = controller()
		vi.mocked(c.captureEntry).mockResolvedValue({ kind: "rejected", message: "Try later" })
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		choose()
		edit()
		const input = source === "draft" ? draft() : target()
		for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
			const held = new KeyboardEvent("keydown", {
				bubbles: true,
				cancelable: true,
				key: "s",
				repeat: true,
				...modifier,
			})
			fireEvent(input, held)
			expect(held.defaultPrevented).toBe(true)
		}
		expect(c.captureEntry).not.toHaveBeenCalled()
		await act(async () => {
			fireEvent.keyDown(input, { ctrlKey: true, key: "s" })
		})
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
		await act(async () => {
			fireEvent.keyDown(input, { ctrlKey: true, key: "s", repeat: true })
		})
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
	})
	it("honors native consumption between React capture and bubble for Mod-S", () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		choose()
		edit()
		target().addEventListener("keydown", (event) => event.preventDefault())
		fireEvent.keyDown(target(), { ctrlKey: true, key: "s" })
		expect(c.captureEntry).not.toHaveBeenCalled()
	})
	it("guards native consumed, IME229 and unsupported save modifiers", () => {
		const c = controller(),
			close = vi.fn()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		choose()
		edit()
		for (const key of ["s", "g", "c"]) {
			const consumed = new KeyboardEvent("keydown", {
				bubbles: true,
				cancelable: true,
				ctrlKey: true,
				key,
			})
			consumed.preventDefault()
			fireEvent(draft(), consumed)
			fireEvent.keyDown(draft(), { ctrlKey: true, key, keyCode: 229 })
		}
		fireEvent.keyDown(draft(), { altKey: true, ctrlKey: true, key: "s" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "s", shiftKey: true })
		expect(c.captureEntry).not.toHaveBeenCalled()
		expect(close).not.toHaveBeenCalled()
	})
	it("locks draft and target for loading but not ordinary autosave, and guards update", () => {
		const c = controller(),
			close = vi.fn()
		const view = render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		choose()
		edit()
		const original = (draft() as HTMLTextAreaElement).value
		view.rerender(
			<OrgCaptureWorkflow controller={{ ...c, isLoading: true }} open onOpenChange={close} />,
		)
		expect(draft()).toHaveAttribute("readonly")
		expect(target()).toHaveAttribute("readonly")
		fireEvent.change(draft(), { target: { value: "* changed" } })
		fireEvent.change(target(), { target: { value: "changed.org" } })
		expect(draft()).toHaveValue(original)
		expect(target()).toHaveValue("inbox.org")
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "s" })
		expect(c.captureEntry).not.toHaveBeenCalled()
		expect(screen.getByText("Cancel")).toBeDisabled()
		view.rerender(
			<OrgCaptureWorkflow
				controller={{ ...c, isEditorReadOnly: false, isLoading: false, isSaving: true }}
				open
				onOpenChange={close}
			/>,
		)
		expect(draft()).not.toHaveAttribute("readonly")
		expect(target()).not.toHaveAttribute("readonly")
		expect(screen.getByText("Cancel")).toBeEnabled()
	})
	it("retains a successful write's conflict warning until explicit no-rollback dismissal", async () => {
		const c = controller(),
			close = vi.fn()
		vi.mocked(c.captureEntry).mockResolvedValue({
			kind: "success",
			message: "Newer target draft conflicts with the saved entry.",
		})
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		choose()
		edit()
		await act(async () => fireEvent.click(screen.getByText("Finish")))
		expect(screen.getByRole("alert")).toHaveTextContent("Newer target draft conflicts")
		expect(close).not.toHaveBeenCalled()
		expect(draft()).toHaveAttribute("readonly")
		await act(async () => fireEvent.click(screen.getByText("Dismiss (no rollback)")))
		expect(close).toHaveBeenCalledWith(false)
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
	})
	it("keeps a StrictMode session live after effect replay", () => {
		const c = controller()
		render(
			<StrictMode>
				<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />
			</StrictMode>,
		)
		choose()
		edit()
		expect(c.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), true)
	})
	it.each([
		["todo", "* TODO ", "7"],
		["note", "* ", "2"],
	])("prepares literal %s defaults via a separate minibuffer", (id, source, cursor) => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		choose(id)
		expect(draft()).toHaveValue(source)
		expect(draft()).toHaveAttribute("data-cursor", cursor)
		expect(target()).toHaveValue("inbox.org")
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(c.captureEntry).not.toHaveBeenCalled()
	})
	it("accepts highlighted candidate with whole-value completion", () => {
		render(<OrgCaptureWorkflow controller={controller()} open onOpenChange={vi.fn()} />)
		choose("n")
		expect(draft()).toHaveValue("* ")
	})
	it("registers target/draft changes live and cancels without IO, clearing on unmount", async () => {
		const c = controller(),
			close = vi.fn()
		const view = render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		choose()
		edit()
		expect(c.setTransientDirty).toHaveBeenLastCalledWith(expect.stringContaining("g1"), true)
		fireEvent.change(target(), { target: { value: "notes.org" } })
		expect(c.captureEntry).not.toHaveBeenCalled()
		await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cancel" })))
		expect(close).toHaveBeenCalledWith(false)
		expect(c.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), false)
		view.unmount()
		expect(c.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), false)
	})
	it("validates empty heading and invalid target inline before IO", async () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		choose()
		fireEvent.click(screen.getByText("Finish"))
		expect(screen.getByRole("alert")).toHaveTextContent("title")
		edit()
		fireEvent.change(target(), { target: { value: "../bad.org" } })
		fireEvent.click(screen.getByText("Finish"))
		expect(screen.getByRole("alert")).toHaveTextContent("safe relative")
		expect(c.captureEntry).not.toHaveBeenCalled()
	})
	it("locks pending cancellation, editing and duplicates; restores the origin through latest controller", async () => {
		const c = controller(),
			d = deferred(),
			close = vi.fn(),
			restore = vi.fn()
		vi.mocked(c.captureEntry).mockReturnValue(d.promise)
		const view = render(
			<OrgCaptureWorkflow controller={c} open onOpenChange={close} onRestoreOrigin={restore} />,
		)
		choose()
		edit()
		fireEvent.click(screen.getByText("Finish"))
		fireEvent.click(screen.getByText("Finish"))
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "g" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "k" })
		expect(screen.getByText("Cancel")).toBeDisabled()
		expect(draft()).toHaveAttribute("readonly")
		expect(close).not.toHaveBeenCalled()
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
		expect(c.captureEntry).toHaveBeenCalledWith(
			"* TODO 标题 %? ${literal}\nbody\n** child",
			"inbox.org",
		)
		const latest = { ...c, activeBufferId: "other", switchBuffer: vi.fn(async () => true) }
		view.rerender(
			<OrgCaptureWorkflow
				controller={latest}
				open
				onOpenChange={close}
				onRestoreOrigin={restore}
			/>,
		)
		await act(async () => d.resolve({ kind: "success" }))
		expect(latest.switchBuffer).toHaveBeenCalledWith("origin", expect.any(AbortSignal))
		expect(restore).toHaveBeenCalledWith(
			{
				bufferId: "origin",
				scope: { capabilityToken: "token", rootPath: "/root", workspaceSessionId: "g1" },
			},
			expect.any(AbortSignal),
		)
		expect(close).toHaveBeenCalledWith(false)
	})
	it("keeps rejection editable and retires unknown rejection without blind resubmit", async () => {
		const c = controller()
		vi.mocked(c.captureEntry)
			.mockResolvedValueOnce({ kind: "rejected", message: "Target has an unclosed block" })
			.mockRejectedValueOnce(new Error("lost response"))
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		choose()
		edit()
		await act(async () => fireEvent.click(screen.getByText("Finish")))
		expect(screen.getByRole("alert")).toHaveTextContent("unclosed block")
		expect(draft()).not.toHaveAttribute("readonly")
		await act(async () => fireEvent.click(screen.getByText("Finish")))
		expect(draft()).toHaveAttribute("readonly")
		expect(screen.getByRole("alert")).toHaveTextContent("may already contain")
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "s" })
		expect(c.captureEntry).toHaveBeenCalledTimes(2)
		expect(screen.getByText("Dismiss (no rollback)")).toBeEnabled()
		const copy = new KeyboardEvent("keydown", {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			key: "c",
		})
		draft().dispatchEvent(copy)
		expect(copy.defaultPrevented).toBe(false)
	})
	it("does not allow stale grant completion to close, restore or dirty a new grant", async () => {
		const c = controller(),
			d = deferred(),
			close = vi.fn()
		vi.mocked(c.captureEntry).mockReturnValue(d.promise)
		const view = render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		choose()
		edit()
		fireEvent.click(screen.getByText("Finish"))
		const fresh = { ...controller(), workspaceSessionId: "g2" }
		view.rerender(<OrgCaptureWorkflow controller={fresh} open onOpenChange={close} />)
		expect(c.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), false)
		await act(async () => d.resolve({ kind: "success" }))
		expect(close).not.toHaveBeenCalled()
		expect(fresh.switchBuffer).not.toHaveBeenCalled()
		expect(fresh.setTransientDirty).not.toHaveBeenCalled()
	})
	it("prioritizes IME and consumed events; preserves selected Ctrl-C copy; local prefix and Mod-S finish", async () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		choose()
		edit()
		fireEvent.compositionStart(draft())
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "g" })
		fireEvent.keyDown(draft(), { ctrlKey: true, isComposing: true, key: "s" })
		fireEvent.compositionEnd(draft())
		expect(c.captureEntry).not.toHaveBeenCalled()
		const consumed = new KeyboardEvent("keydown", {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			key: "g",
		})
		consumed.preventDefault()
		draft().dispatchEvent(consumed)
		const textarea = draft() as HTMLTextAreaElement
		textarea.setSelectionRange(0, 5)
		const copy = new KeyboardEvent("keydown", {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			key: "c",
		})
		textarea.dispatchEvent(copy)
		expect(copy.defaultPrevented).toBe(false)
		textarea.setSelectionRange(0, 0)
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		await act(async () => fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" }))
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
	})
	it("external autosave displays busy, allows cancellation and refuses Finish", async () => {
		const c = { ...controller(), isSaving: true },
			close = vi.fn()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		choose()
		edit()
		expect(screen.getByRole("status")).toHaveTextContent("busy saving")
		expect(screen.getByText("Finish")).toBeDisabled()
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "s" })
		expect(c.captureEntry).not.toHaveBeenCalled()
		await act(async () => fireEvent.click(screen.getByText("Cancel")))
		expect(close).toHaveBeenCalledWith(false)
	})
})
