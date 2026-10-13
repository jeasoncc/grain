import { StrictMode } from "react"
import { act, cleanup, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { OrgCommandEditorContext } from "@/flows/org-command/org-workspace-command"
import type { OrgNoteOutcome } from "@/pipes/org/org-note.pipe"
import type { OrgEditorCommandTarget } from "@/views/org-editor"
import type { OrgWorkspaceController } from "./use-org-workspace"
import { useOrgRoamWorkflow, type OrgRoamWorkflow } from "./use-org-roam-workflow"
import { renderHook } from "@/test/application-providers"

afterEach(cleanup)
const nodeSource = ":PROPERTIES:\n:ID: target-id\n:ROAM_ALIASES: \"Alias name\"\n:END:\n#+TITLE: Node title\n"
function fixture() {
	let context: OrgCommandEditorContext = { relativePath: "origin.org", content: "left\r\nselected\rright\0", cursor: 14, selectionFrom: 6, selectionTo: 14, selectionRangeCount: 1, ownership: {}, revision: 1, available: true, readOnly: false }
	const listeners = new Set<() => void>()
	const target: OrgEditorCommandTarget = {
		getCommandContext: () => context,
		subscribeCommandContext: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
		executeCommand: vi.fn(() => false), captureCommand: vi.fn(() => null), captureFocus: vi.fn(() => vi.fn(() => true)), restoreFocus: vi.fn(),
		applyEdit: vi.fn((expected, edit) => {
			if (context.content !== expected) return false
			context = { ...context, content: context.content.slice(0, edit.from) + edit.insert + context.content.slice(edit.to), revision: context.revision + 1, cursor: edit.cursor, selectionFrom: edit.cursor, selectionTo: edit.cursor }
			Object.assign(controller, {
				content: context.content,
				liveBuffers: controller.liveBuffers.map((buffer) => buffer.bufferId === "origin"
					? { ...buffer, content: context.content, sourceGeneration: buffer.sourceGeneration + 1 } : buffer),
			})
			for (const listener of listeners) listener()
			return true
		}),
	}
	const controller = {
		workspace: { rootPath: "/approved", capabilityToken: "grant", directories: [], documents: [] }, workspaceSessionId: "session",
		activeBufferId: "origin", activeDocument: { relativePath: "origin.org", revision: "origin-disk", content: context.content }, content: context.content,
		liveBuffers: [
			{ document: { relativePath: "target.org", revision: "disk" }, content: nodeSource, bufferId: "target", runtimeIncarnation: "incarnation", sourceGeneration: 1 },
			{ document: { relativePath: "origin.org", revision: "origin-disk" }, content: context.content, bufferId: "origin", runtimeIncarnation: "origin-incarnation", sourceGeneration: 1 },
		],
		setTransientDirty: vi.fn(() => true), createRoamNote: vi.fn(async () => ({ kind: "created-unopened", relativePath: "dated/note.org", id: "new-id", title: "New title", message: "Confirmed; opening not requested." }) as OrgNoteOutcome),
		openOrgLink: vi.fn(async () => true), isLoading: false, isSaving: false,
		isWorkspaceBlocked: false, isWorkspaceBusy: false,
		getBufferEffectState: () => ({ busy: false, loading: false, saving: false, readOnly: false }),
	} as unknown as OrgWorkspaceController
	return { controller, target, changeOrigin: (patch: Partial<OrgCommandEditorContext>) => {
		const previous = context.content
		context = { ...context, ...patch }
		if (context.content !== previous) {
			Object.assign(controller, {
				content: context.content,
				liveBuffers: controller.liveBuffers.map((buffer) => buffer.bufferId === "origin"
					? { ...buffer, content: context.content, sourceGeneration: buffer.sourceGeneration + 1 } : buffer),
			})
		}
		for (const listener of listeners) listener()
	} }
}
async function chooseNew(result: { current: OrgRoamWorkflow }, insert = false) {
	if (insert) {
		act(() => { expect(result.current.openInsert()).toBe(true) })
		await waitFor(() => expect(result.current.session?.annotatedCandidates?.length).toBeGreaterThan(0))
		act(() => { expect(result.current.session!.onAccept("roam:create")).toEqual({ ok: true }) })
	} else act(() => { expect(result.current.openCreate()).toBe(true) })
	act(() => { expect(result.current.session!.onAccept("New title")).toEqual({ ok: true }) })
}

describe("root-owned Org-roam workflow", () => {
	it("creates a full editable scratch in an empty workspace, protects it synchronously, and cancels without writes", async () => {
		const f = fixture()
		const empty = { ...f.controller, liveBuffers: [] }
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: empty, getTarget: () => null }), { wrapper: StrictMode })
		await chooseNew(result)
		expect(result.current.session).toBeNull()
		expect(result.current.tool?.content).toMatch(/^:PROPERTIES:\n:ID:       /)
		expect(result.current.tool?.content).toContain("#+TITLE: New title\n")
		expect(result.current.tool?.content.endsWith("\n* 内容\n\n")).toBe(true)
		expect(empty.setTransientDirty).toHaveBeenCalledWith(expect.any(String), true)
		act(() => { result.current.tool!.onChange(`${result.current.tool!.content}raw\r\nbody\0`) })
		expect(result.current.tool?.content.endsWith("raw\r\nbody\0")).toBe(true)
		act(() => { result.current.tool!.cancel() })
		expect(empty.createRoamNote).not.toHaveBeenCalled()
		expect(result.current.owned).toBe(false)
		expect(empty.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), false)
	})
	it("drains an accepted publication under a native-close barrier without a late source edit", async () => {
		const f = fixture()
		const accepted = Promise.withResolvers<OrgNoteOutcome>()
		vi.mocked(f.controller.createRoamNote).mockReturnValue(accepted.promise)
		const { result, rerender } = renderHook(({ controller }) => useOrgRoamWorkflow({ controller, getTarget: () => f.target }), { initialProps: { controller: f.controller } })
		await chooseNew(result, true)
		act(() => { result.current.tool!.finish() })
		rerender({ controller: { ...f.controller, isWorkspaceBlocked: true } })
		await act(async () => accepted.resolve({ kind: "created-unopened", relativePath: "dated/drained.org", id: "drained", title: "New title", message: "Confirmed publication." }))
		expect(f.target.applyEdit).not.toHaveBeenCalled()
		expect(result.current.tool).toMatchObject({ pending: false, readOnly: true, message: expect.stringContaining("Created dated/drained.org") })
		await result.current.tool!.drain()
	})
	it("annotates aliases and disambiguating source locations, rejects raw paths, and opens via ID provenance", async () => {
		const f = fixture()
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => null }))
		act(() => { result.current.openFind() })
		await waitFor(() => expect(result.current.session?.annotatedCandidates).toHaveLength(2))
		const candidate = result.current.session!.annotatedCandidates![1]
		expect(candidate).toMatchObject({ label: "Node title", searchText: expect.stringContaining("Alias name"), detail: expect.stringContaining("target.org:1") })
		act(() => { expect(result.current.session!.onAccept("../../danger.org")).toMatchObject({ ok: false }) })
		expect(f.controller.openOrgLink).not.toHaveBeenCalled()
		await act(async () => { await result.current.session!.onAccept(candidate.value) })
		expect(f.controller.openOrgLink).toHaveBeenCalledExactlyOnceWith({ kind: "id", relativePath: null, value: "target-id" })
	})
	it("replaces the exact captured raw range as one buffer-local edit and refuses real multi-selection", async () => {
		const f = fixture()
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => f.target }))
		act(() => { result.current.openInsert() })
		await waitFor(() => expect(result.current.session?.annotatedCandidates).toHaveLength(2))
		const node = result.current.session!.annotatedCandidates![1]
		await act(async () => { await result.current.session!.onAccept(node.value) })
		expect(f.target.applyEdit).toHaveBeenCalledExactlyOnceWith("left\r\nselected\rright\0", { from: 6, to: 14, insert: "[[id:target-id][selected]]", cursor: 32 })
		expect(f.controller.createRoamNote).not.toHaveBeenCalled()
		expect(f.controller.openOrgLink).not.toHaveBeenCalled()
		act(() => { f.changeOrigin({ selectionRangeCount: 2 }); expect(result.current.openInsert()).toBe(false) })
	})
	it("finishes the same captured plan with full raw edited source, preserves captured identity/path, and uses open:false for insertion", async () => {
		const f = fixture()
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => f.target }))
		await chooseNew(result, true)
		const header = result.current.tool!.content
		const draft = header.replace("* 内容", "* Changed") + "edited\r\ntext\0"
		act(() => { result.current.tool!.onChange(draft); result.current.tool!.finish() })
		await waitFor(() => expect(result.current.tool).toBeNull())
		expect(f.controller.createRoamNote).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ content: draft, title: "New title", id: expect.any(String), directory: expect.any(String), filenameStem: expect.any(String) }), { open: false })
		expect(f.target.applyEdit).toHaveBeenCalledExactlyOnceWith(expect.any(String), expect.objectContaining({ insert: "[[id:new-id][selected]]" }))
	})
	it("allows an edited valid file title and uses its confirmed title for an empty-region link without changing the captured filename", async () => {
		const f = fixture()
		f.changeOrigin({ selectionFrom: 14, selectionTo: 14 })
		vi.mocked(f.controller.createRoamNote).mockImplementation(async (plan) => ({ kind: "created-unopened", relativePath: "dated/note.org", id: plan.id, title: "Edited title", message: "Confirmed without opening." }))
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => f.target }))
		await chooseNew(result, true)
		const draft = result.current.tool!.content.replace("#+TITLE: New title", "#+TITLE: Edited title")
		act(() => { result.current.tool!.onChange(draft); result.current.tool!.finish() })
		await waitFor(() => expect(result.current.tool).toBeNull())
		expect(f.controller.createRoamNote).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ content: draft, title: "New title", filenameStem: expect.stringContaining("new_title") }), { open: false })
		expect(f.target.applyEdit).toHaveBeenCalledExactlyOnceWith(expect.any(String), expect.objectContaining({ from: 14, to: 14, insert: expect.stringMatching(/^\[\[id:[^\]]+\]\[Edited title\]\]$/) }))
	})
	it("retires a new-node producer when its native originating window is replaced without a source change", async () => {
		const f = fixture()
		f.changeOrigin({ windowId: "origin-window" })
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => f.target }))
		await chooseNew(result, true)
		const draft = result.current.tool!.content
		act(() => { f.changeOrigin({ windowId: "replacement-window" }) })
		expect(result.current.tool).toMatchObject({ content: draft, readOnly: true })
		expect(result.current.tool!.origin!.isLive()).toBe(false)
		act(() => { result.current.tool!.finish(); result.current.tool!.onChange("must not replace retained draft") })
		expect(f.controller.createRoamNote).not.toHaveBeenCalled()
		expect(f.target.applyEdit).not.toHaveBeenCalled()
		expect(result.current.tool!.content).toBe(draft)
	})
	it("drains started creation singleflight and retains an honestly confirmed unlinked draft after origin ABA", async () => {
		const f = fixture()
		const { promise, resolve } = Promise.withResolvers<OrgNoteOutcome>()
		vi.mocked(f.controller.createRoamNote).mockImplementation(() => promise)
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => f.target }))
		await chooseNew(result, true)
		const original = result.current.tool!.content
		act(() => { result.current.tool!.finish(); result.current.tool!.finish(); result.current.tool!.cancel() })
		expect(f.controller.createRoamNote).toHaveBeenCalledOnce()
		expect(result.current.tool?.pending).toBe(true)
		act(() => { f.changeOrigin({ revision: 2 }); f.changeOrigin({ revision: 1 }) })
		await act(async () => { resolve({ kind: "created-unopened", relativePath: "dated/confirmed.org", id: "confirmed", title: "New title", message: "Not opened." }) })
		expect(f.target.applyEdit).not.toHaveBeenCalled()
		expect(result.current.tool).toMatchObject({ content: original, pending: false, readOnly: true, message: expect.stringContaining("Created dated/confirmed.org") })
		act(() => { result.current.tool!.finish(); result.current.tool!.onChange("must not replace copyable source") })
		expect(f.controller.createRoamNote).toHaveBeenCalledOnce()
		expect(result.current.tool?.content).toBe(original)
		act(() => { result.current.tool!.cancel() })
		expect(result.current.owned).toBe(false)
	})
	it("scope detaches retain copyable protected drafts and prevent a late completion overriding a new grant", async () => {
		const f = fixture()
		const { promise, resolve } = Promise.withResolvers<OrgNoteOutcome>()
		vi.mocked(f.controller.createRoamNote).mockImplementation(() => promise)
		const { result, rerender } = renderHook(({ controller }) => useOrgRoamWorkflow({ controller, getTarget: () => f.target }), { initialProps: { controller: f.controller } })
		await chooseNew(result, true)
		act(() => { result.current.tool!.finish() })
		const next = { ...f.controller, workspace: { ...f.controller.workspace!, capabilityToken: "new-grant" }, setTransientDirty: vi.fn(() => true) }
		rerender({ controller: next })
		expect(next.setTransientDirty).toHaveBeenCalledWith(expect.any(String), true)
		expect(result.current.tool?.readOnly).toBe(true)
		await act(async () => { resolve({ kind: "uncertain", message: "Publication could not be confirmed." }) })
		expect(f.target.applyEdit).not.toHaveBeenCalled()
		expect(result.current.tool?.message).toContain("Publication could not be confirmed")
		act(() => { result.current.tool!.cancel() })
		expect(next.setTransientDirty).toHaveBeenLastCalledWith(expect.any(String), false)
	})
	it("revalidates dirty selected node revisions before applying a link and excludes duplicate IDs", async () => {
		const f = fixture()
		const { result, rerender } = renderHook(({ controller }) => useOrgRoamWorkflow({ controller, getTarget: () => f.target }), { initialProps: { controller: f.controller } })
		act(() => { result.current.openInsert() })
		await waitFor(() => expect(result.current.session?.annotatedCandidates).toHaveLength(2))
		const value = result.current.session!.annotatedCandidates![1].value
		const changed = { ...f.controller, liveBuffers: f.controller.liveBuffers.map((buffer) => buffer.bufferId !== "target" ? buffer : ({ ...buffer, content: buffer.content.replace("Node title", "Changed title"), sourceGeneration: buffer.sourceGeneration + 1 })) }
		rerender({ controller: changed })
		await act(async () => { expect(await result.current.session!.onAccept(value)).toMatchObject({ ok: false }) })
		expect(f.target.applyEdit).not.toHaveBeenCalled()
		act(() => { result.current.session!.onCancel() })
		const duplicate = { ...f.controller, liveBuffers: [...f.controller.liveBuffers, { ...f.controller.liveBuffers[0], bufferId: "duplicate", document: { ...f.controller.liveBuffers[0].document, relativePath: "duplicate.org" } }] }
		rerender({ controller: duplicate })
		act(() => { result.current.openFind() })
		await waitFor(() => expect(result.current.session?.annotatedCandidates).toHaveLength(3))
		expect(result.current.session!.annotatedCandidates!.slice(1).every((entry) => entry.unavailableReason)).toBe(true)
	})
	it.each(["grant", "session", "runtime", "generation"] as const)("rejects a captured origin after %s replacement even when its path and body are unchanged", async (change) => {
		const f = fixture()
		const { result, rerender } = renderHook(({ controller }) => useOrgRoamWorkflow({ controller, getTarget: () => f.target }), { initialProps: { controller: f.controller } })
		await chooseNew(result, true)
		const draft = result.current.tool!.content
		const next = {
			...f.controller,
			...(change === "grant" ? { workspace: { ...f.controller.workspace!, capabilityToken: "replacement-grant" } } : {}),
			...(change === "session" ? { workspaceSessionId: "replacement-session" } : {}),
			liveBuffers: f.controller.liveBuffers.map((buffer) => buffer.bufferId !== "origin" ? buffer : {
				...buffer,
				runtimeIncarnation: change === "runtime" ? "replacement-runtime" : buffer.runtimeIncarnation,
				sourceGeneration: change === "generation" ? buffer.sourceGeneration + 2 : buffer.sourceGeneration,
			}),
		}
		rerender({ controller: next })
		act(() => { result.current.tool!.finish() })
		expect(f.controller.createRoamNote).not.toHaveBeenCalled()
		expect(f.target.applyEdit).not.toHaveBeenCalled()
		expect(result.current.tool).toMatchObject({ content: draft, readOnly: true })
	})
	it("opens a confirmed new node only after conservative publication and notifies the root to reveal its editor", async () => {
		const f = fixture()
		const onOpened = vi.fn()
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => null, onOpened }))
		await chooseNew(result)
		act(() => { result.current.tool!.finish() })
		await waitFor(() => expect(result.current.owned).toBe(false))
		expect(f.controller.createRoamNote).toHaveBeenCalledExactlyOnceWith(expect.any(Object), { open: false })
		expect(f.controller.openOrgLink).toHaveBeenCalledExactlyOnceWith({ kind: "id", relativePath: null, value: "new-id" })
		expect(onOpened).toHaveBeenCalledOnce()
	})
	it("keeps an edited ID identity header draft editable and rejects before any publication", async () => {
		const f = fixture()
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => null }))
		await chooseNew(result)
		const original = result.current.tool!.content
		const edited = original.replace(/:ID: +[^\n]+/, ":ID: changed-id")
		act(() => { result.current.tool!.onChange(edited); result.current.tool!.finish() })
		expect(f.controller.createRoamNote).not.toHaveBeenCalled()
		expect(result.current.tool).toMatchObject({ content: edited, readOnly: false, message: expect.any(String) })
		act(() => { result.current.tool!.onChange(original); result.current.tool!.finish() })
		await waitFor(() => expect(f.controller.createRoamNote).toHaveBeenCalledOnce())
	})
	it("retains a confirmed created file without navigation or focus theft after scratch focus is lost", async () => {
		const f = fixture()
		const { promise, resolve } = Promise.withResolvers<OrgNoteOutcome>()
		vi.mocked(f.controller.createRoamNote).mockImplementation(() => promise)
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => null }))
		await chooseNew(result)
		act(() => { result.current.tool!.finish() })
		const outside = document.createElement("button")
		document.body.append(outside)
		outside.focus()
		await act(async () => { resolve({ kind: "created-unopened", relativePath: "dated/confirmed.org", id: "confirmed", title: "New title", message: "No opening requested." }) })
		expect(f.controller.openOrgLink).not.toHaveBeenCalled()
		expect(document.activeElement).toBe(outside)
		expect(result.current.tool).toMatchObject({ readOnly: true, message: expect.stringContaining("Created dated/confirmed.org") })
		act(() => { result.current.tool!.cancel() })
		expect(document.activeElement).toBe(outside)
		outside.remove()
	})
	it("fences stale picker/title/scratch callbacks from a replacement capture", async () => {
		const f = fixture()
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => null }))
		act(() => { result.current.openFind() })
		const picker = result.current.session!
		act(() => { picker.onAccept("roam:create") })
		const title = result.current.session!
		act(() => { title.onAccept("First draft") })
		const first = result.current.tool!
		act(() => {
			expect(title.onAccept("Must not replace the draft")).toMatchObject({ ok: false })
			picker.onCancel()
			title.onCancel()
		})
		expect(result.current.tool?.content).toBe(first.content)
		act(() => { first.cancel(); result.current.openCreate() })
		const replacement = result.current.session!
		act(() => { first.cancel(); first.finish(); picker.onCancel(); title.onCancel() })
		expect(result.current.session?.id).toBe(replacement.id)
		expect(f.controller.createRoamNote).not.toHaveBeenCalled()
	})
	it("never publishes an editable draft when transient dirty protection is denied", async () => {
		const f = fixture()
		vi.mocked(f.controller.setTransientDirty).mockReturnValue(false)
		const { result } = renderHook(() => useOrgRoamWorkflow({ controller: f.controller, getTarget: () => null }))
		act(() => { result.current.openCreate() })
		act(() => { expect(result.current.session!.onAccept("Title")).toMatchObject({ ok: false }) })
		expect(result.current.tool).toBeNull()
		expect(f.controller.createRoamNote).not.toHaveBeenCalled()
	})
})
