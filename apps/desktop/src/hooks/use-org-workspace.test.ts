import { history, redoDepth, undoDepth } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import type {
	OrgBufferRuntime,
	OrgBufferWindowHandle,
	OrgBufferRuntimeOptions,
} from "@/flows/org-editor-runtime"
import * as runtimeFactory from "@/flows/org-editor-runtime"
import { useBlocker } from "@tanstack/react-router"
import { act, cleanup, renderHook } from "@testing-library/react"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	archiveOrgSubtreeFlow,
	clearOrgDerivedIndexFlow,
	createOrgDirectoryFlow,
	deleteOrgDocumentFlow,
	prepareLegacyMigrationFlow,
	verifyLegacyMigrationRecoveryFlow,
	runLegacyMigrationRecoveryDrillFlow,
	rebuildOrgDerivedIndexFlow,
	resolveOrgLinkTargetFlow,
	selectOrgWorkspaceFlow,
	captureOrgTodoFlow,
	captureOrgEntryFlow,
	moveOrgDocumentFlow,
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	refileOrgSubtreeFlow,
	readOrgRefileTargetFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
} from "@/flows/org-workspace"
import { orgWorkspaceEventAdapter } from "@/io/event/org-workspace-event.adapter"
import {
	releaseOrgWorkspace,
	watchOrgWorkspace,
	unwatchOrgWorkspace,
} from "@/io/file/org-file.repository"
import type { WorkspaceInterface } from "@/types/workspace"
import type { OrgDocumentInterface, OrgWorkspaceInterface } from "@/types/org"
import type { OrgSubtreeTransferOutcome } from "./use-org-workspace"
import * as orgWindowClose from "./use-org-window-close"
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
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE:
		"The target copy succeeded, but source removal was not confirmed. Treat this as a possible duplicate copy: reread both documents and remove one copy only after verifying that both contain the subtree. No destructive rollback was attempted.",
	openDefaultOrgWorkspaceFlow: vi.fn(),
	openOrgDocumentFlow: vi.fn(),
	refileOrgSubtreeFlow: vi.fn(),
	readOrgRefileTargetFlow: vi.fn(),
	saveOrgDocumentFlow: vi.fn(),
	scanOrgWorkspaceFlow: vi.fn(),
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: vi.fn(async () => () => undefined) },
}))
vi.mock("@/io/file/org-file.repository", () => ({
	releaseOrgWorkspace: vi.fn(() => async () => E.right(undefined)),
	unwatchOrgWorkspace: vi.fn(() => async () => E.right(undefined)),
	watchOrgWorkspace: vi.fn(() => async () => E.right("watch-G1")),
}))

const workspace: OrgWorkspaceInterface = {
	directories: [],
	documents: [
		{ relativePath: "z.org", revision: "z-1" },
		{ relativePath: "inbox.org", revision: "old" },
	],
	rootPath: "/notes",
	capabilityToken: "G1",
}

const captured: OrgDocumentInterface = {
	content: "* TODO Captured\n",
	relativePath: "inbox.org",
	revision: "new",
}

describe("Org capture entry and transient drafts", () => {
	let nativeState: Parameters<typeof orgWindowClose.useOrgWindowClose>[0]
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
		window.localStorage.clear()
		vi.spyOn(orgWindowClose, "useOrgWindowClose").mockImplementation((state) => {
			nativeState = state
			return true
		})
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
		vi.mocked(openOrgDocumentFlow).mockImplementation(
			(input) => async () => E.right({ ...captured, relativePath: input.relativePath }),
		)
		vi.mocked(captureOrgEntryFlow).mockReturnValue(async () => E.right(captured))
		vi.mocked(orgWorkspaceEventAdapter.listen).mockResolvedValue(() => undefined)
		vi.mocked(watchOrgWorkspace).mockReturnValue(async () => E.right("watch"))
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
		vi.mocked(releaseOrgWorkspace).mockReturnValue(async () => E.right(undefined))
		vi.spyOn(window, "confirm").mockReturnValue(false)
	})
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})
	const setup = async () => {
		const hook = renderHook(() => useOrgWorkspace())
		await act(async () => {
			await hook.result.current.openDefaultWorkspace()
		})
		await act(async () => {
			await hook.result.current.openDocumentPath("inbox.org")
		})
		return hook
	}
	const attachRuntime = (runtime: OrgBufferRuntime, windowId = "workspace-test") => {
		let handle!: OrgBufferWindowHandle
		const view = new EditorView({
			state: EditorState.create({
				doc: runtime.state.doc,
				extensions: runtime.historyFreeSourceExtensions,
			}),
			dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
		})
		handle = runtime.attachWindow({ windowId, view })
		return {
			view,
			handle,
			dispose: () => {
				handle.detach()
				view.destroy()
			},
		}
	}
	it("does not echo retained G1 runtime failures into same-root G2, even from a parked key", async () => {
		const create = runtimeFactory.createOrgBufferRuntime
		let oldFailure: OrgBufferRuntimeOptions["onError"]
		vi.spyOn(runtimeFactory, "createOrgBufferRuntime").mockImplementation((options) => {
			oldFailure ??= options.onError
			return create(options)
		})
		const { result } = await setup()
		const oldRuntime = result.current.activeBufferRuntime!
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		// Parked errors in the current grant remain visible.
		act(() => {
			oldFailure!(
				new runtimeFactory.OrgBufferRuntimeError("projection-failed", "parked G1 failure"),
			)
		})
		expect(result.current.error).not.toBeNull()
		vi.spyOn(window, "confirm").mockReturnValue(true)
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		const currentRuntime = result.current.activeBufferRuntime!
		expect(oldRuntime.closed).toBe(true)
		expect(result.current.error).toBeNull()
		act(() => {
			oldFailure!(new runtimeFactory.OrgBufferRuntimeError("projection-failed", "late G1 failure"))
		})
		expect(result.current.error).toBeNull()
		expect(result.current.activeBufferRuntime).toBe(currentRuntime)
		expect(currentRuntime.source).toBe(captured.content)
	})
	it("mirrors a runtime edit synchronously before native close and save capture", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime)
		vi.mocked(saveOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ ...captured, revision: "saved" }),
		)
		await act(async () => {
			editor.view.dispatch({ changes: { from: 0, insert: "new " } })
			expect(nativeState.hasDirtyBuffers).toBe(true)
			await result.current.saveDocument()
		})
		expect(result.current.content).toBe(runtime.source)
		expect(runtime.revision).toBe(1)
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ content: runtime.source }),
		)
		expect(result.current.isDirty).toBe(false)
		editor.dispose()
	})
	it("retains canonical undo/redo across A/B/A and rejects parked writers", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const original = runtime.source
		const first = attachRuntime(runtime)
		act(() => first.view.dispatch({ changes: { from: 0, insert: "typed " } }))
		first.dispose()
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		expect(() => runtime.applyControllerSource(runtime.source, "stale")).toThrow()
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		expect(result.current.activeBufferRuntime).toBe(runtime)
		const second = attachRuntime(runtime)
		act(() => {
			expect(second.handle.undo()).toBe(true)
		})
		expect(result.current.content).toBe(original)
		act(() => {
			expect(second.handle.redo()).toBe(true)
		})
		expect(result.current.content).toBe(`typed ${original}`)
		second.dispose()
	})
	it.each([
		"arbitrary body",
		"separator only",
	])("resets unknown clean inactive body/history under the same logical ID: %s", async (kind) => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const first = attachRuntime(runtime)
		const second = attachRuntime(runtime, "second-window")
		act(() => first.view.dispatch({ changes: { from: 0, insert: "typed " } }))
		const saved = runtime.source
		const replacement =
			kind === "separator only" ? saved.replaceAll("\n", "\r\n") : "external\r\nbody"
		const oldHistory = runtime.state
		vi.mocked(saveOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ ...captured, content: saved, revision: "saved" }),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(result.current.isDirty).toBe(false)
		expect(undoDepth(runtime.state)).toBe(1)
		// Do not detach: both old windows can still exist before view effects run.
		await act(async () => {
			expect(await result.current.openDocumentPath("z.org")).toBe(true)
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ ...captured, content: replacement, revision: "external" }),
		)
		await act(async () => {
			expect(await result.current.openDocumentPath("inbox.org")).toBe(true)
		})
		const fresh = result.current.activeBufferRuntime!
		expect(fresh).not.toBe(runtime)
		expect(fresh.key).toEqual(runtime.key)
		expect(runtime.closed).toBe(true)
		expect(fresh.source).toBe(replacement)
		expect(undoDepth(fresh.state)).toBe(0)
		expect(redoDepth(fresh.state)).toBe(0)
		expect(fresh.adoptLegacyState(oldHistory)).toBe(false)
		expect(() => first.view.dispatch({ changes: { from: 0, insert: "stale" } })).toThrow()
		expect(() => second.view.dispatch({ changes: { from: 0, insert: "stale" } })).toThrow()
		expect(() => runtime.applyControllerSource(saved, replacement)).toThrow()
		expect(result.current.content).toBe(replacement)
		expect(result.current.isDirty).toBe(false)
		first.dispose()
		second.dispose()
	})
	it("retains dirty parked working body and history on an unknown disk replacement", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime)
		act(() => editor.view.dispatch({ changes: { from: 0, insert: "working " } }))
		const working = runtime.source
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ ...captured, content: "unknown\r\nbody", revision: "external" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		expect(result.current.activeBufferRuntime).toBe(runtime)
		expect(runtime.closed).toBe(false)
		expect(runtime.source).toBe(working)
		expect(undoDepth(runtime.state)).toBe(1)
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "inbox.org")?.hasConflict,
		).toBe(true)
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe(captured.content)
		editor.dispose()
	})
	it("retains clean parked canonical history when disk returns the same raw source", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime)
		act(() => editor.view.dispatch({ changes: { from: 0, insert: "saved " } }))
		const saved = runtime.source
		vi.mocked(saveOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ ...captured, content: saved, revision: "saved" }),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ ...captured, content: saved, revision: "metadata-only" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		expect(result.current.activeBufferRuntime).toBe(runtime)
		expect(undoDepth(runtime.state)).toBe(1)
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		act(() => {
			expect(editor.handle.redo()).toBe(true)
		})
		expect(runtime.source).toBe(saved)
		editor.dispose()
	})
	it("closes retired and old-grant runtimes and mints a fresh reopened identity", async () => {
		const { result, unmount } = await setup()
		const first = result.current.activeBufferRuntime!
		await act(async () => {
			expect(await result.current.closeActiveDocument()).toBe(true)
		})
		expect(first.closed).toBe(true)
		expect(result.current.activeBufferRuntime).toBeNull()
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		const reopened = result.current.activeBufferRuntime!
		expect(reopened.key.bufferId).not.toBe(first.key.bufferId)
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		expect(reopened.closed).toBe(true)
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		const next = result.current.activeBufferRuntime!
		expect(next.key.workspaceSessionId).toBe("G2")
		unmount()
		expect(next.closed).toBe(true)
	})
	it("allows runtime typing during own save without installing the older ACK body", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime)
		act(() => editor.view.dispatch({ changes: { from: 0, insert: "first " } }))
		const saving = runtime.source
		let resolve!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(saveOrgDocumentFlow).mockReturnValue(
			() =>
				new Promise((done) => {
					resolve = done
				}),
		)
		let pending!: Promise<void>
		act(() => {
			pending = result.current.saveDocument()
		})
		act(() => editor.view.dispatch({ changes: { from: 0, insert: "newer " } }))
		await act(async () => {
			resolve(E.right({ ...captured, content: saving, revision: "saved" }))
			await pending
		})
		expect(runtime.source).toBe(`newer ${saving}`)
		expect(result.current.content).toBe(runtime.source)
		expect(result.current.activeDocument?.content).toBe(saving)
		expect(result.current.isDirty).toBe(true)
		editor.dispose()
	})
	it("retains a paused Source-equals-Base body instead of importing external bytes", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const original = runtime.source
		vi.mocked(saveOrgDocumentFlow).mockReturnValue(async () => {
			throw new Error("uncertain write")
		})
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(result.current.isDirty).toBe(false)
		expect(nativeState.hasDirtyBuffers).toBe(true)
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ ...captured, content: "external", revision: "external" }),
		)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000)
		})
		expect(runtime.source).toBe(original)
		expect(result.current.content).toBe(original)
		expect(result.current.openBuffers[0]?.hasConflict).toBe(true)
	})
	it("adopts public legacy cache history before first attachment", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const cached = EditorState.create({ doc: "", extensions: history() }).update({
			changes: { from: 0, insert: runtime.source },
		}).state
		expect(runtime.adoptLegacyState(cached)).toBe(true)
		const editor = attachRuntime(runtime)
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe("")
		expect(result.current.content).toBe("")
		expect(result.current.isDirty).toBe(true)
		editor.dispose()
	})
	it("denies runtime writes while an owner read is loading", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		let resolve!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(openOrgDocumentFlow).mockReturnValue(
			() =>
				new Promise((done) => {
					resolve = done
				}),
		)
		let pending!: Promise<boolean>
		act(() => {
			pending = result.current.openDocumentPath("z.org")
		})
		expect(() => runtime.applyControllerSource(runtime.source, "denied")).toThrow()
		act(() => result.current.updateContent("compatibility denied"))
		expect(runtime.source).toBe(captured.content)
		await act(async () => {
			resolve(E.right({ ...captured, relativePath: "z.org" }))
			await pending
		})
	})
	it("does not grant compatibility edits authority when native close protection is unavailable", async () => {
		const hook = await setup()
		const runtime = hook.result.current.activeBufferRuntime!
		vi.mocked(orgWindowClose.useOrgWindowClose).mockReturnValue(false)
		hook.rerender()
		act(() => hook.result.current.updateContent("read-only denied"))
		expect(runtime.source).toBe(captured.content)
		expect(hook.result.current.content).toBe(captured.content)
	})
	it("looks up targets without state effects and forwards explicit heading selection", async () => {
		const { result } = await setup()
		const snapshot = { relativePath: "z.org", revision: "fresh", headings: [] }
		vi.mocked(readOrgRefileTargetFlow).mockReturnValue(async () => E.right(snapshot))
		expect(await result.current.readRefileTarget("z.org")).toEqual({ kind: "ready", snapshot })
		expect(readOrgRefileTargetFlow).toHaveBeenCalledWith(
			expect.objectContaining({
				workspaceRoot: "/notes",
				capabilityToken: "G1",
				sourceRelativePath: "inbox.org",
				targetRelativePath: "z.org",
			}),
		)
		expect(result.current.isLoading).toBe(false)
		expect(result.current.isSaving).toBe(false)
		expect(result.current.activeDocument?.relativePath).toBe("inbox.org")
		const target = {
			expectedTargetRevision: "fresh",
			targetHeading: { from: 9, heading: "** Exact" },
		}
		vi.mocked(refileOrgSubtreeFlow).mockReturnValue(async () =>
			E.right({ source: captured, target: { ...captured, relativePath: "z.org" } }),
		)
		await act(async () => {
			await result.current.refileSubtree(0, "z.org", target)
		})
		expect(refileOrgSubtreeFlow).toHaveBeenCalledWith(
			expect.objectContaining({ ...target, targetRelativePath: "z.org" }),
		)
	})
	it("cancels immediately without waiting for native IO and removes its listener", async () => {
		const { result } = await setup()
		let resolve!: (
			value: E.Either<never, { relativePath: string; revision: string; headings: [] }>,
		) => void
		vi.mocked(readOrgRefileTargetFlow).mockReturnValue(
			() =>
				new Promise((r) => {
					resolve = r
				}),
		)
		const controller = new AbortController()
		const remove = vi.spyOn(controller.signal, "removeEventListener")
		const pending = result.current.readRefileTarget("z.org", controller.signal)
		controller.abort()
		expect(await pending).toMatchObject({ kind: "rejected" })
		expect(remove).toHaveBeenCalledWith("abort", expect.any(Function))
		await act(async () => {
			resolve(E.right({ relativePath: "z.org", revision: "late", headings: [] }))
			await Promise.resolve()
		})
		expect(result.current.activeDocument?.relativePath).toBe("inbox.org")
		expect(
			result.current.workspace?.documents.find((d) => d.relativePath === "z.org")?.revision,
		).toBe("z-1")
	})
	it("invalidates a pending lookup even when the newer lookup is rejected before IO", async () => {
		const { result } = await setup()
		const pendingRead = deferred<Awaited<ReturnType<ReturnType<typeof readOrgRefileTargetFlow>>>>()
		let current!: () => boolean
		vi.mocked(readOrgRefileTargetFlow).mockImplementationOnce((input) => {
			current = input.confirmCurrent!
			return () => pendingRead.promise
		})
		const pending = result.current.readRefileTarget("z.org")
		expect(current()).toBe(true)
		expect((await result.current.readRefileTarget("../unsafe.org")).kind).toBe("rejected")
		expect(current()).toBe(false)
		pendingRead.resolve(E.right({ relativePath: "z.org", revision: "late", headings: [] }))
		expect((await pending).kind).toBe("rejected")
		expect(readOrgRefileTargetFlow).toHaveBeenCalledOnce()
	})

	it("rejects source-edit ABA and stale activation before publication", async () => {
		const { result } = await setup()
		const staleReader = result.current.readRefileTarget
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		expect(await staleReader("z.org")).toMatchObject({ kind: "rejected" })
		expect(readOrgRefileTargetFlow).not.toHaveBeenCalled()
		let resolve!: (
			value: E.Either<never, { relativePath: string; revision: string; headings: [] }>,
		) => void
		vi.mocked(readOrgRefileTargetFlow).mockReturnValueOnce(
			() =>
				new Promise((r) => {
					resolve = r
				}),
		)
		const pending = result.current.readRefileTarget("z.org")
		act(() => {
			result.current.updateContent("* Changed\n")
			result.current.updateContent(captured.content)
		})
		resolve(E.right({ relativePath: "z.org", revision: "late", headings: [] }))
		expect(await pending).toMatchObject({ kind: "rejected" })
	})
	it.each([
		"lease",
		"close",
		"rename",
	])("rejects pending snapshots after source context changes: %s", async (action) => {
		const { result } = await setup()
		let resolve!: (
			value: E.Either<never, { relativePath: string; revision: string; headings: [] }>,
		) => void
		vi.mocked(readOrgRefileTargetFlow).mockReturnValue(
			() =>
				new Promise((r) => {
					resolve = r
				}),
		)
		const oldReader = result.current.readRefileTarget
		const pending = oldReader("z.org")
		if (action === "lease") {
			vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
				E.right({ ...workspace, capabilityToken: "G2" }),
			)
			await act(async () => {
				await result.current.openDefaultWorkspace()
			})
		} else if (action === "close") {
			await act(async () => {
				await result.current.closeActiveDocument()
			})
		} else {
			vi.mocked(moveOrgDocumentFlow).mockReturnValue(async () =>
				E.right({ ...captured, relativePath: "renamed.org" }),
			)
			await act(async () => {
				await result.current.moveActiveDocument("renamed.org")
			})
		}
		resolve(E.right({ relativePath: "z.org", revision: "late", headings: [] }))
		expect(await pending).toMatchObject({ kind: "rejected" })
		expect(await oldReader("z.org")).toMatchObject({ kind: "rejected" })
		expect(readOrgRefileTargetFlow).toHaveBeenCalledTimes(1)
	})
	it("does not expose an older lookup after a newer request completes", async () => {
		const { result } = await setup()
		let resolve!: (
			value: E.Either<never, { relativePath: string; revision: string; headings: [] }>,
		) => void
		vi.mocked(readOrgRefileTargetFlow).mockReturnValueOnce(
			() =>
				new Promise((r) => {
					resolve = r
				}),
		)
		const pending = result.current.readRefileTarget("z.org")
		vi.mocked(readOrgRefileTargetFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "z.org", revision: "new", headings: [] }),
		)
		expect(await result.current.readRefileTarget("z.org")).toMatchObject({ kind: "ready" })
		resolve(E.right({ relativePath: "z.org", revision: "old", headings: [] }))
		expect(await pending).toMatchObject({ kind: "rejected" })
	})
	it.each([
		"inbox.org",
		"z.org",
	])("protects unresolved clean-body source/target %s against read and transfer", async (path) => {
		const { result } = await setup()
		vi.mocked(captureOrgEntryFlow).mockReturnValue(async () =>
			E.right({ ...captured, relativePath: "foreign.org" }),
		)
		await act(async () => {
			await result.current.captureEntry("* Entry\n", path)
		})
		expect(result.current.isDirty).toBe(false)
		expect(await result.current.readRefileTarget("z.org")).toMatchObject({ kind: "rejected" })
		expect(readOrgRefileTargetFlow).not.toHaveBeenCalled()
		await act(async () => {
			expect(await result.current.refileSubtree(0, "z.org")).toMatchObject({ kind: "rejected" })
		})
		expect(refileOrgSubtreeFlow).not.toHaveBeenCalled()
	})
	it("rejects dirty inactive targets and invalid heading selections before IO", async () => {
		const { result } = await setup()
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		act(() => result.current.updateContent("* Dirty\n"))
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		expect(await result.current.readRefileTarget("z.org")).toMatchObject({ kind: "rejected" })
		expect(readOrgRefileTargetFlow).not.toHaveBeenCalled()
		expect(
			await result.current.refileSubtree(0, "z.org", {
				expectedTargetRevision: "<missing>",
				targetHeading: { from: 0, heading: "* Bad" },
			}),
		).toMatchObject({ kind: "rejected" })
		expect(refileOrgSubtreeFlow).not.toHaveBeenCalled()
	})
	it("reads transient input live, requires root discard, and allows A/B/A cleanup but not G1/G2 cleanup", async () => {
		const { result } = await setup()
		const setter = result.current.setTransientDirty
		const staleCapture = result.current.captureEntry
		act(() => {
			setter("draft", true)
			expect(nativeState.hasDirtyBuffers).toBe(true)
		})
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		expect(openDefaultOrgWorkspaceFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		act(() => setter("draft", false))
		expect(nativeState.hasDirtyBuffers).toBe(false)
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		act(() => result.current.setTransientDirty("draft", true))
		act(() => setter("draft", false))
		expect(nativeState.hasDirtyBuffers).toBe(true)
		await act(async () => {
			expect(await staleCapture("* Old", "inbox.org")).toMatchObject({ kind: "rejected" })
		})
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
	})
	it("blocks busy routing and compatibility edits without cancelling a running capture", async () => {
		const { result } = await setup()
		const pending = deferred<Awaited<ReturnType<ReturnType<typeof captureOrgEntryFlow>>>>()
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(() => pending.promise)
		let capturing!: ReturnType<typeof result.current.captureEntry>
		act(() => {
			capturing = result.current.captureEntry("* New", "inbox.org")
		})
		const blocker = vi.mocked(useBlocker).mock.calls.at(-1)![0] as unknown as {
			shouldBlockFn: () => boolean
			enableBeforeUnload: boolean
		}
		expect(blocker.shouldBlockFn()).toBe(true)
		expect(blocker.enableBeforeUnload).toBe(true)
		expect(window.confirm).not.toHaveBeenCalled()
		act(() => result.current.updateContent("newer"))
		await act(async () => {
			pending.resolve(E.right({ ...captured, content: "persisted" }))
			expect(await capturing).toEqual({ kind: "success" })
		})
		expect(result.current.content).toBe("persisted")
		expect(result.current.activeDocument?.content).toBe("persisted")
		expect(result.current.isSaving).toBe(false)
		act(() => result.current.updateContent("persisted"))
		expect(nativeState.hasDirtyBuffers).toBe(false)
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ ...captured, content: "external", revision: "external" }),
		)
		await act(async () => {
			vi.advanceTimersByTime(2000)
			await Promise.resolve()
		})
		expect(result.current.content).toBe("external")
	})
	it("rejects active and parked dirty targets before flow IO", async () => {
		const { result } = await setup()
		act(() => result.current.updateContent("dirty"))
		await act(async () => {
			expect(await result.current.captureEntry("* New", "inbox.org")).toMatchObject({
				kind: "rejected",
			})
		})
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		await act(async () => {
			expect(await result.current.captureEntry("* New", "inbox.org")).toMatchObject({
				kind: "rejected",
			})
		})
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
	})
	it.each([
		"captureEntry",
		"captureTodo",
		"refile",
		"archive",
	] as const)("installs confirmed %s target into parked canonical source and baseline without resetting history", async (operation) => {
		const targetPath = operation === "archive" ? "z_archive.org" : "inbox.org"
		if (operation === "archive") {
			const archiveWorkspace = {
				...workspace,
				documents: [...workspace.documents, { relativePath: targetPath, revision: "new" }],
			}
			vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(archiveWorkspace))
			vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () => E.right(archiveWorkspace))
		}
		const { result } = await setup()
		if (operation === "archive") {
			await act(async () => {
				await result.current.openDocumentPath(targetPath)
			})
		}
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime)
		act(() =>
			editor.view.dispatch({ changes: { from: runtime.source.length, insert: "saved edit\n" } }),
		)
		const baseline = runtime.source
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ ...captured, relativePath: targetPath, content: baseline, revision: "saved" }),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		const depth = undoDepth(runtime.state)
		expect(depth).toBeGreaterThan(0)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const confirmed = {
			...captured,
			relativePath: targetPath,
			content: `${baseline}* Added\n`,
			revision: "confirmed",
		}
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(async () => E.right(confirmed))
		vi.mocked(captureOrgTodoFlow).mockReturnValueOnce(async () => E.right(confirmed))
		const moved = {
			source: { ...captured, relativePath: "z.org", content: "", revision: "removed" },
			target: confirmed,
		}
		vi.mocked(refileOrgSubtreeFlow).mockReturnValueOnce(async () => E.right(moved))
		vi.mocked(archiveOrgSubtreeFlow).mockReturnValueOnce(async () => E.right(moved))
		await act(async () => {
			if (operation === "captureEntry") await result.current.captureEntry("* Added\n", "inbox.org")
			else if (operation === "captureTodo") await result.current.captureTodo("Added", "inbox.org")
			else if (operation === "refile") await result.current.refileSubtree(0, "inbox.org")
			else await result.current.archiveSubtree(0)
		})
		expect(runtime.source).toBe(confirmed.content)
		expect(editor.view.state.sliceDoc()).toBe(confirmed.content)
		expect(undoDepth(runtime.state)).toBe(depth)
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === targetPath),
		).toMatchObject({ baseRevision: "confirmed", isDirty: false })
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () => E.right(confirmed))
		await act(async () => {
			await result.current.openDocumentPath(targetPath)
		})
		expect(result.current.activeBufferRuntime).toBe(runtime)
		expect(result.current.content).toBe(confirmed.content)
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(result.current.isDirty).toBe(true)
		editor.dispose()
	})
	it.each([
		"captureEntry",
		"captureTodo",
		"refile",
	] as const)("retains a programmatically advanced parked target after confirmed %s and pauses reconciliation", async (operation) => {
		const hook = await setup()
		const { result } = hook
		const runtime = result.current.activeBufferRuntime!
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const pending = deferred<E.Either<never, OrgDocumentInterface>>()
		const confirmed = { ...captured, content: "confirmed disk", revision: "confirmed" }
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(() => pending.promise)
		vi.mocked(captureOrgTodoFlow).mockReturnValueOnce(() => pending.promise)
		vi.mocked(refileOrgSubtreeFlow).mockReturnValueOnce(async () => {
			const result = await pending.promise
			return E.map((target: OrgDocumentInterface) => ({
				target,
				source: { ...captured, relativePath: "z.org", content: "", revision: "removed" },
			}))(result)
		})
		let accepting!: Promise<unknown>
		act(() => {
			accepting =
				operation === "captureEntry"
					? result.current.captureEntry("* Added", "inbox.org")
					: operation === "captureTodo"
						? result.current.captureTodo("Added", "inbox.org")
						: result.current.refileSubtree(0, "inbox.org")
		})
		// Model a non-UI canonical writer that advanced after IO began. Compatibility
		// and attached UI ports cannot produce this while the controller is busy.
		vi.spyOn(runtime, "source", "get").mockReturnValue("newer canonical body")
		const install = vi.spyOn(runtime, "applyControllerSource")
		await act(async () => {
			pending.resolve(E.right(confirmed))
			await accepting
		})
		expect(install).not.toHaveBeenCalled()
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "inbox.org"),
		).toMatchObject({ baseRevision: "confirmed", isDirty: true, hasConflict: true })
		expect(result.current.error).toContain("reconcile")
		await act(async () => {
			vi.advanceTimersByTime(2000)
			await Promise.resolve()
		})
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		hook.unmount()
	})
	it("updates clean active, parked and new targets without creating draft buffers", async () => {
		const { result } = await setup()
		await act(async () => {
			expect(await result.current.captureEntry("* New", "inbox.org")).toEqual({ kind: "success" })
		})
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(async () =>
			E.right({ ...captured, content: "parked captured", revision: "parked" }),
		)
		await act(async () => {
			await result.current.captureEntry("* New", "inbox.org")
		})
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "inbox.org")
				?.baseRevision,
		).toBe("parked")
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(async () =>
			E.right({ ...captured, relativePath: "new.org" }),
		)
		await act(async () => {
			await result.current.captureEntry("* New", "new.org")
		})
		expect(
			result.current.workspace?.documents.some((entry) => entry.relativePath === "new.org"),
		).toBe(true)
		expect(result.current.openBuffers).toHaveLength(2)
	})
	it.each([
		"uncertain write",
		"malformed confirmation",
	] as const)("protects the active capture working version after %s, undo, refresh and reactivation until manual save", async (mode) => {
		let watchHandler!: Parameters<typeof orgWorkspaceEventAdapter.listen>[0]
		vi.mocked(orgWorkspaceEventAdapter.listen).mockImplementation(async (handler) => {
			watchHandler = handler
			return () => undefined
		})
		const baseline = { ...captured, content: "* Baseline A\n", revision: "r1" }
		let disk = baseline
		// Path-aware reads prevent the B navigation from accidentally returning A's body.
		vi.mocked(openOrgDocumentFlow).mockImplementation(
			(input) => async () =>
				E.right(
					input.relativePath === "inbox.org"
						? disk
						: {
								content: "* B\n",
								relativePath: input.relativePath,
								revision: "b1",
							},
				),
		)
		vi.mocked(scanOrgWorkspaceFlow).mockImplementation(
			() => async () =>
				E.right({
					...workspace,
					documents: workspace.documents.map((entry) =>
						entry.relativePath === "inbox.org" ? { ...entry, revision: disk.revision } : entry,
					),
				}),
		)
		const { result } = await setup()
		const id = result.current.activeBufferId!
		const liveBlocker = vi.mocked(useBlocker).mock.calls.at(-1)![0] as unknown as {
			shouldBlockFn: () => boolean
		}
		vi.mocked(captureOrgEntryFlow).mockImplementationOnce(() => async () => {
			// The native writer may have installed r2 even though confirmation was lost/invalid.
			disk = { ...baseline, content: "* Baseline A\n* Captured\n", revision: "r2" }
			return mode === "malformed confirmation"
				? E.right({ ...disk, revision: "" })
				: E.left({
						type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR",
						targetRelativePath: "inbox.org",
						cause: null,
						message: "write may have installed r2",
					})
		})
		await act(async () => {
			expect(await result.current.captureEntry("* Captured", "inbox.org")).toMatchObject({
				kind: "uncertain",
			})
		})
		act(() => result.current.updateContent("* User edit\n"))
		// Hook-level undo to baseline; native editor undo/IME is not simulated here.
		act(() => result.current.updateContent(baseline.content))
		expect(result.current.isDirty).toBe(false)
		const assertProtected = () => {
			expect(result.current.activeBufferId).toBe(id)
			expect(result.current.activeDocument).toEqual(baseline)
			expect(result.current.content).toBe(baseline.content)
			expect(nativeState.hasDirtyBuffers).toBe(true)
			expect(nativeState.isBusy).toBe(false)
			expect(result.current.openBuffers.find((buffer) => buffer.bufferId === id)?.hasConflict).toBe(
				true,
			)
		}
		assertProtected()
		await act(async () => {
			watchHandler({ paths: ["inbox.org"], token: "watch", workspaceRoot: workspace.rootPath })
			await vi.advanceTimersByTimeAsync(500)
		})
		assertProtected()
		const readsBeforePoll = vi.mocked(openOrgDocumentFlow).mock.calls.length
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000)
		})
		expect(vi.mocked(openOrgDocumentFlow).mock.calls.length).toBeGreaterThan(readsBeforePoll)
		assertProtected()
		// A later confirmed read has both a newer revision and different body bytes.
		disk = { ...disk, content: "* External r3 body\n", revision: "r3" }
		await act(async () => {
			await result.current.refreshWorkspace()
		})
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000)
		})
		assertProtected()
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		expect(result.current.openBuffers.find((buffer) => buffer.bufferId === id)).toMatchObject({
			baseRevision: "r1",
			isDirty: false,
			hasConflict: true,
		})
		await act(async () => {
			await result.current.switchBuffer(id)
		})
		assertProtected()
		await act(async () => {
			expect(await result.current.captureEntry("* Retry", "inbox.org")).toMatchObject({
				kind: "rejected",
			})
			await result.current.openDefaultWorkspace()
		})
		expect(openDefaultOrgWorkspaceFlow).toHaveBeenCalledTimes(1)
		expect(window.confirm).toHaveBeenCalled()
		expect(liveBlocker.shouldBlockFn()).toBe(true)
		assertProtected()
		act(() => result.current.updateContent("* Further edit\n"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		expect(result.current.content).toBe("* Further edit\n")
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(captureOrgEntryFlow).toHaveBeenCalledTimes(1)
		vi.mocked(saveOrgDocumentFlow).mockImplementation((input) => async () => {
			disk = { ...baseline, content: input.content, revision: "manual-r4" }
			return E.right({ relativePath: input.relativePath, revision: disk.revision })
		})
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({
				content: "* Further edit\n",
				expectedRevision: "r1",
				relativePath: "inbox.org",
			}),
		)
		expect(nativeState.hasDirtyBuffers).toBe(false)
		expect(result.current.openBuffers.find((buffer) => buffer.bufferId === id)?.hasConflict).toBe(
			false,
		)
		act(() => result.current.updateContent("* Autosave resumed\n"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({
				content: "* Autosave resumed\n",
				expectedRevision: "manual-r4",
			}),
		)
		expect(captureOrgEntryFlow).toHaveBeenCalledTimes(1)
	})
	it("requires confirmed ordinary save to close an uncertain capture even after undo to baseline", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId!
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(async () =>
			E.right({ ...captured, revision: "" }),
		)
		await act(async () => {
			await result.current.captureEntry("* Entry", "inbox.org")
		})
		act(() => result.current.updateContent("edit"))
		act(() => result.current.updateContent(captured.content))
		expect(result.current.isDirty).toBe(false)
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "still unresolved" } as never),
		)
		await act(async () => {
			expect(await result.current.closeActiveDocument()).toBe(false)
		})
		expect(result.current.activeBufferId).toBe(id)
		expect(nativeState.hasDirtyBuffers).toBe(true)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "inbox.org", revision: "confirmed-close" }),
		)
		await act(async () => {
			expect(await result.current.closeActiveDocument()).toBe(true)
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({
				content: captured.content,
				expectedRevision: captured.revision,
			}),
		)
		expect(result.current.openBuffers).toHaveLength(0)
		expect(nativeState.hasDirtyBuffers).toBe(false)
		expect(captureOrgEntryFlow).toHaveBeenCalledTimes(1)
	})
	it.each([
		"rejected",
		"uncertain",
		"throw",
		"invalid",
	])("releases ownership after %s and pauses only uncertain outcomes", async (mode) => {
		const { result } = await setup()
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(async () => {
			if (mode === "throw") throw new Error("lost response")
			if (mode === "invalid") return E.right({ ...captured, revision: "" })
			return mode === "rejected"
				? E.left({
						type: "ORG_CAPTURE_REJECTED_ERROR",
						phase: "read",
						noWrite: true,
						cause: null,
						message: "read failed",
					})
				: E.left({
						type: "ORG_CAPTURE_UNCERTAIN_WRITE_ERROR",
						targetRelativePath: "inbox.org",
						cause: null,
						message: "write uncertain",
					})
		})
		await act(async () => {
			expect((await result.current.captureEntry("* New", "inbox.org")).kind).toBe(
				mode === "rejected" ? "rejected" : "uncertain",
			)
		})
		expect(nativeState.isBusy).toBe(false)
		expect(nativeState.hasDirtyBuffers).toBe(mode !== "rejected")
		if (mode === "rejected")
			await act(async () => {
				expect(await result.current.captureEntry("* Fixed", "inbox.org")).toEqual({
					kind: "success",
				})
			})
	})
})

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
	let reject!: (reason: unknown) => void
	const promise = new Promise<T>((complete, fail) => {
		resolve = complete
		reject = fail
	})
	return { promise, resolve, reject }
}

describe("Org subtree transfer outcomes", () => {
	const moved = {
		source: { ...captured, content: "", revision: "removed" },
		target: { ...captured, relativePath: "archive.org", revision: "copied" },
	}
	const validation = {
		message: "Invalid subtree target",
		type: "ORG_SUBTREE_REFILE_VALIDATION_ERROR" as const,
	}
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
		vi.mocked(watchOrgWorkspace).mockReturnValue(async () => E.right("watch-G1"))
		vi.mocked(unwatchOrgWorkspace).mockReturnValue(async () => E.right(undefined))
		vi.mocked(releaseOrgWorkspace).mockReturnValue(async () => E.right(undefined))
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

	it.each([
		"refile",
		"archive",
	] as const)("rejects a same-render content update before %s starts", async (operation) => {
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
	})

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
		const message =
			"Target may contain the subtree. Reread both documents; do not retry automatically."
		vi.mocked(refileOrgSubtreeFlow).mockReturnValueOnce(async () =>
			E.left({
				cause: {
					cause: "unconfirmed write",
					command: "write_org_document",
					message: "unconfirmed write",
					operation: "write",
					type: "ORG_FILE_ERROR",
				},
				message,
				targetRelativePath: "archive.org",
				type: "ORG_SUBTREE_REFILE_UNCERTAIN_WRITE_ERROR",
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
				cause: validation,
				message: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
				recovery: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
				target: moved.target,
				type: "ORG_SUBTREE_REFILE_PARTIAL_ERROR",
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

	it("keeps an open target's body and baseline after a confirmed partial copy", async () => {
		const { result } = await setup()
		const targetBefore = {
			relativePath: "archive.org",
			revision: "before",
			content: "* Existing\n",
		}
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () => E.right(targetBefore))
		await act(async () => {
			await result.current.openDocument(targetBefore)
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () => E.right(captured))
		await act(async () => {
			await result.current.openDocument(captured)
		})
		let guard!: () => boolean
		let protectedPath!: (path: string) => boolean
		vi.mocked(refileOrgSubtreeFlow).mockImplementationOnce((input) => {
			guard = input.confirmSourceUnchanged!
			protectedPath = (input as typeof input & { isProtectedPath: (path: string) => boolean })
				.isProtectedPath
			expect(guard()).toBe(true)
			return async () =>
				E.left({
					type: "ORG_SUBTREE_REFILE_PARTIAL_ERROR",
					cause: validation,
					message: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
					recovery: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
					target: moved.target,
				})
		})
		await act(async () => {
			await result.current.refileSubtree(0, "archive.org")
		})
		expect(protectedPath(captured.relativePath)).toBe(true)
		expect(protectedPath("archive.org")).toBe(true)
		expect(guard()).toBe(false)
		expect(result.current.workspace?.documents).toContainEqual({
			relativePath: "archive.org",
			revision: "copied",
		})
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "archive.org"),
		).toMatchObject({ baseRevision: "before", hasConflict: true })
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () => E.right(moved.target))
		await act(async () => {
			await result.current.openDocument(targetBefore)
		})
		expect(result.current.activeDocument).toEqual(targetBefore)
		expect(result.current.content).toBe(targetBefore.content)
	})

	it("rejects concurrent mutations and compatibility edits while transferring", async () => {
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
			expect(await outcome).toEqual({ kind: "success" })
		})
		expect(result.current.content).toBe(moved.source.content)
		expect(result.current.isDirty).toBe(false)
		expect(result.current.activeDocument).toEqual(moved.source)
		expect(result.current.error).toContain("in progress")
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
			expect(await result.current.archiveSubtree(0)).toMatchObject({ kind: "rejected" })
		})
		expect(archiveOrgSubtreeFlow).not.toHaveBeenCalled()
	})

	it.each([
		"uncertain",
		"partial",
		"throw",
	] as const)("protects both paths after %s, including baseline undo and a source-only manual save", async (mode) => {
		const { result } = await setup()
		vi.mocked(refileOrgSubtreeFlow).mockReturnValueOnce(async () => {
			if (mode === "throw") throw new Error("lost receipt")
			return mode === "partial"
				? E.left({
						type: "ORG_SUBTREE_REFILE_PARTIAL_ERROR",
						cause: validation,
						message: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
						recovery: ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
						target: moved.target,
					})
				: E.left({
						type: "ORG_SUBTREE_REFILE_UNCERTAIN_WRITE_ERROR",
						targetRelativePath: "archive.org",
						message: "lost receipt",
						cause: {
							type: "ORG_FILE_ERROR",
							operation: "write",
							command: "write_org_document",
							message: "lost receipt",
							cause: null,
						},
					})
		})
		await act(async () => {
			expect((await result.current.refileSubtree(0, "archive.org")).kind).toBe("partial")
		})
		act(() => result.current.updateContent("temporary edit"))
		act(() => result.current.updateContent(captured.content))
		expect(result.current.isDirty).toBe(false)
		expect(result.current.openBuffers[0].hasConflict).toBe(true)
		await act(async () => {
			expect((await result.current.readRefileTarget("archive.org")).kind).toBe("rejected")
			expect((await result.current.refileSubtree(0, "archive.org")).kind).toBe("rejected")
			expect((await result.current.archiveSubtree(0)).kind).toBe("rejected")
		})
		expect(readOrgRefileTargetFlow).not.toHaveBeenCalled()
		expect(refileOrgSubtreeFlow).toHaveBeenCalledOnce()
		expect(archiveOrgSubtreeFlow).not.toHaveBeenCalled()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: captured.relativePath, revision: "saved" }),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(result.current.openBuffers[0].hasConflict).toBe(false)
		await act(async () => {
			expect((await result.current.readRefileTarget("archive.org")).kind).toBe("rejected")
			expect((await result.current.refileSubtree(0, "archive.org")).kind).toBe("rejected")
			expect((await result.current.archiveSubtree(0)).kind).toBe("rejected")
		})
		expect(readOrgRefileTargetFlow).not.toHaveBeenCalled()
		expect(refileOrgSubtreeFlow).toHaveBeenCalledOnce()
		expect(archiveOrgSubtreeFlow).not.toHaveBeenCalled()
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
					cause: null,
					command: "read",
					message: "Old read error",
					operation: "read",
					type: "ORG_FILE_ERROR",
				}),
			)
			expect(await oldOpening).toBe(false)
		})
		expect(result.current.isLoading).toBe(true)
		expect(result.current.error).toBeNull()
		await act(async () => {
			newRead.resolve(
				E.left({
					cause: null,
					command: "read",
					message: "New read error",
					operation: "read",
					type: "ORG_FILE_ERROR",
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
					cause: null,
					command: "read",
					message: "New read error",
					operation: "read",
					type: "ORG_FILE_ERROR",
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

	it("preserves save commit when canceled while awaiting an already in-flight save", async () => {
		const { result } = await setup()
		const save = deferred<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => save.promise)
		act(() => result.current.updateContent("saved edits"))
		let saving: Promise<void> | undefined
		act(() => {
			saving = result.current.saveDocument()
		})
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

// Buffer snapshots deliberately contain source/baseline only, not editor undo history.
describe("independent Org buffers", () => {
	const a = captured
	const b = { content: "B baseline", relativePath: "z.org", revision: "z-1" }
	const fileError = {
		cause: null,
		command: "read",
		message: "Disk conflict or missing file",
		operation: "read" as const,
		type: "ORG_FILE_ERROR" as const,
	}
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
		vi.mocked(watchOrgWorkspace).mockReturnValue(async () => E.right("watch-G1"))
		vi.mocked(unwatchOrgWorkspace).mockReturnValue(async () => E.right(undefined))
		vi.mocked(releaseOrgWorkspace).mockReturnValue(async () => E.right(undefined))
		window.localStorage.clear()
		vi.spyOn(window, "confirm").mockReturnValue(true)
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
		vi.mocked(openOrgDocumentFlow).mockImplementation(
			(input) => async () => E.right(input.relativePath === a.relativePath ? a : b),
		)
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
		vi.mocked(saveOrgDocumentFlow).mockImplementation(
			(input) => async () => E.right({ relativePath: input.relativePath, revision: "saved" }),
		)
	})
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})
	const setup = async () => {
		const hook = renderHook(() => useOrgWorkspace())
		await act(async () => {
			await hook.result.current.openDefaultWorkspace()
		})
		await act(async () => {
			await hook.result.current.openDocumentPath(a.relativePath)
		})
		return hook
	}
	const parkDirtyA = async () => {
		const hook = await setup()
		act(() => hook.result.current.updateContent("A edits"))
		await act(async () => {
			expect(await hook.result.current.openDocumentPath(b.relativePath)).toBe(true)
		})
		return hook
	}

	it("switches a missing dirty parked buffer by ID without saving", async () => {
		const { result } = await parkDirtyA()
		const id = result.current.openBuffers.find(
			(buffer) => buffer.relativePath === a.relativePath,
		)!.bufferId
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({ ...workspace, documents: [workspace.documents[0]!] }),
		)
		await act(async () => {
			await result.current.refreshWorkspace()
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () => E.left(fileError))
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(true)
		})
		expect(result.current.content).toBe("A edits")
		expect(result.current.activeBufferId).toBe(id)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("current ID is a no-op and unknown, aborted and closed IDs do no IO", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId!
		vi.mocked(openOrgDocumentFlow).mockClear()
		const controller = new AbortController()
		controller.abort()
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(true)
			expect(await result.current.switchBuffer(id, controller.signal)).toBe(false)
			expect(await result.current.switchBuffer(a.relativePath)).toBe(false)
			expect(await result.current.switchBuffer("G2:buffer-1")).toBe(false)
			expect(await result.current.closeActiveDocument()).toBe(true)
		})
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(false)
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		expect(result.current.activeBufferId).not.toBe(id)
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(false)
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("aborted switch releases its read loading and cannot activate late", async () => {
		const { result } = await parkDirtyA()
		const id = result.current.openBuffers.find(
			(buffer) => buffer.relativePath === a.relativePath,
		)!.bufferId
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		const controller = new AbortController()
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.switchBuffer(id, controller.signal)
		})
		expect(result.current.isLoading).toBe(true)
		act(() => controller.abort())
		expect(result.current.isLoading).toBe(false)
		await act(async () => {
			read.resolve(E.right(a))
			expect(await opening).toBe(false)
		})
		expect(result.current.activeDocument?.relativePath).toBe(b.relativePath)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("closing the parked target during a read cancels activation by logical ID", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId!
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.switchBuffer(id)
		})
		await act(async () => {
			expect(await result.current.closeDocumentPath(a.relativePath)).toBe(true)
		})
		await act(async () => {
			read.resolve(E.right(a))
			expect(await opening).toBe(false)
		})
		expect(result.current.activeDocument?.relativePath).toBe(b.relativePath)
		expect(result.current.isLoading).toBe(false)
		expect(result.current.openBuffers).toHaveLength(1)
	})

	it("closed and reopened parked path cannot be activated by a pending old ID read", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId!
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.switchBuffer(id)
		})
		await act(async () => {
			expect(await result.current.closeDocumentPath(a.relativePath)).toBe(true)
		})
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		const newId = result.current.activeBufferId
		expect(newId).not.toBe(id)
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		await act(async () => {
			read.resolve(E.right(a))
			expect(await opening).toBe(false)
		})
		expect(result.current.activeDocument?.relativePath).toBe(b.relativePath)
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(false)
		})
	})

	it("successful delete retires the active ID", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId!
		vi.mocked(deleteOrgDocumentFlow).mockReturnValueOnce(async () => E.right(undefined))
		await act(async () => {
			await result.current.deleteActiveDocument()
		})
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(false)
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		await act(async () => {
			await result.current.refreshWorkspace()
		})
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		expect(result.current.activeBufferId).not.toBe(id)
	})

	it("retained G1 switch callback rejects G2 without IO", async () => {
		const { result } = await setup()
		const oldSwitch = result.current.switchBuffer
		const oldId = result.current.activeBufferId!
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(await oldSwitch(oldId)).toBe(false)
			expect(await result.current.switchBuffer(oldId)).toBe(false)
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
	})

	const legacyWorkspace = { id: "legacy", title: "Legacy" } as WorkspaceInterface
	const throwingOperations = [
		{
			name: "migration first prepare",
			flow: prepareLegacyMigrationFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) =>
				controller.migrateLegacyWorkspace(legacyWorkspace),
		},
		{
			name: "verify",
			flow: verifyLegacyMigrationRecoveryFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) =>
				controller.verifyLegacyMigration(legacyWorkspace),
		},
		{
			name: "recovery",
			flow: runLegacyMigrationRecoveryDrillFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) =>
				controller.runLegacyRecoveryDrill(legacyWorkspace),
		},
		{
			name: "index clear",
			flow: clearOrgDerivedIndexFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) => controller.clearDerivedIndex(),
		},
		{
			name: "index rebuild",
			flow: rebuildOrgDerivedIndexFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) => controller.rebuildDerivedIndex(),
		},
		{
			name: "capture",
			flow: captureOrgTodoFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) =>
				controller.captureTodo("Todo", "other.org"),
		},
		{
			name: "create",
			flow: saveOrgDocumentFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) =>
				controller.createDocument("other.org"),
		},
		{
			name: "directory",
			flow: createOrgDirectoryFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) =>
				controller.createDirectory("directory"),
		},
		{
			name: "move",
			flow: moveOrgDocumentFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) =>
				controller.moveActiveDocument("other.org"),
		},
		{
			name: "delete",
			flow: deleteOrgDocumentFlow,
			run: (controller: ReturnType<typeof useOrgWorkspace>) => controller.deleteActiveDocument(),
		},
	]
	for (const mode of ["factoryThrow", "synchronousThrow", "rejectingTask"] as const) {
		for (const operation of throwingOperations) {
			it(`${operation.name} releases its owner after ${mode} without losing buffers or retrying`, async () => {
				let nativeState!: Parameters<typeof orgWindowClose.useOrgWindowClose>[0]
				vi.spyOn(orgWindowClose, "useOrgWindowClose").mockImplementation((state) => {
					nativeState = state
					return true
				})
				const { result } = await setup()
				vi.mocked(operation.flow).mockImplementationOnce(() => {
					if (mode === "factoryThrow") throw new Error("unexpected")
					if (mode === "synchronousThrow")
						return () => {
							throw new Error("unexpected")
						}
					return async () => {
						throw new Error("unexpected")
					}
				})
				await act(async () => {
					await operation.run(result.current)
				})
				expect(result.current.isSaving).toBe(false)
				expect(result.current.isLoading).toBe(false)
				expect(result.current.content).toBe(a.content)
				expect(result.current.activeDocument).toEqual(a)
				expect(nativeState.isBusy).toBe(false)
				expect(result.current.error).toMatch(/may have changed.*Refresh and reconcile/)
				expect(operation.flow).toHaveBeenCalledTimes(1)
				vi.mocked(createOrgDirectoryFlow).mockReturnValue(async () => E.right(undefined))
				await act(async () => {
					await result.current.createDirectory("next")
				})
				expect(result.current.workspace?.directories).toContain("next")
			})
		}

		it(`retains active and closing parked save bodies after ${mode}, without autosave looping`, async () => {
			const { result } = await parkDirtyA()
			act(() => result.current.updateContent("B edits"))
			const fail = () => {
				if (mode === "factoryThrow") throw new Error("unexpected")
				if (mode === "synchronousThrow")
					return () => {
						throw new Error("unexpected")
					}
				return async () => {
					throw new Error("unexpected")
				}
			}
			vi.mocked(saveOrgDocumentFlow).mockImplementationOnce(fail)
			await act(async () => {
				expect(await result.current.closeActiveDocument()).toBe(false)
			})
			expect(result.current.content).toBe("B edits")
			expect(result.current.isDirty).toBe(true)
			expect(result.current.isSaving).toBe(false)
			await act(async () => {
				await vi.advanceTimersByTimeAsync(5000)
			})
			expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
			vi.mocked(saveOrgDocumentFlow).mockImplementationOnce(fail)
			await act(async () => {
				expect(await result.current.closeDocumentPath(a.relativePath)).toBe(false)
			})
			expect(result.current.isSaving).toBe(false)
			expect(result.current.openBuffers).toHaveLength(2)
			await act(async () => {
				await result.current.openDocumentPath(a.relativePath)
			})
			expect(result.current.content).toBe("A edits")
		})

		it(`root approval ${mode} releases busy state without releasing an unknown or ambient grant`, async () => {
			const { result } = await parkDirtyA()
			vi.mocked(selectOrgWorkspaceFlow).mockImplementationOnce(() => {
				if (mode === "factoryThrow") throw new Error("unexpected")
				if (mode === "synchronousThrow")
					return () => {
						throw new Error("unexpected")
					}
				return async () => {
					throw new Error("unexpected")
				}
			})
			await act(async () => {
				await result.current.selectWorkspace()
			})
			expect(result.current.isLoading).toBe(false)
			expect(result.current.workspaceSessionId).toBe("G1")
			expect(result.current.openBuffers).toHaveLength(2)
			expect(releaseOrgWorkspace).not.toHaveBeenCalled()
			await act(async () => {
				await result.current.openDocumentPath(a.relativePath)
			})
			expect(result.current.content).toBe("A edits")
		})
	}

	it("rejecting in-flight saves resolve navigation waiters safely and allow a later owned save", async () => {
		const { result } = await setup()
		act(() => result.current.updateContent("retained input"))
		let reject!: (error: Error) => void
		const task = new Promise<never>((_, fail) => {
			reject = fail
		})
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => task)
		let saving!: Promise<void>
		let opening!: Promise<boolean>
		act(() => {
			saving = result.current.saveDocument()
		})
		act(() => {
			opening = result.current.openDocumentPath(b.relativePath)
		})
		await act(async () => {
			reject(new Error("unknown write outcome"))
			await saving
			expect(await opening).toBe(false)
		})
		expect(result.current.content).toBe("retained input")
		expect(result.current.isSaving).toBe(false)
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
		expect(result.current.isDirty).toBe(false)
	})

	it("unexpected capture failure retains both dirty active and parked bodies", async () => {
		const { result } = await parkDirtyA()
		act(() => result.current.updateContent("B edits"))
		vi.mocked(captureOrgTodoFlow).mockReturnValueOnce(async () => {
			throw new Error("unknown outcome")
		})
		await act(async () => {
			await result.current.captureTodo("todo", "other.org")
		})
		expect(result.current.content).toBe("B edits")
		expect(result.current.openBuffers.every((buffer) => buffer.isDirty)).toBe(true)
		expect(result.current.isSaving).toBe(false)
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		expect(result.current.content).toBe("A edits")
	})

	it("failed exact-grant cleanup still releases only the approval owner", async () => {
		const { result } = await setup()
		const approval = deferred<Awaited<ReturnType<ReturnType<typeof selectOrgWorkspaceFlow>>>>()
		vi.mocked(selectOrgWorkspaceFlow).mockReturnValueOnce(() => approval.promise)
		vi.mocked(releaseOrgWorkspace).mockReturnValueOnce(async () => {
			throw new Error("release failed")
		})
		let selecting!: Promise<void>
		act(() => {
			selecting = result.current.selectWorkspace()
		})
		vi.mocked(selectOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.left({ message: "cancelled" } as never),
		)
		await act(async () => {
			await result.current.selectWorkspace()
		})
		await act(async () => {
			approval.resolve(E.right({ ...workspace, capabilityToken: "unused-grant" }))
			await selecting
		})
		expect(releaseOrgWorkspace).toHaveBeenCalledExactlyOnceWith(workspace.rootPath, "unused-grant")
		expect(result.current.isLoading).toBe(false)
		expect(result.current.content).toBe(a.content)
		expect(result.current.workspaceSessionId).toBe("G1")
	})

	it("a rejected old approval cannot clear the busy flags of a newer owner", async () => {
		const { result } = await setup()
		let rejectOld!: (error: Error) => void
		const oldTask = new Promise<never>((_, reject) => {
			rejectOld = reject
		})
		const next = deferred<Awaited<ReturnType<ReturnType<typeof selectOrgWorkspaceFlow>>>>()
		vi.mocked(selectOrgWorkspaceFlow)
			.mockReturnValueOnce(() => oldTask)
			.mockReturnValueOnce(() => next.promise)
		let old!: Promise<void>
		let newer!: Promise<void>
		act(() => {
			old = result.current.selectWorkspace()
		})
		act(() => {
			newer = result.current.selectWorkspace()
		})
		await act(async () => {
			rejectOld(new Error("old failure"))
			await old
		})
		expect(result.current.isLoading).toBe(true)
		vi.mocked(createOrgDirectoryFlow).mockReturnValue(async () => E.right(undefined))
		await act(async () => {
			await result.current.createDirectory("blocked")
		})
		expect(createOrgDirectoryFlow).not.toHaveBeenCalled()
		await act(async () => {
			next.resolve(E.right(null))
			await newer
		})
		expect(result.current.isLoading).toBe(false)
		await act(async () => {
			await result.current.createDirectory("allowed")
		})
		expect(result.current.workspace?.directories).toContain("allowed")
	})

	it("rejects saved A editor/save callbacks after B navigation and after ABA navigation", async () => {
		const { result } = await setup()
		const old = result.current
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		act(() => old.updateContent("wrong A input"))
		await act(async () => {
			await old.saveDocument()
		})
		expect(result.current.content).toBe(b.content)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		act(() => old.updateContent("stale ABA input"))
		await act(async () => {
			await old.saveDocument()
		})
		expect(result.current.content).toBe(a.content)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		true,
		false,
	])("retains same-render edits during deferred refresh (missing=%s)", async (missing) => {
		const { result } = await setup()
		const scan = deferred<Awaited<ReturnType<ReturnType<typeof scanOrgWorkspaceFlow>>>>()
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(() => scan.promise)
		const old = result.current
		let refreshing!: Promise<void>
		act(() => {
			old.updateContent("live edits")
			refreshing = old.refreshWorkspace()
		})
		await act(async () => {
			scan.resolve(
				E.right({
					...workspace,
					documents: missing ? [] : [{ relativePath: a.relativePath, revision: "external" }],
				}),
			)
			await refreshing
		})
		expect(result.current.content).toBe("live edits")
		expect(result.current.activeDocument).toEqual(a)
		expect(result.current.openBuffers[0]?.hasConflict).toBe(true)
	})

	it.each([
		"refresh",
		"poll",
	] as const)("retains ABA editor changes during a deferred %s read", async (boundary) => {
		const { result } = await setup()
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValue(() => read.promise)
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({
				...workspace,
				documents: [{ relativePath: a.relativePath, revision: "external" }],
			}),
		)
		let checking: Promise<void> | undefined
		if (boundary === "refresh") {
			act(() => {
				checking = result.current.refreshWorkspace()
			})
			await act(async () => {
				await Promise.resolve()
			})
		} else {
			await act(async () => {
				await vi.advanceTimersByTimeAsync(2000)
			})
		}
		act(() => {
			result.current.updateContent("intervening edit")
			result.current.updateContent(a.content)
		})
		await act(async () => {
			read.resolve(E.right({ ...a, content: "external body", revision: "external" }))
			await checking
		})
		expect(result.current.content).toBe(a.content)
		expect(result.current.activeDocument).toEqual(a)
		expect(result.current.error).toContain("External modification")
	})

	it("releases an approval that arrives after workspace cleanup", async () => {
		const grant = deferred<Awaited<ReturnType<ReturnType<typeof openDefaultOrgWorkspaceFlow>>>>()
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(() => grant.promise)
		const { result, unmount } = renderHook(() => useOrgWorkspace())
		let pending!: Promise<void>
		act(() => {
			pending = result.current.openDefaultWorkspace()
		})
		unmount()
		await act(async () => {
			grant.resolve(E.right({ ...workspace, capabilityToken: "late-lease" }))
			await pending
		})
		expect(releaseOrgWorkspace).toHaveBeenCalledWith(workspace.rootPath, "late-lease")
	})

	it("releases stale same-root approvals by exact lease without revoking the winner", async () => {
		const oldGrant = deferred<Awaited<ReturnType<ReturnType<typeof openDefaultOrgWorkspaceFlow>>>>()
		vi.mocked(openDefaultOrgWorkspaceFlow)
			.mockReturnValueOnce(() => oldGrant.promise)
			.mockReturnValueOnce(async () => E.right({ ...workspace, capabilityToken: "winner" }))
		const { result, unmount } = renderHook(() => useOrgWorkspace())
		let pending!: Promise<void>
		act(() => {
			pending = result.current.openDefaultWorkspace()
		})
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			oldGrant.resolve(E.right({ ...workspace, capabilityToken: "stale" }))
			await pending
		})
		expect(result.current.workspaceSessionId).toBe("winner")
		expect(releaseOrgWorkspace).toHaveBeenCalledWith(workspace.rootPath, "stale")
		expect(releaseOrgWorkspace).not.toHaveBeenCalledWith(workspace.rootPath, "winner")
		unmount()
		expect(releaseOrgWorkspace).toHaveBeenCalledWith(workspace.rootPath, "winner")
	})

	it("serializes two creations and navigation waiting on the same deferred save", async () => {
		const { result } = await setup()
		const saved = deferred<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
		const created = deferred<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
		vi.mocked(saveOrgDocumentFlow)
			.mockReturnValueOnce(() => saved.promise)
			.mockReturnValueOnce(() => created.promise)
		act(() => result.current.updateContent("A edits"))
		let saving!: Promise<void>
		let first!: Promise<void>
		let second!: Promise<void>
		let navigating!: Promise<boolean>
		act(() => {
			saving = result.current.saveDocument()
			first = result.current.createDocument("one.org")
			second = result.current.createDocument("two.org")
			navigating = result.current.openDocumentPath(b.relativePath)
		})
		const reads = vi.mocked(openOrgDocumentFlow).mock.calls.length
		await act(async () => {
			saved.resolve(E.right({ relativePath: a.relativePath, revision: "saved" }))
			await saving
			await second
			expect(await navigating).toBe(false)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
		expect(openOrgDocumentFlow).toHaveBeenCalledTimes(reads)
		expect(result.current.isSaving).toBe(true)
		await act(async () => {
			created.resolve(E.right({ relativePath: "one.org", revision: "created" }))
			await first
		})
		expect(result.current.activeDocument?.relativePath).toBe("one.org")
		expect(result.current.isSaving).toBe(false)
	})

	it("preserves approved leases through scans and releases same-root superseded leases exactly", async () => {
		vi.mocked(openDefaultOrgWorkspaceFlow)
			.mockReturnValueOnce(async () => E.right({ ...workspace, capabilityToken: "lease-1" }))
			.mockReturnValueOnce(async () => E.right({ ...workspace, capabilityToken: "lease-2" }))
		const hook = await setup()
		expect(hook.result.current.workspaceSessionId).toBe("lease-1")
		await act(async () => {
			await hook.result.current.refreshWorkspace()
		})
		expect(hook.result.current.workspace?.capabilityToken).toBe("lease-1")
		await act(async () => {
			await hook.result.current.openDefaultWorkspace()
		})
		expect(releaseOrgWorkspace).toHaveBeenCalledWith(workspace.rootPath, "lease-1")
		expect(hook.result.current.workspaceSessionId).toBe("lease-2")
		hook.unmount()
		expect(releaseOrgWorkspace).toHaveBeenCalledWith(workspace.rootPath, "lease-2")
		expect(vi.mocked(releaseOrgWorkspace).mock.calls.every((args) => args.length === 2)).toBe(true)
	})

	it.each([
		"delete",
		"capture",
		"move",
		"refile",
		"archive",
	] as const)("rejects a retained clean A %s callback after a deferred switch to dirty B", async (command) => {
		const { result } = await setup()
		const retained = result.current
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.openDocumentPath(b.relativePath)
		})
		await act(async () => {
			read.resolve(E.right(b))
			expect(await opening).toBe(true)
		})
		act(() => result.current.updateContent("B unsaved body"))
		await act(async () => {
			if (command === "delete") await retained.deleteActiveDocument()
			if (command === "capture") await retained.captureTodo("old A", a.relativePath)
			if (command === "move") await retained.moveActiveDocument("moved.org")
			if (command === "refile")
				expect((await retained.refileSubtree(0, b.relativePath)).kind).toBe("rejected")
			if (command === "archive") expect((await retained.archiveSubtree(0)).kind).toBe("rejected")
		})
		for (const flow of [
			deleteOrgDocumentFlow,
			captureOrgTodoFlow,
			moveOrgDocumentFlow,
			refileOrgSubtreeFlow,
			archiveOrgSubtreeFlow,
		])
			expect(flow).not.toHaveBeenCalled()
		expect(result.current.activeDocument).toEqual(b)
		expect(result.current.content).toBe("B unsaved body")
		expect(result.current.openBuffers).toHaveLength(2)
	})

	it("revalidates source generation and grant at the last refile boundary and ignores late outcomes", async () => {
		const hook = await setup()
		const transfer = deferred<Awaited<ReturnType<ReturnType<typeof refileOrgSubtreeFlow>>>>()
		let confirmSourceUnchanged!: () => boolean
		vi.mocked(refileOrgSubtreeFlow).mockImplementationOnce((input) => {
			confirmSourceUnchanged = input.confirmSourceUnchanged!
			return () => transfer.promise
		})
		let pending!: Promise<OrgSubtreeTransferOutcome>
		act(() => {
			pending = hook.result.current.refileSubtree(0, b.relativePath)
		})
		expect(confirmSourceUnchanged()).toBe(true)
		act(() => {
			hook.result.current.updateContent("intervening edit")
		})
		act(() => {
			hook.result.current.updateContent(a.content)
		})
		expect(confirmSourceUnchanged()).toBe(true)
		hook.unmount()
		expect(confirmSourceUnchanged()).toBe(false)
		transfer.resolve(E.right({ source: { ...a, content: "", revision: "removed" }, target: b }))
		expect((await pending).kind).toBe("rejected")
	})

	it("uses a live saved revision for a retained same-activation delete callback", async () => {
		const { result } = await setup()
		const retainedDelete = result.current.deleteActiveDocument
		act(() => result.current.updateContent("saved A body"))
		await act(async () => {
			await result.current.saveDocument()
		})
		vi.mocked(deleteOrgDocumentFlow).mockReturnValueOnce(async () => E.right(undefined))
		await act(async () => {
			await retainedDelete()
		})
		expect(deleteOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ relativePath: a.relativePath, expectedRevision: "saved" }),
		)
		expect(result.current.activeDocument).toBeNull()
	})

	it("carries the approved G1 token through reads, writes, scans, index and watch cleanup", async () => {
		const hook = await setup()
		const { result } = hook
		expect(result.current.workspaceSessionId).toBe("G1")
		expect(openOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ capabilityToken: "G1" }),
		)
		expect(watchOrgWorkspace).toHaveBeenCalledWith(workspace.rootPath, "G1")
		// Native scans return filesystem fields, not authority: preserve the original grant.
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, capabilityToken: undefined }),
		)
		vi.mocked(rebuildOrgDerivedIndexFlow).mockReturnValue(async () =>
			E.right({ documentCount: 2, headingCount: 0, linkCount: 0, agendaCount: 0 }),
		)
		await act(async () => {
			await result.current.rebuildDerivedIndex()
		})
		expect(rebuildOrgDerivedIndexFlow).toHaveBeenCalledWith(
			expect.objectContaining({ capabilityToken: "G1" }),
		)
		act(() => result.current.updateContent("G1 edited"))
		await act(async () => {
			await result.current.saveDocument()
		})
		await act(async () => {
			await result.current.refreshWorkspace()
		})
		vi.mocked(createOrgDirectoryFlow).mockReturnValue(async () => E.right(undefined))
		vi.mocked(captureOrgTodoFlow).mockReturnValue(async () => E.right(captured))
		vi.mocked(clearOrgDerivedIndexFlow).mockReturnValue(async () =>
			E.right({ documentCount: 0, headingCount: 0, linkCount: 0, agendaCount: 0 }),
		)
		await act(async () => {
			await result.current.createDirectory("folder")
		})
		await act(async () => {
			await result.current.captureTodo("G1 todo")
		})
		await act(async () => {
			await result.current.clearDerivedIndex()
		})
		await act(async () => {
			await result.current.createDocument("new.org")
		})
		for (const flow of [
			openOrgDocumentFlow,
			saveOrgDocumentFlow,
			createOrgDirectoryFlow,
			captureOrgTodoFlow,
		]) {
			for (const [input] of vi.mocked(flow).mock.calls)
				expect(input).toEqual(expect.objectContaining({ capabilityToken: "G1" }))
		}
		expect(scanOrgWorkspaceFlow).toHaveBeenCalledWith(workspace.rootPath, "G1")
		expect(clearOrgDerivedIndexFlow).toHaveBeenCalledWith(workspace.rootPath, "G1")
		expect(result.current.workspace?.capabilityToken).toBe("G1")
		hook.unmount()
		expect(unwatchOrgWorkspace).toHaveBeenCalledWith("watch-G1", workspace.rootPath, "G1")
		expect(releaseOrgWorkspace).toHaveBeenCalledWith(workspace.rootPath, "G1")
	})

	it("rejects every retained G1 command after a deferred same-root G2 grant", async () => {
		const { result } = await setup()
		const retained = result.current
		const grant = deferred<Awaited<ReturnType<ReturnType<typeof openDefaultOrgWorkspaceFlow>>>>()
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(() => grant.promise)
		let opening!: Promise<void>
		act(() => {
			opening = result.current.openDefaultWorkspace()
		})
		await act(async () => {
			grant.resolve(E.right({ ...workspace, capabilityToken: "G2" }))
			await opening
		})
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		act(() => result.current.updateContent("G2 dirty B"))
		vi.clearAllMocks()
		const legacy = {} as Parameters<typeof retained.verifyLegacyMigration>[0]
		await act(async () => {
			await retained.openDocument(workspace.documents[1])
			await retained.openDocumentPath(a.relativePath)
			await retained.openDocumentAt(a.relativePath, 1)
			await retained.openOrgLink({} as Parameters<typeof retained.openOrgLink>[0])
			await retained.refreshWorkspace()
			await retained.createDirectory("old-dir")
			await retained.createDocument("old.org")
			await retained.captureTodo("old capture")
			await retained.deleteActiveDocument()
			await retained.moveActiveDocument("old-move.org")
			await retained.refileSubtree(0, b.relativePath)
			await retained.archiveSubtree(0)
			await retained.migrateLegacyWorkspace(legacy)
			await retained.verifyLegacyMigration(legacy)
			await retained.runLegacyRecoveryDrill(legacy)
			await retained.rebuildDerivedIndex()
			await retained.clearDerivedIndex()
			await retained.openDefaultWorkspace()
			await retained.selectWorkspace()
			await retained.saveDocument()
			expect(await retained.closeActiveDocument()).toBe(false)
			expect(await retained.closeDocumentPath(a.relativePath)).toBe(false)
			retained.updateContent("stale input")
		})
		for (const flow of [
			openOrgDocumentFlow,
			scanOrgWorkspaceFlow,
			resolveOrgLinkTargetFlow,
			createOrgDirectoryFlow,
			saveOrgDocumentFlow,
			captureOrgTodoFlow,
			deleteOrgDocumentFlow,
			moveOrgDocumentFlow,
			refileOrgSubtreeFlow,
			archiveOrgSubtreeFlow,
			prepareLegacyMigrationFlow,
			verifyLegacyMigrationRecoveryFlow,
			runLegacyMigrationRecoveryDrillFlow,
			rebuildOrgDerivedIndexFlow,
			clearOrgDerivedIndexFlow,
			openDefaultOrgWorkspaceFlow,
			selectOrgWorkspaceFlow,
		])
			expect(flow).not.toHaveBeenCalled()
		expect(result.current.content).toBe("G2 dirty B")
		expect(result.current.workspaceSessionId).toBe("G2")
	})

	it("rejects a retained clean-root callback with dirty A parked under clean B", async () => {
		const { result } = await setup()
		const retainedOpen = result.current.openDefaultWorkspace
		act(() => result.current.updateContent("parked A body"))
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		vi.clearAllMocks()
		await act(async () => {
			await retainedOpen()
		})
		expect(openDefaultOrgWorkspaceFlow).not.toHaveBeenCalled()
		expect(window.confirm).not.toHaveBeenCalled()
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath)?.isDirty,
		).toBe(true)
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		expect(result.current.content).toBe("parked A body")
	})

	it("checks live dirtiness even for a retained callback in the same activation", async () => {
		const { result } = await setup()
		const retainedOpen = result.current.openDefaultWorkspace
		act(() => result.current.updateContent("new unsaved A"))
		vi.mocked(window.confirm).mockReturnValue(false)
		vi.mocked(openDefaultOrgWorkspaceFlow).mockClear()
		await act(async () => {
			await retainedOpen()
		})
		expect(window.confirm).toHaveBeenCalled()
		expect(openDefaultOrgWorkspaceFlow).not.toHaveBeenCalled()
		expect(result.current.content).toBe("new unsaved A")
	})

	it("parks A dirty -> B dirty -> A without writing either buffer or replacing baselines/IDs", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId
		act(() => result.current.updateContent("A edits"))
		await act(async () => {
			expect(await result.current.openDocumentPath(b.relativePath)).toBe(true)
		})
		act(() => result.current.updateContent("B edits"))
		await act(async () => {
			expect(await result.current.openDocumentPath(a.relativePath)).toBe(true)
		})
		expect(result.current.content).toBe("A edits")
		expect(result.current.activeDocument).toEqual(a)
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.openBuffers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					baseRevision: a.revision,
					isDirty: true,
					relativePath: a.relativePath,
				}),
				expect.objectContaining({
					baseRevision: b.revision,
					isDirty: true,
					relativePath: b.relativePath,
				}),
			]),
		)
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		expect(result.current.content).toBe("B edits")
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("keeps inactive dirtiness out of autosave but in route/window/workspace guards", async () => {
		const { result } = await parkDirtyA()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(result.current.isDirty).toBe(false)
		const blocker = vi.mocked(useBlocker).mock.calls.at(-1)?.[0] as unknown as {
			disabled: boolean
			enableBeforeUnload: boolean
			shouldBlockFn: () => boolean
		}
		expect(blocker.disabled).toBe(false)
		expect(blocker.enableBeforeUnload).toBe(true)
		vi.mocked(window.confirm).mockReturnValue(false)
		expect(blocker.shouldBlockFn()).toBe(true)
		const session = result.current.workspaceSessionId
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		expect(openDefaultOrgWorkspaceFlow).toHaveBeenCalledTimes(1)
		expect(result.current.workspaceSessionId).toBe(session)
		expect(result.current.openBuffers).toHaveLength(2)
	})

	it("retains all buffers on failed grants, but clears them and changes session even for the same successful root", async () => {
		const { result } = await parkDirtyA()
		const session = result.current.workspaceSessionId
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () => E.left(fileError))
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		expect(result.current.workspaceSessionId).toBe(session)
		expect(result.current.openBuffers).toHaveLength(2)
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		expect(result.current.workspaceSessionId).toBe("G2")
		expect(result.current.openBuffers).toEqual([])
		expect(result.current.activeBufferId).toBeNull()
	})

	it.each([
		"missing",
		"changed",
	])("scan and reopen preserve a dirty %s buffer and mark conflict without inventing an external body", async (kind) => {
		const { result } = await parkDirtyA()
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({
				...workspace,
				documents:
					kind === "missing"
						? [workspace.documents[0]]
						: [workspace.documents[0], { relativePath: a.relativePath, revision: "external" }],
			}),
		)
		await act(async () => {
			await result.current.refreshWorkspace()
		})
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath)
				?.hasConflict,
		).toBe(true)
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () =>
			kind === "missing"
				? E.left(fileError)
				: E.right({ ...a, content: "EXTERNAL", revision: "external" }),
		)
		await act(async () => {
			expect(await result.current.openDocumentPath(a.relativePath)).toBe(true)
		})
		expect(result.current.content).toBe("A edits")
		expect(result.current.activeDocument).toEqual(a)
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath)
				?.hasConflict,
		).toBe(true)
	})

	it("rejects inactive close on revision conflict, retains source, and can retry through existing revision flow", async () => {
		const { result } = await parkDirtyA()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () => E.left(fileError))
		await act(async () => {
			expect(await result.current.closeDocumentPath(a.relativePath)).toBe(false)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith({
			capabilityToken: "G1",
			content: "A edits",
			expectedRevision: a.revision,
			relativePath: a.relativePath,
			workspaceRoot: workspace.rootPath,
		})
		expect(result.current.openBuffers).toHaveLength(2)
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath),
		).toMatchObject({ hasConflict: true, isDirty: true })
		await act(async () => {
			expect(await result.current.closeDocumentPath(a.relativePath)).toBe(true)
		})
		expect(result.current.openBuffers).toHaveLength(1)
		expect(
			result.current.workspace?.documents.find((entry) => entry.relativePath === a.relativePath)
				?.revision,
		).toBe("saved")
		expect(result.current.content).toBe(b.content)
	})

	it("rejects capture and move into an inactive dirty target before any writer starts", async () => {
		const { result } = await parkDirtyA()
		await act(async () => {
			await result.current.captureTodo("capture", a.relativePath)
			await result.current.moveActiveDocument(a.relativePath)
		})
		expect(captureOrgTodoFlow).not.toHaveBeenCalled()
		expect(moveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath)?.isDirty,
		).toBe(true)
	})

	it("serializes inactive save and blocks compatibility edits during that mutation", async () => {
		const { result } = await parkDirtyA()
		const write = deferred<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => write.promise)
		let closing!: Promise<boolean>
		act(() => {
			closing = result.current.closeDocumentPath(a.relativePath)
		})
		act(() => result.current.updateContent("new B input"))
		await act(async () => {
			expect(await result.current.openDocumentPath(a.relativePath)).toBe(false)
			await result.current.captureTodo("capture", a.relativePath)
			await result.current.openDefaultWorkspace()
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(captureOrgTodoFlow).not.toHaveBeenCalled()
		expect(openDefaultOrgWorkspaceFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			write.resolve(E.right({ relativePath: a.relativePath, revision: "saved" }))
			expect(await closing).toBe(true)
		})
		expect(result.current.content).toBe(b.content)
		expect(result.current.isDirty).toBe(false)
	})

	it("successful active save advances the parked baseline and never resurrects old dirtiness", async () => {
		const { result } = await setup()
		act(() => result.current.updateContent("saved A"))
		await act(async () => {
			await result.current.saveDocument()
		})
		vi.mocked(openOrgDocumentFlow).mockImplementation(
			(input) => async () =>
				E.right(
					input.relativePath === a.relativePath
						? { ...a, content: "saved A", revision: "saved" }
						: b,
				),
		)
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath),
		).toMatchObject({ baseRevision: "saved", isDirty: false })
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		expect(result.current.content).toBe("saved A")
		expect(result.current.isDirty).toBe(false)
		expect(result.current.activeDocument?.revision).toBe("saved")
	})

	it("blocks compatibility edits while a slow navigation is loading", async () => {
		const { result } = await setup()
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.openDocumentPath(b.relativePath)
		})
		act(() => {
			result.current.updateContent("temporary")
			result.current.updateContent(a.content)
		})
		await act(async () => {
			read.resolve(E.right(b))
			expect(await opening).toBe(true)
		})
		expect(result.current.activeDocument).toEqual(b)
		expect(result.current.openBuffers).toHaveLength(2)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("preserves a newer active edit while an in-flight save advances its baseline and rejects waiting navigation", async () => {
		const { result } = await setup()
		act(() => result.current.updateContent("persist this"))
		const write = deferred<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => write.promise)
		let saving!: Promise<void>
		let opening!: Promise<boolean>
		act(() => {
			saving = result.current.saveDocument()
			opening = result.current.openDocumentPath(b.relativePath)
		})
		// Returning to the OLD baseline is still dirty relative to the newly saved baseline.
		act(() => result.current.updateContent(a.content))
		await act(async () => {
			write.resolve(E.right({ relativePath: a.relativePath, revision: "saved" }))
			await saving
			expect(await opening).toBe(false)
		})
		expect(result.current.content).toBe(a.content)
		expect(result.current.activeDocument).toMatchObject({
			content: "persist this",
			revision: "saved",
		})
		expect(result.current.isDirty).toBe(true)
		await act(async () => {
			expect(await result.current.openDocumentPath(b.relativePath)).toBe(true)
		})
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath),
		).toMatchObject({ baseRevision: "saved", isDirty: true })
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})

	it("rereads clean parked buffers but retires IDs across close/reopen in the same grant", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ ...a, content: "fresh disk", revision: "fresh" }),
		)
		await act(async () => {
			expect(await result.current.openDocumentPath(a.relativePath)).toBe(true)
		})
		expect(result.current.content).toBe("fresh disk")
		expect(result.current.activeBufferId).toBe(id)
		await act(async () => {
			expect(await result.current.closeActiveDocument()).toBe(true)
		})
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		expect(result.current.activeBufferId).not.toBe(id)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("blocks compatibility edits during workspace approval loading", async () => {
		const { result } = await parkDirtyA()
		const session = result.current.workspaceSessionId
		const grant = deferred<Awaited<ReturnType<ReturnType<typeof openDefaultOrgWorkspaceFlow>>>>()
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(() => grant.promise)
		let opening!: Promise<void>
		act(() => {
			opening = result.current.openDefaultWorkspace()
		})
		act(() => result.current.updateContent("new B"))
		await act(async () => {
			grant.resolve(E.right(workspace))
			await opening
		})
		expect(result.current.workspaceSessionId).toBe(session)
		expect(result.current.content).toBe("")
		expect(result.current.openBuffers).toHaveLength(0)
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		expect(result.current.content).toBe(a.content)
	})

	it("retains the logical buffer ID when renaming the active document", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId
		vi.mocked(moveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "renamed.org", revision: a.revision }),
		)
		await act(async () => {
			await result.current.moveActiveDocument("renamed.org")
		})
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.openBuffers[0]?.relativePath).toBe("renamed.org")
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ ...a, relativePath: "renamed.org" }),
		)
		await act(async () => {
			expect(await result.current.switchBuffer(id!)).toBe(true)
		})
		expect(openOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({ relativePath: "renamed.org" }),
		)
		expect(result.current.activeBufferId).toBe(id)
	})
})

describe("Org save-all snapshot transaction", () => {
	const documents = ["a.org", "b.org", "c.org"].map((relativePath) => ({
		relativePath,
		revision: `${relativePath}-1`,
		content: `base ${relativePath}`,
	}))
	type SaveResult = Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
		window.localStorage.clear()
		vi.mocked(watchOrgWorkspace).mockReturnValue(async () => E.right("watch-G1"))
		vi.mocked(unwatchOrgWorkspace).mockReturnValue(async () => E.right(undefined))
		vi.mocked(releaseOrgWorkspace).mockReturnValue(async () => E.right(undefined))
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, documents }),
		)
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, documents }),
		)
		vi.mocked(openOrgDocumentFlow).mockImplementation(
			(input) => async () =>
				E.right(documents.find((document) => document.relativePath === input.relativePath)!),
		)
		vi.mocked(saveOrgDocumentFlow).mockImplementation(
			(input) => async () =>
				E.right({ relativePath: input.relativePath, revision: `${input.relativePath}-2` }),
		)
	})
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})
	const setup = async (count = 3) => {
		const hook = renderHook(() => useOrgWorkspace())
		await act(async () => {
			await hook.result.current.openDefaultWorkspace()
		})
		for (const document of documents.slice(0, count)) {
			await act(async () => {
				await hook.result.current.openDocument(document)
			})
			act(() => hook.result.current.updateContent(`edited ${document.relativePath}`))
		}
		return hook
	}
	it("saves each dirty buffer with its own exact G1 body and revision without navigating or closing", async () => {
		const { result } = await setup()
		const ids = result.current.openBuffers.map((buffer) => buffer.bufferId)
		let outcome!: Awaited<ReturnType<typeof result.current.saveAllDocuments>>
		await act(async () => {
			outcome = await result.current.saveAllDocuments()
		})
		expect(outcome).toEqual({
			kind: "success",
			savedPaths: ["a.org", "b.org", "c.org"],
			remainingDirtyPaths: [],
		})
		expect(result.current.activeDocument?.relativePath).toBe("c.org")
		expect(result.current.openBuffers.map((buffer) => buffer.bufferId)).toEqual(ids)
		for (const document of documents)
			expect(saveOrgDocumentFlow).toHaveBeenCalledWith({
				content: `edited ${document.relativePath}`,
				expectedRevision: document.revision,
				relativePath: document.relativePath,
				capabilityToken: "G1",
				workspaceRoot: "/notes",
			})
		expect(
			result.current.openBuffers.every(
				(buffer) => !buffer.isDirty && buffer.baseRevision.endsWith("-2"),
			),
		).toBe(true)
		await act(async () => {
			await result.current.openDocumentPath("a.org")
		})
		expect(result.current.content).toBe("base a.org")
	})
	it.each([
		"revision",
		"scope",
		"throw",
		"invalid",
	])("stops at the second %s failure, advances only confirmed baselines, and does not auto-retry", async (mode) => {
		const { result } = await setup()
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockImplementation((input) => async () => {
			if (input.relativePath !== "b.org")
				return E.right({ relativePath: input.relativePath, revision: "confirmed" })
			return pending.promise
		})
		let saving!: ReturnType<typeof result.current.saveAllDocuments>
		act(() => {
			saving = result.current.saveAllDocuments()
		})
		await act(async () => {
			await Promise.resolve()
		})
		act(() => result.current.updateContent("raw unwritten c body\n"))
		let outcome!: Awaited<typeof saving>
		await act(async () => {
			if (mode === "throw") pending.reject(new Error("transport failed"))
			else if (mode === "invalid")
				pending.resolve(E.right({ relativePath: "wrong.org", revision: "wrong" }))
			else pending.resolve(E.left({ type: "IO_ERROR", message: `${mode} rejected` } as never))
			outcome = await saving
		})
		expect(outcome.kind).toBe("partial")
		expect(outcome.savedPaths).toEqual(["a.org"])
		expect(outcome.remainingDirtyPaths).toEqual(["b.org", "c.org"])
		expect(outcome.message).toMatch(/reread/i)
		if (mode === "throw" || mode === "invalid")
			expect(outcome.message).toMatch(/files may have changed/)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
		expect(
			result.current.openBuffers.map((buffer) => [
				buffer.relativePath,
				buffer.baseRevision,
				buffer.isDirty,
			]),
		).toEqual([
			["a.org", "confirmed", false],
			["b.org", "b.org-1", true],
			["c.org", "c.org-1", true],
		])
		expect(result.current.content).toBe("raw unwritten c body\n")
		expect(result.current.isSaving).toBe(false)
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "c.org")?.hasConflict,
		).toBe(false)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		act(() => result.current.updateContent("new unwritten c body"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
		expect(result.current.content).toBe("new unwritten c body")
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(3)
		expect(result.current.activeDocument?.content).toBe("new unwritten c body")
		// Polls must see the confirmed baseline so this tests pause, not a fresh conflict.
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right(result.current.activeDocument!),
		)
		act(() => result.current.updateContent("resumed c body"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(4)
	})
	it.each([
		"left",
		"throw",
		"invalid",
	])("latches a deferred active batch %s failure across newer typing until a confirmed manual retry", async (mode) => {
		const { result } = await setup(3)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockImplementation((input) =>
			input.relativePath === "c.org"
				? () => pending.promise
				: async () => E.right({ relativePath: input.relativePath, revision: "confirmed" }),
		)
		let saving!: ReturnType<typeof result.current.saveAllDocuments>
		act(() => {
			saving = result.current.saveAllDocuments()
		})
		await act(async () => {
			await Promise.resolve()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(3)
		expect(result.current.isEditorReadOnly).toBe(false)
		act(() => result.current.updateContent("raw newer c body\n"))
		await act(async () => {
			if (mode === "throw") pending.reject(new Error("transport"))
			else if (mode === "invalid")
				pending.resolve(E.right({ relativePath: "wrong.org", revision: "bad" }))
			else pending.resolve(E.left({ type: "IO_ERROR", message: "uncertain" } as never))
			expect(await saving).toMatchObject({
				kind: "partial",
				savedPaths: ["a.org", "b.org"],
				remainingDirtyPaths: ["c.org"],
			})
		})
		expect(result.current.activeDocument).toEqual(documents[2])
		expect(result.current.content).toBe("raw newer c body\n")
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		act(() => result.current.updateContent("raw newer c body\nmore"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(3)
		vi.mocked(saveOrgDocumentFlow).mockImplementation(
			(input) => async () => E.right({ relativePath: input.relativePath, revision: "retried" }),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({
				content: "raw newer c body\nmore",
				expectedRevision: "c.org-1",
			}),
		)
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right(result.current.activeDocument!),
		)
		act(() => result.current.updateContent("resumed after confirmation"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(5)
	})
	it.each([
		"left",
		"throw",
		"invalid",
	])("latches an ordinary deferred %s save failure until successful explicit save-all", async (mode) => {
		const { result } = await setup(1)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let saving!: Promise<void>
		act(() => {
			saving = result.current.saveDocument()
		})
		expect(result.current.isEditorReadOnly).toBe(false)
		act(() => result.current.updateContent("raw new a body\n"))
		await act(async () => {
			if (mode === "throw") pending.reject(new Error("transport"))
			else if (mode === "invalid")
				pending.resolve(E.right({ relativePath: "wrong.org", revision: "bad" }))
			else pending.resolve(E.left({ type: "IO_ERROR", message: "uncertain" } as never))
			await saving
		})
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		act(() => result.current.updateContent("raw new a body\nmore"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(result.current.activeDocument).toEqual(documents[0])
		expect(result.current.content).toBe("raw new a body\nmore")
		await act(async () => {
			expect(await result.current.saveAllDocuments()).toMatchObject({
				kind: "success",
				savedPaths: ["a.org"],
			})
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right(result.current.activeDocument!),
		)
		act(() => result.current.updateContent("resumed a body"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(3)
	})
	it("retains an unresolved externally removed working copy even after undo to baseline", async () => {
		const { result } = await setup(1)
		const oldId = result.current.activeBufferId!
		// Establish pause/conflict on this copy, then restore its clean body.
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "uncertain" } as never),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		act(() => result.current.updateContent("base a.org"))
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({ ...workspace, documents: documents.slice(1) }),
		)
		await act(async () => {
			await result.current.refreshWorkspace()
		})
		expect(result.current.activeDocument).toEqual(documents[0])
		expect(result.current.content).toBe("base a.org")
		expect(result.current.activeBufferId).toBe(oldId)
		expect(result.current.openBuffers[0].hasConflict).toBe(true)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})
	it("keeps pause while parking/reactivating, then retires it after a confirmed inactive close", async () => {
		const { result } = await setup(1)
		const oldId = result.current.activeBufferId!
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "uncertain" } as never),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		await act(async () => {
			await result.current.openDocumentPath("b.org")
		})
		await act(async () => {
			await result.current.switchBuffer(oldId)
		})
		act(() => result.current.updateContent("paused after switching"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			await result.current.openDocumentPath("b.org")
		})
		await act(async () => {
			expect(await result.current.closeDocumentPath("a.org")).toBe(true)
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({ content: "paused after switching" }),
		)
		await act(async () => {
			await result.current.openDocument(documents[0])
		})
		expect(result.current.activeBufferId).not.toBe(oldId)
		act(() => result.current.updateContent("new copy after inactive close"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(3)
	})
	it("moves the pause with a renamed logical buffer until a confirmed save", async () => {
		const { result } = await setup(1)
		const id = result.current.activeBufferId!
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "uncertain" } as never),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		act(() => result.current.updateContent("base a.org"))
		vi.mocked(moveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "renamed.org", revision: "a.org-1" }),
		)
		await act(async () => {
			await result.current.moveActiveDocument("renamed.org")
		})
		expect(result.current.activeBufferId).toBe(id)
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right(result.current.activeDocument!),
		)
		act(() => result.current.updateContent("new renamed body"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({ relativePath: "renamed.org", content: "new renamed body" }),
		)
		act(() => result.current.updateContent("resumed renamed body"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(3)
	})
	it.each(["delete", "root"])("retires pause after %s lifecycle cleanup", async (mode) => {
		const { result } = await setup(1)
		const oldId = result.current.activeBufferId!
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "uncertain" } as never),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		act(() => result.current.updateContent("base a.org"))
		if (mode === "delete") {
			vi.mocked(deleteOrgDocumentFlow).mockReturnValueOnce(async () => E.right(undefined))
			await act(async () => {
				await result.current.deleteActiveDocument()
			})
		} else {
			vi.spyOn(window, "confirm").mockReturnValueOnce(true)
			vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () =>
				E.right({ ...workspace, documents, capabilityToken: "G2" }),
			)
			await act(async () => {
				await result.current.openDefaultWorkspace()
			})
		}
		await act(async () => {
			await result.current.openDocument(documents[0])
		})
		expect(result.current.activeBufferId).not.toBe(oldId)
		expect(result.current.openBuffers[0].hasConflict).toBe(false)
		act(() => result.current.updateContent("new copy after cleanup"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
	})
	it("does not transfer a closed working copy's pause to a newly reopened ID", async () => {
		const { result } = await setup(1)
		const oldId = result.current.activeBufferId!
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "uncertain" } as never),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		act(() => result.current.updateContent("base a.org"))
		await act(async () => {
			expect(await result.current.closeActiveDocument()).toBe(true)
		})
		await act(async () => {
			await result.current.openDocument(documents[0])
		})
		expect(result.current.activeBufferId).not.toBe(oldId)
		act(() => result.current.updateContent("new working copy"))
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		// The unresolved clean copy requires a confirmed save before close.
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(3)
	})
	it("owns native Busy throughout deferred writes, blocks all competing navigation/writers, and retains newer typing", async () => {
		let nativeState!: Parameters<typeof orgWindowClose.useOrgWindowClose>[0]
		vi.spyOn(orgWindowClose, "useOrgWindowClose").mockImplementation((state) => {
			nativeState = state
			return true
		})
		const { result } = await setup()
		const first = deferred<SaveResult>()
		const second = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow)
			.mockReturnValueOnce(() => first.promise)
			.mockReturnValueOnce(() => second.promise)
		let saving!: ReturnType<typeof result.current.saveAllDocuments>
		act(() => {
			saving = result.current.saveAllDocuments()
		})
		expect(nativeState.isBusy).toBe(true)
		expect(result.current.isSaving).toBe(true)
		await act(async () => {
			expect(await result.current.saveAllDocuments()).toMatchObject({ kind: "rejected" })
			expect(await result.current.openDocumentPath("a.org")).toBe(false)
			expect(await result.current.switchBuffer(result.current.activeBufferId!)).toBe(false)
			for (const buffer of result.current.openBuffers) {
				expect(await result.current.switchBuffer(buffer.bufferId)).toBe(false)
			}
			expect(await result.current.closeDocumentPath("a.org")).toBe(false)
			expect(await result.current.closeActiveDocument()).toBe(false)
			await result.current.saveDocument()
			await result.current.createDocument("new.org")
			await result.current.captureTodo("todo")
			await result.current.openDefaultWorkspace()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(openDefaultOrgWorkspaceFlow).toHaveBeenCalledTimes(1)
		expect(captureOrgTodoFlow).not.toHaveBeenCalled()
		act(() => result.current.updateContent("new c typing"))
		await act(async () => {
			first.resolve(E.right({ relativePath: "a.org", revision: "a-2" }))
			await first.promise
		})
		expect(nativeState.isBusy).toBe(true)
		expect(result.current.isSaving).toBe(true)
		let outcome!: Awaited<typeof saving>
		await act(async () => {
			second.resolve(E.right({ relativePath: "b.org", revision: "b-2" }))
			outcome = await saving
		})
		expect(outcome).toMatchObject({
			kind: "partial",
			savedPaths: ["a.org", "b.org", "c.org"],
			remainingDirtyPaths: ["c.org"],
		})
		expect(result.current.activeDocument).toMatchObject({
			content: "edited c.org",
			revision: "c.org-2",
		})
		expect(result.current.content).toBe("new c typing")
		expect(nativeState.isBusy).toBe(false)
		expect(result.current.isSaving).toBe(false)
	})
	it("rejects an existing active write without taking its owner or releasing its Busy", async () => {
		const { result } = await setup(1)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let saving!: Promise<void>
		act(() => {
			saving = result.current.saveDocument()
		})
		await act(async () => {
			expect(await result.current.saveAllDocuments()).toMatchObject({
				kind: "rejected",
				savedPaths: [],
				remainingDirtyPaths: ["a.org"],
			})
		})
		expect(result.current.isSaving).toBe(true)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "a-2" }))
			await saving
		})
		expect(result.current.isSaving).toBe(false)
	})
	it("returns rejected on the first failure and leaves all captured bodies dirty without retries", async () => {
		const { result } = await setup(1)
		vi.mocked(saveOrgDocumentFlow).mockImplementation(() => {
			throw new Error("synchronous")
		})
		await act(async () => {
			expect(await result.current.saveAllDocuments()).toMatchObject({
				kind: "rejected",
				savedPaths: [],
				remainingDirtyPaths: ["a.org"],
			})
		})
		expect(result.current.content).toBe("edited a.org")
		expect(result.current.isSaving).toBe(false)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(6000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})
	it("is a clean no-op and rejects stale activation/path and stale same-root G1 callbacks", async () => {
		const { result } = await setup(1)
		const oldActivation = result.current.saveAllDocuments
		await act(async () => {
			await result.current.openDocumentPath("b.org")
		})
		await act(async () => {
			expect(await oldActivation()).toMatchObject({ kind: "rejected", savedPaths: [] })
		})
		act(() => result.current.updateContent("base b.org"))
		await act(async () => {
			await result.current.saveAllDocuments()
		})
		const oldGrant = result.current.saveAllDocuments
		vi.spyOn(window, "confirm").mockReturnValue(true)
		const grant = deferred<Awaited<ReturnType<ReturnType<typeof openDefaultOrgWorkspaceFlow>>>>()
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(() => grant.promise)
		let opening!: Promise<void>
		act(() => {
			opening = result.current.openDefaultWorkspace()
		})
		await act(async () => {
			expect(await oldGrant()).toMatchObject({ kind: "rejected", savedPaths: [] })
			grant.resolve(E.right({ ...workspace, documents, capabilityToken: "G2" }))
			await opening
		})
		vi.mocked(saveOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(await oldGrant()).toMatchObject({ kind: "rejected", savedPaths: [] })
			expect(await result.current.saveAllDocuments()).toEqual({
				kind: "success",
				savedPaths: [],
				remainingDirtyPaths: [],
			})
		})
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("does not acquire an owner or write for an already clean active buffer", async () => {
		const { result } = await setup(1)
		act(() => result.current.updateContent("base a.org"))
		await act(async () => {
			expect(await result.current.saveAllDocuments()).toEqual({
				kind: "success",
				savedPaths: [],
				remainingDirtyPaths: [],
			})
		})
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(result.current.isSaving).toBe(false)
		expect(result.current.activeDocument?.relativePath).toBe("a.org")
	})
	it("ignores a deferred completion after unmount and stops remaining writes", async () => {
		const hook = await setup()
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let saving!: ReturnType<typeof hook.result.current.saveAllDocuments>
		act(() => {
			saving = hook.result.current.saveAllDocuments()
		})
		hook.unmount()
		pending.resolve(E.right({ relativePath: "a.org", revision: "late" }))
		expect(await saving).toMatchObject({
			kind: "rejected",
			savedPaths: [],
			remainingDirtyPaths: ["a.org", "b.org", "c.org"],
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})
})
