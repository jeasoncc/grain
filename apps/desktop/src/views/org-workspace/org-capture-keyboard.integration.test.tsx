import { Prec, StateEffect } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import * as E from "fp-ts/Either"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgCaptureOutcome, OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { OrgCaptureWorkflow } from "./org-capture-workflow.view.fn"
import { previewOrgCaptureTarget } from "@/pipes/org/org-capture-target.pipe"
import { useSettings } from "@/hooks/use-settings"

const controller = () =>
	({
		activeBufferId: "origin",
		captureEntry: vi.fn(async () => ({ kind: "rejected", message: "Try later" })),
		readCaptureTarget: vi.fn<OrgWorkspaceController["readCaptureTarget"]>(async (destination) => {
			const preview = previewOrgCaptureTarget("", destination)
			return E.isLeft(preview) ? { kind: "rejected", message: preview.left.message } :
				{ kind: "ready", target: destination, expectedRevision: "<missing>", preview: preview.right }
		}),
		isLoading: false,
		isSaving: false,
		liveBuffers: [],
		isWorkspaceBlocked: false,
		isWorkspaceBusy: false,
		getBufferEffectState(this: OrgWorkspaceController) {
			return { busy: this.isLoading || this.isSaving, loading: this.isLoading, saving: this.isSaving, readOnly: this.isLoading }
		},
		openBuffers: [{ bufferId: "origin" }],
		setTransientDirty: vi.fn(() => true),
		switchBuffer: vi.fn(async () => true),
		workspace: { capabilityToken: "token", rootPath: "/root" },
		workspaceSessionId: "g1",
	}) as unknown as OrgWorkspaceController
const choose = async () => {
	const input = screen.getByRole("combobox")
	fireEvent.change(input, { target: { value: "todo" } })
	await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
	fireEvent.keyUp(window, { key: "Enter" })
	const content = screen.getByRole("textbox", { name: "Capture Org draft" })
	const view = EditorView.findFromDOM(content)!
	act(() =>
		view.dispatch({
			changes: { from: 0, insert: "* TODO Valid draft", to: view.state.doc.length },
		}),
	)
	return { content, view }
}

describe("capture keyboard with real CodeMirror", () => {
	beforeEach(() => { useSettings.setState({ orgKeymapConfigurationJson: "", orgCaptureConfigurationJson: "" }) })
	afterEach(() => { cleanup(); useSettings.setState({ orgKeymapConfigurationJson: "" }) })

	it("uses real tool-scoped configured bindings/transients and cancels the previous lease", async () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		const { content, view } = await choose()
		const source = view.state.sliceDoc()
		const selection = view.state.selection
		fireEvent.keyDown(content, { key: "c", ctrlKey: true })
		act(() => {
			useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1,
				bindings: [{ scope: "org-capture", key: "A-f", command: "org-capture.finish" }],
				leaders: [{ scope: "org-capture", key: "C-l", map: "capture-actions" }],
				transients: [{ id: "capture-actions", label: "Capture actions", scope: "org-capture", timeoutMs: null,
					bindings: [{ key: "f", command: "org-capture.finish" }] }] }) })
		})
		fireEvent.keyDown(content, { key: "c", ctrlKey: true })
		expect(c.captureEntry).not.toHaveBeenCalled()
		fireEvent.keyDown(content, { key: "Escape" })
		fireEvent.keyDown(content, { key: "f", altKey: true, isComposing: true })
		fireEvent.keyDown(content, { key: "f", altKey: true, repeat: true })
		expect(c.captureEntry).not.toHaveBeenCalled()
		await act(async () => {
			fireEvent.keyDown(content, { key: "l", ctrlKey: true })
			fireEvent.keyDown(content, { key: "f" })
		})
		expect(c.captureEntry).toHaveBeenCalledOnce()
		expect(view.state.sliceDoc()).toBe(source)
		expect(view.state.selection.eq(selection)).toBe(true)
	})

	it.each([
		false,
		true,
	])("focuses the newly accepted scratch immediately without stealing later focus (strict=%s)", async (strict) => {
		const c = controller()
		const mounted = render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />, {
			wrapper: strict ? StrictMode : undefined,
		})
		const { content, view } = await choose()
		expect(content).toHaveFocus()
		const target = screen.getByRole("textbox", { name: "Capture target file" })
		target.focus()
		act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: "\nbody" } }))
		expect(target).toHaveFocus()
		mounted.rerender(
			<OrgCaptureWorkflow controller={{ ...c, isLoading: true }} open onOpenChange={vi.fn()} />,
		)
		expect(view.state.readOnly).toBe(true)
		expect(target).toHaveFocus()
		mounted.rerender(
			<OrgCaptureWorkflow
				controller={{ ...c, workspaceSessionId: "g2" }}
				open
				onOpenChange={vi.fn()}
			/>,
		)
		expect(screen.getByRole("textbox", { name: "Capture Org draft" })).toBe(content)
		expect(view.state.readOnly).toBe(true)
		expect(view.state.sliceDoc()).toContain("\nbody")
	})

	it.each([
		"c",
		"k",
	])("does not arm C-c %s after CodeMirror natively consumes the first C-c", async (second) => {
		const c = controller(),
			close = vi.fn(),
			body = vi.fn()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		const { content, view } = await choose()
		let consumed = false
		act(() =>
			view.dispatch({
				effects: StateEffect.appendConfig.of(
					Prec.highest(
						EditorView.domEventHandlers({
							keydown: (event) => {
								if (!consumed && event.ctrlKey && event.key === "c") {
									consumed = true
									event.preventDefault()
									return true
								}
								return false
							},
						}),
					),
				),
			}),
		)
		document.body.addEventListener("keydown", body)
		try {
			fireEvent.keyDown(content, { ctrlKey: true, key: "c" })
			fireEvent.keyDown(content, { ctrlKey: true, key: second })
			expect(consumed).toBe(true)
			expect(c.captureEntry).not.toHaveBeenCalled()
			expect(c.switchBuffer).not.toHaveBeenCalled()
			expect(close).not.toHaveBeenCalled()
			expect(body).not.toHaveBeenCalled()
		} finally {
			document.body.removeEventListener("keydown", body)
		}
	})

	it("keeps normal editor prefixes and finish shortcuts, but blocks held save retries", async () => {
		const c = controller()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		const { content } = await choose()
		const down = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ctrlKey: true, key: "s" })
		down.preventDefault()
		fireEvent(content, down)
		fireEvent.keyDown(content, { ctrlKey: true, key: "s", repeat: true })
		expect(c.captureEntry).not.toHaveBeenCalled()
		fireEvent.keyUp(window, { ctrlKey: true, key: "s" })
		await act(async () => {
			fireEvent.keyDown(content, { ctrlKey: true, key: "s" })
		})
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
		await act(async () => {
			fireEvent.keyDown(content, { ctrlKey: true, key: "s", repeat: true })
		})
		expect(c.captureEntry).toHaveBeenCalledTimes(1)
		fireEvent.keyUp(window, { ctrlKey: true, key: "s" })
		await act(async () => fireEvent.click(screen.getByText("Preview target")))
		await act(async () => {
			fireEvent.keyDown(content, { ctrlKey: true, key: "c" })
			fireEvent.keyUp(window, { ctrlKey: true, key: "c" })
			fireEvent.keyDown(content, { ctrlKey: true, key: "c" })
			fireEvent.keyUp(window, { ctrlKey: true, key: "c" })
		})
		expect(c.captureEntry).toHaveBeenCalledTimes(2)
	})

	it("drains an accepted Capture after origin retirement without replacing or clearing its original Source", async () => {
		const c = controller()
		const effect = Promise.withResolvers<OrgCaptureOutcome>()
		vi.mocked(c.captureEntry).mockImplementation(() => effect.promise)
		const close = vi.fn()
		let originLive = true
		const pane = () => <OrgCaptureWorkflow controller={c} open onOpenChange={close} isToolEditable={() => originLive} />
		const mounted = render(pane())
		const { content, view } = await choose()
		act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "* TODO Retained 😀\nbody\0\n" } }))
		const retained = view.state.doc
		const selection = view.state.selection
		await act(async () => {
			fireEvent.keyDown(content, { ctrlKey: true, key: "s" })
			fireEvent.keyUp(window, { ctrlKey: true, key: "s" })
		})
		expect(c.captureEntry).toHaveBeenCalledOnce()
		originLive = false
		mounted.rerender(pane())
		expect(view.state.readOnly).toBe(true)
		expect(content).toHaveAttribute("contenteditable", "false")
		await act(async () => effect.resolve({ kind: "success" }))
		expect(screen.getByRole("textbox", { name: "Capture Org draft" })).toBe(content)
		expect(view.state.doc).toBe(retained)
		expect(view.state.selection.eq(selection)).toBe(true)
		expect(view.state.sliceDoc()).toBe("* TODO Retained 😀\nbody\0\n")
		expect(close).not.toHaveBeenCalled()
		await act(async () => {
			fireEvent.keyDown(content, { ctrlKey: true, key: "s" })
			fireEvent.keyUp(window, { ctrlKey: true, key: "s" })
		})
		expect(c.captureEntry).toHaveBeenCalledOnce()
	})
})
