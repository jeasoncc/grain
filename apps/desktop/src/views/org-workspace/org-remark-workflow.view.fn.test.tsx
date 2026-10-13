import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { render, renderHook } from "@/test/application-providers"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime/org-buffer-runtime"
import { useOrgRemarkWorkflow, type OrgRemarkPanel, type OrgRemarkWorkflow } from "@/hooks/use-org-remark-workflow"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { useSettings } from "@/hooks/use-settings"
import { OrgRemarkWorkflowView } from "./org-remark-workflow.view.fn"
import { planOrgRemarkMutation } from "@/pipes/org/org-remark.pipe"
import type { OrgEditorCommandTarget } from "@/views/org-editor"
import { EditorView } from "@codemirror/view"
import { historyField, redoDepth, undoDepth } from "@codemirror/commands"
import { OrgEditor } from "@/views/org-editor"
import { useCallback, useRef } from "react"
import { useApplicationParameterRegistration } from "@/views/application/application-command-provider"

function remarkFixture() {
	const source = createOrgBufferRuntime({ source: "alpha beta\r\nliteral 😀\0", key: { workspaceSessionId: "session", bufferId: "source" }, canCommit: () => true, onCommit: () => {} })
	const plan = planOrgRemarkMutation({ notesSource: "", sourceRelativePath: "source.org", source: source.source,
		action: { type: "add", id: "a1b2c3d4", from: 0, to: 5, kind: "range", label: "quote" } })
	if (plan.kind !== "ready") throw new Error("Cannot prepare real annotation source")
	const notes = createOrgBufferRuntime({ source: `${plan.next}Unsaved marginal note 😀\0\n`, key: { workspaceSessionId: "session", bufferId: "notes" }, canCommit: () => true, onCommit: () => {} })
	const sourceDocument = { relativePath: "source.org", revision: "source-r1", content: "alpha disk baseline\r\nliteral 😀\0" }
	const notesDocument = { relativePath: "source-notes.org", revision: "notes-r1", content: "" }
	let available = true
	const restore = vi.fn(() => true)
	const target = { getCommandContext: () => ({ relativePath: "source.org", content: source.source, cursor: 0,
		selectionFrom: 0, selectionTo: 0, selectionRangeCount: 1, windowId: "source-window", ownership: target,
		revision: source.revision, available, readOnly: false }), captureFocus: () => restore, restoreFocus: restore } as unknown as OrgEditorCommandTarget
	const controller = {
		workspace: { rootPath: "/root", capabilityToken: "grant", directories: [], documents: [sourceDocument, notesDocument] },
		workspaceSessionId: "session", activeBufferId: "source", isWorkspaceBlocked: false,
		liveBuffers: [
			{ bufferId: "source", document: sourceDocument, runtime: source, runtimeIncarnation: "source-incarnation", sourceGeneration: source.revision, get isDirty() { return source.source !== sourceDocument.content } },
			{ bufferId: "notes", document: notesDocument, runtime: notes, runtimeIncarnation: "notes-incarnation", sourceGeneration: notes.revision, isDirty: true },
		],
		openBuffers: [], getBufferEffectState: () => ({ busy: false, readOnly: false }),
		readRemarkNotes: async () => ({ kind: "ready", notes: { workspaceSessionId: "session", rootPath: "/root",
			document: notesDocument, content: notes.source, bufferId: "notes", runtime: notes, runtimeIncarnation: "notes-incarnation", sourceGeneration: notes.revision } }),
		saveRemarkNotes: vi.fn(async () => ({ kind: "confirmed" })),
		registerBufferWindow: () => () => {}, captureBufferWindowPermit: () => () => true,
		clock: { captureSparseContext: () => (context: unknown) => context },
	} as unknown as OrgWorkspaceController
	return { source, notes, controller, target, restore, retire: () => { available = false }, revive: () => { available = true } }
}

afterEach(() => { cleanup(); useSettings.setState({ orgKeymapConfigurationJson: "" }) })
it("routes configured Remark save and return from the actual notes editor without touching Source, and rejects readonly Save", async () => {
	useSettings.setState({ orgKeymapConfigurationJson: JSON.stringify({ version: 1, bindings: [
		{ scope: "org-remark", key: "A-s", command: "org-remark.save" },
		{ scope: "org-remark", key: "A-r", command: "org-remark.return-source" },
	] }) })
	const source = "* Notes\r\nbody\0😀"
	const runtime = createOrgBufferRuntime({ source, key: { workspaceSessionId: "session", bufferId: "notes" }, canCommit: () => true, onCommit: vi.fn() })
	const saveNotes = vi.fn()
	const restore = vi.fn(() => screen.getByRole("button", { name: "Original Source" }).focus())
	const panel: OrgRemarkPanel = {
		sourcePath: "source.org", entry: null, focusRequest: 1, focus: false, readOnly: false, retired: false,
		origin: { isLive: () => true, restore },
		notes: { workspaceSessionId: "session", rootPath: "/root", bufferId: "notes", runtime,
			runtimeIncarnation: "notes-incarnation", sourceGeneration: runtime.revision, content: source,
			document: { relativePath: "source-notes.org", revision: "baseline", content: source } },
	}
	const workflow = { panel, pending: false, saveNotes, closePanel: vi.fn(), drainNotes: async () => {} } as unknown as OrgRemarkWorkflow
	const controller = { registerBufferWindow: () => () => {}, captureBufferWindowPermit: () => () => true,
		clock: { captureSparseContext: () => (context: unknown) => context } } as unknown as OrgWorkspaceController
	const app = render(<><button>Original Source</button><OrgRemarkWorkflowView workflow={workflow} controller={controller} /></>)
	const editor = screen.getByRole("textbox", { name: "Remark notes for source.org" })
	act(() => editor.focus())
	fireEvent.keyDown(editor, { key: "s", altKey: true })
	expect(saveNotes).toHaveBeenCalledOnce()
	app.rerender(<><button>Original Source</button><OrgRemarkWorkflowView workflow={{ ...workflow, panel: { ...panel, readOnly: true } }} controller={controller} /></>)
	fireEvent.keyDown(editor, { key: "s", altKey: true })
	expect(saveNotes).toHaveBeenCalledOnce()
	await act(async () => { fireEvent.keyDown(editor, { key: "r", altKey: true }) })
	expect(restore).toHaveBeenCalledOnce()
	expect(screen.getByRole("button", { name: "Original Source" })).toHaveFocus()
	expect(runtime.source).toBe(source)
	app.rerender(<><button>Original Source</button><OrgRemarkWorkflowView workflow={{ ...workflow, panel: null }} controller={controller} /></>)
	fireEvent.keyDown(editor, { key: "s", altKey: true })
	expect(saveNotes).toHaveBeenCalledOnce()
})

it("projects an unsaved canonical sidecar annotation instead of its empty disk baseline without editing either history", async () => {
	const f = remarkFixture()
	const sourceState = f.source.state
	const notesState = f.notes.state
	const hook = renderHook(() => useOrgRemarkWorkflow({ controller: f.controller, getTarget: () => f.target }))
	await waitFor(() => expect(hook.result.current.snapshots.get(f.source)?.marks).toMatchObject([
		{ id: "a1b2c3d4", from: 0, to: 5, label: "quote" },
	]))
	expect(f.source.state).toBe(sourceState)
	expect(f.notes.state).toBe(notesState)
	expect(f.controller.saveRemarkNotes).not.toHaveBeenCalled()
	hook.unmount()
	f.source.close(); f.notes.close()
})

it("projects live sidecar pen edits and Undo immediately while retaining unsaved mapped Source anchors and independent histories", async () => {
	const f = remarkFixture()
	let workflow!: OrgRemarkWorkflow
	function Consumer() {
		workflow = useOrgRemarkWorkflow({ controller: f.controller, getTarget: () => f.target })
		return <>
			<OrgEditor runtime={f.source} windowId="source-window" value={f.source.source} documentPath="source.org"
				onSave={() => { throw new Error("Remark must not save Source") }} remarkSnapshot={workflow.snapshots.get(f.source)} ariaLabel="Canonical Source" />
			<OrgRemarkWorkflowView workflow={workflow} controller={f.controller} />
		</>
	}
	const app = render(<Consumer />)
	await waitFor(() => expect(workflow.snapshots.get(f.source)?.marks).toHaveLength(1))
	act(() => { expect(workflow.execute("remark-open")).toBe(true) })
	await waitFor(() => expect(workflow.panel?.readOnly).toBe(false))
	const source = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Canonical Source" }))!
	const notes = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Remark notes for source.org" }))!
	const rawNotes = f.notes.source
	act(() => source.dispatch({ changes: { from: 0, insert: "prefix " } }))
	await waitFor(() => expect(workflow.snapshots.get(f.source)?.marks[0]).toMatchObject({ from: 7, to: 12 }))
	const sourceRaw = f.source.source
	const sourceGeneration = f.source.revision
	const sourceHistory = f.source.state.field(historyField)
	const sourceSelection = source.state.selection.toJSON()
	const label = notes.state.sliceDoc().indexOf(":org-remark-label: quote") + ":org-remark-label: ".length
	expect(label).toBeGreaterThan(":org-remark-label: ".length)
	act(() => notes.dispatch({ changes: { from: label, to: label + "quote".length, insert: "important" } }))
	await waitFor(() => expect(workflow.snapshots.get(f.source)?.marks[0]).toMatchObject({ from: 7, to: 12, label: "important" }))
	expect(source.dom.querySelector(".cm-org-remark-important")).not.toBeNull()
	expect(f.source.source).toBe(sourceRaw)
	expect(f.source.revision).toBe(sourceGeneration)
	expect(f.source.state.field(historyField)).toBe(sourceHistory)
	expect(source.state.selection.toJSON()).toEqual(sourceSelection)
	expect(undoDepth(f.source.state)).toBe(1)
	expect(undoDepth(f.notes.state)).toBe(1)
	act(() => fireEvent.keyDown(notes.contentDOM, { ctrlKey: true, key: "z" }))
	await waitFor(() => expect(workflow.snapshots.get(f.source)?.marks[0]).toMatchObject({ from: 7, to: 12, label: "quote" }))
	expect(f.notes.source).toBe(rawNotes)
	expect(f.source.source).toBe(sourceRaw)
	expect(f.source.revision).toBe(sourceGeneration)
	expect(f.source.state.field(historyField)).toBe(sourceHistory)
	expect(source.state.selection.toJSON()).toEqual(sourceSelection)
	expect(undoDepth(f.notes.state)).toBe(0)
	expect(f.controller.saveRemarkNotes).not.toHaveBeenCalled()
	act(() => fireEvent.keyDown(source.contentDOM, { ctrlKey: true, key: "z" }))
	await waitFor(() => expect(workflow.snapshots.get(f.source)?.marks[0]).toMatchObject({ from: 0, to: 5, label: "quote" }))
	expect(f.source.source).toBe("alpha beta\r\nliteral 😀\0")
	expect(undoDepth(f.source.state)).toBe(0)
	app.unmount(); f.source.close(); f.notes.close()
})

it("never revives retired source focus or stale callbacks when the same source window returns or a fresh Remark producer opens", async () => {
	const f = remarkFixture()
	const hook = renderHook(() => useOrgRemarkWorkflow({ controller: f.controller, getTarget: () => f.target }))
	await waitFor(() => expect(hook.result.current.snapshots.get(f.source)?.marks).toHaveLength(1))
	act(() => { expect(hook.result.current.execute("remark-open")).toBe(true) })
	await waitFor(() => expect(hook.result.current.panel?.retired).toBe(false))
	const old = hook.result.current
	const bytes = old.panel!.notes.content
	act(() => f.retire())
	hook.rerender()
	expect(hook.result.current.panel?.retired).toBe(true)
	act(() => { expect(f.notes.applyCommandEdit(f.notes.source, { from: f.notes.source.length, to: f.notes.source.length, insert: "Later canonical notes edit\n", cursor: f.notes.source.length })).toBe(true) })
	await waitFor(() => expect(hook.result.current.panel?.notes.content).toBe(bytes))
	act(() => f.revive())
	hook.rerender()
	expect(hook.result.current.panel).toMatchObject({ retired: true, focus: false, notes: { content: bytes } })
	act(() => { old.returnToSource(); old.saveNotes(); old.panel!.origin.restore() })
	expect(f.restore).not.toHaveBeenCalled()
	expect(f.controller.saveRemarkNotes).not.toHaveBeenCalled()
	act(() => { expect(hook.result.current.execute("remark-open")).toBe(true) })
	await waitFor(() => expect(hook.result.current.panel?.retired).toBe(false))
	expect(hook.result.current.panel?.notes.content).toBe(f.notes.source)
	const fresh = hook.result.current.panel
	act(() => { old.closePanel(); old.saveNotes(); old.returnToSource(); old.panel!.origin.restore() })
	expect(hook.result.current.panel).toBe(fresh)
	expect(f.restore).not.toHaveBeenCalled()
	expect(f.controller.saveRemarkNotes).not.toHaveBeenCalled()
	hook.unmount(); f.source.close(); f.notes.close()
})

it("cancels the actual Remark pen picker without a canonical edit and refuses its retained acceptance callback", async () => {
	const f = remarkFixture()
	let workflow!: OrgRemarkWorkflow
	function Consumer() {
		const target = useRef<OrgEditorCommandTarget | null>(null)
		const register = useCallback((next: OrgEditorCommandTarget | null) => { target.current = next }, [])
		workflow = useOrgRemarkWorkflow({ controller: f.controller, getTarget: () => target.current })
		useApplicationParameterRegistration(f.source, workflow.session)
		return <OrgEditor runtime={f.source} windowId="source-window" value={f.source.source} documentPath="source.org"
			onSave={() => { throw new Error("Remark must not save Source") }} onCommandTarget={register} remarkSnapshot={workflow.snapshots.get(f.source)} ariaLabel="Canonical Source" />
	}
	const app = render(<Consumer />)
	await waitFor(() => expect(workflow.snapshots.get(f.source)?.marks).toHaveLength(1))
	const source = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Canonical Source" }))!
	const sourceState = f.source.state
	const notesState = f.notes.state
	act(() => { source.focus(); expect(workflow.execute("remark-change")).toBe(true) })
	await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("quote"))
	const accept = workflow.session!.onAccept
	act(() => fireEvent.keyDown(screen.getByRole("combobox"), { ctrlKey: true, key: "g" }))
	await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument())
	await act(async () => { expect(await accept("important")).toMatchObject({ ok: false }) })
	expect(workflow.owned).toBe(false)
	expect(f.source.source).toBe(sourceState.sliceDoc())
	expect(f.source.state.field(historyField)).toBe(sourceState.field(historyField))
	expect(f.notes.source).toBe(notesState.sliceDoc())
	expect(f.notes.state.field(historyField)).toBe(notesState.field(historyField))
	expect(undoDepth(f.source.state)).toBe(0)
	expect(undoDepth(f.notes.state)).toBe(0)
	app.unmount(); f.source.close(); f.notes.close()
})

it("retains a collapsed live anchor when a sidecar pen edit follows Source deletion beyond its saved coordinate bounds", async () => {
	const f = remarkFixture()
	const hook = renderHook(() => useOrgRemarkWorkflow({ controller: f.controller, getTarget: () => f.target }))
	await waitFor(() => expect(hook.result.current.snapshots.get(f.source)?.marks).toHaveLength(1))
	act(() => { expect(hook.result.current.execute("remark-open")).toBe(true) })
	await waitFor(() => expect(hook.result.current.panel?.readOnly).toBe(false))
	act(() => { expect(f.source.applyCommandEdit(f.source.source, { from: 0, to: f.source.source.length, insert: "x\r\n", cursor: 0 })).toBe(true) })
	await waitFor(() => expect(hook.result.current.snapshots.get(f.source)?.marks[0]).toMatchObject({ collapsed: true }))
	const collapsed = hook.result.current.snapshots.get(f.source)!.marks[0]
	expect(collapsed.from).toBe(collapsed.to)
	expect(collapsed.from).toBeLessThanOrEqual(f.source.source.length)
	const sourceRaw = f.source.source
	const sourceGeneration = f.source.revision
	const sourceHistory = f.source.state.field(historyField)
	const app = render(<OrgRemarkWorkflowView workflow={hook.result.current} controller={f.controller} />)
	const notes = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Remark notes for source.org" }))!
	const label = notes.state.sliceDoc().indexOf(":org-remark-label: quote") + ":org-remark-label: ".length
	act(() => notes.dispatch({ changes: { from: label, to: label + "quote".length, insert: "important" } }))
	await waitFor(() => expect(hook.result.current.snapshots.get(f.source)?.marks).toMatchObject([
		{ ...collapsed, label: "important" },
	]))
	expect(f.source.source).toBe(sourceRaw)
	expect(f.source.revision).toBe(sourceGeneration)
	expect(f.source.state.field(historyField)).toBe(sourceHistory)
	expect(undoDepth(f.source.state)).toBe(1)
	expect(undoDepth(f.notes.state)).toBe(1)
	expect(f.controller.saveRemarkNotes).not.toHaveBeenCalled()
	app.unmount(); hook.unmount(); f.source.close(); f.notes.close()
})

it.each(["source-window", "sidecar"] as const)("keeps a retired %s producer copyable and read-only, without binding or saving another buffer", async (retirement) => {
	const f = remarkFixture()
	const hook = renderHook(({ controller }) => useOrgRemarkWorkflow({ controller, getTarget: () => f.target }), { initialProps: { controller: f.controller } })
	await waitFor(() => expect(hook.result.current.snapshots.get(f.source)?.marks).toHaveLength(1))
	act(() => { expect(hook.result.current.execute("remark-open")).toBe(true) })
	await waitFor(() => expect(hook.result.current.panel?.readOnly).toBe(false))
	const retained = f.notes.source
	const replacement = createOrgBufferRuntime({ source: "Other dirty sidecar\0😀", key: { workspaceSessionId: "session", bufferId: "replacement" }, canCommit: () => true, onCommit: () => {} })
	const replacementSource = replacement.source
	const replacementGeneration = replacement.revision
	const replacementHistory = replacement.state.field(historyField)
	act(() => { if (retirement === "sidecar") f.notes.close(); else f.retire() })
	const next = { ...f.controller, liveBuffers: f.controller.liveBuffers.map((buffer) => retirement === "sidecar" && buffer.bufferId === "notes"
		? { ...buffer, runtime: replacement, runtimeIncarnation: "replacement-incarnation" } : buffer),
		registerBufferWindow: vi.fn(() => () => {}) }
	hook.rerender({ controller: next })
	expect(hook.result.current.panel).toMatchObject({ readOnly: true, retired: true, focus: false, notes: { content: retained } })
	expect(hook.result.current.panel?.notes.runtime).toBe(f.notes)
	expect(hook.result.current.panel?.notes.runtimeIncarnation).toBe("notes-incarnation")
	act(() => hook.result.current.saveNotes())
	expect(f.controller.saveRemarkNotes).not.toHaveBeenCalled()
	render(<OrgRemarkWorkflowView workflow={hook.result.current} controller={next} />)
	const textbox = screen.getByRole("textbox", { name: "Remark notes for source.org" })
	const view = EditorView.findFromDOM(textbox)!
	expect(view.state.readOnly).toBe(true)
	expect(view.state.sliceDoc()).toBe(retained)
	expect(next.registerBufferWindow).not.toHaveBeenCalled()
	expect(replacement.source).toBe(replacementSource)
	expect(replacement.revision).toBe(replacementGeneration)
	expect(replacement.state.field(historyField)).toBe(replacementHistory)
	expect(undoDepth(replacement.state)).toBe(0)
	expect(redoDepth(replacement.state)).toBe(0)
	cleanup(); hook.unmount()
	f.source.close(); f.notes.close(); replacement.close()
})
