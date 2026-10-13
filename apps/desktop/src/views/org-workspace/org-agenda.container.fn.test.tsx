import { isolateHistory, redoDepth, undoDepth } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, createEvent, fireEvent, screen, within, type RenderResult } from "@testing-library/react"
import { render } from "@/test/application-providers"
import { settingsStorageEvent } from "@/test/settings-storage-event"
import * as E from "fp-ts/Either"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useOrgWorkspace, type OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { orgFileRepository } from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import type { OrgBufferRuntime, OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import type { OrgAgendaTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import { OrgAgendaContainer } from "./org-agenda.container.fn"
import { OrgTodoNote } from "../org-editor/org-todo-note.view.fn"
import { useSettings } from "@/hooks/use-settings"
import { repairOrgConfigurationStorage } from "@/hooks/use-org-input-configuration"
import { useApplicationCommandHost, type ApplicationCommandHost } from "@/views/application/application-command-provider"
import { readOrgSparseClockContext } from "@/io/api/org-clock-context.api"
import { parseOrgClocks } from "@/pipes/org/org-clock.pipe"
import * as agendaCommandFlow from "@/flows/org-workspace/org-agenda-command.flow"

// Production container, hook, flows, parser, runtime and CM history; only host/file IO is replaced.
vi.mock("@tanstack/react-router", () => ({ useBlocker: vi.fn(), useNavigate: () => vi.fn() }))
vi.mock("@/io/event/org-window-close.adapter", () => ({
	registerOrgWindowClose: () => () => undefined,
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))
vi.mock("@/io/api/org-clock-context.api", () => ({ readOrgSparseClockContext: vi.fn() }))
vi.mock("@/io/file/org-file.repository", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/io/file/org-file.repository")>()
	const repository = {
		...actual.orgFileRepository,
		openDefaultWorkspace: vi.fn(),
		scanWorkspace: vi.fn(),
		readDocument: vi.fn(),
		writeDocument: vi.fn(),
		watchWorkspace: vi.fn(),
		unwatchWorkspace: vi.fn(),
		releaseWorkspace: vi.fn(),
	}
	return {
		...actual,
		orgFileRepository: repository,
		watchOrgWorkspace: repository.watchWorkspace,
		unwatchOrgWorkspace: repository.unwatchWorkspace,
		releaseOrgWorkspace: repository.releaseWorkspace,
	}
})

const source =
	"#+TODO: NEXT | FINISHED\r\n* NEXT 😀 duplicate\r\nDEADLINE: <2026-07-01 Wed>\r\nfirst body\r\n* NEXT 😀 duplicate\r\nDEADLINE: <2026-07-01 Wed>\r\n#+begin_export html\r\n<b>second body untouched</b>\r\n#+end_export\r\n"
const changed = source.replace(
	"* NEXT 😀 duplicate\r\nDEADLINE: <2026-07-01 Wed>\r\n#+begin_export",
	"* FINISHED 😀 duplicate\r\nDEADLINE: <2026-07-01 Wed>\r\n#+begin_export",
)
let controller: OrgWorkspaceController
let hideAgenda: () => void
let workspace: OrgWorkspaceInterface
let disk: Map<string, OrgDocumentInterface>
const showEditor = vi.fn()
let noteCallback: ((request: OrgAgendaTodoNoteRequest) => boolean | void) | undefined
const disposers: (() => void)[] = []
let grant = 0
let commandHost: ApplicationCommandHost
let nativeEpoch: number

function Harness({ loggingTool = false }: { readonly loggingTool?: boolean }) {
	controller = useOrgWorkspace()
	commandHost = useApplicationCommandHost()
	const [visible, setVisible] = useState(true)
	const [note, setNote] = useState<OrgAgendaTodoNoteRequest | null>(null)
	hideAgenda = () => setVisible(false)
	return (
		<>
			<input aria-label="Other surface" />
			{visible ? (
				<OrgAgendaContainer
					controller={controller}
					onShowEditor={showEditor}
					onTodoNoteRequest={loggingTool ? (request) => {
						setNote(request)
						return noteCallback?.(request)
					} : noteCallback}
					now={() => new Date(2026, 8, 30, 23, 59)}
				/>
			) : null}
			{note ? <OrgTodoNote
				request={note}
				origin={note.origin}
				closeFence={JSON.stringify([controller.workspace?.capabilityToken, controller.workspaceSessionId])}
				onClose={() => setNote(null)}
			/> : null}
		</>
	)
}

// Same history-free CM projection/dispatch boundary used by the editor; canonical history stays in runtime.
function attach(runtime: OrgBufferRuntime) {
	const windowId = `agenda-test-${disposers.length}`
	const release = controller.registerBufferWindow(windowId, runtime.key.bufferId)
	let handle!: OrgBufferWindowHandle
	const view = new EditorView({
		state: EditorState.create({
			doc: runtime.state.doc,
			extensions: runtime.historyFreeSourceExtensions,
		}),
		dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
	})
	handle = runtime.attachWindow({ windowId, view })
	disposers.push(() => {
		release()
		handle.detach()
		view.destroy()
	})
	return { view, handle }
}
const live = (path = "tasks.org") =>
	controller.liveBuffers.find((buffer) => buffer.document.relativePath === path)!
async function setup(loggingTool = false) {
	render(<Harness loggingTool={loggingTool} />)
	await act(async () => {
		await controller.openDefaultWorkspace()
	})
	await open("editor.org")
	expect(screen.getAllByRole("button", { name: "Cycle TODO for 😀 duplicate" })).toHaveLength(2)
}
async function open(path: string) {
	await act(async () => {
		expect(await controller.openDocumentPath(path)).toBe(true)
	})
}
async function cycleSecondKeyboard() {
	const agenda = screen.getByRole("main", { name: "Org agenda" })
	await act(async () => {
		fireEvent.keyDown(agenda, { key: "n" })
	})
	expect(agenda.querySelectorAll("[data-agenda-open]")[1]).toHaveAttribute("aria-current", "true")
	await act(async () => {
		fireEvent.keyDown(agenda, { key: "t" })
	})
}
function expectChangedRows() {
	const rows = within(screen.getByRole("main", { name: "Org agenda" }))
		.getAllByRole("button")
		.filter((button) => button.hasAttribute("data-agenda-open"))
	expect(within(rows[0]).getByText("NEXT")).toBeInTheDocument()
	expect(within(rows[1]).getByText("FINISHED")).toBeInTheDocument()
}

beforeEach(() => {
	noteCallback = undefined
	vi.useFakeTimers()
	vi.clearAllMocks()
	nativeEpoch = Date.UTC(2026, 9, 9, 10, 0)
	vi.mocked(readOrgSparseClockContext).mockImplementation(async calendarTimes => ({
		nowEpochMs: nativeEpoch, todayStartEpochMs: nativeEpoch - 36000000, todayEndEpochMs: nativeEpoch + 50400000,
		durationFormat: "gnu-default", includeClockingTask: false, activeClock: null,
		localTimeToEpochMs: (year, month, day, hour, minute) => {
			if (!calendarTimes.some(time => time.join(",") === [year, month, day, hour, minute].join(","))) throw new Error("Uncaptured test calendar")
			return new Date(year, month - 1, day, hour, minute).getTime()
		},
	}))
	window.localStorage.clear()
	useSettings.setState({ orgAgendaConfigurationJson: "" })
	repairOrgConfigurationStorage()
	disk = new Map([
		[
			"editor.org",
			{ relativePath: "editor.org", content: "* Editor\noriginal body\n", revision: "editor-1" },
		],
		["tasks.org", { relativePath: "tasks.org", content: source, revision: "tasks-1" }],
	])
	// Unique grants isolate the production module's revision-keyed agenda cache across tests.
	workspace = {
		rootPath: "/notes",
		capabilityToken: `agenda-${++grant}`,
		directories: [],
		documents: [...disk.values()].map(({ relativePath, revision }) => ({ relativePath, revision })),
	}
	vi.mocked(orgFileRepository.openDefaultWorkspace).mockReturnValue(async () => E.right(workspace))
	vi.mocked(orgFileRepository.scanWorkspace).mockImplementation(
		() => async () => E.right(workspace),
	)
	vi.mocked(orgFileRepository.readDocument).mockImplementation(
		(input) => async () => E.right({ ...disk.get(input.relativePath)! }),
	)
	vi.mocked(orgFileRepository.writeDocument).mockImplementation((input) => async () => {
		expect(input.expectedRevision).toBe(disk.get(input.relativePath)!.revision)
		const saved = {
			relativePath: input.relativePath,
			content: input.content,
			revision: `${input.relativePath}-saved`,
		}
		disk.set(input.relativePath, saved)
		return E.right({ relativePath: saved.relativePath, revision: saved.revision })
	})
	vi.mocked(orgFileRepository.watchWorkspace).mockReturnValue(async () => E.right("watch"))
	vi.mocked(orgFileRepository.unwatchWorkspace).mockReturnValue(async () => E.right(undefined))
	vi.mocked(orgFileRepository.releaseWorkspace).mockReturnValue(async () => E.right(undefined))
})
afterEach(() => {
	while (disposers.length) disposers.pop()!()
	cleanup()
	useSettings.setState({ orgAgendaConfigurationJson: "" })
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe("production OrgAgendaContainer working-copy actions", () => {
	it("rejects a throwing precommit observer without edits and drains ownership", async () => {
		await setup()
		await open("tasks.org")
		const runtime = live().runtime
		const generation = runtime.revision
		const original = agendaCommandFlow.runOrgAgendaOperationFlow
		vi.spyOn(agendaCommandFlow, "runOrgAgendaOperationFlow").mockImplementationOnce((entry, command, ports, signal, options) =>
			original(entry, command, ports, signal, {
				...options,
				onCommitStarted: () => {
					options?.onCommitStarted?.()
					throw new Error("precommit observer")
				},
			}),
		)
		await cycleSecondKeyboard()
		expect(runtime.source).toBe(source)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(runtime.revision).toBe(generation)
		await cycleSecondKeyboard()
		expect(runtime.source).toBe(changed)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(runtime.revision).toBe(generation + 1)
	})

	it("confirms a committed publication despite an observer throw and drains ownership", async () => {
		await setup()
		await open("tasks.org")
		const runtime = live().runtime
		const generation = runtime.revision
		const original = runtime.applyCommandEdits.bind(runtime)
		vi.spyOn(runtime, "applyCommandEdits").mockImplementationOnce((raw, edits) => {
			original(raw, edits)
			throw new Error("observer threw after canonical commit")
		})
		await cycleSecondKeyboard()
		expect(runtime.source).toBe(changed)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(runtime.revision).toBe(generation + 1)
		// A later operation must not inherit the publication or mutation owner.
		await act(async () => {
			fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for 😀 duplicate" })[0])
		})
		expect(undoDepth(runtime.state)).toBe(2)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("hands a no-allocation note request to the shell and completes only once", async () => {
		const raw = source.replace("#+TODO: NEXT | FINISHED\r\n", "#+TODO: NEXT | FINISHED(f@)\r\n")
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		let request!: OrgAgendaTodoNoteRequest
		const callback = vi.fn((value: OrgAgendaTodoNoteRequest) => {
			request = value
			return true
		})
		noteCallback = callback
		await setup()
		await cycleSecondKeyboard()
		expect(callback).toHaveBeenCalledTimes(1)
		expect(
			controller.liveBuffers.some((buffer) => buffer.document.relativePath === "tasks.org"),
		).toBe(false)
		fireEvent.keyDown(screen.getByRole("main"), { key: "t" })
		expect(callback).toHaveBeenCalledTimes(1)
		expect(request.validate?.()).toEqual({ kind: "ready" })
		await act(async () => {
			const accepted = request.execute("literal note")
			expect(await request.execute("duplicate")).toMatchObject({ kind: "rejected" })
			expect(await accepted).toEqual({ kind: "applied" })
		})
		const runtime = live().runtime
		expect(runtime.source).toContain("literal note")
		expect(undoDepth(runtime.state)).toBe(1)
		expect(await request.execute("again")).toMatchObject({ kind: "rejected" })
		expect(undoDepth(runtime.state)).toBe(1)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})
	it.each(["schedule", "deadline"] as const)("resumes rich %s through a literal logging tool in one canonical history event", async (kind) => {
		const field = kind === "schedule" ? "SCHEDULED" : "DEADLINE"
		const raw = `#+STARTUP: ${kind === "schedule" ? "lognotereschedule" : "lognoteredeadline"} logdrawer\r\n` +
			source.replaceAll("DEADLINE: <2026-07-01 Wed>", `${field}: <2026-07-01 Wed 10:30 +1w>`)
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		let request!: OrgAgendaTodoNoteRequest
		noteCallback = (value) => { request = value; return true }
		await setup(true)
		const active = controller.activeBufferRuntime
		const action = screen.getAllByRole("button", { name: `${kind === "schedule" ? "Schedule" : "Deadline"} for 😀 duplicate` })[1]
		await act(async () => { action.focus(); fireEvent.click(action) })
		const input = within(screen.getByRole("region", { name: "Minibuffer" })).getByRole("combobox", { name: /date \/ time \/ range \/ repeater \/ warning/ })
		const selected = "<2026-10-01 08:00-10:30 .+1m --2d>--<2026-10-02 11:00>"
		await act(async () => { fireEvent.change(input, { target: { value: selected } }); fireEvent.keyDown(input, { key: "Enter" }) })
		expect(input).not.toBeInTheDocument()
		expect(controller.liveBuffers.some((buffer) => buffer.document.relativePath === "tasks.org")).toBe(false)
		expect(request.origin?.isLive()).toBe(true)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		const tool = screen.getByRole("group", { name: `${kind === "schedule" ? "Schedule" : "Deadline"} logging note` })
		const note = within(tool).getByRole("textbox") as HTMLTextAreaElement
		fireEvent.change(note, { target: { value: "literal 😀\r\n* not a heading\u0000" } })
		note.setSelectionRange(0, note.value.length)
		const copy = createEvent.keyDown(note, { key: "c", ctrlKey: true })
		fireEvent(note, copy)
		expect(copy.defaultPrevented).toBe(false)
		await act(async () => { fireEvent.click(within(tool).getByRole("button", { name: "Abort note" })) })
		expect(note).toBeInTheDocument()
		expect(controller.liveBuffers.some((buffer) => buffer.document.relativePath === "tasks.org")).toBe(false)
		await act(async () => {
			fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep draft" }))
		})
		expect(note).toHaveValue("literal 😀\n* not a heading\u0000")
		await act(async () => { fireEvent.click(within(tool).getByRole("button", { name: "Finish note" })) })
		expect(tool).not.toBeInTheDocument()
		expect(await request.execute("late duplicate")).toMatchObject({ kind: "rejected" })
		expect(live().runtime.source).toContain(`${field}: ${selected}`)
		expect(live().runtime.source).toContain("[2026-09-30 Wed 23:59]")
		expect(live().runtime.source).toContain(
			`  : ${JSON.stringify("literal 😀\n")}\r\n  : ${JSON.stringify("* not a heading\u0000")}\r\n`,
		)
		expect(live().runtime.source.startsWith(raw.slice(0, raw.lastIndexOf("* NEXT")))).toBe(true)
		expect(undoDepth(live().runtime.state)).toBe(1)
		expect(live().isDirty).toBe(true)
		expect(controller.activeBufferRuntime).toBe(active)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		const runtime = live().runtime
		const result = runtime.source
		const editor = attach(runtime)
		expect(editor.view.state.sliceDoc()).toBe(result)
		await act(async () => { expect(editor.handle.undo()).toBe(true) })
		expect(runtime.source).toBe(raw)
		expect(editor.view.state.sliceDoc()).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(1)
		await act(async () => { expect(editor.handle.redo()).toBe(true) })
		expect(runtime.source).toBe(result)
		expect(editor.view.state.sliceDoc()).toBe(result)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(redoDepth(runtime.state)).toBe(0)
		expect(controller.activeBufferRuntime).toBe(active)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})
	it("edits a dirty task through an explicit Agenda scope, cancels then accepts its selected-state note once, and returns Source without touching another dirty buffer", async () => {
		const raw = source.replace("#+TODO: NEXT | FINISHED\r\n", "#+TODO: NEXT | FINISHED(f@)\r\n")
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		let request!: OrgAgendaTodoNoteRequest
		noteCallback = value => { request = value; return true }
		await setup(true)
		const other = controller.activeBufferRuntime!
		const otherEditor = attach(other)
		await act(async () => { otherEditor.view.dispatch({
			changes: { from: other.state.doc.length, insert: "unrelated dirty 😀\n" },
			annotations: isolateHistory.of("full"),
		}) })
		const otherBody = other.source
		const otherHistory = other.state
		await open("tasks.org")
		const runtime = live().runtime
		const taskEditor = attach(runtime)
		await act(async () => { taskEditor.view.dispatch({
			changes: { from: runtime.state.doc.length, insert: "task dirty overlay 😀\r\n" },
			annotations: isolateHistory.of("full"),
		}) })
		const dirtyBody = runtime.source
		const historyDepth = undoDepth(runtime.state)
		await act(async () => { useSettings.setState({ orgAgendaConfigurationJson: JSON.stringify({
			version: 1, views: [{
				id: "tasks", name: "Task states", files: ["tasks.org"], mode: "todo",
				todo: ["NEXT", "FINISHED"], match: null, window: null, overdue: false, deadlineWarningDays: null,
			}],
		}) }) })
		expect(screen.queryByRole("button", { name: "Cycle TODO for 😀 duplicate" })).not.toBeInTheDocument()
		await act(async () => { fireEvent.change(screen.getByRole("combobox", { name: "Agenda view" }), { target: { value: "tasks" } }) })
		for (const accepted of [false, true]) {
			const row = screen.getByRole("main").querySelectorAll<HTMLButtonElement>("[data-agenda-open]")[1]
			await act(async () => { row.focus(); await commandHost.registry.execute("org-agenda.todo-state") })
			const input = within(screen.getByRole("region", { name: "Minibuffer" })).getByRole("combobox", { name: /Agenda TODO state/ })
			await act(async () => { fireEvent.change(input, { target: { value: "FINISHED" } }); fireEvent.keyDown(input, { key: "Enter" }) })
			expect(runtime.source).toBe(dirtyBody)
			const tool = screen.getByRole("group", { name: "TODO state logging note" })
			if (!accepted) {
				await act(async () => { fireEvent.click(within(tool).getByRole("button", { name: "Abort note" })) })
				expect(undoDepth(runtime.state)).toBe(historyDepth)
				expect(runtime.source).toBe(dirtyBody)
			} else {
				fireEvent.change(within(tool).getByRole("textbox"), { target: { value: "selected second task literal 😀" } })
				await act(async () => { fireEvent.click(within(tool).getByRole("button", { name: "Finish note" })) })
				expect(await request.execute("duplicate acceptance")).toMatchObject({ kind: "rejected" })
				expect(undoDepth(runtime.state)).toBe(historyDepth + 1)
				expect(runtime.source).toContain("selected second task literal 😀")
				expect(runtime.source).toContain("task dirty overlay 😀")
				expect(runtime.source.startsWith(dirtyBody.slice(0, dirtyBody.lastIndexOf("* NEXT")))).toBe(true)
			}
		}
		await act(async () => { expect(taskEditor.handle.undo()).toBe(true) })
		expect(runtime.source).toBe(dirtyBody)
		expect(undoDepth(runtime.state)).toBe(historyDepth)
		const selected = screen.getByRole("main").querySelectorAll<HTMLButtonElement>("[data-agenda-open]")[1]
		await act(async () => { selected.focus(); await commandHost.registry.execute("org-agenda.return-source") })
		expect(controller.revealTarget).toMatchObject({ relativePath: "tasks.org", line: 5 })
		expect(showEditor).toHaveBeenCalledOnce()
		expect(other.source).toBe(otherBody)
		expect(other.state).toBe(otherHistory)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it.each(["complete-repeating", "remove-schedule", "remove-deadline"] as const)("executes selected-row %s on canonical ranges and undoes its whole operation once", async (kind) => {
		const raw = source.replaceAll("DEADLINE: <2026-07-01 Wed>",
			"SCHEDULED: <2026-07-01 Wed +1w> DEADLINE: <2026-07-02 Thu ++1m>")
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		render(<Harness />)
		await act(async () => { await controller.openDefaultWorkspace() })
		await open("editor.org")
		const unrelated = controller.activeBufferRuntime
		const rows = [...screen.getByRole("main").querySelectorAll<HTMLButtonElement>("[data-agenda-open]")]
		const selected = rows.find(row => row.closest("li")?.dataset.agendaHeading === String(raw.lastIndexOf("* NEXT")))!
		await act(async () => { selected.focus(); await commandHost.registry.execute(`org-agenda.${kind}`) })
		const runtime = live().runtime
		const boundary = raw.lastIndexOf("* NEXT")
		expect(runtime.source.slice(0, boundary)).toBe(raw.slice(0, boundary))
		const selectedBody = runtime.source.slice(boundary)
		if (kind === "complete-repeating") {
			expect(selectedBody).toContain("* FINISHED 😀 duplicate")
			expect(selectedBody).toContain("SCHEDULED: <2026-07-01 Wed +0w>")
			expect(selectedBody).toContain("DEADLINE: <2026-07-02 Thu ++0m>")
		} else {
			expect(selectedBody).not.toContain(kind === "remove-schedule" ? "SCHEDULED:" : "DEADLINE:")
			expect(selectedBody).toContain(kind === "remove-schedule"
				? "DEADLINE: <2026-07-02 Thu ++1m>" : "SCHEDULED: <2026-07-01 Wed +1w>")
			expect(selectedBody).toContain("* NEXT 😀 duplicate")
		}
		expect(undoDepth(runtime.state)).toBe(1)
		const editor = attach(runtime)
		await act(async () => { expect(editor.handle.undo()).toBe(true) })
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(controller.activeBufferRuntime).toBe(unrelated)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it.each([
		["shell", "rejected"],
		["shell", "confirmed"],
		["agenda", "rejected"],
		["agenda", "confirmed"],
	] as const)("latches %s cancellation during note commit and preserves %s outcome", async (surface, outcome) => {
		const raw = source.replace("#+TODO: NEXT | FINISHED\r\n", "#+TODO: NEXT | FINISHED(f@)\r\n")
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		let request!: OrgAgendaTodoNoteRequest
		const callback = vi.fn((value: OrgAgendaTodoNoteRequest) => {
			request = value
			return true
		})
		noteCallback = callback
		await setup()
		const original = agendaCommandFlow.runOrgAgendaOperationFlow
		vi.spyOn(agendaCommandFlow, "runOrgAgendaOperationFlow")
			.mockImplementationOnce(original)
			.mockImplementationOnce((entry, command, ports, signal, options) =>
				original(entry, command, ports, signal, {
					...options,
					onCommitStarted: () => {
						options?.onCommitStarted?.()
						if (surface === "shell") request.abort()
						else fireEvent.keyDown(screen.getByRole("main"), { key: "Escape" })
						expect(signal?.aborted).toBe(false)
						if (outcome === "rejected") throw new Error("reject after cancellation")
					},
				}),
			)
		await cycleSecondKeyboard()
		await act(async () => {
			expect(await request.execute("literal note")).toMatchObject({
				kind: outcome === "confirmed" ? "applied" : "aborted",
			})
		})
		expect(request.validate?.()).toMatchObject({ kind: "rejected" })
		expect(live().runtime.source.includes("literal note")).toBe(outcome === "confirmed")
		expect(undoDepth(live().runtime.state)).toBe(outcome === "confirmed" ? 1 : 0)
		// Deferred cancellation must release ownership, not leave the old prompt retryable.
		await act(async () => {
			fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for 😀 duplicate" })[0])
		})
		expect(callback).toHaveBeenCalledTimes(2)
		act(() => request.abort())
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})
	it.each(["unmount", "new grant"])("retires a real copyable logging note without late mutation: %s", async (mode) => {
		const raw = source.replace("#+TODO: NEXT | FINISHED\r\n", "#+TODO: NEXT | FINISHED(f@)\r\n")
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		let request!: OrgAgendaTodoNoteRequest
		noteCallback = (value) => {
			request = value
		}
		await setup(true)
		await cycleSecondKeyboard()
		const tool = screen.getByRole("group", { name: "TODO state logging note" })
		const note = within(tool).getByRole("textbox") as HTMLTextAreaElement
		fireEvent.change(note, { target: { value: "copy before closing\n* literal draft" } })
		await act(async () => {
			if (mode === "unmount") hideAgenda()
			else {
				workspace = { ...workspace, capabilityToken: `new-${++grant}` }
				await controller.openDefaultWorkspace()
			}
		})
		expect(note).toHaveValue("copy before closing\n* literal draft")
		expect(note).toHaveAttribute("readonly")
		expect(request.origin?.isLive()).toBe(false)
		note.setSelectionRange(0, note.value.length)
		const copy = createEvent.keyDown(note, { ctrlKey: true, key: "c" })
		fireEvent(note, copy)
		expect(copy.defaultPrevented).toBe(false)
		expect(await request.execute("late")).toMatchObject({ kind: "rejected" })
		expect(
			controller.liveBuffers.some((buffer) => buffer.document.relativePath === "tasks.org"),
		).toBe(false)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		await act(async () => { fireEvent.click(within(tool).getByRole("button", { name: "Abort note" })) })
		expect(note).toBeInTheDocument()
		await act(async () => {
			fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep draft" }))
		})
		expect(note).toHaveValue("copy before closing\n* literal draft")
		await act(async () => { fireEvent.click(within(tool).getByRole("button", { name: "Abort note" })) })
		await act(async () => {
			fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close tool" }))
		})
		expect(tool).not.toBeInTheDocument()
		expect(controller.liveBuffers.some((buffer) => buffer.document.relativePath === "tasks.org")).toBe(false)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})
	it("aborts a pending note Source read when the producer source generation changes and retains the literal draft", async () => {
		const raw = source.replace("#+TODO: NEXT | FINISHED\r\n", "#+TODO: NEXT | FINISHED(f@)\r\n")
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		let request!: OrgAgendaTodoNoteRequest
		noteCallback = value => { request = value; return true }
		await setup(true)
		const unrelated = controller.activeBufferRuntime!
		const editor = attach(unrelated)
		await cycleSecondKeyboard()
		const draft = within(screen.getByRole("group", { name: "TODO state logging note" })).getByRole("textbox")
		fireEvent.change(draft, { target: { value: "pending literal note 😀" } })
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentInterface>>()
		vi.mocked(orgFileRepository.readDocument).mockImplementationOnce(() => () => promise)
		let accepted!: Promise<OrgTodoNoteResult>
		act(() => { accepted = request.execute("pending literal note 😀") })
		await act(async () => { editor.view.dispatch({
			changes: { from: unrelated.state.doc.length, insert: "new producer generation\n" },
			annotations: isolateHistory.of("full"),
		}) })
		await act(async () => { expect(await accepted).toMatchObject({ kind: "rejected" }) })
		expect(draft).toHaveValue("pending literal note 😀")
		expect(draft).toHaveAttribute("readonly")
		expect(controller.liveBuffers.some(buffer => buffer.document.relativePath === "tasks.org")).toBe(false)
		await act(async () => { resolve(E.right(disk.get("tasks.org")!)) })
		expect(controller.liveBuffers.some(buffer => buffer.document.relativePath === "tasks.org")).toBe(false)
		expect(unrelated.source).toContain("new producer generation")
		expect(undoDepth(unrelated.state)).toBe(1)
		expect(disk.get("tasks.org")!.content).toBe(raw)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("refuses a note-required transition without a logging tool, without partial source or history", async () => {
		const raw = source.replace("#+TODO: NEXT | FINISHED\r\n", "#+TODO: NEXT | FINISHED(f@)\r\n")
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		await setup()
		await open("tasks.org")
		const runtime = controller.activeBufferRuntime!
		await cycleSecondKeyboard()
		expect(runtime.source).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(controller.isDirty).toBe(false)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		const rows = within(screen.getByRole("main", { name: "Org agenda" }))
			.getAllByRole("button")
			.filter((button) => button.hasAttribute("data-agenda-open"))
		for (const row of rows) expect(within(row).getByText("NEXT")).toBeInTheDocument()
	})

	it("logs with an empty CUSTOM_ID property and projects exact output and undo to the editor", async () => {
		vi.setSystemTime(new Date(2026, 8, 30, 23, 59))
		const raw = source
			.replace(
				"#+TODO: NEXT | FINISHED\r\n",
				"#+TODO: NEXT | FINISHED(!)\r\n#+STARTUP: logdone logdrawer\r\n",
			)
			.replace(
				"DEADLINE: <2026-07-01 Wed>\r\n#+begin_export",
				"DEADLINE: <2026-07-01 Wed>\r\n:PROPERTIES:\r\n:CUSTOM_ID:\r\n:END:\r\n#+begin_export",
			)
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		await setup()
		await open("tasks.org")
		const runtime = live().runtime
		const editor = attach(runtime)
		await cycleSecondKeyboard()
		const stamp = "[2026-09-30 Wed 23:59]"
		const expected = raw.replace(
			"* NEXT 😀 duplicate\r\nDEADLINE: <2026-07-01 Wed>\r\n:PROPERTIES:\r\n:CUSTOM_ID:\r\n:END:\r\n",
			`* FINISHED 😀 duplicate\r\nCLOSED: ${stamp} DEADLINE: <2026-07-01 Wed>\r\n:PROPERTIES:\r\n:CUSTOM_ID:\r\n:END:\r\n:LOGBOOK:\r\n- State "FINISHED"    from "NEXT" ${stamp}\r\n:END:\r\n`,
		)
		expect(runtime.source).toBe(expected)
		expect(editor.view.state.sliceDoc()).toBe(expected)
		expectChangedRows()
		expect(undoDepth(runtime.state)).toBe(1)
		await act(async () => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe(raw)
		expect(editor.view.state.sliceDoc()).toBe(raw)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(1)
		expect(controller.isDirty).toBe(false)
		expect(screen.getAllByText("NEXT")).toHaveLength(2)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it.each([
		":LOGBOOK:\r\n:OTHER:\r\n:END:\r\n",
		":PROPERTIES:\r\n:LOGBOOK:\r\n:END:\r\n",
		":LOGBOOK:\r\n:END:\r\n:LOGBOOK:\r\n:END:\r\n",
		":PROPERTIES:\r\n:END:\r\n:PROPERTIES:\r\n:END:\r\n",
		":LOGBOOK:\r\nunclosed\r\n",
		":PROPERTIES:\r\n:CUSTOM_ID:\r\n",
	])("rejects malformed drawers with zero agenda/editor edits (%s)", async (body) => {
		const raw = source
			.replace(
				"#+TODO: NEXT | FINISHED\r\n",
				"#+TODO: NEXT | FINISHED(!)\r\n#+STARTUP: logdone logdrawer\r\n",
			)
			.replace(
				"DEADLINE: <2026-07-01 Wed>\r\n#+begin_export",
				`DEADLINE: <2026-07-01 Wed>\r\n${body}#+begin_export`,
			)
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		await setup()
		await open("tasks.org")
		const runtime = live().runtime
		const editor = attach(runtime)
		const update = vi.spyOn(editor.view, "update")
		await cycleSecondKeyboard()
		expect(runtime.source).toBe(raw)
		expect(editor.view.state.sliceDoc()).toBe(raw)
		expect(
			update.mock.calls
				.flatMap(([transactions]) => transactions)
				.some((transaction) => transaction.docChanged),
		).toBe(false)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(0)
		expect(controller.isDirty).toBe(false)
		expect(screen.getAllByText("NEXT")).toHaveLength(2)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it.each([
		"button",
		"keyboard",
	])("prepares an unopened schedule via %s without allocating; bottom parameters edit the second duplicate only and preserve working-copy history and CAS", async (action) => {
		await setup()
		const active = controller.activeBufferRuntime
		const before = controller.liveBuffers.map((buffer) => buffer.bufferId)
		const button = screen.getAllByRole("button", { name: "Schedule for 😀 duplicate" })[1]
		const originalRow = button
			.closest("li")!
			.querySelector<HTMLButtonElement>("[data-agenda-open]")!
		await act(async () => {
			if (action === "button") {
				button.focus()
				fireEvent.click(button)
			} else {
				originalRow.focus()
				fireEvent.keyDown(originalRow, { key: "s" })
			}
		})
		const input = within(screen.getByRole("region", { name: "Minibuffer" })).getByRole("combobox", { name: /date \/ time \/ range \/ repeater \/ warning/ })
		expect(controller.liveBuffers.map((buffer) => buffer.bufferId)).toEqual(before)
		expect(controller.activeBufferRuntime).toBe(active)
		await act(async () => {
			fireEvent.change(input, { target: { value: "2026-08-01" } })
			fireEvent.keyDown(input, { key: "Enter" })
		})
		const planned = source.replace(
			"* NEXT 😀 duplicate\r\nDEADLINE: <2026-07-01 Wed>\r\n#+begin_export",
			"* NEXT 😀 duplicate\r\nDEADLINE: <2026-07-01 Wed> SCHEDULED: <2026-08-01>\r\n#+begin_export",
		)
		expect(live().content).toBe(planned)
		expect(live().isDirty).toBe(true)
		expect(controller.activeBufferRuntime).toBe(active)
		expect(showEditor).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		expect(undoDepth(live().runtime.state)).toBe(1)
		expect(screen.getByRole("heading", { name: "2026-08-01" })).toBeInTheDocument()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(20)
		})
		expect(document.activeElement).toBe(action === "button" ? button : originalRow)
		expect(originalRow).toHaveAttribute("aria-current", "true")
		const editor = attach(live().runtime)
		await act(async () => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(live().content).toBe(source)
		await act(async () => {
			expect(editor.handle.redo()).toBe(true)
		})
		await act(async () => {
			await controller.saveAllDocuments()
		})
		expect(orgFileRepository.writeDocument).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ content: planned, expectedRevision: "tasks-1" }),
		)
	})

	it("accepting the existing deadline is unchanged and does not allocate an unopened target or create history", async () => {
		await setup()
		const before = controller.liveBuffers.map((buffer) => buffer.bufferId)
		await act(async () => {
			const row = screen
				.getAllByRole("button", { name: "Deadline for 😀 duplicate" })[1]
				.closest("li")!
				.querySelector<HTMLButtonElement>("[data-agenda-open]")!
			row.focus()
			fireEvent.keyDown(row, { key: "d" })
		})
		const input = within(screen.getByRole("region", { name: "Minibuffer" })).getByRole("combobox", { name: /date \/ time \/ range \/ repeater \/ warning/ })
		await act(async () => {
			fireEvent.change(input, { target: { value: "<2026-07-01 Wed>" } })
			fireEvent.keyDown(input, { key: "Enter" })
		})
		expect(input).not.toBeInTheDocument()
		expect(controller.liveBuffers.map((buffer) => buffer.bufferId)).toEqual(before)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})
	it("keyboard t targets the second duplicate anchor, parks unopened dirty source without activation/writes, and has one undo event and original Save All CAS", async () => {
		await setup()
		const active = controller.activeBufferRuntime
		const activeId = controller.activeBufferId
		await cycleSecondKeyboard()
		expectChangedRows()
		expect(live().content).toBe(changed)
		expect(live().isDirty).toBe(true)
		expect(controller.activeBufferRuntime).toBe(active)
		expect(controller.activeBufferId).toBe(activeId)
		expect(controller.activeDocument?.relativePath).toBe("editor.org")
		expect(controller.revealTarget).toBeNull()
		expect(showEditor).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		const runtime = live().runtime
		expect(undoDepth(runtime.state)).toBe(1)
		const editor = attach(runtime)
		await act(async () => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe(source)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(1)
		expect(screen.getAllByText("NEXT")).toHaveLength(2)
		await act(async () => {
			expect(editor.handle.redo()).toBe(true)
		})
		expectChangedRows()
		await act(async () => {
			expect(await controller.saveAllDocuments()).toMatchObject({
				kind: "success",
				savedPaths: ["tasks.org"],
			})
		})
		expect(orgFileRepository.writeDocument).toHaveBeenCalledExactlyOnceWith({
			workspaceRoot: "/notes",
			capabilityToken: workspace.capabilityToken,
			relativePath: "tasks.org",
			content: changed,
			expectedRevision: "tasks-1",
		})
	})

	it.each([
		"active",
		"inactive",
	])("cycles an %s dirty live buffer without losing unsaved body; agenda follows CM edits and Save All uses original CAS", async (mode) => {
		await setup()
		await open("tasks.org")
		const runtime = live().runtime
		const editor = attach(runtime)
		await act(async () => {
			editor.view.dispatch({
				changes: { from: runtime.state.doc.length, insert: "unsaved body\r\n" },
			})
		})
		const dirty = runtime.source
		if (mode === "inactive") await open("editor.org")
		const activeId = controller.activeBufferId
		vi.mocked(orgFileRepository.readDocument).mockClear()
		await act(async () => {
			fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for 😀 duplicate" })[1])
		})
		expectChangedRows()
		expect(runtime.source).toBe(
			dirty.replace(
				"* NEXT 😀 duplicate\r\nDEADLINE: <2026-07-01 Wed>\r\n#+begin_export",
				"* FINISHED 😀 duplicate\r\nDEADLINE: <2026-07-01 Wed>\r\n#+begin_export",
			),
		)
		expect(editor.view.state.sliceDoc()).toBe(runtime.state.sliceDoc())
		expect(controller.activeBufferId).toBe(activeId)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		expect(showEditor).not.toHaveBeenCalled()
		await act(async () => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe(dirty)
		expect(screen.getAllByText("NEXT")).toHaveLength(2)
		await act(async () => {
			expect(await controller.saveAllDocuments()).toMatchObject({
				kind: "success",
				savedPaths: ["tasks.org"],
			})
		})
		expect(orgFileRepository.writeDocument).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ content: dirty, expectedRevision: "tasks-1" }),
		)
	})

	it("button pending read is single-flight; agenda unmount aborts and late IO cannot park or mutate source", async () => {
		await setup()
		const active = controller.activeBufferRuntime
		const before = controller.liveBuffers.map((buffer) => [buffer.bufferId, buffer.content])
		const execute = vi.spyOn(controller, "executeAgendaCommand")
		let settle!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(orgFileRepository.readDocument).mockClear()
		vi.mocked(orgFileRepository.readDocument).mockReturnValueOnce(
			() =>
				new Promise((resolve) => {
					settle = resolve
				}),
		)
		await act(async () => {
			fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for 😀 duplicate" })[1])
		})
		expect(execute).toHaveBeenCalledOnce()
		const signal = execute.mock.calls[0][2]!
		expect(signal.aborted).toBe(false)
		expect(screen.getByRole("main", { name: "Org agenda" })).toHaveAttribute("aria-busy", "true")
		for (const button of within(screen.getByRole("main", { name: "Org agenda" })).getAllByRole("button"))
			expect(button).toHaveAttribute("aria-disabled", "true")
		await act(async () => {
			fireEvent.keyDown(screen.getByRole("main", { name: "Org agenda" }), { key: "t" })
			fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for 😀 duplicate" })[1])
		})
		expect(orgFileRepository.readDocument).toHaveBeenCalledTimes(1)
		await act(async () => {
			hideAgenda()
		})
		expect(signal.aborted).toBe(true)
		await act(async () => {
			settle(E.right(disk.get("tasks.org")!))
		})
		expect(controller.liveBuffers.map((buffer) => [buffer.bufferId, buffer.content])).toEqual(
			before,
		)
		expect(controller.activeBufferRuntime).toBe(active)
		expect(controller.revealTarget).toBeNull()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		expect(showEditor).not.toHaveBeenCalled()
	})

	it.each([
		"success",
		"rejection",
		"moved",
	])("keeps actual keyboard focus through a deferred root action: %s", async (mode) => {
		await setup()
		const agenda = screen.getByRole("main", { name: "Org agenda" })
		const rows = agenda.querySelectorAll<HTMLButtonElement>("[data-agenda-open]")
		rows[0].focus()
		fireEvent.keyDown(rows[0], { key: "n" })
		expect(document.activeElement).toBe(rows[1])
		let settle!: (value: E.Either<never, OrgDocumentInterface>) => void
		let reject!: (reason: Error) => void
		vi.mocked(orgFileRepository.readDocument).mockReturnValueOnce(
			() =>
				new Promise((resolve, fail) => {
					settle = resolve
					reject = fail
				}),
		)
		await act(async () => {
			fireEvent.keyDown(rows[1], { key: "t" })
		})
		expect(document.activeElement).toBe(rows[1])
		expect(rows[1]).not.toBeDisabled()
		expect(rows[1]).toHaveAttribute("aria-disabled", "true")
		const other = screen.getByRole("textbox", { name: "Other surface" })
		if (mode === "moved") other.focus()
		await act(async () => {
			if (mode === "rejection") reject(new Error("read failed"))
			else settle(E.right(disk.get("tasks.org")!))
		})
		expect(document.activeElement).toBe(mode === "moved" ? other : rows[1])
		expect(showEditor).not.toHaveBeenCalled()
		expect(agenda).toBeInTheDocument()
	})

	it.each([
		"removed",
		"empty",
		"refresh error",
		"moved",
	])("restores surviving selection/root without stealing external focus: %s", async (mode) => {
		await setup()
		await open("tasks.org")
		const runtime = live().runtime
		const editor = attach(runtime)
		const agenda = screen.getByRole("main", { name: "Org agenda" })
		const rows = agenda.querySelectorAll<HTMLButtonElement>("[data-agenda-open]")
		rows[1].focus()
		const other = screen.getByRole("textbox", { name: "Other surface" })
		if (mode === "moved") other.focus()
		await act(async () => {
			if (mode === "refresh error") {
				workspace = {
					...workspace,
					documents: [...workspace.documents, { relativePath: "bad.org", revision: "bad-1" }],
				}
				vi.mocked(orgFileRepository.readDocument).mockImplementation((input) => async () => {
					if (input.relativePath === "bad.org") throw new Error("refresh failed")
					return E.right(disk.get(input.relativePath)!)
				})
				await controller.refreshWorkspace()
			} else {
				editor.view.dispatch({
					changes: {
						from: 0,
						to: runtime.state.doc.length,
						insert:
							mode === "removed"
								? "* NEXT surviving\nDEADLINE: <2026-07-01 Wed>\n"
								: "* No timestamps\n",
					},
				})
			}
		})
		expect(screen.getByRole("main", { name: "Org agenda" })).toBe(agenda)
		if (mode === "removed")
			expect(document.activeElement).toBe(agenda.querySelector("[data-agenda-open]"))
		else expect(document.activeElement).toBe(mode === "moved" ? other : agenda)
		if (mode === "refresh error")
			expect(within(agenda).getByRole("alert")).toBeInTheDocument()
	})

	it.each([
		"unmount",
		"new grant",
		"superseded",
		"valid",
	])("guards deferred production open navigation: %s", async (mode) => {
		await setup()
		const openAt = vi.spyOn(controller, "openDocumentAt")
		let settle!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(orgFileRepository.readDocument).mockReturnValueOnce(
			() =>
				new Promise((resolve) => {
					settle = resolve
				}),
		)
		const agenda = screen.getByRole("main", { name: "Org agenda" })
		const rows = agenda.querySelectorAll<HTMLButtonElement>("[data-agenda-open]")
		rows[0].focus()
		await act(async () => {
			fireEvent.keyDown(rows[0], { key: "Enter" })
		})
		expect(openAt).toHaveBeenCalledOnce()
		const signal = openAt.mock.calls[0][4]!
		expect(signal.aborted).toBe(false)
		await act(async () => {
			if (mode === "unmount") hideAgenda()
			if (mode === "new grant") {
				workspace = { ...workspace, capabilityToken: `new-${++grant}` }
				await controller.openDefaultWorkspace()
			}
			if (mode === "superseded") fireEvent.click(rows[1])
		})
		const calls = showEditor.mock.calls.length
		expect(signal.aborted).toBe(mode !== "valid")
		const active = controller.activeBufferRuntime
		const before = controller.liveBuffers.map((buffer) => [buffer.bufferId, buffer.content])
		const reveal = controller.revealTarget
		await act(async () => {
			settle(E.right(disk.get("tasks.org")!))
		})
		expect(showEditor).toHaveBeenCalledTimes(calls + (mode === "valid" ? 1 : 0))
		if (mode !== "valid") {
			expect(controller.activeBufferRuntime).toBe(active)
			expect(controller.liveBuffers.map((buffer) => [buffer.bufferId, buffer.content])).toEqual(before)
			expect(controller.revealTarget).toBe(reveal)
		}
	})

	it("catches unexpected open rejection and false without navigation", async () => {
		await setup()
		const openAt = vi
			.spyOn(controller, "openDocumentAt")
			.mockRejectedValueOnce(new Error("unexpected"))
		// Mount an independent production container on the real root controller boundary.
		cleanup()
		let mounted!: RenderResult
		await act(async () => {
			mounted = render(<OrgAgendaContainer controller={controller} onShowEditor={showEditor} />)
		})
		await act(async () => {
			fireEvent.click(screen.getByRole("main", { name: "Org agenda" }).querySelector<HTMLButtonElement>("[data-agenda-open]")!)
		})
		expect(openAt).toHaveBeenCalledOnce()
		expect(showEditor).not.toHaveBeenCalled()
		expect(screen.getByRole("alert")).toHaveTextContent("Cannot open the selected Agenda Source.")
		openAt.mockResolvedValueOnce(false)
		await act(async () => {
			fireEvent.click(screen.getByRole("main", { name: "Org agenda" }).querySelector<HTMLButtonElement>("[data-agenda-open]")!)
		})
		expect(showEditor).not.toHaveBeenCalled()
		mounted.unmount()
	})

	it.each([
		"unmount",
		"scope",
		"supersede",
	])("rejects even a late true open result at the container boundary: %s", async (mode) => {
		await setup()
		const rootController = controller
		await act(async () => {
			hideAgenda()
		})
		let settle!: (opened: boolean) => void
		const openAt = vi
			.fn<OrgWorkspaceController["openDocumentAt"]>()
			.mockImplementationOnce(
				() =>
					new Promise<boolean>((resolve) => {
						settle = resolve
					}),
			)
			.mockResolvedValueOnce(false)
		const snapshot = { ...rootController, openDocumentAt: openAt }
		let mounted!: RenderResult
		await act(async () => {
			mounted = render(<OrgAgendaContainer controller={snapshot} onShowEditor={showEditor} />)
		})
		await act(async () => {
			fireEvent.click(screen.getByRole("main", { name: "Org agenda" }).querySelector<HTMLButtonElement>("[data-agenda-open]")!)
		})
		expect(openAt).toHaveBeenCalledOnce()
		const signal = openAt.mock.calls[0][4]!
		expect(signal.aborted).toBe(false)
		await act(async () => {
			if (mode === "unmount") mounted.unmount()
			if (mode === "scope")
				mounted.rerender(
					<OrgAgendaContainer
						controller={{
							...snapshot,
							workspace: { ...workspace, capabilityToken: "G2" },
							workspaceSessionId: "G2-session",
						}}
						onShowEditor={showEditor}
					/>,
				)
			if (mode === "supersede")
				fireEvent.click(
					screen.getByRole("main").querySelectorAll<HTMLButtonElement>("[data-agenda-open]")[1],
				)
		})
		expect(signal.aborted).toBe(true)
		await act(async () => {
			settle(true)
		})
		expect(showEditor).not.toHaveBeenCalled()
	})

	it("preserves production keyboard copy/input/IME/consumed/repeat semantics and selection index", async () => {
		await setup()
		const agenda = screen.getByRole("main", { name: "Org agenda" })
		const rows = agenda.querySelectorAll<HTMLButtonElement>("[data-agenda-open]")
		rows[0].focus()
		const dispatch = (target: HTMLElement, init: KeyboardEventInit, consumed = false) => {
			const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init })
			if (consumed) event.preventDefault()
			act(() => {
				target.dispatchEvent(event)
			})
			return event
		}
		for (const init of [
			{ key: "t", isComposing: true },
			{ key: "t", keyCode: 229 },
		])
			expect(dispatch(rows[0], init).defaultPrevented).toBe(false)
		dispatch(rows[0], { key: "t" }, true)
		const input = document.createElement("input")
		agenda.append(input)
		input.focus()
		expect(dispatch(input, { key: "t" }).defaultPrevented).toBe(false)
		expect(document.activeElement).toBe(input)
		input.remove()
		rows[0].focus()
		expect(dispatch(rows[0], { key: "ArrowDown" }).defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(rows[1])
		expect(dispatch(rows[1], { key: "t", repeat: true }).defaultPrevented).toBe(true)
		expect(
			controller.liveBuffers.find((buffer) => buffer.document.relativePath === "tasks.org"),
		).toBeUndefined()
		await act(async () => {
			fireEvent.keyDown(rows[1], { key: "t" })
		})
		expect(live().content).toBe(changed)
		expect(document.activeElement).toBe(rows[1])
	})

	it("derives agenda rows from real failed-save parked edits without writing or changing canonical history", async () => {
		await setup()
		await open("tasks.org")
		const runtime = live().runtime
		const editor = attach(runtime)
		const working = "* TODO Parked agenda source\r\n<2026-10-07 Wed>\r\n😀\0"
		await act(async () => editor.view.dispatch({
			changes: { from: 0, to: editor.view.state.doc.length, insert: working },
		}))
		vi.mocked(orgFileRepository.writeDocument).mockReturnValueOnce(async () => E.left({
			type: "ORG_FILE_ERROR", operation: "write", command: "write_org_document",
			message: "simulated save failure", cause: "denied",
		}))
		await act(async () => { await controller.saveDocument() })
		await open("editor.org")
		const history = undoDepth(runtime.state)
		const sourceGeneration = runtime.revision
		expect(live().runtime).toBe(runtime)
		const incarnation = live().runtimeIncarnation
		vi.mocked(orgFileRepository.readDocument).mockClear()
		vi.mocked(orgFileRepository.writeDocument).mockClear()
		expect(screen.getByText("Parked agenda source")).toBeInTheDocument()
		expect(screen.queryByText("😀 duplicate")).not.toBeInTheDocument()
		expect(disk.get("tasks.org")!.content).toBe(source)
		expect(runtime.source).toBe(working)
		expect(runtime.revision).toBe(sourceGeneration)
		expect(undoDepth(runtime.state)).toBe(history)
		const undated = "* TODO No dated entry\r\n😀\0"
		await act(async () => editor.view.dispatch({
			annotations: isolateHistory.of("full"),
			changes: { from: 0, to: editor.view.state.doc.length, insert: undated },
		}))
		const editedHistory = runtime.state
		const editedGeneration = runtime.revision
		expect(runtime.source).toBe(undated)
		expect(screen.queryByText("Parked agenda source")).not.toBeInTheDocument()
		expect(screen.queryByText("😀 duplicate")).not.toBeInTheDocument()
		expect(runtime.state).toBe(editedHistory)
		expect(runtime.revision).toBe(editedGeneration)

		await act(async () => { expect(editor.handle.undo()).toBe(true) })
		const undoneHistory = runtime.state
		const undoneGeneration = runtime.revision
		expect(runtime.source).toBe(working)
		expect(screen.getByText("Parked agenda source")).toBeInTheDocument()
		expect(screen.queryByText("😀 duplicate")).not.toBeInTheDocument()
		expect(undoDepth(runtime.state)).toBe(history)
		expect(redoDepth(runtime.state)).toBe(1)
		expect(runtime.state).toBe(undoneHistory)
		expect(runtime.revision).toBe(undoneGeneration)
		await act(async () => { expect(editor.handle.redo()).toBe(true) })
		const redoneHistory = runtime.state
		const redoneGeneration = runtime.revision
		expect(runtime.source).toBe(undated)
		expect(screen.queryByText("Parked agenda source")).not.toBeInTheDocument()
		expect(screen.queryByText("😀 duplicate")).not.toBeInTheDocument()
		expect(runtime.state).toBe(redoneHistory)
		expect(runtime.revision).toBe(redoneGeneration)
		expect(live().runtime).toBe(runtime)
		expect(live().runtimeIncarnation).toBe(incarnation)
		expect(undoDepth(runtime.state)).toBe(history + 1)
		expect(redoDepth(runtime.state)).toBe(0)
		expect(disk.get("tasks.org")!.content).toBe(source)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
	})

	it("removes disappeared unopened agenda sources instead of retaining cached rows", async () => {
		await setup()
		disk.delete("tasks.org")
		workspace = { ...workspace, documents: workspace.documents.filter(({ relativePath }) => relativePath !== "tasks.org") }
		await act(async () => { await controller.refreshWorkspace() })
		expect(screen.queryByText("😀 duplicate")).not.toBeInTheDocument()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("rejects superseded agenda disk completion after same-root grant replacement", async () => {
		await setup()
		let resolve!: (value: E.Either<OrgFileError, OrgDocumentInterface>) => void
		vi.mocked(orgFileRepository.readDocument).mockImplementationOnce(() => () => new Promise((settle) => { resolve = settle }))
		workspace = {
			...workspace,
			documents: workspace.documents.map((document) => document.relativePath === "tasks.org"
				? { ...document, revision: "tasks-2" } : document),
		}
		await act(async () => { await controller.refreshWorkspace() })
		workspace = { ...workspace, capabilityToken: `agenda-replacement-${++grant}` }
		disk.set("tasks.org", { relativePath: "tasks.org", revision: "tasks-2", content: "* TODO Current grant agenda\n<2026-10-07>" })
		await act(async () => { await controller.openDefaultWorkspace() })
		expect(screen.queryByText("😀 duplicate")).not.toBeInTheDocument()
		await open("editor.org")
		expect(screen.getByText("Current grant agenda")).toBeInTheDocument()
		await act(async () => { resolve(E.right({ relativePath: "tasks.org", revision: "tasks-2", content: source })) })
		expect(screen.getByText("Current grant agenda")).toBeInTheDocument()
		expect(screen.queryByText("😀 duplicate")).not.toBeInTheDocument()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("preserves focused same-session rows during a replacement read without lending them fresh command permission", async () => {
		await setup()
		const rows = screen.getByRole("main").querySelectorAll<HTMLButtonElement>("[data-agenda-open]")
		const focused = rows[1]
		focused.focus()
		const original = controller.activeBufferRuntime
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentInterface>>()
		vi.mocked(orgFileRepository.readDocument).mockImplementationOnce(() => () => promise)
		workspace = { ...workspace, documents: workspace.documents.map(document =>
			document.relativePath === "tasks.org" ? { ...document, revision: "tasks-2" } : document) }
		disk.set("tasks.org", { relativePath: "tasks.org", revision: "tasks-2", content: source.replaceAll("😀 duplicate", "Replacement") })
		await act(async () => { await controller.refreshWorkspace() })
		expect(focused).toHaveFocus()
		expect(screen.getAllByRole("button", { name: "Cycle TODO for 😀 duplicate" })).toHaveLength(2)
		const reads = vi.mocked(orgFileRepository.readDocument).mock.calls.length
		await act(async () => {
			fireEvent.keyDown(focused, { key: "t" })
			fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for 😀 duplicate" })[1])
		})
		expect(orgFileRepository.readDocument).toHaveBeenCalledTimes(reads)
		expect(controller.liveBuffers.some(buffer => buffer.document.relativePath === "tasks.org")).toBe(false)
		expect(controller.activeBufferRuntime).toBe(original)
		expect(undoDepth(original!.state)).toBe(0)
		await act(async () => { resolve(E.right(disk.get("tasks.org")!)) })
		expect(screen.queryByRole("button", { name: "Cycle TODO for 😀 duplicate" })).not.toBeInTheDocument()
		expect(screen.getAllByRole("button", { name: "Cycle TODO for Replacement" })).toHaveLength(2)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("uses virtual range and undated list rows on exact Source anchors with one canonical undo and real return-to-source", async () => {
		const raw = "#+TODO: NEXT | FINISHED\r\n* NEXT Range\r\n<2026-09-29 Tue>--<2026-10-01 Thu>\r\n* NEXT Undated\r\nbody\r\n"
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		const dated = { id: "range", name: "Range", files: ["tasks.org"], mode: "dates", todo: null, match: null, window: { start: "2026-09-30", span: 2 }, overdue: false, deadlineWarningDays: null }
		const list = { ...dated, id: "pending", name: "Pending", mode: "todo", todo: "pending", match: 'FILE="/notes/tasks.org"/!NEXT', window: null }
		useSettings.setState({ orgAgendaConfigurationJson: JSON.stringify({ version: 1, views: [dated, list] }) })
		render(<Harness />)
		await act(async () => { await controller.openDefaultWorkspace() })
		expect(screen.queryByRole("button", { name: "Cycle TODO for Range" })).not.toBeInTheDocument()
		await act(async () => { fireEvent.change(screen.getByRole("combobox", { name: "Agenda view" }), { target: { value: "range" } }) })
		expect(screen.getAllByRole("button", { name: "Cycle TODO for Range" })).toHaveLength(2)
		const row = screen.getAllByRole("button", { name: "Cycle TODO for Range" })[1].closest("li")!.querySelector<HTMLButtonElement>("[data-agenda-open]")!
		await act(async () => { row.focus(); fireEvent.keyDown(row, { key: "Enter" }) })
		expect(controller.revealTarget).toMatchObject({ relativePath: "tasks.org", line: 3 })
		expect(showEditor).toHaveBeenCalledOnce()
		const runtime = live().runtime
		const editor = attach(runtime)
		await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for Range" })[1]) })
		expect(runtime.source).toBe(raw.replace("* NEXT Range", "* FINISHED Range"))
		expect(editor.view.state.sliceDoc()).toBe(runtime.source)
		expect(undoDepth(runtime.state)).toBe(1)
		await act(async () => { expect(editor.handle.undo()).toBe(true) })
		expect(runtime.source).toBe(raw)
		await act(async () => { fireEvent.change(screen.getByRole("combobox", { name: "Agenda view" }), { target: { value: "pending" } }) })
		expect(screen.getAllByRole("button", { name: "Cycle TODO for Range" })).toHaveLength(1)
		expect(screen.getByRole("button", { name: "Cycle TODO for Undated" })).toBeInTheDocument()
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Cycle TODO for Undated" })) })
		expect(runtime.source).toBe(raw.replace("* NEXT Undated", "* FINISHED Undated"))
		expect(undoDepth(runtime.state)).toBe(1)
		expect(screen.queryByRole("button", { name: "Cycle TODO for Undated" })).not.toBeInTheDocument()
		await act(async () => { expect(editor.handle.undo()).toBe(true) })
		expect(runtime.source).toBe(raw)
		expect(screen.getByRole("button", { name: "Cycle TODO for Undated" })).toBeInTheDocument()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("retires a real action preparation on configuration ABA before its reader can publish", async () => {
		await setup()
		await open("tasks.org")
		const original = controller.prepareAgendaCommand
		const { promise: gate, resolve: release } = Promise.withResolvers<void>()
		let signal!: AbortSignal
		vi.spyOn(controller, "prepareAgendaCommand").mockImplementationOnce(async (entry, kind, abort) => {
			signal = abort!
			await gate
			return original(entry, kind, abort)
		})
		await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "Schedule for 😀 duplicate" })[0]) })
		await act(async () => {
			useSettings.setState({ orgAgendaConfigurationJson: "{\"version\":1,\"views\":[]}" })
			useSettings.setState({ orgAgendaConfigurationJson: "" })
			release()
		})
		expect(signal.aborted).toBe(true)
		expect(screen.queryByRole("region", { name: "Minibuffer" })).not.toBeInTheDocument()
		expect(live().runtime.source).toBe(source)
		expect(undoDepth(live().runtime.state)).toBe(0)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it.each(["preparation", "navigation"] as const)("synchronously retires %s on a storage-only generation before identical settings hydrate", async (operation) => {
		await setup()
		const originalSource = controller.activeBufferRuntime
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentInterface>>()
		vi.mocked(orgFileRepository.readDocument).mockImplementationOnce(() => () => promise)
		let signal!: AbortSignal
		if (operation === "preparation") {
			const original = controller.prepareAgendaCommand
			vi.spyOn(controller, "prepareAgendaCommand").mockImplementationOnce((entry, kind, abort) => {
				signal = abort!
				return original(entry, kind, abort)
			})
			await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "Schedule for 😀 duplicate" })[1]) })
		} else {
			const original = controller.openDocumentAt
			vi.spyOn(controller, "openDocumentAt").mockImplementationOnce((path, line, revision, current, abort) => {
				signal = abort!
				return original(path, line, revision, current, abort)
			})
			await act(async () => {
				const row = screen.getByRole("main").querySelectorAll<HTMLButtonElement>("[data-agenda-open]")[1]
				row.focus()
				fireEvent.click(row)
			})
		}
		expect(signal.aborted).toBe(false)
		const raw = useSettings.getState().orgAgendaConfigurationJson
		await act(async () => {
			window.dispatchEvent(settingsStorageEvent(localStorage.getItem("grain-settings")))
			// No raw JSON change or React retirement effect is needed to abort the old producer.
			expect(signal.aborted).toBe(true)
			resolve(E.right(disk.get("tasks.org")!))
		})
		expect(useSettings.getState().orgAgendaConfigurationJson).toBe(raw)
		expect(screen.queryByRole("region", { name: "Minibuffer" })).not.toBeInTheDocument()
		expect(controller.liveBuffers.some(buffer => buffer.document.relativePath === "tasks.org")).toBe(false)
		expect(controller.activeBufferRuntime).toBe(originalSource)
		expect(undoDepth(originalSource!.state)).toBe(0)
		expect(showEditor).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("makes a retained real note read-only on configuration ABA without allocating another Source", async () => {
		const raw = source.replace("#+TODO: NEXT | FINISHED\r\n", "#+TODO: NEXT | FINISHED(f@)\r\n")
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		let request!: OrgAgendaTodoNoteRequest
		noteCallback = value => { request = value; return true }
		await setup()
		await cycleSecondKeyboard()
		await act(async () => {
			useSettings.setState({ orgAgendaConfigurationJson: "{\"version\":1,\"views\":[]}" })
			useSettings.setState({ orgAgendaConfigurationJson: "" })
		})
		expect(request.validate?.()).toMatchObject({ kind: "rejected" })
		await act(async () => { expect(await request.execute("retained literal note")).toMatchObject({ kind: "rejected" }) })
		expect(controller.liveBuffers.some(buffer => buffer.document.relativePath === "tasks.org")).toBe(false)
		expect(disk.get("tasks.org")!.content).toBe(raw)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("retires a retained literal note on an identical native storage envelope without reviving it after hydration", async () => {
		const raw = source.replace("#+TODO: NEXT | FINISHED\r\n", "#+TODO: NEXT | FINISHED(f@)\r\n")
		disk.set("tasks.org", { relativePath: "tasks.org", content: raw, revision: "tasks-1" })
		let request!: OrgAgendaTodoNoteRequest
		noteCallback = value => { request = value; return true }
		await setup(true)
		await cycleSecondKeyboard()
		const tool = screen.getByRole("group", { name: "TODO state logging note" })
		const draft = within(tool).getByRole("textbox")
		fireEvent.change(draft, { target: { value: "retained native storage draft 😀" } })
		const invalidated = vi.fn()
		const unsubscribe = request.subscribeValidation!(invalidated)
		await act(async () => {
			window.dispatchEvent(settingsStorageEvent(localStorage.getItem("grain-settings")))
			expect(invalidated).toHaveBeenCalled()
			expect(request.validate?.()).toMatchObject({ kind: "rejected" })
		})
		unsubscribe()
		expect(draft).toHaveValue("retained native storage draft 😀")
		expect(draft).toHaveAttribute("readonly")
		await act(async () => { expect(await request.execute("stale acceptance")).toMatchObject({ kind: "rejected" }) })
		expect(controller.liveBuffers.some(buffer => buffer.document.relativePath === "tasks.org")).toBe(false)
		expect(disk.get("tasks.org")!.content).toBe(raw)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("drains an accepted canonical effect across configuration ABA without phantom cancellation or another undo event", async () => {
		await setup()
		await open("tasks.org")
		const original = agendaCommandFlow.runOrgAgendaOperationFlow
		let effectSignal!: AbortSignal
		const { promise: terminal, resolve: release } = Promise.withResolvers<void>()
		vi.spyOn(agendaCommandFlow, "runOrgAgendaOperationFlow").mockImplementationOnce(async (...args) => {
			effectSignal = args[3]!
			const outcome = await original(...args)
			await terminal
			return outcome
		})
		await cycleSecondKeyboard()
		const runtime = live().runtime
		expect(runtime.source).toBe(changed)
		expect(undoDepth(runtime.state)).toBe(1)
		await act(async () => {
			useSettings.setState({ orgAgendaConfigurationJson: "{\"version\":1,\"views\":[]}" })
			useSettings.setState({ orgAgendaConfigurationJson: "" })
			expect(effectSignal.aborted).toBe(false)
			release()
		})
		expect(runtime.source).toBe(changed)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it.each(["configuration ABA", "identical storage envelope"] as const)("cancels an old real query on %s before cache/row publication and visibly fails closed for invalid saved JSON", async (transition) => {
		await setup()
		const { promise, resolve } = Promise.withResolvers<E.Either<OrgFileError, OrgDocumentInterface>>()
		vi.mocked(orgFileRepository.readDocument).mockImplementationOnce(() => () => promise)
		workspace = { ...workspace, documents: workspace.documents.map(document => document.relativePath === "tasks.org" ? { ...document, revision: "tasks-2" } : document) }
		disk.set("tasks.org", { relativePath: "tasks.org", revision: "tasks-2", content: "* TODO Current\n<2026-09-30 Wed>" })
		await act(async () => { await controller.refreshWorkspace() })
		await act(async () => {
			if (transition === "configuration ABA") {
				useSettings.setState({ orgAgendaConfigurationJson: "{\"version\":1,\"views\":[]}" })
				useSettings.setState({ orgAgendaConfigurationJson: "" })
			} else {
				window.dispatchEvent(settingsStorageEvent(localStorage.getItem("grain-settings")))
			}
		})
		expect(screen.getByText("Current")).toBeInTheDocument()
		await act(async () => { resolve(E.right({ relativePath: "tasks.org", revision: "tasks-2", content: source })) })
		expect(screen.getByText("Current")).toBeInTheDocument()
		expect(screen.queryByText("😀 duplicate")).not.toBeInTheDocument()
		vi.mocked(orgFileRepository.readDocument).mockClear()
		await act(async () => { useSettings.setState({ orgAgendaConfigurationJson: "{" }) })
		expect(screen.getByRole("alert")).toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "Cycle TODO for Current" })).not.toBeInTheDocument()
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(orgFileRepository.writeDocument).not.toHaveBeenCalled()
	})

	it("executes discoverable Agenda Clock against the selected canonical Source, restores epochs through undo and saves that parked buffer", async () => {
		await setup()
		const unrelated = controller.activeBufferRuntime
		const focus = (index: number) => {
			const rows = screen.getByRole("main", { name: "Org agenda" }).querySelectorAll<HTMLButtonElement>("[data-agenda-open]")
			rows[index].focus()
		}
		await act(async () => { focus(0); expect(await commandHost.execute("org-agenda.clock-in")).toMatchObject({ kind: "success" }) })
		const runtime = live().runtime
		const first = runtime.source
		expect(controller.activeBufferRuntime).toBe(unrelated)
		expect(undoDepth(runtime.state)).toBe(1)
		nativeEpoch += 120000
		await act(async () => { focus(1); expect(await commandHost.execute("org-agenda.clock-in")).toMatchObject({ kind: "success" }) })
		expect(runtime.source).toContain("=> 0:02")
		expect(undoDepth(runtime.state)).toBe(2)
		const projection = attach(runtime)
		await act(async () => { expect(projection.handle.undo()).toBe(true) })
		expect(runtime.source).toBe(first)
		await act(async () => { focus(0); expect(await commandHost.execute("org-agenda.clock-report")).toMatchObject({ kind: "success" }) })
		const report = screen.getByRole("textbox", { name: "Copy exact Org clock report" })
		expect(report.textContent).toContain("Known live clock: 0:02 elapsed (native epoch).")
		expect(undoDepth(runtime.state)).toBe(1)
		await act(async () => { focus(0); expect(await commandHost.execute("org-agenda.clock-out")).toMatchObject({ kind: "success" }) })
		const stopped = parseOrgClocks(runtime.source)
		expect(stopped.kind === "snapshot" && stopped.active).toBeNull()
		expect(report).toHaveTextContent("Known live clock: 0:02 elapsed (native epoch).")
		expect(report).toBeInTheDocument()
		await act(async () => { focus(0); expect(await commandHost.execute("org-agenda.save")).toMatchObject({ kind: "success" }) })
		expect(vi.mocked(orgFileRepository.writeDocument).mock.calls.at(-1)?.[0].relativePath).toBe("tasks.org")
		expect(disk.get("tasks.org")!.content).toBe(runtime.source)
		expect(controller.activeBufferRuntime).toBe(unrelated)
		await act(async () => { focus(0); expect(await commandHost.execute("org-agenda.clock-in")).toMatchObject({ kind: "success" }) })
		await act(async () => { focus(0); expect(await commandHost.execute("org-agenda.cancel-clock")).toMatchObject({ kind: "success" }) })
		const cancelled = parseOrgClocks(runtime.source)
		expect(cancelled.kind === "snapshot" && cancelled.active).toBeNull()
	})
})
