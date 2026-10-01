import { act, cleanup, renderHook } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	saveOrgDocumentFlow,
} from "@/flows/org-workspace"
import type { OrgDocumentInterface, OrgWorkspaceInterface } from "@/types/org"
import {
	canContinueAfterOrgSave,
	hasDefaultWorkspacePreference,
	isDirtyCaptureTarget,
	ORG_WORKSPACE_PREFERENCE_KEY,
	setDefaultWorkspacePreference,
	updateWorkspaceDocument,
	useOrgWorkspace,
} from "./use-org-workspace"

vi.mock("@tanstack/react-router", () => ({ useBlocker: vi.fn() }))
vi.mock("@/flows/org-workspace", () => ({
	openDefaultOrgWorkspaceFlow: vi.fn(),
	openOrgDocumentFlow: vi.fn(),
	saveOrgDocumentFlow: vi.fn(),
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: async () => () => undefined },
}))
vi.mock("@/io/file/org-file.repository", () => ({
	releaseOrgWorkspace: () => async () => E.right(undefined),
	unwatchOrgWorkspace: () => async () => E.right(undefined),
	watchOrgWorkspace: () => async () => E.left({ message: "Watching disabled in test" }),
}))

const workspace: OrgWorkspaceInterface = {
	directories: [],
	documents: [
		{ relativePath: "z.org", revision: "z-1" },
		{ relativePath: "inbox.org", revision: "old" },
	],
	rootPath: "/notes",
}

const captured: OrgDocumentInterface = {
	content: "* TODO Captured\n",
	relativePath: "inbox.org",
	revision: "new",
}

describe("Org workspace preference", () => {
	it("persists only the fixed default workspace choice", () => {
		const values = new Map<string, string>()
		const storage = {
			getItem: vi.fn((key: string) => values.get(key) ?? null),
			removeItem: vi.fn((key: string) => values.delete(key)),
			setItem: vi.fn((key: string, value: string) => values.set(key, value)),
		}

		expect(hasDefaultWorkspacePreference(storage)).toBe(false)
		setDefaultWorkspacePreference(true, storage)
		expect(values.get(ORG_WORKSPACE_PREFERENCE_KEY)).toBe("default")
		expect(hasDefaultWorkspacePreference(storage)).toBe(true)
		setDefaultWorkspacePreference(false, storage)
		expect(hasDefaultWorkspacePreference(storage)).toBe(false)
	})
})

describe("Org autosave navigation guard", () => {
	it("continues only when the exact latest editor content was persisted", () => {
		expect(canContinueAfterOrgSave(true, "saved", "saved")).toBe(true)
		expect(canContinueAfterOrgSave(true, "older", "new edit")).toBe(false)
		expect(canContinueAfterOrgSave(false, "saved", "saved")).toBe(false)
		expect(canContinueAfterOrgSave(true, null, "saved")).toBe(false)
	})
})

describe("Org workspace capture helpers", () => {
	it("blocks capture only for the active dirty target", () => {
		expect(isDirtyCaptureTarget(captured, true, "inbox.org")).toBe(true)
		expect(isDirtyCaptureTarget(captured, false, "inbox.org")).toBe(false)
		expect(isDirtyCaptureTarget(captured, true, "other.org")).toBe(false)
		expect(isDirtyCaptureTarget(null, true, "inbox.org")).toBe(false)
	})

	it("updates existing revisions and inserts new targets in sorted order", () => {
		expect(updateWorkspaceDocument(workspace, captured).documents).toEqual([
			{ relativePath: "inbox.org", revision: "new" },
			{ relativePath: "z.org", revision: "z-1" },
		])

		const created = { ...captured, relativePath: "archive.org", revision: "created" }
		expect(updateWorkspaceDocument(workspace, created).documents).toEqual([
			{ relativePath: "archive.org", revision: "created" },
			{ relativePath: "inbox.org", revision: "old" },
			{ relativePath: "z.org", revision: "z-1" },
		])
	})
})

const deferred = <T>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((complete) => {
		resolve = complete
	})
	return { promise, resolve }
}

describe("Org document navigation cancellation", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.clearAllMocks()
		window.localStorage.clear()
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () => E.right(captured))
	})

	afterEach(() => {
		cleanup()
		vi.useRealTimers()
	})

	const setup = async () => {
		const hook = renderHook(() => useOrgWorkspace())
		await act(async () => {
			await hook.result.current.openDefaultWorkspace()
		})
		await act(async () => {
			await hook.result.current.openDocument(workspace.documents[1])
		})
		vi.mocked(openOrgDocumentFlow).mockClear()
		return hook
	}

	it("does not read, save, or change state for an already aborted request", async () => {
		const { result } = await setup()
		act(() => result.current.updateContent("unsaved"))
		const controller = new AbortController()
		controller.abort()
		await act(async () => {
			expect(
				await result.current.openDocument(workspace.documents[0], undefined, controller.signal),
			).toBe(false)
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(result.current.content).toBe("unsaved")
		expect(result.current.isDirty).toBe(true)
		expect(result.current.isLoading).toBe(false)
	})

	it("discards a slow canceled read and releases its loading state", async () => {
		const { result } = await setup()
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		const controller = new AbortController()
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.openDocument(workspace.documents[0], undefined, controller.signal)
		})
		expect(result.current.isLoading).toBe(true)
		act(() => controller.abort())
		// Cancellation must release loading while the IO promise is still pending.
		expect(result.current.isLoading).toBe(false)
		expect(result.current.activeDocument).toEqual(captured)
		expect(result.current.content).toBe(captured.content)
		await act(async () => {
			read.resolve(E.right({ ...captured, relativePath: "z.org" }))
			expect(await opening).toBe(false)
		})
		expect(result.current.activeDocument).toEqual(captured)
		expect(result.current.content).toBe(captured.content)
		expect(result.current.isLoading).toBe(false)
		expect(result.current.error).toBeNull()
	})

	it("closes during a slow read without allowing the late read to reopen a document", async () => {
		const { result } = await setup()
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.openDocument(workspace.documents[0])
		})
		expect(result.current.isLoading).toBe(true)
		await act(async () => {
			expect(await result.current.closeActiveDocument()).toBe(true)
		})
		expect(result.current.isLoading).toBe(false)
		expect(result.current.activeDocument).toBeNull()
		expect(result.current.content).toBe("")
		await act(async () => {
			read.resolve(E.right({ ...captured, relativePath: "z.org" }))
			expect(await opening).toBe(false)
		})
		expect(result.current.isLoading).toBe(false)
		expect(result.current.activeDocument).toBeNull()
		expect(result.current.content).toBe("")
		expect(result.current.error).toBeNull()
	})

	it("does not overwrite a newer request's loading state or error", async () => {
		const { result } = await setup()
		const oldRead = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		const newRead = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow)
			.mockReturnValueOnce(() => oldRead.promise)
			.mockReturnValueOnce(() => newRead.promise)
		const controller = new AbortController()
		let oldOpening!: Promise<boolean>
		let newOpening!: Promise<boolean>
		act(() => {
			oldOpening = result.current.openDocument(workspace.documents[0], undefined, controller.signal)
		})
		act(() => {
			newOpening = result.current.openDocument(workspace.documents[0])
		})
		expect(result.current.isLoading).toBe(true)
		act(() => controller.abort())
		expect(result.current.isLoading).toBe(true)
		expect(result.current.activeDocument).toEqual(captured)
		expect(result.current.content).toBe(captured.content)
		await act(async () => {
			oldRead.resolve(
				E.left({
					type: "ORG_FILE_ERROR",
					operation: "read",
					command: "read",
					cause: null,
					message: "Old read error",
				}),
			)
			expect(await oldOpening).toBe(false)
		})
		expect(result.current.isLoading).toBe(true)
		expect(result.current.error).toBeNull()
		await act(async () => {
			newRead.resolve(
				E.left({
					type: "ORG_FILE_ERROR",
					operation: "read",
					command: "read",
					cause: null,
					message: "New read error",
				}),
			)
			expect(await newOpening).toBe(false)
		})
		expect(result.current.error).toBe("New read error")
		expect(result.current.isLoading).toBe(false)
	})

	it("retains a newer error when a canceled read finishes later", async () => {
		const { result } = await setup()
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow)
			.mockReturnValueOnce(() => read.promise)
			.mockReturnValueOnce(async () =>
				E.left({
					type: "ORG_FILE_ERROR",
					operation: "read",
					command: "read",
					cause: null,
					message: "New read error",
				}),
			)
		const controller = new AbortController()
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.openDocument(workspace.documents[0], undefined, controller.signal)
		})
		controller.abort()
		await act(async () => {
			await result.current.openDocument(workspace.documents[0])
		})
		await act(async () => {
			read.resolve(E.right({ ...captured, relativePath: "z.org" }))
			expect(await opening).toBe(false)
		})
		expect(result.current.error).toBe("New read error")
		expect(result.current.activeDocument).toEqual(captured)
		expect(result.current.isLoading).toBe(false)
	})

	it.each([
		false,
		true,
	])("preserves save commit when canceled while awaiting saving (in-flight: %s)", async (inFlight) => {
		const { result } = await setup()
		const save = deferred<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => save.promise)
		act(() => result.current.updateContent("saved edits"))
		let saving: Promise<void> | undefined
		if (inFlight) {
			act(() => {
				saving = result.current.saveDocument()
			})
		}
		const controller = new AbortController()
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.openDocument(workspace.documents[0], undefined, controller.signal)
		})
		expect(result.current.isSaving).toBe(true)
		controller.abort()
		expect(result.current.isSaving).toBe(true)
		await act(async () => {
			save.resolve(E.right({ relativePath: captured.relativePath, revision: "saved-revision" }))
			expect(await opening).toBe(false)
			await saving
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(result.current.activeDocument).toEqual({
			...captured,
			content: "saved edits",
			revision: "saved-revision",
		})
		expect(
			result.current.workspace?.documents.find(
				(entry) => entry.relativePath === captured.relativePath,
			)?.revision,
		).toBe("saved-revision")
		expect(result.current.content).toBe("saved edits")
		expect(result.current.isDirty).toBe(false)
		expect(result.current.isSaving).toBe(false)
		expect(result.current.isLoading).toBe(false)
		expect(result.current.error).toBeNull()
	})
})
