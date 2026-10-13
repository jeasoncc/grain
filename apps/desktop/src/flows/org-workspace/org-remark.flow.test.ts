import { redoDepth, undoDepth } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import * as E from "fp-ts/Either"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createOrgBufferRuntime, type OrgBufferWindowHandle } from "@/flows/org-editor-runtime/org-buffer-runtime"
import { createOrgRemarkTracker } from "@/flows/org-editor-runtime/org-remark-tracker"
import { planOrgWorkingCopyAck } from "@/pipes/editor/org-working-copy-ack.pipe"
import { parseOrgRemarkNotes, planOrgRemarkMutation } from "@/pipes/org/org-remark.pipe"
import type { OrgRemarkAction } from "@/pipes/org/org-remark.types"
import type { OrgDocumentInterface, OrgDocumentWriteResultInterface, OrgFileError } from "@/types/org"
import type { OrgRemarkNotesContext, OrgRemarkSourceCapture } from "@/types/org/org-remark-workflow.types"
import { runOrgRemarkMutationFlow, type OrgRemarkMutationPorts } from "./org-remark.flow"

const cleanNotes = [
	"* Source", ":PROPERTIES:", ":org-remark-file: Source.org", ":END:",
	"** alpha", ":PROPERTIES:", ":org-remark-id: a1b2c3d4", ":org-remark-beg: 1",
	":org-remark-end: 6", ":org-remark-label: important", ":CATEGORY: important",
	":org-remark-original-text: alpha", ":org-remark-link: [[file:Source.org::1]]", ":END:",
	"Saved marginal note.\n",
].join("\n")
const dirtyNoteBody = "An unsaved marginal note with café 🐉.\n"
const action: OrgRemarkAction = { type: "change", id: "a1b2c3d4", label: "nil", from: 0, to: 5 }
const receipt: OrgDocumentWriteResultInterface = { relativePath: "Source-notes.org", revision: "notes-r2" }
type WriteResult = E.Either<OrgFileError, OrgDocumentWriteResultInterface>
const cleanups: (() => void)[] = []
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup()
})

const deferredWrite = () => {
	let resolve!: (result: WriteResult) => void
	const promise = new Promise<WriteResult>((yes) => { resolve = yes })
	return { promise, resolve }
}

/** Real source/sidecar histories and ACK planner; only IO and authority are replaceable. */
const fixture = () => {
	const source = createOrgBufferRuntime({
		key: { workspaceSessionId: "session", bufferId: "source" },
		source: "alpha beta\n",
		canCommit: () => true,
		onCommit: () => {},
	})
	source.applyCommandEdit(source.source, {
		from: source.source.length, to: source.source.length,
		insert: "Unsaved source body.\n", cursor: source.source.length + "Unsaved source body.\n".length,
	})
	const sourceState = source.state
	const tracker = createOrgRemarkTracker(source)
	const parsed = parseOrgRemarkNotes(cleanNotes, "Source.org", source.source)
	if (parsed.kind !== "ready") throw new Error(parsed.message)
	if (!tracker.install(source.source, source.revision, parsed.marks)) throw new Error("Cannot install source marks")
	const capture: OrgRemarkSourceCapture = {
		workspaceSessionId: "session", relativePath: "Source.org", bufferId: "source",
		runtimeIncarnation: "source-incarnation", sourceGeneration: source.revision,
		remarkVersion: tracker.getSnapshot().version, source: source.source, windowId: "source-window",
	}
	const notes = createOrgBufferRuntime({
		key: { workspaceSessionId: "session", bufferId: "notes" },
		source: cleanNotes,
		canCommit: () => true,
		onCommit: () => {},
	})
	notes.applyCommandEdit(notes.source, {
		from: notes.source.length, to: notes.source.length,
		insert: dirtyNoteBody, cursor: notes.source.length + dirtyNoteBody.length,
	})
	const previousDraft = notes.source
	let document: OrgDocumentInterface = { relativePath: receipt.relativePath, revision: "notes-r1", content: cleanNotes }
	let windowCurrent = true
	let saveOwnerCurrent = true
	let afterCommit: (() => void) | undefined
	let duringAck: (() => void) | undefined
	let handle!: OrgBufferWindowHandle
	const view = new EditorView({
		parent: globalThis.document.body,
		state: EditorState.create({ doc: notes.state.doc, extensions: notes.historyFreeSourceExtensions }),
		dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
	})
	handle = notes.attachWindow({ view, windowId: "notes-window" })
	cleanups.push(() => {
		handle.detach()
		view.destroy()
		tracker.close()
		source.close()
		notes.close()
	})
	const snapshot = (): OrgRemarkNotesContext => ({
		workspaceSessionId: "session", rootPath: "/notes", document,
		content: notes.source, bufferId: "notes", runtime: notes,
		runtimeIncarnation: "notes-incarnation", sourceGeneration: notes.revision,
	})
	const notesAreCurrent = (candidate: OrgRemarkNotesContext) =>
		candidate.runtime === notes && !notes.closed && candidate.bufferId === notes.key.bufferId &&
		candidate.workspaceSessionId === notes.key.workspaceSessionId && candidate.rootPath === "/notes" &&
		candidate.runtimeIncarnation === "notes-incarnation" && candidate.sourceGeneration === notes.revision &&
		candidate.content === notes.source && candidate.document.relativePath === document.relativePath &&
		candidate.document.revision === document.revision && candidate.document.content === document.content
	const pending = deferredWrite()
	const write = vi.fn<OrgRemarkMutationPorts["save"]["write"]>(() => () => pending.promise)
	const pause = vi.fn<OrgRemarkMutationPorts["pause"]>()
	const confirmed = vi.fn<OrgRemarkMutationPorts["save"]["commitConfirmed"]>((saved, confirmation) => {
		duringAck?.()
		const plan = planOrgWorkingCopyAck({
			expectedDocument: initialNotes.document, currentDocument: document,
			workingSource: notes.source, capturedSource: saved.content, receipt: confirmation,
		})
		if (plan.kind !== "ack") throw new Error(plan.reason)
		document = plan.document
	})
	const ports: OrgRemarkMutationPorts = {
		isCurrentSource: () => windowCurrent && !source.closed && source.state === sourceState &&
			source.source === capture.source && source.revision === capture.sourceGeneration &&
			tracker.getSnapshot().version === capture.remarkVersion,
		notesAreCurrent,
		prepareCanonical: (candidate) => notesAreCurrent(candidate) ? candidate : null,
		apply: (candidate, edits, guard) => {
			if (!guard()) return false
			const applied = notes.applyCommandEdits(candidate.content, edits)
			if (applied) afterCommit?.()
			return applied
		},
		snapshot: (path) => path === document.relativePath ? snapshot() : null,
		pause,
		save: {
			isFresh: () => saveOwnerCurrent && !notes.closed,
			isCurrent: () => saveOwnerCurrent && !notes.closed,
			write,
			commitConfirmed: confirmed,
		},
	}
	const initialNotes = snapshot()
	const planned = planOrgRemarkMutation({
		notesSource: initialNotes.content, sourceRelativePath: capture.relativePath, source: capture.source, action,
	})
	if (planned.kind !== "ready") throw new Error(planned.message)
	return {
		source, sourceState, tracker, capture, notes, view, handle, initialNotes, planned, previousDraft,
		pending, write, pause, confirmed, snapshot,
		run: () => runOrgRemarkMutationFlow(capture, initialNotes, action, ports),
		retireSaveOwner: () => { saveOwnerCurrent = false },
		retireSourceWindow: () => { windowCurrent = false },
		afterCommit: (callback: () => void) => { afterCommit = callback },
		duringAck: (callback: () => void) => { duringAck = callback },
	}
}

describe("canonical Org-remark commit and CAS races", () => {
	it.each(["late-owner", "write-left"] as const)("retains the dirty planned sidecar and one undo after %s", async (failure) => {
		const f = fixture()
		const saving = f.run()
		expect(f.notes.source).toBe(f.planned.next)
		expect(f.view.state.sliceDoc()).toBe(f.planned.next)
		expect(undoDepth(f.notes.state)).toBe(2)
		expect(f.snapshot().document).toBe(f.initialNotes.document)
		if (failure === "late-owner") {
			f.retireSaveOwner()
			f.pending.resolve(E.right(receipt))
		} else {
			f.pending.resolve(E.left({
				type: "ORG_FILE_ERROR", operation: "write", command: "write_org_document",
				message: "Sidecar changed on disk", cause: null,
			}))
		}
		expect(await saving).toMatchObject({ kind: "uncertain" })
		expect(f.write).toHaveBeenCalledTimes(1)
		expect(f.confirmed).not.toHaveBeenCalled()
		expect(f.pause).toHaveBeenCalledExactlyOnceWith(receipt.relativePath)
		expect(f.snapshot().document).toBe(f.initialNotes.document)
		expect(f.notes.source).toBe(f.planned.next)
		expect(f.notes.source).toContain(dirtyNoteBody)
		expect(f.notes.source).toContain("Saved marginal note.")
		expect(f.handle.undo()).toBe(true)
		expect(f.notes.source).toBe(f.previousDraft)
		expect(f.view.state.sliceDoc()).toBe(f.previousDraft)
		expect(undoDepth(f.notes.state)).toBe(1)
		expect(redoDepth(f.notes.state)).toBe(1)
		expect(f.handle.redo()).toBe(true)
		expect(f.notes.source).toBe(f.planned.next)
		expect(f.source.state).toBe(f.sourceState)
		expect(f.source.source).toBe(f.capture.source)
		expect(f.source.revision).toBe(f.capture.sourceGeneration)
		expect(undoDepth(f.source.state)).toBe(1)
	})

	it("ACKs only the written baseline when a newer marginal note edit arrives during confirmation", async () => {
		const f = fixture()
		const newerBody = "Another note typed as the CAS is acknowledged.\n"
		let newerState: EditorState | undefined
		f.duringAck(() => {
			const end = f.notes.source.length
			f.notes.applyCommandEdit(f.notes.source, { from: end, to: end, insert: newerBody, cursor: end + newerBody.length })
			newerState = f.notes.state
		})
		const saving = f.run()
		expect(f.snapshot().document).toBe(f.initialNotes.document)
		f.pending.resolve(E.right(receipt))
		const outcome = await saving
		expect(outcome.kind).toBe("confirmed")
		if (outcome.kind !== "confirmed") throw new Error("Expected a confirmed sidecar")
		expect(outcome.notes.document).toEqual({ ...receipt, content: f.planned.next })
		expect(outcome.notes.content).toBe(f.planned.next + newerBody)
		expect(outcome.notes.content).not.toBe(outcome.notes.document.content)
		expect(f.notes.state).toBe(newerState)
		expect(f.view.state.sliceDoc()).toBe(f.planned.next + newerBody)
		expect(undoDepth(f.notes.state)).toBe(3)
		expect(f.write).toHaveBeenCalledTimes(1)
		expect(f.confirmed).toHaveBeenCalledTimes(1)
		expect(f.pause).not.toHaveBeenCalled()
		expect(f.handle.undo()).toBe(true)
		expect(f.notes.source).toBe(f.planned.next)
		expect(f.snapshot().document.content).toBe(f.notes.source)
		expect(f.handle.undo()).toBe(true)
		expect(f.notes.source).toBe(f.previousDraft)
		expect(f.snapshot().document).toEqual({ ...receipt, content: f.planned.next })
		expect(f.source.state).toBe(f.sourceState)
		expect(f.source.source).toBe(f.capture.source)
		expect(f.source.revision).toBe(f.capture.sourceGeneration)
		expect(undoDepth(f.source.state)).toBe(1)
	})

	it.each(["source-window", "anchor-version"] as const)("retains the committed draft without IO when %s changes before save", async (change) => {
		const f = fixture()
		f.afterCommit(() => {
			if (change === "source-window") f.retireSourceWindow()
			else {
				const mark = f.tracker.getSnapshot().marks[0]
				expect(f.tracker.install(f.source.source, f.source.revision, [{ ...mark, from: 1, to: 5 }])).toBe(true)
			}
		})
		expect(await f.run()).toMatchObject({ kind: "uncertain" })
		expect(f.write).not.toHaveBeenCalled()
		expect(f.confirmed).not.toHaveBeenCalled()
		expect(f.pause).toHaveBeenCalledExactlyOnceWith(receipt.relativePath)
		expect(f.notes.source).toBe(f.planned.next)
		expect(f.view.state.sliceDoc()).toBe(f.planned.next)
		expect(f.snapshot().document).toBe(f.initialNotes.document)
		expect(undoDepth(f.notes.state)).toBe(2)
		expect(f.handle.undo()).toBe(true)
		expect(f.notes.source).toBe(f.previousDraft)
		expect(f.notes.source).toContain(dirtyNoteBody)
		expect(f.source.state).toBe(f.sourceState)
		expect(f.source.source).toBe(f.capture.source)
		expect(f.source.revision).toBe(f.capture.sourceGeneration)
		expect(undoDepth(f.source.state)).toBe(1)
		if (change === "anchor-version") {
			expect(f.tracker.getSnapshot().version).toBeGreaterThan(f.capture.remarkVersion)
			expect(f.tracker.read("a1b2c3d4")).toMatchObject({ from: 1, to: 5 })
		}
	})
})
