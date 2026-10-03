import { redoDepth, undoDepth } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useOrgWorkspace, type OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { orgFileRepository } from "@/io/file/org-file.repository"
import type { OrgDocumentInterface, OrgWorkspaceInterface } from "@/types/org"
import type { OrgBufferRuntime, OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import { OrgAgendaContainer } from "./org-agenda.container.fn"

// Production container, hook, flows, parser, runtime and CM history; only host/file IO is replaced.
vi.mock("@tanstack/react-router", () => ({ useBlocker: vi.fn() }))
vi.mock("@/io/event/org-window-close.adapter", () => ({
	registerOrgWindowClose: () => () => undefined,
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))
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
const disposers: (() => void)[] = []
let grant = 0

function Harness() {
	controller = useOrgWorkspace()
	const [visible, setVisible] = useState(true)
	hideAgenda = () => setVisible(false)
	return (
		<>
			<input aria-label="Other surface" />
			{visible ? (
				<OrgAgendaContainer
					controller={controller}
					onShowEditor={showEditor}
					now={() => new Date(2026, 8, 30, 23, 59)}
				/>
			) : null}
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
async function setup() {
	render(<Harness />)
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
	const rows = screen
		.getAllByRole("button")
		.filter((button) => button.hasAttribute("data-agenda-open"))
	expect(within(rows[0]).getByText("NEXT")).toBeInTheDocument()
	expect(within(rows[1]).getByText("FINISHED")).toBeInTheDocument()
	expect(screen.getByRole("status")).toHaveTextContent("TODO state changed in working copy")
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.clearAllMocks()
	window.localStorage.clear()
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
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe("production OrgAgendaContainer working-copy actions", () => {
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
		const input = screen.getByRole("combobox")
		expect(input).toHaveValue("2026-09-30")
		expect(controller.liveBuffers.map((buffer) => buffer.bufferId)).toEqual(before)
		expect(controller.activeBufferRuntime).toBe(active)
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
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
		expect(screen.getByRole("combobox")).toHaveValue("2026-07-01")
		await act(async () => {
			fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
		})
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(screen.getByRole("status")).toHaveTextContent("Deadline unchanged")
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
		expect(controller.isLoading).toBe(true)
		expect(screen.getByRole("main", { name: "Org agenda" })).toHaveAttribute("aria-busy", "true")
		for (const button of screen.getAllByRole("button"))
			expect(button).toHaveAttribute("aria-disabled", "true")
		await act(async () => {
			fireEvent.keyDown(screen.getByRole("main", { name: "Org agenda" }), { key: "t" })
			fireEvent.click(screen.getAllByRole("button", { name: "Cycle TODO for 😀 duplicate" })[1])
		})
		expect(orgFileRepository.readDocument).toHaveBeenCalledTimes(1)
		await act(async () => {
			hideAgenda()
		})
		expect(controller.isLoading).toBe(false)
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
			expect(screen.getByRole("alert")).toHaveTextContent("refresh failed")
	})

	it.each([
		"unmount",
		"new grant",
		"superseded",
		"valid",
	])("guards deferred production open navigation: %s", async (mode) => {
		await setup()
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
		await act(async () => {
			if (mode === "unmount") hideAgenda()
			if (mode === "new grant") {
				workspace = { ...workspace, capabilityToken: `new-${++grant}` }
				await controller.openDefaultWorkspace()
			}
			if (mode === "superseded") fireEvent.click(rows[1])
		})
		const calls = showEditor.mock.calls.length
		await act(async () => {
			settle(E.right(disk.get("tasks.org")!))
		})
		expect(showEditor).toHaveBeenCalledTimes(calls + (mode === "valid" ? 1 : 0))
	})

	it("catches unexpected open rejection and false without navigation", async () => {
		await setup()
		const openAt = vi
			.spyOn(controller, "openDocumentAt")
			.mockRejectedValueOnce(new Error("unexpected"))
		// Mount an independent production container on the real root controller boundary.
		cleanup()
		const mounted = render(<OrgAgendaContainer controller={controller} onShowEditor={showEditor} />)
		await act(async () => {})
		await act(async () => {
			fireEvent.click(screen.getAllByRole("button")[0])
		})
		expect(openAt).toHaveBeenCalledOnce()
		expect(showEditor).not.toHaveBeenCalled()
		openAt.mockResolvedValueOnce(false)
		await act(async () => {
			fireEvent.click(screen.getAllByRole("button")[0])
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
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<boolean>((resolve) => {
						settle = resolve
					}),
			)
			.mockResolvedValueOnce(false)
		const snapshot = { ...rootController, openDocumentAt: openAt }
		const mounted = render(<OrgAgendaContainer controller={snapshot} onShowEditor={showEditor} />)
		await act(async () => {})
		await act(async () => {
			fireEvent.click(screen.getAllByRole("button")[0])
		})
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
			{ key: "c", ctrlKey: true },
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
})
