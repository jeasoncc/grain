import { EditorView } from "@codemirror/view"
import * as E from "fp-ts/Either"
import { act, fireEvent, screen, within } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { StrictMode, useRef } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import { OrgCaptureWorkflow } from "./org-capture-workflow.view.fn"
import { useSettings } from "@/hooks/use-settings"
import { previewOrgCaptureTarget } from "@/pipes/org/org-capture-target.pipe"
import { readOrgCaptureDrafts } from "@/io/storage/org-capture-draft.storage"
import { DEFAULT_ORG_CAPTURE_CONFIGURATION } from "@/pipes/org/org-capture-template.pipe"
import { getOrgInputConfiguration } from "@/hooks/use-org-input-configuration"
import { resolveOrgInput } from "@/flows/org-command/org-prefix-keymap"

vi.mock("@/views/org-editor", () => ({
	OrgEditor: (props: {
		value: string
		onChange: (value: string) => void
		onSave: () => void
		readOnly: boolean
		initialCursor: number
		onPrefixChange: (prefix: OrgPrefixSession | null) => void
		onInputCommand: (id: string) => boolean
	}) => {
		const prefix = useRef<OrgPrefixSession | null>(null)
		const owner = useRef({}).current
		const composing = useRef(false)
		const clearPrefix = () => { prefix.current = null; props.onPrefixChange(null) }
		return (
			<textarea
				aria-label="Capture Org draft"
				value={props.value}
				readOnly={props.readOnly}
				data-cursor={props.initialCursor}
				onChange={(event) => { clearPrefix(); props.onChange(event.target.value) }}
				onBlur={clearPrefix}
				onClick={clearPrefix}
				onInput={clearPrefix}
				onCompositionStart={() => { composing.current = true; clearPrefix() }}
				onCompositionEnd={() => { composing.current = false }}
				onKeyDown={(event) => {
					const policy = getOrgInputConfiguration()
					const view = EditorView.findFromDOM(event.currentTarget)
					const selectionEmpty = view ? view.state.selection.ranges.every((range) => range.empty)
						: event.currentTarget.selectionStart === event.currentTarget.selectionEnd
					const routed = resolveOrgInput({ configuration: policy.configuration, scope: "org-capture",
						current: prefix.current, owner, generation: policy.generation, now: Date.now(),
						selectionEmpty, nextId: (prefix.current?.id ?? 0) + 1,
						input: { key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey,
							shiftKey: event.shiftKey, repeat: event.repeat, altGraphKey: event.getModifierState("AltGraph"),
							isComposing: composing.current || event.nativeEvent.isComposing, keyCode: event.keyCode,
							defaultPrevented: event.defaultPrevented || event.nativeEvent.defaultPrevented } })
					prefix.current = routed.session
					props.onPrefixChange(routed.session)
					if (routed.consumed) {
						event.preventDefault()
						if (routed.commandId) props.onInputCommand(routed.commandId)
					}
					if (event.key === "x") event.preventDefault()
				}}
			/>
		)
	},
}))
const controller = () =>
	({
		activeBufferId: "origin",
		liveBuffers: [],
		isLoading: false,
		isWorkspaceBlocked: false,
		isWorkspaceBusy: false,
		getBufferEffectState(this: OrgWorkspaceController) {
			return { busy: this.isLoading || this.isSaving, loading: this.isLoading, saving: this.isSaving, readOnly: this.isLoading }
		},
		captureEntry: vi.fn(async () => ({ kind: "success" })),
		readCaptureTarget: vi.fn<OrgWorkspaceController["readCaptureTarget"]>(async (destination) => {
			const preview = previewOrgCaptureTarget("", destination)
			return E.isLeft(preview) ? { kind: "rejected", message: preview.left.message } :
				{ kind: "ready", target: destination, expectedRevision: "<missing>", preview: preview.right }
		}),
		isSaving: false,
		openBuffers: [{ bufferId: "origin" }, { bufferId: "other" }],
		setTransientDirty: vi.fn(() => true),
		switchBuffer: vi.fn(async () => true),
		workspace: { capabilityToken: "token", rootPath: "/root" },
		workspaceSessionId: "g1",
	}) as unknown as OrgWorkspaceController
const draft = () => screen.getByRole("textbox", { name: "Capture Org draft" })
const target = () => screen.getByRole("textbox", { name: "Capture target file" })
const choose = async (value = "todo") => {
	const input = screen.getByRole("combobox")
	fireEvent.change(input, { target: { value } })
	await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
	fireEvent.keyUp(window, { key: "Enter" })
}
const edit = (value = "* TODO 标题 %? ${literal}\nbody\n** child") =>
	fireEvent.change(draft(), { target: { value } })
const deferred = () => Promise.withResolvers<{ kind: "success" | "rejected" | "uncertain"; message?: string }>()

beforeEach(() => {
	window.localStorage.clear()
	useSettings.setState({ orgCaptureConfigurationJson: "", orgKeymapConfigurationJson: "" })
})

describe("OrgCaptureWorkflow", () => {
	it("retains a configured prefix on the real outer target control and retires it on configuration ABA", async () => {
		const raw = JSON.stringify({ version: 1, leaders: [{ scope: "org-capture", key: "C-l", map: "outer" }],
			transients: [{ id: "outer", label: "Outer capture", scope: "org-capture", timeoutMs: null,
				bindings: [{ key: "k", command: "org-capture.cancel" }] }] })
		useSettings.setState({ orgKeymapConfigurationJson: raw })
		const close = vi.fn()
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		await choose()
		act(() => target().focus())
		fireEvent.keyDown(target(), { key: "l", ctrlKey: true })
		act(() => { useSettings.setState({ orgKeymapConfigurationJson: "" }); useSettings.setState({ orgKeymapConfigurationJson: raw }) })
		fireEvent.keyDown(target(), { key: "k" })
		expect(close).not.toHaveBeenCalled()
		fireEvent.keyDown(target(), { key: "l", ctrlKey: true })
		await act(async () => { fireEvent.keyDown(target(), { key: "k" }) })
		expect(close).toHaveBeenCalledOnce()
		expect(c.captureEntry).not.toHaveBeenCalled()
	})

	it("restores cancel through the bound origin even after the palette input disconnects, once", async () => {
		const palette = document.createElement("input")
		document.body.append(palette)
		palette.focus()
		const originEditor = document.createElement("textarea")
		document.body.append(originEditor)
		const restoration = Promise.withResolvers<void>()
		const c = controller(),
			close = vi.fn(),
			restore = vi.fn(async () => {
				await restoration.promise
				originEditor.focus()
			})
		render(
			<OrgCaptureWorkflow controller={c} open onOpenChange={close} onRestoreOrigin={restore} />,
		)
		palette.remove()
		await choose()
		fireEvent.click(screen.getByText("Cancel"))
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "g" })
		expect(c.switchBuffer).not.toHaveBeenCalled()
		expect(close).not.toHaveBeenCalled()
		await act(async () => restoration.resolve())
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
		const restoration = Promise.withResolvers<void>()
		const c = controller(),
			close = vi.fn(),
			restore = vi.fn(async () => { await restoration.promise })
		const view = render(
			<OrgCaptureWorkflow controller={c} open onOpenChange={close} onRestoreOrigin={restore} />,
		)
		await choose()
		fireEvent.click(screen.getByText("Cancel"))
		view.rerender(
			<OrgCaptureWorkflow
				controller={{ ...controller(), workspaceSessionId: "g2" }}
				open
				onOpenChange={close}
				onRestoreOrigin={restore}
			/>,
		)
		await act(async () => restoration.resolve())
		expect(close).not.toHaveBeenCalled()
		expect(restore).toHaveBeenCalledOnce()
		expect(draft()).toHaveAttribute("readonly")
	})
	it("lets other Org prefixes reach the editor and target C-c remain native", async () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
		edit()
		const received: string[] = []
		draft().addEventListener("keydown", (event) => received.push((event as KeyboardEvent).key))
		for (const [key, consumed] of [["c", true], ["t", true], ["c", true], ["l", false]] as const) {
			const event = new KeyboardEvent("keydown", {
				bubbles: true,
				cancelable: true,
				ctrlKey: true,
				key,
			})
			fireEvent(draft(), event)
			expect(event.defaultPrevented).toBe(consumed)
		}
		expect(received).toEqual(["c", "t", "c", "l"])
		act(() => { const input = target() as HTMLInputElement; input.focus(); input.setSelectionRange(0, input.value.length) })
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
	it("uses public CodeMirror multi-selection, not window selection, and rejects held repeat", async () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
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
	it.each(["blur", "click", "input"])("clears a pending prefix on %s", async (interaction) => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
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
		await choose()
		edit()
		const input = source === "draft" ? draft() : target()
		for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
			const down = new KeyboardEvent("keydown", {
				bubbles: true, cancelable: true, key: "s", ...modifier,
			})
			down.preventDefault()
			fireEvent(input, down)
			const held = new KeyboardEvent("keydown", {
				bubbles: true,
				cancelable: true,
				key: "s",
				repeat: true,
				...modifier,
			})
			fireEvent(input, held)
			expect(held.defaultPrevented).toBe(true)
			fireEvent.keyUp(window, { key: "s", ...modifier })
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
		fireEvent.keyUp(window, { ctrlKey: true, key: "s" })
	})
	it("honors native consumption between React capture and bubble for Mod-S", async () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
		edit()
		target().addEventListener("keydown", (event) => event.preventDefault())
		fireEvent.keyDown(target(), { ctrlKey: true, key: "s" })
		expect(c.captureEntry).not.toHaveBeenCalled()
	})
	it("guards native consumed, IME229 and unsupported save modifiers", async () => {
		const c = controller(),
			close = vi.fn()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		await choose()
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
	it("locks draft and target for loading but not ordinary autosave, and guards update", async () => {
		const c = controller(),
			close = vi.fn()
		const view = render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		await choose()
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
		expect(screen.getByText("Cancel")).toBeEnabled()
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
		await choose()
		edit()
		await act(async () => fireEvent.click(screen.getByText("Finish")))
		expect(screen.getByRole("alert")).toBeVisible()
		expect(close).not.toHaveBeenCalled()
		expect(draft()).toHaveAttribute("readonly")
		await act(async () => fireEvent.click(screen.getByText("Dismiss (no rollback)")))
		expect(close).toHaveBeenCalledWith(false)
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
	})
	it("keeps a StrictMode session live after effect replay", async () => {
		const c = controller()
		render(
			<StrictMode>
				<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />
			</StrictMode>,
		)
		await choose()
		edit()
		expect(c.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), true)
	})
	it("accepts highlighted candidate with whole-value completion", async () => {
		render(<OrgCaptureWorkflow controller={controller()} open onOpenChange={vi.fn()} />)
		await choose("n")
		expect(draft()).toHaveValue("* ")
	})
	it("registers target/draft changes live and cancels without IO, clearing on unmount", async () => {
		const c = controller(),
			close = vi.fn()
		const view = render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		await choose()
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
		await choose()
		fireEvent.click(screen.getByText("Finish"))
		expect(screen.getByRole("alert")).toBeVisible()
		edit()
		fireEvent.change(target(), { target: { value: "../bad.org" } })
		fireEvent.click(screen.getByText("Finish"))
		expect(screen.getByRole("alert")).toBeVisible()
		expect(c.captureEntry).not.toHaveBeenCalled()
	})
	it("locks pending cancellation, editing and duplicates; restores the bound origin through the latest restorer", async () => {
		const c = controller(),
			d = deferred(),
			close = vi.fn(),
			restore = vi.fn()
		vi.mocked(c.captureEntry).mockReturnValue(d.promise)
		const view = render(
			<>
				<button type="button">Capture origin</button>
				<OrgCaptureWorkflow controller={c} open onOpenChange={close} onRestoreOrigin={restore} />
			</>,
		)
		const origin = screen.getByRole("button", { name: "Capture origin" })
		await choose()
		edit()
		act(() => draft().focus())
		fireEvent.click(screen.getByText("Finish"))
		fireEvent.click(screen.getByText("Finish"))
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "g" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "k" })
		expect(screen.getByText("Cancel")).toBeDisabled()
		expect(draft()).toHaveAttribute("readonly")
		expect(close).not.toHaveBeenCalled()
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
		const latest = { ...c, activeBufferId: "other", switchBuffer: vi.fn(async () => true) }
		view.rerender(
			<>
				<button type="button">Capture origin</button>
				<OrgCaptureWorkflow
					controller={latest}
					open
					onOpenChange={close}
					onRestoreOrigin={() => { if (origin.isConnected) origin.focus() }}
				/>
			</>,
		)
		await act(async () => d.resolve({ kind: "success" }))
		expect(origin).toHaveFocus()
		expect(close).toHaveBeenCalledWith(false)
		expect(close).toHaveBeenCalledOnce()
	})
	it("keeps rejection editable and retires unknown rejection without blind resubmit", async () => {
		const c = controller()
		vi.mocked(c.captureEntry)
			.mockResolvedValueOnce({ kind: "rejected", message: "Target has an unclosed block" })
			.mockRejectedValueOnce(new Error("lost response"))
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
		edit()
		const text = (draft() as HTMLTextAreaElement).value
		await act(async () => fireEvent.click(screen.getByText("Finish")))
		expect(screen.getByRole("alert")).toBeVisible()
		expect(draft()).not.toHaveAttribute("readonly")
		await act(async () => fireEvent.click(screen.getByText("Preview target")))
		await act(async () => fireEvent.click(screen.getByText("Finish")))
		expect(draft()).toHaveAttribute("readonly")
		expect(screen.getByRole("alert")).toBeVisible()
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "s" })
		expect(c.captureEntry).toHaveBeenCalledTimes(2)
		expect(screen.getByText("Dismiss (no rollback)")).toBeEnabled()
		const retiredDraft = draft() as HTMLTextAreaElement
		expect(retiredDraft.value).toBe(text)
		retiredDraft.setSelectionRange(0, text.length)
		const copy = new KeyboardEvent("keydown", {
			bubbles: true,
			cancelable: true,
			ctrlKey: true,
			key: "c",
		})
		fireEvent(retiredDraft, copy)
		expect(copy.defaultPrevented).toBe(false)
		expect(retiredDraft.value).toBe(text)
		expect(c.captureEntry).toHaveBeenCalledTimes(2)
	})
	it("retains a protected read-only draft across grant retirement without stale completion changing its protection", async () => {
		const c = controller(),
			d = deferred(),
			close = vi.fn()
		vi.mocked(c.captureEntry).mockReturnValue(d.promise)
		const view = render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		await choose()
		edit()
		fireEvent.click(screen.getByText("Finish"))
		const fresh = { ...controller(), workspaceSessionId: "g2" }
		view.rerender(<OrgCaptureWorkflow controller={fresh} open onOpenChange={close} />)
		expect(c.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), false)
		const protectionCalls = vi.mocked(fresh.setTransientDirty).mock.calls.length
		expect(fresh.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), true)
		await act(async () => d.resolve({ kind: "success" }))
		expect(close).not.toHaveBeenCalled()
		expect(fresh.switchBuffer).not.toHaveBeenCalled()
		expect(fresh.setTransientDirty).toHaveBeenCalledTimes(protectionCalls)
		expect(draft()).toHaveAttribute("readonly")
	})
	it("prioritizes IME and consumed events; preserves selected Ctrl-C copy; local prefix and Mod-S finish", async () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
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
	it("a disjoint source autosave does not block Capture target publication", async () => {
		const c = { ...controller(), isSaving: true },
			close = vi.fn()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		await choose()
		edit()
		expect(screen.getByText("Finish")).toBeEnabled()
		await act(async () => fireEvent.keyDown(draft(), { ctrlKey: true, key: "s" }))
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
		expect(close).toHaveBeenCalledWith(false)
	})
	it("a target-file effect rejects publication without discarding scratch text", async () => {
		const c = {
			...controller(),
			liveBuffers: [{ bufferId: "target", document: { relativePath: "inbox.org" } }] as unknown as OrgWorkspaceController["liveBuffers"],
			getBufferEffectState: (bufferId: string) => ({ busy: bufferId === "target", loading: false, saving: bufferId === "target", readOnly: false }),
		}
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
		edit()
		const text = (draft() as HTMLTextAreaElement).value
		await act(async () => fireEvent.click(screen.getByText("Finish")))
		expect(c.captureEntry).not.toHaveBeenCalled()
		expect(draft()).toHaveValue(text)
		expect(screen.getByRole("alert")).toBeVisible()
	})
})

describe("Capture draft recovery consumer boundaries", () => {
	const optIn = () => useSettings.setState({
		orgCaptureConfigurationJson: JSON.stringify({ ...DEFAULT_ORG_CAPTURE_CONFIGURATION, draftRecovery: true }),
	})
	const saved = () => {
		const result = readOrgCaptureDrafts("/root", { enabled: true })
		if (E.isLeft(result)) throw result.left
		return result.right
	}

	it("keeps the default scratch in memory and does not leave a recoverable body after unmount", async () => {
		const mounted = render(<OrgCaptureWorkflow controller={controller()} open onOpenChange={vi.fn()} />)
		await choose()
		edit("* private default draft\r\n%? literal 😀")
		mounted.unmount()
		expect(saved()).toEqual([])
	})

	it("resumes literal editing text only after explicit selection under a fresh grant", async () => {
		optIn()
		const original = controller()
		const mounted = render(<OrgCaptureWorkflow controller={original} open onOpenChange={vi.fn()} />)
		await choose()
		const source = "* private %^{not a prompt} %(not evaluated) 中文\nbody😀"
		edit(source)
		mounted.unmount()
		const fresh = {
			...controller(), workspaceSessionId: "g2",
			workspace: { ...original.workspace!, capabilityToken: "fresh-native-grant" },
		}
		render(<OrgCaptureWorkflow controller={fresh} open onOpenChange={vi.fn()} />)
		expect(screen.queryByRole("textbox", { name: "Capture Org draft" })).toBeNull()
		expect(fresh.captureEntry).not.toHaveBeenCalled()
		await act(async () => fireEvent.click(screen.getByRole("button", { name: /Resume saved Capture/ })))
		expect(draft()).toHaveValue(source)
		expect(draft()).not.toHaveAttribute("readonly")
		expect(fresh.captureEntry).not.toHaveBeenCalled()
		await act(async () => fireEvent.click(screen.getByText("Cancel")))
		expect(saved()).toEqual([])
		expect(fresh.captureEntry).not.toHaveBeenCalled()
	})

	it("persists the non-retry marker before requesting publication and restores it read-only after owner loss", async () => {
		optIn()
		const original = controller()
		const pending = deferred()
		vi.mocked(original.captureEntry).mockReturnValue(pending.promise)
		const mounted = render(<OrgCaptureWorkflow controller={original} open onOpenChange={vi.fn()} />)
		await choose()
		edit("* possible published entry\nraw %? 😀")
		fireEvent.click(screen.getByText("Finish"))
		expect(saved()[0].status).toBe("publishing")
		mounted.unmount()
		const fresh = { ...controller(), workspaceSessionId: "fresh" }
		render(<OrgCaptureWorkflow controller={fresh} open onOpenChange={vi.fn()} />)
		await act(async () => fireEvent.click(screen.getByRole("button", { name: /View read-only saved Capture/ })))
		expect(draft()).toHaveAttribute("readonly")
		expect(draft()).toHaveValue("* possible published entry\nraw %? 😀")
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "s" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		fireEvent.keyDown(draft(), { ctrlKey: true, key: "c" })
		await act(async () => pending.resolve({ kind: "uncertain", message: "Late acknowledgement lost" }))
		expect(fresh.captureEntry).not.toHaveBeenCalled()
		expect(saved()[0].status).toBe("publishing")
		await act(async () => fireEvent.click(screen.getByText("Dismiss (no rollback)")))
		expect(saved()[0].status).toBe("publishing")
	})

	it("blocks a content write when the durable publishing marker cannot be saved, retaining editable memory", async () => {
		optIn()
		const current = controller()
		render(<OrgCaptureWorkflow controller={current} open onOpenChange={vi.fn()} />)
		await choose()
		edit("* never published")
		const setItem = localStorage.setItem
		const failure = vi.spyOn(localStorage, "setItem").mockImplementation(function (this: Storage, key, value) {
			if (key.startsWith("grain:org-capture-draft:")) throw new Error("Quota exceeded")
			setItem.call(this, key, value)
		})
		try {
			fireEvent.click(screen.getByText("Finish"))
			expect(current.captureEntry).not.toHaveBeenCalled()
			expect(draft()).toHaveValue("* never published")
			expect(draft()).not.toHaveAttribute("readonly")
			expect(screen.getByRole("alert")).toBeVisible()
			expect(saved()[0].status).toBe("editing")
		} finally { failure.mockRestore() }
	})

	it("does not erase the memory draft or dismiss on saved-draft deletion failure", async () => {
		optIn()
		const current = controller()
		const close = vi.fn()
		render(<OrgCaptureWorkflow controller={current} open onOpenChange={close} />)
		await choose()
		edit("* retained cancel")
		const removeItem = localStorage.removeItem
		const failure = vi.spyOn(localStorage, "removeItem").mockImplementation(function (this: Storage, key) {
			if (key.startsWith("grain:org-capture-draft:")) throw new Error("Storage denied")
			removeItem.call(this, key)
		})
		try {
			await act(async () => fireEvent.click(screen.getByText("Cancel")))
			expect(close).not.toHaveBeenCalled()
			expect(draft()).toHaveValue("* retained cancel")
			expect(saved()[0].draft).toBe("* retained cancel")
			expect(current.captureEntry).not.toHaveBeenCalled()
			expect(screen.getByRole("alert")).toHaveTextContent("Storage denied")
		} finally { failure.mockRestore() }
	})

	it("requires explicit dialog acceptance to delete an uncertain checkpoint and never rolls back or retries its target", async () => {
		optIn()
		vi.spyOn(window, "confirm").mockImplementation(() => Promise.resolve(false) as unknown as boolean)
		const current = controller()
		vi.mocked(current.captureEntry).mockResolvedValue({ kind: "uncertain", message: "ACK lost" })
		render(<OrgCaptureWorkflow controller={current} open onOpenChange={vi.fn()} />)
		await choose()
		edit("* possible target entry")
		await act(async () => fireEvent.click(screen.getByText("Finish")))
		fireEvent.click(screen.getByRole("button", { name: "Delete saved draft" }))
		expect(saved()[0].status).toBe("uncertain")
		const dialog = screen.getByRole("dialog", { name: "Delete saved Capture draft?" })
		fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
		expect(saved()[0].status).toBe("uncertain")
		expect(draft()).toHaveValue("* possible target entry")
		fireEvent.click(screen.getByRole("button", { name: "Delete saved draft" }))
		fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete saved draft only" }))
		expect(saved()).toEqual([])
		expect(draft()).toHaveValue("* possible target entry")
		expect(draft()).toHaveAttribute("readonly")
		expect(current.captureEntry).toHaveBeenCalledTimes(1)
	})

	it("does not refresh a changed recovered target or publish while reconciliation confirmation is open or cancelled", async () => {
		optIn()
		vi.spyOn(window, "confirm").mockImplementation(() => Promise.resolve(false) as unknown as boolean)
		const mounted = render(<OrgCaptureWorkflow controller={controller()} open onOpenChange={vi.fn()} />)
		await choose()
		edit("* recovered old preview")
		mounted.unmount()
		const fresh = { ...controller(), workspaceSessionId: "fresh" }
		vi.mocked(fresh.readCaptureTarget).mockImplementation(async (destination) => {
			const planned = previewOrgCaptureTarget("", destination)
			if (E.isLeft(planned)) return { kind: "rejected", message: planned.left.message }
			return { kind: "ready", target: destination, expectedRevision: "external-2", preview: planned.right }
		})
		render(<OrgCaptureWorkflow controller={fresh} open onOpenChange={vi.fn()} />)
		await act(async () => fireEvent.click(screen.getByRole("button", { name: /Resume saved Capture/ })))
		const reads = vi.mocked(fresh.readCaptureTarget).mock.calls.length
		const retainedDraft = draft()
		fireEvent.click(screen.getByRole("button", { name: "Preview target" }))
		const dialog = screen.getByRole("dialog", { name: "Confirm target reconciliation" })
		fireEvent.keyDown(retainedDraft, { ctrlKey: true, key: "s" })
		expect(fresh.captureEntry).not.toHaveBeenCalled()
		expect(fresh.readCaptureTarget).toHaveBeenCalledTimes(reads)
		fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
		expect(fresh.readCaptureTarget).toHaveBeenCalledTimes(reads)
		fireEvent.click(screen.getByRole("button", { name: "Preview target" }))
		await act(async () => fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "I reconciled the target; refresh preview" })))
		expect(fresh.readCaptureTarget).toHaveBeenCalledTimes(reads + 1)
		expect(fresh.captureEntry).not.toHaveBeenCalled()
		expect(draft()).toHaveValue("* recovered old preview")
	})
})
