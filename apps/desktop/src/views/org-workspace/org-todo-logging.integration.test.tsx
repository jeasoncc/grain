import { undoDepth, redoDepth } from "@codemirror/commands"
import { EditorView } from "@codemirror/view"
import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	scanOrgWorkspaceFlow,
	saveOrgDocumentFlow,
} from "@/flows/org-workspace"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import {
	watchOrgWorkspace,
	unwatchOrgWorkspace,
	releaseOrgWorkspace,
} from "@/io/file/org-file.repository"
import { OrgWorkspaceContainer } from "./org-workspace.container.fn"

// Observe the real Root controller; only filesystem and host boundaries are replaced.
let controller: OrgWorkspaceController
vi.mock("@/hooks/use-org-workspace", async (original) => {
	const real = await original<typeof import("@/hooks/use-org-workspace")>()
	return { ...real, useOrgWorkspace: () => (controller = real.useOrgWorkspace()) }
})
vi.mock("@/hooks/use-workspace", () => ({ useAllWorkspaces: () => [] }))
vi.mock("@/io/event", () => ({ listenForOrgDiaryCreation: () => () => undefined }))
vi.mock("@tanstack/react-router", () => ({
	useBlocker: vi.fn(),
	Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock("@/io/event/org-window-close.adapter", () => ({
	registerOrgWindowClose: () => () => undefined,
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))
vi.mock("@/io/file/org-file.repository", () => ({
	releaseOrgWorkspace: vi.fn(),
	unwatchOrgWorkspace: vi.fn(),
	watchOrgWorkspace: vi.fn(),
}))
vi.mock("@/flows/org-workspace", () => ({
	archiveOrgSubtreeFlow: vi.fn(),
	clearOrgDerivedIndexFlow: vi.fn(),
	createOrgDirectoryFlow: vi.fn(),
	deleteOrgDocumentFlow: vi.fn(),
	prepareLegacyMigrationFlow: vi.fn(),
	verifyLegacyMigrationRecoveryFlow: vi.fn(),
	runLegacyMigrationRecoveryDrillFlow: vi.fn(),
	rebuildOrgDerivedIndexFlow: vi.fn(),
	resolveOrgLinkTargetFlow: vi.fn(),
	selectOrgWorkspaceFlow: vi.fn(),
	captureOrgTodoFlow: vi.fn(),
	captureOrgEntryFlow: vi.fn(),
	moveOrgDocumentFlow: vi.fn(),
	loadOrgAgendaFlow: vi.fn(),
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE: "duplicate",
	openDefaultOrgWorkspaceFlow: vi.fn(),
	openOrgDocumentFlow: vi.fn(),
	refileOrgSubtreeFlow: vi.fn(),
	readOrgRefileTargetFlow: vi.fn(),
	saveOrgDocumentFlow: vi.fn(),
	scanOrgWorkspaceFlow: vi.fn(),
}))
const source =
	"#+STARTUP: logdone logdrawer\r\n#+TODO: NEXT | FINISHED(!)\r\n* NEXT café 😀\r\n:PROPERTIES:\r\n:ID: untouched\r\n:END:\r\nbody\r\n"
const workspace = {
	rootPath: "/notes",
	capabilityToken: "G1",
	directories: [],
	documents: [{ relativePath: "a.org", revision: "a-1" }],
}
const editor = () => EditorView.findFromDOM(screen.getByRole("textbox", { name: "Editing a.org" }))!
const key = (key: string, ctrlKey = true) =>
	fireEvent.keyDown(editor().contentDOM, { key, ctrlKey })
beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date(2026, 6, 1, 0, 1))
	vi.resetAllMocks()
	window.localStorage.clear()
	vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => undefined,
		removeListener: () => undefined,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => true,
	}))
	vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
	vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
	vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
		E.right({ content: source, relativePath: "a.org", revision: "a-1" }),
	)
	vi.mocked(watchOrgWorkspace).mockReturnValue(async () => E.right("watch-G1"))
	vi.mocked(unwatchOrgWorkspace).mockReturnValue(async () => E.right(undefined))
	vi.mocked(releaseOrgWorkspace).mockReturnValue(async () => E.right(undefined))
})
afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
	vi.useRealTimers()
})
async function setup() {
	render(<OrgWorkspaceContainer />)
	await act(async () => {
		await controller.openDefaultWorkspace()
	})
	await act(async () => {
		await controller.openDocumentPath("a.org")
	})
	act(() => {
		editor().dispatch({
			selection: { anchor: editor().state.doc.toString().indexOf("* NEXT") + 3 },
		})
		editor().focus()
	})
}
describe("production Root TODO logging", () => {
	it.each([
		false,
		true,
	])("guards consumed/repeated/IME Root source events and commits once (%s)", async (prefix) => {
		await setup()
		for (const guard of [
			{ repeat: true },
			{ isComposing: true },
			{ keyCode: 229 },
			{ consumed: true },
		]) {
			act(() => {
				if (prefix) key("c")
				const event = createEvent.keyDown(editor().contentDOM, {
					key: prefix ? "t" : "T",
					code: "KeyT",
					keyCode: 84,
					ctrlKey: prefix,
					altKey: !prefix,
					shiftKey: !prefix,
					...guard,
				})
				if ("consumed" in guard) event.preventDefault()
				fireEvent(editor().contentDOM, event)
				key("Escape", false)
			})
		}
		expect(controller.content).toBe(source)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		act(() => {
			if (prefix) {
				key("c")
				key("t")
			} else
				fireEvent.keyDown(editor().contentDOM, {
					key: "T",
					code: "KeyT",
					keyCode: 84,
					altKey: true,
					shiftKey: true,
				})
		})
		expect(controller.content.match(/CLOSED:/g)).toHaveLength(1)
		expect(controller.content.match(/- State/g)).toHaveLength(1)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		["CLOSED:[2025-04-01]", "CLOSED:[2026-07-01]"],
		["CLOSED: \t[2025-04-01\tTue]", "CLOSED: \t[2026-07-01\tWed]"],
		["CLOSED:\t[2025-04-01\t08:00]", "CLOSED:\t[2026-07-01\t00:01]"],
		["CLOSED:  \t[2025-04-01  Tue\t08:00]", "CLOSED:  \t[2026-07-01  Wed\t00:01]"],
	])("preserves CLOSED shape and spacing with exact Root output and undo (%s)", async (closed, fresh) => {
		const raw = `#+STARTUP: logdone\r\n#+TODO: NEXT | FINISHED\r\n* NEXT café 😀\r\n \t${closed}  DEADLINE: <2026-07-02 Thu>\t\r\nbody\r\n`
		const expected = `#+STARTUP: logdone\r\n#+TODO: NEXT | FINISHED\r\n* FINISHED café 😀\r\n \t${fresh}  DEADLINE: <2026-07-02 Thu>\t\r\nbody\r\n`
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		act(() => {
			key("c")
			key("t")
		})
		expect(controller.content).toBe(expected)
		expect(controller.activeBufferRuntime!.source).toBe(expected)
		expect(editor().state.sliceDoc()).toBe(expected)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		act(() => {
			key("z")
		})
		expect(controller.content).toBe(raw)
		expect(controller.activeBufferRuntime!.source).toBe(raw)
		expect(editor().state.sliceDoc()).toBe(raw)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("refuses an atomic logging batch at a sparse hidden boundary in Root", async () => {
		const raw = "#+STARTUP: logdone\n* TODO task\n* Hidden\nuntouched\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: raw, relativePath: "a.org", revision: "a-1" }),
		)
		await setup()
		act(() => {
			key("c")
			key("/", false)
		})
		const input = screen.getByRole("combobox", { name: /^Sparse tree/ })
		fireEvent.change(input, { target: { value: "todo" } })
		fireEvent.keyDown(input, { key: "Enter" })
		act(() => {
			editor().dispatch({ selection: { anchor: editor().state.doc.line(2).from } })
			key("c")
			key("t")
		})
		expect(
			screen
				.getAllByRole("status")
				.some((node) => node.textContent?.includes("TODO change was refused")),
		).toBe(true)
		expect(controller.content).toBe(raw)
		expect(controller.activeBufferRuntime!.source).toBe(raw)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("routes prefix TODO to one canonical batch and restores exact raw bytes with Root undo", async () => {
		await setup()
		act(() => {
			key("c")
			key("t")
		})
		const stamp = "[2026-07-01 Wed 00:01]"
		const expected = source
			.replace("* NEXT café 😀\r\n", `* FINISHED café 😀\r\nCLOSED: ${stamp}\r\n`)
			.replace(
				":END:\r\n",
				`:END:\r\n:LOGBOOK:\r\n- State "FINISHED"    from "NEXT" ${stamp}\r\n:END:\r\n`,
			)
		expect(controller.content).toBe(expected)
		expect(controller.activeBufferRuntime!.source).toBe(expected)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(undoDepth(editor().state)).toBe(0)
		expect(controller.activeDocument?.revision).toBe("a-1")
		expect(editor().contentDOM).toHaveFocus()
		act(() => {
			key("z")
		})
		expect(controller.content).toBe(source)
		expect(controller.activeBufferRuntime!.source).toBe(source)
		expect(redoDepth(controller.activeBufferRuntime!.state)).toBe(1)
		expect(controller.isDirty).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("suppresses source TODO while the Root command overlay owns focus", async () => {
		await setup()
		act(() => {
			key("p")
		})
		const input = screen.getByRole("combobox")
		expect(input).toHaveFocus()
		act(() => {
			fireEvent.keyDown(input, { key: "c", ctrlKey: true })
			fireEvent.keyDown(input, { key: "t", ctrlKey: true })
		})
		expect(controller.content).toBe(source)
		expect(undoDepth(controller.activeBufferRuntime!.state)).toBe(0)
		act(() => {
			fireEvent.keyDown(input, { key: "Escape" })
		})
		expect(screen.queryByRole("combobox")).toBeNull()
		expect(editor().contentDOM).toHaveFocus()
	})
})
