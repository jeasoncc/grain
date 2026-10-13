import { act, cleanup } from "@testing-library/react"
import { renderHook } from "@/test/application-providers"
import { invoke } from "@tauri-apps/api/core"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { planOrgRoamNote } from "@/pipes/org/org-note.pipe"
import type { OrgNoteOutcome, OrgRoamNotePlan } from "@/pipes/org/org-note.pipe"
import type { OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import { orgLinkTargetAt } from "@/pipes/org/org-link.pipe"
import { useOrgWorkspace } from "@/hooks/use-org-workspace"
import type { OrgDiaryOutcome } from "@/pipes/org/org-diary.pipe"
import type { OrgDocumentInterface } from "@/types/org"
import { ConfirmProvider } from "../ui"

vi.mock("@tauri-apps/api/core", async (importOriginal) => ({
	...await importOriginal<typeof import("@tauri-apps/api/core")>(),
	invoke: vi.fn(),
}))
vi.mock("@tanstack/react-router", () => ({ useBlocker: vi.fn(), useNavigate: () => vi.fn() }))
vi.mock("@/hooks/use-org-window-close", () => ({ useOrgWindowClose: () => true }))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({ orgWorkspaceEventAdapter: { listen: async () => () => undefined } }))

const instant = new Date(2026, 9, 6, 23, 59, 58, 999)
const directory = "ا-diary/year-2026-Horse/month-10-October/day-06-Tuesday"
const path = `${directory}/diary-${Math.floor(instant.getTime() / 1000)}-23-59-58.org`
const noteId = "08993470-4b1b-4a60-893b-d0a5a19c89af"
const notePlan = (): OrgRoamNotePlan => planOrgRoamNote(instant, noteId, "New Note")
let disk: Map<string, OrgDocumentInterface>
const snapshot = () => ({ rootPath: "/approved", capabilityToken: "G1", directories: [], documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })) })

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(instant)
	vi.resetAllMocks()
	window.localStorage.clear()
	disk = new Map([
		["a.org", { relativePath: "a.org", revision: "a1", content: "* First\r\noriginal" }],
		["b.org", { relativePath: "b.org", revision: "b1", content: "* Second\noriginal" }],
		["diary/2026-10-06.org", { relativePath: "diary/2026-10-06.org", revision: "legacy1", content: "legacy\r\nuntouched" }],
	])
	vi.mocked(invoke).mockImplementation(async (command, payload) => {
		const args = payload as Record<string, unknown> | undefined
		if (command === "open_default_org_workspace") return snapshot()
		if (command === "scan_org_workspace") return snapshot()
		if (command === "watch_org_workspace") return "watch-G1"
		if (command === "read_org_document") return { ...disk.get(String(args?.relativePath))! }
		if (command === "create_org_directory" || command === "release_org_workspace" || command === "unwatch_org_workspace") return undefined
		if (command !== "write_org_document") throw new Error(`Unexpected fixture IO: ${command}`)
		const relativePath = String(args?.relativePath)
		if (disk.has(relativePath) && args?.expectedRevision === "<missing>") throw { kind: "creation-collision", relativePath, noWrite: true, message: "exists" }
		const saved = { relativePath, revision: `saved-${disk.size}`, content: String(args?.content) }
		disk.set(relativePath, saved)
		return { relativePath, revision: saved.revision }
	})
})
afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
	vi.useRealTimers()
})
const setup = async () => {
	const hook = renderHook(() => useOrgWorkspace(), { wrapper: ConfirmProvider })
	await act(async () => { await hook.result.current.openDefaultWorkspace() })
	return hook
}

describe("ordinary Doom note creation", () => {
	it("initializes only its newly published file with the basename, UUID, captured local time and EOF", async () => {
		const { result } = await setup()
		const uuid = "c7766f19-0d54-4bb3-965e-48f4d1787d75"
		vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(uuid)
		await act(async () => { await result.current.createDocument("folder/普通 Note.org") })
		const source = `:PROPERTIES:\n:ID:       ${uuid}\n:END:\n#+TITLE: 普通 Note\n#+DATE: 2026-10-06\n#+TIME: 2026-10-06 23:59:58\n#+FILETAGS: :note:\n#+LATEX_CLASS: elegant-book\n#+OPTIONS: num:nil toc:nil ^:nil\n\n* 内容\n\n`
		expect(disk.get("folder/普通 Note.org")?.content).toBe(source)
		expect(result.current.content).toBe(source)
		expect(result.current.revealTarget).toMatchObject({ relativePath: "folder/普通 Note.org", line: 13 })
		expect(result.current.isDirty).toBe(false)
	})
	it("creates generated remark sidecars empty and leaves pre-existing empty user files untouched", async () => {
		const { result } = await setup()
		disk.set("empty.org", { relativePath: "empty.org", revision: "empty-1", content: "" })
		await act(async () => { await result.current.createDocument("source-notes.org") })
		expect(disk.get("source-notes.org")?.content).toBe("")
		expect(result.current.activeDocument?.relativePath).toBe("source-notes.org")
		await act(async () => { await result.current.createDocument("empty.org") })
		expect(disk.get("empty.org")).toEqual({ relativePath: "empty.org", revision: "empty-1", content: "" })
		expect(result.current.activeDocument?.relativePath).toBe("source-notes.org")
		expect(disk.get("diary/2026-10-06.org")?.content).toBe("legacy\r\nuntouched")
	})
})

describe("consumer-visible diary controller", () => {
	it("creates fresh UUID entries, uses one captured clock, and reveals their exact EOF", async () => {
		const { result } = await setup()
		const ids: string[] = []
		for (let index = 1; index <= 3; index += 1) {
			await act(async () => {
				expect(await result.current.createDiary()).toEqual({ kind: "created", relativePath: index === 1 ? path : path.replace(/\.org$/, `-${index}.org`) })
			})
			const document = result.current.activeDocument!
			const id = document.content.match(/^:ID:       ([0-9a-f-]{36})$/m)?.[1]
			expect(id).toBeDefined()
			ids.push(id!)
			expect(document.content).toBe(`:PROPERTIES:\n:ID:       ${id}\n:END:\n#+TITLE: 日记 2026-10-06 23:59:58\n#+DATE: 2026-10-06\n#+TIME: 2026-10-06 23:59:58\n#+FILETAGS: :diary:\n#+LATEX_CLASS: elegant-book\n#+OPTIONS: num:nil toc:nil ^:nil\n\n* 今日记录\n\n`)
			expect(result.current.revealTarget).toMatchObject({ relativePath: document.relativePath, line: 13 })
			expect(result.current.isDirty).toBe(false)
		}
		expect(new Set(ids).size).toBe(3)
		expect(disk.get("diary/2026-10-06.org")?.content).toBe("legacy\r\nuntouched")
	})
	it("retains both other dirty buffers without saving or replacing their source", async () => {
		const { result } = await setup()
		await act(async () => { await result.current.openDocumentPath("a.org") })
		act(() => result.current.updateContent("* First\r\ndirty a"))
		await act(async () => { await result.current.openDocumentPath("b.org") })
		act(() => result.current.updateContent("* Second\ndirty b"))
		await act(async () => { expect((await result.current.createDiary()).kind).toBe("created") })
		expect(result.current.liveBuffers.find((buffer) => buffer.document.relativePath === "a.org")).toMatchObject({ content: "* First\r\ndirty a", isDirty: true })
		expect(result.current.liveBuffers.find((buffer) => buffer.document.relativePath === "b.org")).toMatchObject({ content: "* Second\ndirty b", isDirty: true })
		expect(disk.get("a.org")?.content).toBe("* First\r\noriginal")
		expect(disk.get("b.org")?.content).toBe("* Second\noriginal")
	})
	it("captures time before asynchronous directory creation crosses midnight", async () => {
		const { result } = await setup()
		const original = vi.mocked(invoke).getMockImplementation()!
		vi.mocked(invoke).mockImplementation(async (command, payload) => {
			if (command === "create_org_directory") vi.setSystemTime(new Date(2026, 9, 7, 0, 0, 1))
			return original(command, payload)
		})
		await act(async () => { expect(await result.current.createDiary()).toEqual({ kind: "created", relativePath: path }) })
		expect(result.current.content).toContain("#+TIME: 2026-10-06 23:59:58\n")
	})
	it("reports no workspace and a stale render owner without file effects", async () => {
		const { result } = renderHook(() => useOrgWorkspace(), { wrapper: ConfirmProvider })
		await act(async () => { expect((await result.current.createDiary()).kind).toBe("no-workspace") })
		await act(async () => { await result.current.openDefaultWorkspace() })
		const staleController = result.current
		await act(async () => { await result.current.openDocumentPath("a.org") })
		vi.mocked(invoke).mockClear()
		await act(async () => { expect((await staleController.createDiary()).kind).toBe("stale") })
		expect(invoke).not.toHaveBeenCalled()
	})
	it("does not report creation on write failure or an in-flight busy action", async () => {
		const { result } = await setup()
		await act(async () => { await result.current.openDocumentPath("a.org") })
		const source = result.current.content
		const original = vi.mocked(invoke).getMockImplementation()!
		const directoryGate = Promise.withResolvers<unknown>()
		vi.mocked(invoke).mockImplementation((command, payload) => command === "create_org_directory"
			? directoryGate.promise : original(command, payload))
		let pending!: Promise<OrgDiaryOutcome>
		act(() => { pending = result.current.createDiary() })
		await act(async () => { expect((await result.current.createDiary()).kind).toBe("busy") })
		await act(async () => { directoryGate.resolve(undefined); await pending })
		vi.mocked(invoke).mockImplementation((command, payload) => command === "write_org_document"
			? Promise.reject("permission denied") : original(command, payload))
		await act(async () => { expect((await result.current.createDiary()).kind).toBe("uncertain") })
		expect(result.current.activeDocument?.relativePath).toBe(path)
		expect(disk.get("a.org")?.content).toBe(source)
	})
	it("does not navigate or publish UI state after the original owner unmounts", async () => {
		const hook = await setup()
		const original = vi.mocked(invoke).getMockImplementation()!
		const writeGate = Promise.withResolvers<unknown>()
		const writeStarted = Promise.withResolvers<void>()
		vi.mocked(invoke).mockImplementation((command, payload) => {
			if (command !== "write_org_document") return original(command, payload)
			writeStarted.resolve()
			return writeGate.promise
		})
		let pending!: Promise<OrgDiaryOutcome>
		act(() => { pending = hook.result.current.createDiary() })
		await act(async () => { await writeStarted.promise })
		hook.unmount()
		writeGate.resolve({ relativePath: path, revision: "confirmed" })
		expect((await pending).kind).toBe("stale")
		expect(vi.mocked(invoke).mock.calls.some(([command]) => command === "release_org_workspace")).toBe(true)
	})
})

describe("chronological Roam note controller", () => {
	it("publishes the captured full source and opens at EOF by default with its fixed identity", async () => {
		const { result } = await setup()
		const plan = notePlan()
		const relativePath = `${plan.directory}/${plan.filenameStem}.org`
		await act(async () => {
			expect(await result.current.createRoamNote(plan)).toEqual({
				kind: "created", relativePath, id: noteId, title: "New Note",
			})
		})
		expect(result.current.activeDocument).toMatchObject({ relativePath, content: plan.content })
		expect(result.current.revealTarget).toMatchObject({ relativePath, line: 13 })
		expect(result.current.isDirty).toBe(false)
		expect(disk.get("diary/2026-10-06.org")?.content).toBe("legacy\r\nuntouched")
	})
	it("publishes open=false metadata only, retaining active and parked raw sources, selection, history and window authority", async () => {
		const { result } = await setup()
		await act(async () => { await result.current.openDocumentPath("a.org") })
		act(() => result.current.updateContent("* First\r\ndirty a\u0000🐉"))
		await act(async () => { await result.current.openDocumentPath("b.org") })
		const runtime = result.current.activeBufferRuntime!
		const activeId = result.current.activeBufferId!
		const release = result.current.registerBufferWindow("note-create-origin", activeId)
		let handle!: OrgBufferWindowHandle
		const view = new EditorView({
			state: EditorState.create({
				doc: runtime.state.doc,
				extensions: runtime.historyFreeSourceExtensions,
			}),
			dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
		})
		handle = runtime.attachWindow({ windowId: "note-create-origin", view })
		try {
			act(() => view.dispatch({
				changes: { from: runtime.source.length, insert: "\ndirty b" },
				selection: EditorSelection.cursor(3),
			}))
			const source = result.current.content
			const state = runtime.state
			const selection = view.state.selection
			const revision = runtime.revision
			const reveal = result.current.revealTarget
			const permit = result.current.captureBufferWindowPermit("note-create-origin", activeId)
			const plan = notePlan()
			const relativePath = `${plan.directory}/${plan.filenameStem}.org`
			await act(async () => {
				expect(await result.current.createRoamNote(plan, { open: false })).toMatchObject({
					kind: "created-unopened", relativePath, id: noteId, title: "New Note",
				})
			})
			expect(result.current.workspace?.documents.find((document) => document.relativePath === relativePath)).toMatchObject({ relativePath, revision: disk.get(relativePath)?.revision })
			expect(result.current.workspace?.directories).toContain(directory)
			expect(result.current.activeBufferId).toBe(activeId)
			expect(result.current.activeBufferRuntime).toBe(runtime)
			expect(result.current.activeDocument?.relativePath).toBe("b.org")
			expect(result.current.content).toBe(source)
			expect(result.current.isDirty).toBe(true)
			expect(result.current.revealTarget).toBe(reveal)
			expect(runtime.state).toBe(state)
			expect(runtime.revision).toBe(revision)
			expect(view.state.selection).toBe(selection)
			expect(permit()).toBe(true)
			expect(result.current.openBuffers.map((buffer) => buffer.relativePath).sort()).toEqual(["a.org", "b.org"])
			expect(result.current.liveBuffers.find((buffer) => buffer.document.relativePath === "a.org")).toMatchObject({ content: "* First\r\ndirty a\u0000🐉", isDirty: true })
			expect(disk.get("a.org")?.content).toBe("* First\r\noriginal")
			expect(disk.get("b.org")?.content).toBe("* Second\noriginal")
			act(() => { expect(handle.undo()).toBe(true) })
			expect(result.current.content).toBe("* Second\noriginal")
		} finally {
			release()
			handle.detach()
			view.destroy()
		}
	})
	it("copies the captured directory, stem, edited raw body and identity before asynchronous publication", async () => {
		const { result } = await setup()
		const plan = { ...notePlan(), content: `${notePlan().content}raw\r\nlone\rUnicode 🐉\u0000\n` }
		const source = plan.content
		const relativePath = `${plan.directory}/${plan.filenameStem}.org`
		const original = vi.mocked(invoke).getMockImplementation()!
		const gate = Promise.withResolvers<unknown>()
		vi.mocked(invoke).mockImplementation((command, payload) => command === "create_org_directory"
			? gate.promise : original(command, payload))
		let pending!: Promise<OrgNoteOutcome>
		const options = { open: false }
		act(() => { pending = result.current.createRoamNote(plan, options) })
		options.open = true
		plan.directory = "elsewhere"
		plan.filenameStem = "mutated"
		plan.content = "mutated body"
		plan.id = "mutated id"
		plan.title = "mutated title"
		await act(async () => {
			gate.resolve(undefined)
			expect(await pending).toMatchObject({ kind: "created-unopened", relativePath, id: noteId, title: "New Note" })
		})
		expect(disk.get(relativePath)?.content).toBe(source)
		expect(disk.has("elsewhere/mutated.org")).toBe(false)
		expect(result.current.activeDocument).toBeNull()
	})
	it("uses safe same-second suffixes while preserving each existing body and identity", async () => {
		const { result } = await setup()
		const plan = notePlan()
		const secondId = "e4bbf982-3e08-4565-a76d-3f685f954a2d"
		const secondSource = `${planOrgRoamNote(instant, secondId, "New Note").content}another source`
		const base = `${plan.directory}/${plan.filenameStem}`
		disk.set(`${base}.org`, { relativePath: `${base}.org`, revision: "occupied", content: "existing\r\nnote" })
		await act(async () => {
			expect(await result.current.createRoamNote(plan, { open: false })).toMatchObject({
				kind: "created-unopened", relativePath: `${base}-2.org`, id: noteId, title: "New Note",
			})
		})
		await act(async () => {
			expect(await result.current.createRoamNote({ ...plan, id: secondId, content: secondSource }, { open: false })).toMatchObject({
				kind: "created-unopened", relativePath: `${base}-3.org`, id: secondId, title: "New Note",
			})
		})
		expect(disk.get(`${base}.org`)?.content).toBe("existing\r\nnote")
		expect(disk.get(`${base}-2.org`)?.content).toBe(plan.content)
		expect(disk.get(`${base}-3.org`)?.content).toBe(secondSource)
	})
	it("retains a file with a lost publication receipt without retrying, installing metadata or navigating", async () => {
		const { result } = await setup()
		await act(async () => { await result.current.openDocumentPath("a.org") })
		const original = vi.mocked(invoke).getMockImplementation()!
		vi.mocked(invoke).mockImplementation(async (command, payload) => {
			const confirmed = await original(command, payload)
			if (command === "write_org_document") throw new Error("receipt lost after publish")
			return confirmed
		})
		const plan = notePlan()
		const relativePath = `${plan.directory}/${plan.filenameStem}.org`
		vi.mocked(invoke).mockClear()
		await act(async () => { expect((await result.current.createRoamNote(plan)).kind).toBe("uncertain") })
		expect(disk.get(relativePath)?.content).toBe(plan.content)
		expect(vi.mocked(invoke).mock.calls.filter(([command]) => command === "write_org_document")).toHaveLength(1)
		expect(result.current.workspace?.documents.some((document) => document.relativePath === relativePath)).toBe(false)
		expect(result.current.activeDocument?.relativePath).toBe("a.org")
		expect(result.current.isSaving).toBe(false)
	})
	it("rejects absent workspace, stale render and a busy owner without publishing another file", async () => {
		const { result } = renderHook(() => useOrgWorkspace(), { wrapper: ConfirmProvider })
		await act(async () => { expect((await result.current.createRoamNote(notePlan())).kind).toBe("no-workspace") })
		await act(async () => { await result.current.openDefaultWorkspace() })
		const stale = result.current
		await act(async () => { await result.current.openDocumentPath("a.org") })
		vi.mocked(invoke).mockClear()
		await act(async () => { expect((await stale.createRoamNote(notePlan())).kind).toBe("stale") })
		expect(invoke).not.toHaveBeenCalled()
		const original = vi.mocked(invoke).getMockImplementation()!
		const gate = Promise.withResolvers<unknown>()
		vi.mocked(invoke).mockImplementation((command, payload) => command === "create_org_directory"
			? gate.promise : original(command, payload))
		let pending!: Promise<OrgNoteOutcome>
		act(() => { pending = result.current.createRoamNote(notePlan(), { open: false }) })
		await act(async () => { expect((await result.current.createRoamNote(notePlan())).kind).toBe("busy") })
		await act(async () => { gate.reject(new Error("directory denied")); expect((await pending).kind).toBe("rejected") })
		expect(result.current.isSaving).toBe(false)
		expect(vi.mocked(invoke).mock.calls.some(([command]) => command === "write_org_document")).toBe(false)
	})
	it("never claims navigation when confirmation outlives the exact mounted workspace owner", async () => {
		const hook = await setup()
		const original = vi.mocked(invoke).getMockImplementation()!
		const gate = Promise.withResolvers<unknown>()
		const started = Promise.withResolvers<void>()
		vi.mocked(invoke).mockImplementation((command, payload) => {
			if (command !== "write_org_document") return original(command, payload)
			started.resolve()
			return gate.promise
		})
		let pending!: Promise<OrgNoteOutcome>
		act(() => { pending = hook.result.current.createRoamNote(notePlan()) })
		await act(async () => { await started.promise })
		hook.unmount()
		gate.resolve({ relativePath: `${notePlan().directory}/${notePlan().filenameStem}.org`, revision: "confirmed" })
		expect((await pending).kind).toBe("stale")
	})
})

describe("captured note identity protection", () => {
	it("rejects a changed captured ID before any filesystem publication", async () => {
		const { result } = await setup()
		await act(async () => { await result.current.openDocumentPath("a.org") })
		const plan = notePlan()
		const content = plan.content.replace(noteId, "289796dd-e1b8-4eeb-a745-c9c4e82adf81")
		vi.mocked(invoke).mockClear()
		await act(async () => {
			expect(await result.current.createRoamNote({ ...plan, content }, { open: false })).toMatchObject({ kind: "rejected" })
		})
		expect(invoke).not.toHaveBeenCalled()
		expect(result.current.activeDocument?.relativePath).toBe("a.org")
		expect(result.current.content).toBe("* First\r\noriginal")
		expect(result.current.isSaving).toBe(false)
	})
	it("accepts unchanged identity without trimming or normalizing the persisted source", async () => {
		const { result } = await setup()
		const plan = planOrgRoamNote(instant, noteId, "  Note with spaces  ")
		const content = `${plan.content.replaceAll("\n", "\r\n")}body\rUnicode 🐉\u0000\n`
		const relativePath = `${plan.directory}/${plan.filenameStem}.org`
		await act(async () => {
			expect(await result.current.createRoamNote({ ...plan, content }, { open: false })).toMatchObject({
				kind: "created-unopened", relativePath, id: noteId, title: "Note with spaces",
			})
		})
		expect(disk.get(relativePath)?.content).toBe(content)
		expect(result.current.activeDocument).toBeNull()
	})
	it("publishes an edited valid title verbatim at the original capture-start filename and returns its actual parsed title", async () => {
		const { result } = await setup()
		const plan = notePlan()
		const content = plan.content.replace("#+TITLE: New Note", "#+TITLE:   Edited 名称  ")
		const relativePath = `${plan.directory}/${plan.filenameStem}.org`
		await act(async () => {
			expect(await result.current.createRoamNote({ ...plan, content }, { open: false })).toMatchObject({
				kind: "created-unopened", relativePath, id: noteId, title: "Edited 名称",
			})
		})
		expect(disk.get(relativePath)?.content).toBe(content)
		expect(plan.title).toBe("New Note")
		expect(result.current.workspace?.documents.some((document) => document.relativePath === relativePath)).toBe(true)
	})
})

describe("root Roam navigation through the existing link boundary", () => {
	it("opens a confirmed chronological note by ID without requiring an already open source", async () => {
		disk.clear()
		const { result } = await setup()
		expect(result.current.workspace?.documents).toEqual([])
		const missing = orgLinkTargetAt(`[[id:${noteId}]]`, 3, "a.org")!
		await act(async () => { expect(await result.current.openOrgLink(missing)).toBe(false) })
		expect(result.current.activeDocument).toBeNull()
		const plan = notePlan()
		const relativePath = `${plan.directory}/${plan.filenameStem}.org`
		await act(async () => {
			expect((await result.current.createRoamNote(plan, { open: false })).kind).toBe("created-unopened")
		})
		expect(result.current.activeDocument).toBeNull()
		const target = orgLinkTargetAt(`[[id:${noteId}]]`, 3, "a.org")!
		await act(async () => { expect(await result.current.openOrgLink(target)).toBe(true) })
		expect(result.current.activeDocument?.relativePath).toBe(relativePath)
		expect(result.current.content).toBe(plan.content)
		expect(result.current.revealTarget?.relativePath).toBe(relativePath)
	})
	it("retains a newly selected source when the root ID query settles late", async () => {
		const { result } = await setup()
		const plan = notePlan()
		const relativePath = `${plan.directory}/${plan.filenameStem}.org`
		disk.set(relativePath, { relativePath, revision: "note-1", content: plan.content })
		const original = vi.mocked(invoke).getMockImplementation()!
		const gate = Promise.withResolvers<unknown>()
		vi.mocked(invoke).mockImplementation((command, payload) => command === "scan_org_workspace"
			? gate.promise : original(command, payload))
		const target = orgLinkTargetAt(`[[id:${noteId}]]`, 3, "a.org")!
		let pending!: Promise<boolean>
		act(() => { pending = result.current.openOrgLink(target) })
		await act(async () => { await result.current.openDocumentPath("a.org") })
		await act(async () => { gate.resolve(snapshot()); expect(await pending).toBe(false) })
		expect(result.current.activeDocument?.relativePath).toBe("a.org")
		expect(result.current.content).toBe("* First\r\noriginal")
		expect(result.current.revealTarget?.relativePath).not.toBe(relativePath)
	})
})

describe("fresh note EOF and canonical separator authority", () => {
	it.each([
		["\r", "body\nliteral LF\u0000🐉"],
		["\r\n", "body\rliteral CR\nliteral LF\u0000🐉"],
	] as const)("reveals canonical EOF for %j without rewriting other newline bytes", async (separator, tail) => {
		const { result } = await setup()
		const plan = notePlan()
		const content = plan.content.replaceAll("\n", separator) + tail
		await act(async () => { expect((await result.current.createRoamNote({ ...plan, content })).kind).toBe("created") })
		expect(result.current.content).toBe(content)
		expect(result.current.activeBufferRuntime?.state.doc.lines).toBe(13)
		expect(result.current.revealTarget?.line).toBe(13)
		expect(disk.get(result.current.activeDocument!.relativePath)?.content).toBe(content)
	})
})
