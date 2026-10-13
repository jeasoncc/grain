import { undo, undoDepth } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import * as E from "fp-ts/Either"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "@/test/application-providers"
import { settingsStorageEvent } from "@/test/settings-storage-event"
import { useSettings } from "@/hooks/use-settings"
import { getOrgCaptureConfiguration } from "@/hooks/use-org-capture-configuration"
import { getOrgInputConfiguration, repairOrgConfigurationStorage } from "@/hooks/use-org-input-configuration"
import type { OrgCaptureOutcome, OrgCaptureTargetOutcome, OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import { readOrgCaptureDrafts } from "@/io/storage/org-capture-draft.storage"
import { previewOrgCaptureTarget } from "@/pipes/org/org-capture-target.pipe"
import { OrgEditor } from "@/views/org-editor"
import { useApplicationCommandHost } from "@/views/application/application-command-provider"
import { OrgCaptureWorkflow } from "./org-capture-workflow.view.fn"

const raw = (prompt = false, recovery = false) => JSON.stringify({ version: 1, draftRecovery: recovery,
	templates: [{ id: "proof", label: "Generation proof", entryType: "entry",
		target: { kind: "file", relativePath: "inbox.org" }, source: prompt ? "* TODO %^{Title|Captured}\n%?" : "* TODO Captured\n%?" }] })
let offered: OrgMinibufferSession | null = null
function ParameterProbe() { offered = useApplicationCommandHost().session; return null }
const fixture = () => ({
	activeBufferId: "source", workspaceSessionId: "session", workspace: { rootPath: "/root", capabilityToken: "grant" },
	openBuffers: [{ bufferId: "source" }], liveBuffers: [], isWorkspaceBlocked: false,
	getBufferEffectState: () => ({ busy: false, loading: false, saving: false, readOnly: false }),
	setTransientDirty: vi.fn(() => true), switchBuffer: vi.fn(async () => true),
	captureEntry: vi.fn<OrgWorkspaceController["captureEntry"]>(async () => ({ kind: "success" })),
	readCaptureTarget: vi.fn<OrgWorkspaceController["readCaptureTarget"]>(async (target) => {
		const preview = previewOrgCaptureTarget("", target)
		if (E.isLeft(preview)) return { kind: "rejected", message: preview.left.message }
		return { kind: "ready", target, expectedRevision: "<missing>", preview: preview.right }
	}),
}) as unknown as OrgWorkspaceController
const choose = async () => {
	const input = screen.getByRole("combobox")
	fireEvent.change(input, { target: { value: "proof" } })
	await act(async () => { fireEvent.keyDown(input, { key: "Enter" }) })
	fireEvent.keyUp(window, { key: "Enter" })
}
const scratch = () => {
	const content = screen.getByRole("textbox", { name: "Capture Org draft" })
	const view = EditorView.findFromDOM(content)
	if (!view) throw new Error("Real Capture CodeMirror is unavailable")
	return view
}
const saved = () => {
	const result = readOrgCaptureDrafts("/root", { enabled: true })
	if (E.isLeft(result)) throw result.left
	return result.right
}
const aba = () => {
	const initial = useSettings.getState().orgCaptureConfigurationJson
	useSettings.setState({ orgCaptureConfigurationJson: raw(false, false) === initial ? raw(true, false) : raw(false, false) })
	useSettings.setState({ orgCaptureConfigurationJson: initial })
}
beforeEach(() => {
	localStorage.clear()
	useSettings.setState({ orgCaptureConfigurationJson: raw(), orgKeymapConfigurationJson: "", orgBehaviorConfigurationJson: "" })
	repairOrgConfigurationStorage()
	offered = null
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("Capture configuration authority with real readers and CodeMirror", () => {
	it.each([false, true])("rejects a retained %s prompt/template callback synchronously inside batched ABA", async (prompt) => {
		useSettings.setState({ orgCaptureConfigurationJson: raw(prompt) })
		const c = fixture(), close = vi.fn()
		render(<><ParameterProbe /><OrgCaptureWorkflow controller={c} open onOpenChange={close} /></>)
		if (prompt) await choose()
		const stale = offered!
		expect(stale).not.toBeNull()
		await act(async () => {
			aba()
			const acceptance = stale.onAccept("proof")
			stale.onCancel()
			expect(await acceptance).toMatchObject({ ok: false })
		})
		expect(c.readCaptureTarget).not.toHaveBeenCalled()
		expect(c.captureEntry).not.toHaveBeenCalled()
		expect(close).not.toHaveBeenCalled()
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(screen.queryByRole("textbox", { name: "Capture Org draft" })).toBeNull()
	})

	it("rejects scratch edits and retained Undo synchronously before an ABA render", async () => {
		const c = fixture()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
		const view = scratch()
		act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: "😀 literal" } }))
		const bytes = view.state.sliceDoc(), history = undoDepth(view.state)
		act(() => {
			aba()
			view.dispatch({ changes: { from: view.state.doc.length, insert: "stale edit" } })
			expect(view.state.sliceDoc()).toBe(bytes)
			expect(undoDepth(view.state)).toBe(history)
			undo(view)
			expect(view.state.sliceDoc()).toBe(bytes)
			expect(undoDepth(view.state)).toBe(history)
		})
		expect(c.captureEntry).not.toHaveBeenCalled()
	})

	it("retires an unresolved preview and keeps exact draft bytes read-only/copyable after ABA", async () => {
		const preview = Promise.withResolvers<OrgCaptureTargetOutcome>()
		const c = fixture(), close = vi.fn()
		vi.mocked(c.readCaptureTarget).mockReturnValue(preview.promise)
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		await choose()
		const view = scratch(), bytes = "* TODO Literal\r\n%^{not a prompt} 中文😀"
		act(() => { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: bytes } }) })
		act(aba)
		const target = { kind: "file" as const, relativePath: "inbox.org" }
		const planned = previewOrgCaptureTarget("", target)
		if (E.isLeft(planned)) throw planned.left
		await act(async () => preview.resolve({ kind: "ready", target, expectedRevision: "old-preview", preview: planned.right }))
		expect(scratch().state.sliceDoc()).toBe(bytes)
		expect(scratch().state.facet(EditorState.readOnly)).toBe(true)
		expect(screen.queryByLabelText("Capture target preview")).toBeNull()
		act(() => { scratch().dispatch({ selection: { anchor: 0, head: scratch().state.doc.length } }) })
		const copy = new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true, cancelable: true })
		fireEvent(scratch().contentDOM, copy)
		expect(copy.defaultPrevented).toBe(false)
		fireEvent.keyDown(scratch().contentDOM, { key: "s", ctrlKey: true })
		expect(c.captureEntry).not.toHaveBeenCalled()
		expect(close).not.toHaveBeenCalled()
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Dismiss (no rollback)" })) })
		expect(close).toHaveBeenCalledExactlyOnceWith(false)
	})

	it("drains one accepted publication after ABA without closing, restoring focus or deleting its publishing marker", async () => {
		useSettings.setState({ orgCaptureConfigurationJson: raw(false, true) })
		const accepted = Promise.withResolvers<OrgCaptureOutcome>()
		const c = fixture(), close = vi.fn(), restore = vi.fn(), report = vi.fn()
		vi.mocked(c.captureEntry).mockReturnValue(accepted.promise)
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} onRestoreOrigin={restore} beginResult={() => report} />)
		await choose()
		fireEvent.click(screen.getByRole("button", { name: "Finish" }))
		expect(c.captureEntry).toHaveBeenCalledOnce()
		expect(saved()[0].status).toBe("publishing")
		act(aba)
		await act(async () => accepted.resolve({ kind: "success" }))
		expect(report).toHaveBeenCalledExactlyOnceWith({ kind: "success", message: "Capture saved." })
		expect(saved()[0].status).toBe("publishing")
		expect(scratch().state.facet(EditorState.readOnly)).toBe(true)
		expect(close).not.toHaveBeenCalled()
		expect(restore).not.toHaveBeenCalled()
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Dismiss (no rollback)" })) })
		expect(saved()[0].status).toBe("publishing")
		expect(c.captureEntry).toHaveBeenCalledOnce()
	})

	it("revokes a retained recovery selection before it can install an old draft or read its target", async () => {
		useSettings.setState({ orgCaptureConfigurationJson: raw(false, true) })
		const first = render(<OrgCaptureWorkflow controller={fixture()} open onOpenChange={vi.fn()} />)
		await choose()
		const bytes = scratch().state.sliceDoc()
		first.unmount()
		const c = fixture(), close = vi.fn()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={close} />)
		const resume = screen.getByRole("button", { name: /Resume saved Capture/ })
		act(() => { aba(); fireEvent.click(resume) })
		expect(screen.queryByRole("textbox", { name: "Capture Org draft" })).toBeNull()
		expect(c.readCaptureTarget).not.toHaveBeenCalled()
		expect(c.captureEntry).not.toHaveBeenCalled()
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Dismiss (no rollback)" })) })
		expect(saved()[0].draft).toBe(bytes)
		expect(close).toHaveBeenCalledExactlyOnceWith(false)
	})

	it("hydrates latest native storage authority, never a delayed event body, and retires an equal-text session", async () => {
		const c = fixture()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
		const generation = getOrgCaptureConfiguration().generation
		const latest = localStorage.getItem("grain-settings")!
		const delayed = JSON.stringify({ state: { ...JSON.parse(latest).state, orgCaptureConfigurationJson: raw(true) }, version: 0 })
		act(() => window.dispatchEvent(settingsStorageEvent(delayed)))
		expect(useSettings.getState().orgCaptureConfigurationJson).toBe(raw())
		expect(getOrgCaptureConfiguration().generation).not.toBe(generation)
		expect(scratch().state.facet(EditorState.readOnly)).toBe(true)
		expect(c.captureEntry).not.toHaveBeenCalled()
	})

	it.each(["malformed", "removed", "unsupported-version"])("latches %s native storage closed until an explicit successful save", async (kind) => {
		const c = fixture()
		render(<OrgCaptureWorkflow controller={c} open onOpenChange={vi.fn()} />)
		await choose()
		const envelope = localStorage.getItem("grain-settings")!
		const unavailable = kind === "malformed" ? "{broken" : kind === "removed" ? null :
			JSON.stringify({ ...JSON.parse(envelope), version: 99 })
		if (unavailable === null) localStorage.removeItem("grain-settings")
		else localStorage.setItem("grain-settings", unavailable)
		act(() => window.dispatchEvent(settingsStorageEvent(unavailable)))
		expect(getOrgCaptureConfiguration().configuration).toBeNull()
		expect(getOrgInputConfiguration().configuration).toBeNull()
		localStorage.setItem("grain-settings", envelope)
		act(() => window.dispatchEvent(settingsStorageEvent(envelope)))
		expect(getOrgCaptureConfiguration().configuration).toBeNull()
		expect(getOrgCaptureConfiguration().error).not.toBeNull()
		act(() => { useSettings.getState().setOrgCaptureConfigurationJson(raw()); repairOrgConfigurationStorage() })
		expect(getOrgCaptureConfiguration().configuration).not.toBeNull()
		expect(scratch().state.facet(EditorState.readOnly)).toBe(true)
		expect(c.captureEntry).not.toHaveBeenCalled()
	})

	it("cancels scratch without mutating the real Source bytes, selection, or history", async () => {
		const c = fixture(), source = "#+TITLE: Source\r\n* TODO Existing\r\nbody\0😀", close = vi.fn()
		render(<><OrgEditor value={source} ariaLabel="Canonical Source" onSave={() => {}} /><OrgCaptureWorkflow controller={c} open onOpenChange={close} /></>)
		const sourceView = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Canonical Source" }))!
		act(() => { sourceView.dispatch({ selection: { anchor: 3, head: 9 } }) })
		const selection = sourceView.state.selection, history = undoDepth(sourceView.state)
		await choose()
		act(() => { scratch().dispatch({ changes: { from: 0, to: scratch().state.doc.length, insert: "* TODO Cancel me" } }) })
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Cancel" })) })
		expect(sourceView.state.sliceDoc()).toBe(source)
		expect(sourceView.state.selection.eq(selection)).toBe(true)
		expect(undoDepth(sourceView.state)).toBe(history)
		expect(c.captureEntry).not.toHaveBeenCalled()
		expect(close).toHaveBeenCalledExactlyOnceWith(false)
	})
})
