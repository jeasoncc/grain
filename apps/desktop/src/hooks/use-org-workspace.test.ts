import { act, cleanup, renderHook } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	archiveOrgSubtreeFlow,
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
	refileOrgSubtreeFlow,
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	saveOrgDocumentFlow,
} from "@/flows/org-workspace"
import type { OrgSubtreeTransferOutcome } from "./use-org-workspace"
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
	archiveOrgSubtreeFlow: vi.fn(),
	refileOrgSubtreeFlow: vi.fn(),
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE:
		"The target copy succeeded, but source removal was not confirmed. Treat this as a possible duplicate copy: reread both documents and remove one copy only after verifying that both contain the subtree. No destructive rollback was attempted.",
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

describe("Org subtree transfer outcomes", () => {
	const moved = {
		source: { ...captured, content: "", revision: "removed" },
		target: { ...captured, relativePath: "archive.org", revision: "copied" },
	}
	const validation = {
		type: "ORG_SUBTREE_REFILE_VALIDATION_ERROR" as const,
		message: "Invalid subtree target",
	}
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
		window.localStorage.clear()
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () => E.right(captured))
		vi.mocked(refileOrgSubtreeFlow).mockReturnValue(async () => E.right(moved))
		vi.mocked(archiveOrgSubtreeFlow).mockReturnValue(async () => E.right(moved))
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
		return hook
	}

	it("rejects absent workspace, absent document, and dirty input without starting a transfer", async () => {
		const { result } = renderHook(() => useOrgWorkspace())
		await act(async () => {
			expect(await result.current.archiveSubtree(0)).toEqual({
				kind: "rejected",
				message: expect.stringContaining("workspace"),
			})
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			expect(await result.current.archiveSubtree(0)).toEqual({
				kind: "rejected",
				message: expect.stringContaining("document"),
			})
			await result.current.openDocument(workspace.documents[1])
		})
		act(() => result.current.updateContent("dirty"))
		await act(async () => {
			expect(await result.current.refileSubtree(0, "archive.org")).toEqual({
				kind: "rejected",
				message: "Save the current document before refiling or archiving a subtree.",
			})
		})
		expect(refileOrgSubtreeFlow).not.toHaveBeenCalled()
		expect(archiveOrgSubtreeFlow).not.toHaveBeenCalled()
	})

	it.each(["refile", "archive"] as const)(
		"rejects a same-render content update before %s starts",
		async (operation) => {
			const { result } = await setup()
			await act(async () => {
				result.current.updateContent("same-render edit")
				expect(
					await (operation === "refile"
						? result.current.refileSubtree(0, "archive.org")
						: result.current.archiveSubtree(0)),
				).toEqual({
					kind: "rejected",
					message: "Save the current document before refiling or archiving a subtree.",
				})
			})
			expect(result.current.content).toBe("same-render edit")
			expect(result.current.activeDocument).toEqual(captured)
			expect(result.current.isDirty).toBe(true)
			expect(refileOrgSubtreeFlow).not.toHaveBeenCalled()
			expect(archiveOrgSubtreeFlow).not.toHaveBeenCalled()
		},
	)

	it.each([
		"refile",
		"archive",
	])("reports successful %s and updates persisted revisions", async (operation) => {
		const { result } = await setup()
		await act(async () => {
			expect(
				await (operation === "refile"
					? result.current.refileSubtree(0, "archive.org")
					: result.current.archiveSubtree(0)),
			).toEqual({ kind: "success" })
		})
		expect(result.current.activeDocument).toEqual(moved.source)
		expect(result.current.content).toBe("")
		expect(result.current.isDirty).toBe(false)
		expect(result.current.isSaving).toBe(false)
		expect(result.current.workspace?.documents).toContainEqual({
			relativePath: "archive.org",
			revision: "copied",
		})
	})

	it("returns flow rejection messages unchanged", async () => {
		const { result } = await setup()
		vi.mocked(refileOrgSubtreeFlow).mockReturnValueOnce(async () => E.left(validation))
		await act(async () => {
			expect(await result.current.refileSubtree(0, "archive.org")).toEqual({
				kind: "rejected",
				message: validation.message,
			})
		})
		expect(result.current.error).toBe(validation.message)
		expect(result.current.activeDocument).toEqual(captured)
	})

	it("reports an uncertain target write as partial without claiming persisted revisions", async () => {
		const { result } = await setup()
		const message = "Target may contain the subtree. Reread both documents; do not retry automatically."
		vi.mocked(refileOrgSubtreeFlow).mockReturnValueOnce(async () =>
			E.left({
				type: "ORG_SUBTREE_REFILE_UNCERTAIN_WRITE_ERROR",
				cause: {
					type: "ORG_FILE_ERROR",
					command: "write_org_document",
					operation: "write",
					cause: "unconfirmed write",
					message: "unconfirmed write",
				},
				targetRelativePath: "archive.org",
				message,
			}),
		)
		await act(async () => {
			expect(await result.current.refileSubtree(0, "archive.org")).toEqual({
				kind: "partial",
				message,
			})
		})
		expect(result.current.error).toBe(message)
		expect(result.current.workspace).toEqual(workspace)
		expect(result.current.activeDocument).toEqual(captured)
		expect(result.current.content).toBe(captured.content)
		expect(result.current.isSaving).toBe(false)
		expect(refileOrgSubtreeFlow).toHaveBeenCalledOnce()
	})

	it("reports partial copy and retains its persisted target and recovery message", async () => {
		const { result } = await setup()
		vi.mocked(refileOrgSubtreeFlow).mockReturnValueOnce(async () =>
			E.left({
				type: "ORG_SUBTREE_REFILE_PARTIAL_ERROR",
				message: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
				recovery: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
				cause: validation,
				target: moved.target,
			}),
		)
		await act(async () => {
			expect(await result.current.refileSubtree(0, "archive.org")).toEqual({
				kind: "partial",
				message: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
			})
		})
		expect(result.current.error).toBe(ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE)
		expect(result.current.workspace?.documents).toContainEqual({
			relativePath: "archive.org",
			revision: "copied",
		})
		expect(result.current.activeDocument).toEqual(captured)
		expect(result.current.isSaving).toBe(false)
	})

	it("rejects concurrent mutations, but reports moved files as success when newer input is retained", async () => {
		const { result } = await setup()
		const transfer = deferred<Awaited<ReturnType<ReturnType<typeof refileOrgSubtreeFlow>>>>()
		vi.mocked(refileOrgSubtreeFlow).mockReturnValueOnce(() => transfer.promise)
		let outcome!: Promise<OrgSubtreeTransferOutcome>
		act(() => {
			outcome = result.current.refileSubtree(0, "archive.org")
		})
		expect(result.current.isSaving).toBe(true)
		await act(async () => {
			expect(await result.current.archiveSubtree(0)).toEqual({
				kind: "rejected",
				message: expect.stringContaining("in progress"),
			})
		})
		act(() => result.current.updateContent("newer input"))
		await act(async () => {
			transfer.resolve(E.right(moved))
			expect(await outcome).toEqual({
				kind: "success",
				message: expect.stringContaining("newer editor input was retained"),
			})
		})
		expect(result.current.content).toBe("newer input")
		expect(result.current.isDirty).toBe(true)
		expect(result.current.activeDocument).toEqual(moved.source)
		expect(result.current.error).toContain("newer editor input was retained")
		expect(refileOrgSubtreeFlow).toHaveBeenCalledTimes(1)
		expect(archiveOrgSubtreeFlow).not.toHaveBeenCalled()
	})

	it.each([
		"throw",
		"reject",
	])("releases mutation and saving state after an unexpected %s without claiming rollback", async (failure) => {
		const { result } = await setup()
		if (failure === "throw") {
			vi.mocked(refileOrgSubtreeFlow).mockImplementationOnce(() => {
				throw new Error("unexpected")
			})
		} else {
			vi.mocked(refileOrgSubtreeFlow).mockReturnValueOnce(async () => {
				throw new Error("unexpected")
			})
		}
		await act(async () => {
			expect(await result.current.refileSubtree(0, "archive.org")).toEqual({
				kind: "partial",
				message: expect.stringContaining("Do not automatically retry"),
			})
		})
		expect(result.current.isSaving).toBe(false)
		expect(result.current.error).toContain("Reread both source and target")
		expect(refileOrgSubtreeFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			expect(await result.current.archiveSubtree(0)).toEqual({ kind: "success" })
		})
	})
})

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
