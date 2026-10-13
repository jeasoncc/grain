import { redoDepth, undo, undoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { useCallback, useRef, useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useOrgRoamWorkflow, type OrgRoamWorkflow } from "@/hooks/use-org-roam-workflow"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgNoteOutcome, OrgRoamNotePlan } from "@/pipes/org/org-note.pipe"
import { OrgEditor, type OrgEditorCommandTarget } from "@/views/org-editor"
import { useApplicationParameterRegistration } from "@/views/application/application-command-provider"
import { OrgRoamWorkflowView } from "./org-roam-workflow.view.fn"

const rangeRects = Object.getOwnPropertyDescriptor(Range.prototype, "getClientRects")
const rangeBounds = Object.getOwnPropertyDescriptor(Range.prototype, "getBoundingClientRect")
beforeEach(() => {
	Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] })
	Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() })
})
afterEach(() => {
	cleanup()
	for (const [key, descriptor] of [["getClientRects", rangeRects], ["getBoundingClientRect", rangeBounds]] as const) {
		if (descriptor) Object.defineProperty(Range.prototype, key, descriptor)
		else Reflect.deleteProperty(Range.prototype, key)
	}
})
const raw = "left\r\nselected\rright\0"
const node = ":PROPERTIES:\n:ID: existing-id\n:END:\n#+TITLE: Existing node\n"
function Harness({ create, onWorkflow }: { readonly create: OrgWorkspaceController["createRoamNote"]; readonly onWorkflow?: (workflow: OrgRoamWorkflow) => void }) {
	const [content, setContent] = useState(raw)
	const generation = useRef(1)
	const changeSource = useCallback((next: string) => {
		generation.current += 1
		setContent(next)
	}, [])
	const target = useRef<OrgEditorCommandTarget | null>(null)
	const register = useCallback((next: OrgEditorCommandTarget | null) => { target.current = next }, [])
	const controller = {
		workspace: { rootPath: "/approved", capabilityToken: "grant", directories: [], documents: [] }, workspaceSessionId: "session", activeBufferId: "origin", activeDocument: { relativePath: "origin.org", content: raw, revision: "r" }, content,
		liveBuffers: [
			{ document: { relativePath: "target.org", revision: "r" }, content: node, bufferId: "target", runtimeIncarnation: "target", sourceGeneration: 1 },
			{ document: { relativePath: "origin.org", revision: "r" }, content, bufferId: "origin", runtimeIncarnation: "origin", sourceGeneration: generation.current },
		],
		isLoading: false, isSaving: false, setTransientDirty: () => true, createRoamNote: create, openOrgLink: async () => true,
		isWorkspaceBlocked: false, isWorkspaceBusy: false,
		getBufferEffectState: () => ({ busy: false, loading: false, saving: false, readOnly: false }),
	} as unknown as OrgWorkspaceController
	const workflow = useOrgRoamWorkflow({ controller, getTarget: () => target.current })
	onWorkflow?.(workflow)
	const parameterOwner = useRef({}).current
	useApplicationParameterRegistration(parameterOwner, workflow.session)
	return <>
		<button onClick={workflow.openInsert}>Insert node</button>
		<button onClick={workflow.openCreate}>New node</button>
		<OrgEditor sessionKey="origin-test" documentPath="origin.org" value={content} onChange={changeSource} onSave={() => {}} onCommandTarget={register} ariaLabel="Origin source" />
		<OrgRoamWorkflowView tool={workflow.tool} />
	</>
}

describe("Roam editor consumer boundaries", () => {
	it("inserts into the exact original selection as one undo transaction, preserving the surrounding raw source", async () => {
		const create = vi.fn(async (): Promise<OrgNoteOutcome> => ({ kind: "rejected", message: "Unexpected creation" }))
		render(<Harness create={create} />)
		const source = screen.getByRole("textbox", { name: "Origin source" })
		const view = EditorView.findFromDOM(source)!
		const from = view.state.doc.line(2).from
		act(() => { view.dispatch({ selection: { anchor: from, head: from + "selected".length } }) })
		fireEvent.click(screen.getByRole("button", { name: "Insert node" }))
		const input = screen.getByRole("combobox")
		fireEvent.change(input, { target: { value: "Existing node" } })
		await waitFor(() => expect(screen.getByText("Existing node")).toBeInTheDocument())
		expect(input).toHaveValue("Existing node")
		fireEvent.keyDown(input, { key: "Enter" })
		await waitFor(() => expect(view.state.sliceDoc()).toBe("left\r\n[[id:existing-id][selected]]\rright\0"))
		expect(undoDepth(view.state)).toBe(1)
		act(() => { expect(undo(view)).toBe(true) })
		expect(view.state.sliceDoc()).toBe(raw)
		expect(create).not.toHaveBeenCalled()
	})
	it("offers an EOF full scratch and honors accepted C-c C-c finish, C-g cancellation, and native copy priority", async () => {
		const create = vi.fn(async (plan: OrgRoamNotePlan): Promise<OrgNoteOutcome> => ({ kind: "created-unopened", relativePath: "dated/new.org", id: plan.id, title: plan.title, message: "Not opened by publication" }))
		let workflow!: OrgRoamWorkflow
		render(<Harness create={create} onWorkflow={(next) => { workflow = next }} />)
		fireEvent.click(screen.getByRole("button", { name: "New node" }))
		const title = screen.getByRole("combobox")
		fireEvent.change(title, { target: { value: "Keyboard capture" } })
		fireEvent.keyDown(title, { key: "Enter" })
		const scratch = screen.getByRole("textbox", { name: "Org-roam capture draft" })
		const view = EditorView.findFromDOM(scratch)!
		expect(view.state.selection.main.head).toBe(view.state.doc.length)
		act(() => { view.dispatch({ selection: { anchor: 0, head: 10 } }) })
		fireEvent.keyDown(scratch, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(scratch, { ctrlKey: true, key: "c" })
		expect(create).not.toHaveBeenCalled()
		const copiedRange = view.state.selection.main
		act(() => {
			view.dispatch({ selection: { anchor: view.state.doc.length } })
			view.dispatch({ selection: view.state.selection.addRange(copiedRange, false) })
		})
		fireEvent.keyDown(scratch, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(scratch, { ctrlKey: true, key: "c" })
		expect(create).not.toHaveBeenCalled()
		act(() => { view.dispatch({ selection: { anchor: view.state.doc.length } }) })
		fireEvent.keyDown(scratch, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(scratch, { ctrlKey: true, key: "Control" })
		fireEvent.keyUp(scratch, { ctrlKey: true, key: "Control" })
		fireEvent.keyDown(scratch, { ctrlKey: true, key: "c" })
		await waitFor(() => expect(create).toHaveBeenCalledOnce())
		await waitFor(() => expect(workflow.tool).toBeNull())
		fireEvent.click(screen.getByRole("button", { name: "New node" }))
		const nextTitle = screen.getByRole("combobox")
		fireEvent.change(nextTitle, { target: { value: "Cancelled" } })
		fireEvent.keyDown(nextTitle, { key: "Enter" })
		fireEvent.keyDown(screen.getByRole("textbox", { name: "Org-roam capture draft" }), { ctrlKey: true, key: "g" })
		await act(async () => {})
		expect(workflow.tool).not.toBeNull()
		fireEvent.click(screen.getByRole("button", { name: "Close tool" }))
		await act(async () => {})
		expect(workflow.tool).toBeNull()
		expect(create).toHaveBeenCalledOnce()
	})
	it("consumes each finish prefix once so an ID-rejected full draft can be corrected and finished with the next C-c C-c", async () => {
		const create = vi.fn(async (plan: OrgRoamNotePlan): Promise<OrgNoteOutcome> => ({ kind: "created-unopened", relativePath: "dated/new.org", id: plan.id, title: plan.title, message: "Confirmed" }))
		let workflow!: OrgRoamWorkflow
		render(<Harness create={create} onWorkflow={(next) => { workflow = next }} />)
		fireEvent.click(screen.getByRole("button", { name: "New node" }))
		const title = screen.getByRole("combobox")
		fireEvent.change(title, { target: { value: "Corrected capture" } })
		fireEvent.keyDown(title, { key: "Enter" })
		const source = screen.getByRole("textbox", { name: "Org-roam capture draft" })
		const view = EditorView.findFromDOM(source)!
		const original = view.state.sliceDoc()
		const rejected = original.replace(/^:ID:\s+(.+)$/m, ":ID: changed-id")
		act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: rejected }, selection: { anchor: 0 } }))
		fireEvent.keyDown(source, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(source, { ctrlKey: true, key: "Control" })
		fireEvent.keyDown(source, { ctrlKey: true, key: "c" })
		expect(create).not.toHaveBeenCalled()
		expect(workflow.tool?.readOnly).toBe(false)
		expect(view.state.sliceDoc()).toBe(rejected)
		act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: original }, selection: { anchor: 0 } }))
		fireEvent.keyDown(source, { ctrlKey: true, key: "c" })
		fireEvent.keyDown(source, { ctrlKey: true, key: "Control" })
		fireEvent.keyDown(source, { ctrlKey: true, key: "c" })
		await waitFor(() => expect(workflow.tool).toBeNull())
		expect(create).toHaveBeenCalledOnce()
	})
	it.each(["source-change", "publication"] as const)("fences direct scratch edits and Undo synchronously on %s while preserving selection and native copy", async (retirement) => {
		const publication = Promise.withResolvers<OrgNoteOutcome>()
		const create = vi.fn(() => publication.promise)
		let workflow!: OrgRoamWorkflow
		render(<Harness create={create} onWorkflow={(next) => { workflow = next }} />)
		fireEvent.click(screen.getByRole("button", { name: "New node" }))
		const title = screen.getByRole("combobox")
		fireEvent.change(title, { target: { value: "Retained capture" } })
		fireEvent.keyDown(title, { key: "Enter" })
		const scratch = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Org-roam capture draft" }))!
		const source = EditorView.findFromDOM(screen.getByRole("textbox", { name: "Origin source" }))!
		act(() => scratch.dispatch({ changes: { from: scratch.state.doc.length, insert: "\nLocal draft 😀\0" }, userEvent: "input.type" }))
		const retained = scratch.state.sliceDoc()
		const producer = workflow.tool!
		expect(producer.content).toBe(retained)
		expect(undoDepth(scratch.state)).toBe(1)
		act(() => {
			if (retirement === "source-change") source.dispatch({ changes: { from: 0, insert: "Changed Source " } })
			else producer.finish()
			// The React readonly compartment has not reconfigured yet; the live producer lease must fence dispatch.
			expect(scratch.state.readOnly).toBe(false)
			expect(producer.readOnly).toBe(true)
			scratch.dispatch({ changes: { from: 0, insert: "Must not alter retained draft " } })
			undo(scratch)
			fireEvent.keyDown(scratch.contentDOM, { ctrlKey: true, key: "z" })
			expect(scratch.state.sliceDoc()).toBe(retained)
			expect(undoDepth(scratch.state)).toBe(1)
			expect(redoDepth(scratch.state)).toBe(0)
			scratch.dispatch({ selection: { anchor: 0, head: 5 } })
			expect(scratch.state.selection.main.from).toBe(0)
			expect(scratch.state.selection.main.to).toBe(5)
			const copy = new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true, cancelable: true })
			scratch.contentDOM.dispatchEvent(copy)
			expect(copy.defaultPrevented).toBe(false)
		})
		expect(workflow.tool?.content).toBe(retained)
		expect(scratch.state.sliceDoc()).toBe(retained)
		if (retirement === "publication") await act(async () => {
			publication.resolve({ kind: "uncertain", message: "Retain the accepted draft for reconciliation." })
		})
		else expect(source.state.sliceDoc()).toBe(`Changed Source ${raw}`)
		expect(workflow.tool?.readOnly).toBe(true)
		expect(scratch.state.sliceDoc()).toBe(retained)
	})
})
