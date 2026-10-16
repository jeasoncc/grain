import { parseOrgAgenda, type OrgAgendaEntry } from "@/pipes/org/org-agenda.pipe"
import * as registryFactory from "@/flows/org-editor-runtime/org-workspace-runtime-registry"
import * as parkedFactory from "@/flows/org-editor-runtime/org-parked-working-copy-reservoir"
import * as sessionFactory from "@/flows/org-editor-runtime/org-workspace-session-owner"
import type { OrgBufferIdentityScope } from "@/flows/org-editor-runtime/org-buffer-identity-registry"
import { history, isolateHistory, redoDepth, undoDepth } from "@codemirror/commands"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import type {
	OrgBufferRuntime,
	OrgBufferWindowHandle,
	OrgBufferRuntimeOptions,
} from "@/flows/org-editor-runtime"
import * as runtimeFactory from "@/flows/org-editor-runtime"
import { useBlocker } from "@tanstack/react-router"
import { useConfirm } from "@/views/ui/confirm"
import type { ConfirmOptions } from "@/views/ui/confirm"
import {
	act,
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react"
import { render, renderHook } from "@/test/application-providers"
import { createElement, StrictMode } from "react"
import { useOrgAgendaParameters } from "@/hooks/use-org-agenda-parameters"
import { OrgAgendaContainer } from "@/views/org-workspace/org-agenda.container.fn"
import { useSettings } from "@/hooks/use-settings"
import { useConfigurationState } from "@/state/configuration.state"
import * as E from "fp-ts/Either"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	createOrgDirectoryFlow,
	deleteOrgDocumentFlow,
	selectOrgWorkspaceFlow,
	captureOrgTodoFlow,
	moveOrgDocumentFlow,
	openDefaultOrgWorkspaceFlow,
	reopenDefaultOrgWorkspaceFlow,
	revealOrgWorkspacePathFlow,
	openOrgDocumentFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
} from "@/flows/org-workspace/org-workspace.flow"
import {
	prepareLegacyMigrationFlow,
	executeLegacyMigrationFlow,
	areLegacyMigrationPlansEquivalent,
	verifyLegacyMigrationRecoveryFlow,
	runLegacyMigrationRecoveryDrillFlow,
} from "@/flows/org-workspace/legacy-migration.flow"
import {
	clearOrgDerivedIndexFlow,
	rebuildOrgDerivedIndexFlow,
} from "@/flows/org-workspace/org-derived-index.flow"
import { captureOrgEntryFlow } from "@/flows/org-workspace/org-capture-entry.flow"
import { resolveOrgLinkTargetFlow } from "@/flows/org-workspace/org-link-target.flow"
import type * as linkFlows from "@/flows/org-workspace/org-link-target.flow"
import { loadOrgAgendaFlow } from "@/flows/org-workspace/org-agenda.flow"
import {
	archiveOrgSubtreeFlow,
	ORG_SUBTREE_REFILE_DUPLICATE_RECOVERY_MESSAGE,
	refileOrgSubtreeFlow,
} from "@/flows/org-workspace/org-subtree-refile.flow"
import { readOrgRefileTargetFlow } from "@/flows/org-workspace/org-refile-target.flow"
import { createOrgRefileTargetSnapshot } from "@/pipes/org/org-refile-target.pipe"
import type * as subtreeRef from "@/flows/org-workspace/org-subtree-refile.flow"
import { orgWorkspaceEventAdapter } from "@/io/event/org-workspace-event.adapter"
import {
	orgFileRepository,
	releaseOrgWorkspace,
	watchOrgWorkspace,
	unwatchOrgWorkspace,
} from "@/io/file/org-file.repository"
import type { WorkspaceInterface } from "@/types/workspace"
import type { OrgDocumentInterface, OrgDocumentWriteResultInterface, OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import type { OrgSubtreeTransferOutcome } from "./use-org-workspace"
import * as orgWindowClose from "./use-org-window-close"
import * as windowCloseAdapter from "@/io/event/org-window-close.adapter"
import * as workingCopyFlow from "@/flows/org-workspace/org-save-working-copy.flow"
import * as saveAllFlow from "@/flows/org-workspace/org-save-all.flow"
import {
	type OrgLiveBuffer,
	type OrgWorkspaceController,
	type OrgSaveAllOutcome,
	canContinueAfterOrgSave,
	hasDefaultWorkspacePreference,
	isDirtyCaptureTarget,
	ORG_WORKSPACE_PREFERENCE_KEY,
	setDefaultWorkspacePreference,
	updateWorkspaceDocument,
	useOrgWorkspace,
} from "./use-org-workspace"
import { planLegacyMigration } from "@/pipes/migration/migration.plan.fn"
import * as freshDocument from "@/flows/org-workspace/org-fresh-document-create.flow"

const savedAutosavePreferences = {
	autoSave: useSettings.getState().autoSave,
	autoSaveInterval: useSettings.getState().autoSaveInterval,
}
// These file-effect fixtures explicitly opt into a one-second quiet interval.
beforeEach(() => useSettings.setState({ autoSave: true, autoSaveInterval: 1 }))
afterEach(() => {
	cleanup()
	useSettings.setState(savedAutosavePreferences)
})

// Observe the real narrow lifecycle port, never React internals or Map storage.
const observeParkedReservoir = () => {
	const create = parkedFactory.createOrgParkedWorkingCopyReservoir
	let reservoir!: ReturnType<typeof create>
	let scope!: OrgBufferIdentityScope
	vi.spyOn(parkedFactory, "createOrgParkedWorkingCopyReservoir").mockImplementation((...args) => {
		reservoir = create(...args)
		const open = reservoir.openScope
		reservoir.openScope = (candidate) => {
			scope = candidate
			return open(candidate)
		}
		return reservoir
	})
	return {
		get reservoir() {
			return reservoir
		},
		get scope() {
			return scope
		},
	}
}

vi.mock("@/views/ui/confirm", async (original) => {
	const real = await original<typeof import("@/views/ui/confirm")>()
	const confirm = vi.fn<(options: ConfirmOptions) => Promise<boolean>>()
	return { ...real, useConfirm: () => confirm }
})
vi.mock("@tanstack/react-router", () => ({ useBlocker: vi.fn(), useNavigate: () => async () => undefined }))
vi.mock("@/flows/org-workspace/org-workspace.flow", () => ({
	createOrgDirectoryFlow: vi.fn(),
	deleteOrgDocumentFlow: vi.fn(),
	selectOrgWorkspaceFlow: vi.fn(),
	captureOrgTodoFlow: vi.fn(),
	moveOrgDocumentFlow: vi.fn(),
	openDefaultOrgWorkspaceFlow: vi.fn(),
	reopenDefaultOrgWorkspaceFlow: vi.fn(),
	revealOrgWorkspacePathFlow: vi.fn(),
	openOrgDocumentFlow: vi.fn(),
	saveOrgDocumentFlow: vi.fn(),
	scanOrgWorkspaceFlow: vi.fn(),
}))
vi.mock("@/flows/org-workspace/legacy-migration.flow", () => ({
	prepareLegacyMigrationFlow: vi.fn(),
	executeLegacyMigrationFlow: vi.fn(),
	areLegacyMigrationPlansEquivalent: vi.fn(),
	verifyLegacyMigrationRecoveryFlow: vi.fn(),
	runLegacyMigrationRecoveryDrillFlow: vi.fn(),
}))
vi.mock("@/flows/org-workspace/org-derived-index.flow", () => ({
	clearOrgDerivedIndexFlow: vi.fn(),
	rebuildOrgDerivedIndexFlow: vi.fn(),
}))
vi.mock("@/flows/org-workspace/org-capture-entry.flow", () => ({ captureOrgEntryFlow: vi.fn(), readOrgCaptureTargetFlow: vi.fn() }))
vi.mock("@/flows/org-workspace/org-link-target.flow", () => ({ resolveOrgLinkTargetFlow: vi.fn() }))
vi.mock("@/flows/org-workspace/org-agenda.flow", () => ({ loadOrgAgendaFlow: vi.fn() }))
vi.mock("@/flows/org-workspace/org-refile-target.flow", () => ({ readOrgRefileTargetFlow: vi.fn() }))
vi.mock("@/flows/org-workspace/org-subtree-refile.flow", async (importOriginal) => ({
	...(await importOriginal<typeof subtreeRef>()),
	archiveOrgSubtreeFlow: vi.fn(),
	refileOrgSubtreeFlow: vi.fn(),
}))
vi.mock("@/io/event/org-workspace-event.adapter", () => ({
	orgWorkspaceEventAdapter: { listen: vi.fn(async () => () => undefined) },
}))
vi.mock("@/io/file/org-file.repository", () => ({
	releaseOrgWorkspace: vi.fn(() => async () => E.right(undefined)),
	orgFileRepository: { readDocument: vi.fn() },
	unwatchOrgWorkspace: vi.fn(() => async () => E.right(undefined)),
	watchOrgWorkspace: vi.fn(() => async () => E.right("watch-G1")),
}))
const { resolveOrgLinkTargetFlow: productionResolveLink } =
	await vi.importActual<typeof linkFlows>("@/flows/org-workspace/org-link-target.flow")

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

const attachRuntime = (
	runtime: OrgBufferRuntime,
	owner: ReturnType<typeof useOrgWorkspace>,
	windowId = "workspace-test",
	register = true,
) => {
	const release = register ? owner.registerBufferWindow(windowId, runtime.key.bufferId) : () => {}
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
			release()
			handle.detach()
			view.destroy()
		},
	}
}

describe("Org capture entry and transient drafts", () => {
	let nativeState: Parameters<typeof orgWindowClose.useOrgWindowClose>[0]
	let snapshotSources!: () => readonly OrgLiveBuffer[]
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
		const createSession = sessionFactory.createOrgWorkspaceSessionOwner
		vi.spyOn(sessionFactory, "createOrgWorkspaceSessionOwner").mockImplementation((ports) => {
			const session = createSession(ports)
			snapshotSources = () => session.snapshotLiveBuffers(session.scope)
			return session
		})
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
		vi.mocked(useConfirm()).mockResolvedValue(false)
	})
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
		vi.useRealTimers()
	})
	let agendaOwner: () => ReturnType<typeof useOrgWorkspace>
	const setup = async () => {
		const hook = renderHook(() => useOrgWorkspace())
		agendaOwner = () => hook.result.current
		await act(async () => {
			await hook.result.current.openDefaultWorkspace()
		})
		await act(async () => {
			await hook.result.current.openDocumentPath("inbox.org")
		})
		return hook
	}
	it.each(["create", "retire-after-write"] as const)("captured child diary uses the existing approved producer and retains Main: %s", async (mode) => {
		const hook = await setup()
		const child = hook.result.current.activeBufferRuntime!
		let mounted = attachRuntime(child, hook.result.current, "diary-child")
		await act(async () => { await hook.result.current.openDocumentPath("z.org") })
		const main = hook.result.current.activeBufferRuntime!
		let current = true
		const writes: { relativePath: string; content: string; expectedRevision?: string }[] = []
		const publish = freshDocument.createOrgFreshDocumentFlow
		const publisher = vi.spyOn(freshDocument, "createOrgFreshDocumentFlow").mockImplementation(input => publish(input, {
			...orgFileRepository,
			createDirectory: () => async () => E.right(undefined),
			writeDocument: request => async () => {
				writes.push(request)
				if (mode === "retire-after-write") current = false
				return E.right({ relativePath: request.relativePath, revision: "diary-r1" })
			},
		}))
		const navigation: string[] = []
		const adapter = hook.result.current.captureBufferNavigation(child.key.bufferId, "diary-child", () => current, async (id) => {
			const created = snapshotSources().find(buffer => buffer.bufferId === id)
			if (!created || created.runtime.source !== writes[0].content) return false
			mounted.dispose()
			mounted = attachRuntime(created.runtime, hook.result.current, "diary-child")
			navigation.push(id)
			return true
		})!
		try {
			await act(async () => { expect((await adapter.createDiary()).kind).toBe(mode === "create" ? "created" : "created-unopened") })
			expect(writes).toHaveLength(1)
			expect(writes[0].expectedRevision).toBe("<missing>")
			expect(navigation).toHaveLength(mode === "create" ? 1 : 0)
			if (mode === "create") {
				expect(mounted.view.state.sliceDoc()).toBe(writes[0].content)
				expect(hook.result.current.captureBufferWindowPermit("diary-child", navigation[0])()).toBe(true)
				expect(hook.result.current.captureBufferWindowPermit("diary-child", child.key.bufferId)()).toBe(false)
			}
			expect(hook.result.current.activeBufferRuntime).toBe(main)
			expect(main.source).toBe(captured.content)
			expect(child.source).toBe(captured.content)
			expect(hook.result.current.workspace?.documents.some(document => document.relativePath === writes[0].relativePath)).toBe(true)
		} finally { publisher.mockRestore(); mounted.dispose(); hook.unmount() }
	})
	it.each((["live", "disk", "stale-source"] as const).flatMap(mode =>
		(["link", "document"] as const).map(operation => ({ mode, operation }))))("captured child $operation follows approved $mode provenance without activating Main", async ({ mode, operation }) => {
		const destination = { relativePath: "target.org", revision: "target-r1", content: "* Destination\r\n:PROPERTIES:\r\n:ID: child-link\r\n:END:\r\nraw\0😀\r\n" }
		const liveSuffix = "* Unsaved target\r\nworking\0😀\r\n"
		const expectedContent = mode === "live" ? destination.content + liveSuffix : destination.content
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right({ ...workspace, documents: [...workspace.documents, destination] }))
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () => E.right({ ...workspace, documents: [...workspace.documents, destination] }))
		vi.mocked(openOrgDocumentFlow).mockImplementation((input) => async () => E.right(input.relativePath === "target.org" ? destination : { ...captured, relativePath: input.relativePath }))
		vi.mocked(orgFileRepository.readDocument).mockImplementation(input => async () => E.right(input.relativePath === "target.org" ? destination : { ...captured, relativePath: input.relativePath }))
		vi.mocked(resolveOrgLinkTargetFlow).mockImplementation((grant, target, overlays, repository, _cache, metadata, signal) =>
			productionResolveLink(grant, target, overlays, repository, new Map(), metadata, signal))
		const hook = await setup()
		const child = hook.result.current.activeBufferRuntime!
		let mounted = attachRuntime(child, hook.result.current, "navigation-child")
		if (mode === "live") {
			await act(async () => { expect(await hook.result.current.openDocumentPath("target.org")).toBe(true) })
			const targetWindow = attachRuntime(hook.result.current.activeBufferRuntime!, hook.result.current, "target-fixture")
			act(() => targetWindow.view.dispatch({ changes: { from: targetWindow.view.state.doc.length, insert: liveSuffix } }))
			targetWindow.dispose()
		}
		await act(async () => { await hook.result.current.openDocumentPath("z.org") })
		const main = hook.result.current.activeBufferRuntime!
		const loadsBeforeNavigation = vi.mocked(openOrgDocumentFlow).mock.calls.filter(([input]) => input.relativePath === "target.org").length
		const navigated: { bufferId: string; line: number }[] = []
		const adapter = hook.result.current.captureBufferNavigation(child.key.bufferId, "navigation-child", () => true,
			async (bufferId, line) => {
				const target = snapshotSources().find(buffer => buffer.bufferId === bufferId)
				if (!target || target.document.relativePath !== "target.org" || target.runtime.source !== expectedContent) return false
				mounted.dispose()
				mounted = attachRuntime(target.runtime, hook.result.current, "navigation-child")
				navigated.push({ bufferId, line })
				return true
			})!
		try {
			if (mode === "stale-source") act(() => { mounted.view.dispatch({ changes: { from: 0, insert: "x" } }); mounted.handle.undo() })
			await act(async () => {
				const opened = operation === "link"
					? await adapter.openOrgLink({ kind: "id", relativePath: null, value: "child-link" })
					: await adapter.openDocumentAt("target.org", 1, destination.revision)
				expect(opened).toBe(mode !== "stale-source")
			})
			expect(hook.result.current.activeBufferRuntime).toBe(main)
			expect(main.source).toBe(captured.content)
			expect(child.source).toBe(captured.content)
			expect(navigated).toHaveLength(mode === "stale-source" ? 0 : 1)
			expect(vi.mocked(openOrgDocumentFlow).mock.calls.filter(([input]) => input.relativePath === "target.org"))
				.toHaveLength(loadsBeforeNavigation + (mode === "disk" ? 1 : 0))
			if (mode === "live")
				expect(vi.mocked(orgFileRepository.readDocument).mock.calls.some(([input]) => input.relativePath === "target.org")).toBe(false)
			if (navigated[0]) {
				expect(navigated[0].line).toBe(1)
				expect(mounted.view.state.sliceDoc()).toBe(expectedContent)
				expect(hook.result.current.captureBufferWindowPermit("navigation-child", navigated[0].bufferId)()).toBe(true)
				expect(hook.result.current.captureBufferWindowPermit("navigation-child", child.key.bufferId)()).toBe(false)
			}
		} finally { mounted.dispose(); hook.unmount() }
	})
	it.each(["move", "window-aba", "source-aba", "partial"] as const)("captured child transfer owns its logical buffer while Main remains another buffer: %s", async (mode) => {
		const original = "* Child 😀\r\nbody\0\r\n* Keep\r\n"
		vi.mocked(openOrgDocumentFlow).mockImplementation((input) => async () => E.right({
			relativePath: input.relativePath, revision: input.relativePath === "inbox.org" ? "child-r1" : "main-r1",
			content: input.relativePath === "inbox.org" ? original : "* Main\r\n",
		}))
		const hook = await setup()
		const child = hook.result.current.activeBufferRuntime!
		const mounted = attachRuntime(child, hook.result.current, "captured-child")
		const adapter = hook.result.current.captureBufferTransfer(child.key.bufferId, "captured-child", () => true)!
		expect(adapter).not.toBeNull()
		await act(async () => { await hook.result.current.openDocumentPath("z.org") })
		const main = hook.result.current.activeBufferRuntime!
		let target = { relativePath: "target.org", revision: "target-r1", content: "* Destination\r\n" }
		vi.mocked(readOrgRefileTargetFlow).mockReturnValueOnce(async () =>
			E.right(createOrgRefileTargetSnapshot(target.relativePath, target.revision, target.content)),
		)
		const lookup = await adapter.readRefileTarget("target.org")
		if (lookup.kind !== "ready") throw new Error(lookup.message)
		const writes: string[] = []
		const real = await vi.importActual<typeof subtreeRef>("@/flows/org-workspace/org-subtree-refile.flow")
		vi.mocked(refileOrgSubtreeFlow).mockImplementation((input) => real.refileOrgSubtreeFlow(input, {
			...orgFileRepository,
			scanWorkspace: () => async () => E.right({ directories: [], documents: [target] }),
			readDocument: () => async () => E.right(target),
			writeDocument: (input) => async () => {
				writes.push(input.relativePath)
				if (input.relativePath === "target.org") {
					target = { ...target, content: input.content, revision: "target-r2" }
					return E.right(target)
				}
				if (mode === "partial") return E.left({ type: "ORG_FILE_ERROR", operation: "write", command: "write_org_document", message: "source CAS rejected", cause: null })
				return E.right({ relativePath: input.relativePath, revision: "child-r2" })
			},
		}))
		let replacementRelease: (() => void) | undefined
		try {
			if (mode === "window-aba") {
				replacementRelease = hook.result.current.registerBufferWindow("captured-child", child.key.bufferId)
			} else if (mode === "source-aba") {
				act(() => {
					mounted.view.dispatch({ changes: { from: 0, insert: "x" } })
					expect(mounted.handle.undo()).toBe(true)
				})
				expect(child.source).toBe(original)
			}
			await act(async () => {
				const outcome = await adapter.refileSubtree(2, "target.org", { snapshot: lookup.snapshot })
				expect(outcome.kind).toBe(mode === "move" ? "success" : mode === "partial" ? "partial" : "rejected")
			})
			expect(hook.result.current.activeBufferRuntime).toBe(main)
			expect(main.source).toBe("* Main\r\n")
			expect(child.source).toBe(mode === "move" ? "* Keep\r\n" : original)
			expect(writes).toEqual(mode === "move" || mode === "partial" ? ["target.org", "inbox.org"] : [])
			if (mode === "partial") {
				expect(target.content).toContain("body\0\r\n")
				expect(hook.result.current.openBuffers.find(buffer => buffer.bufferId === child.key.bufferId)?.hasConflict).toBe(true)
			}
		} finally { replacementRelease?.(); mounted.dispose(); hook.unmount() }
	})
	it.each(["cancel", "accept", "edit", "aba", "retire"] as const)(
		"dirty deletion preserves the live source until an unstale explicit decision: %s",
		async (decision) => {
			const hook = await setup()
			act(() => hook.result.current.updateContent("unsaved source"))
			const runtime = hook.result.current.activeBufferRuntime!
			const pending = Promise.withResolvers<boolean>()
			vi.mocked(useConfirm()).mockReturnValueOnce(pending.promise)
			vi.mocked(deleteOrgDocumentFlow).mockImplementationOnce((input) => async () => E.right({
				sourceRelativePath: input.relativePath,
				relativePath: `.grain-originals/deleted/${input.relativePath}`,
				kind: "delete",
				object: "original",
			}))
			let deleting!: Promise<boolean>
			act(() => { deleting = hook.result.current.deleteDocument(hook.result.current.activeDocument!) })
			expect(deleteOrgDocumentFlow).not.toHaveBeenCalled()
			if (decision === "edit" || decision === "aba") {
				act(() => hook.result.current.updateContent("newer source"))
				if (decision === "aba") act(() => hook.result.current.updateContent("unsaved source"))
			}
			if (decision === "retire") hook.unmount()
			await act(async () => {
				pending.resolve(decision !== "cancel")
				await deleting
			})
			if (decision === "accept") {
				expect(deleteOrgDocumentFlow).toHaveBeenCalledTimes(1)
				expect(hook.result.current.activeDocument).toBeNull()
			} else {
				expect(deleteOrgDocumentFlow).not.toHaveBeenCalled()
				expect(runtime.source).toBe(decision === "edit" ? "newer source" : "unsaved source")
			}
		},
	)

	it("keeps dirty canonical and parked buffers when leaving the UI route", async () => {
		const hook = await setup()
		act(() => hook.result.current.updateContent("dirty parked source"))
		await act(async () => { await hook.result.current.openDocumentPath("z.org") })
		act(() => hook.result.current.updateContent("dirty focused source"))
		const buffers = hook.result.current.liveBuffers
		const blocker = vi.mocked(useBlocker).mock.lastCall![0] as unknown as { shouldBlockFn: () => Promise<boolean> }
		expect(await blocker.shouldBlockFn()).toBe(false)
		expect(hook.result.current.liveBuffers).toEqual(buffers)
		expect(buffers.map((buffer) => buffer.runtime.source)).toEqual(["dirty parked source", "dirty focused source"])
		expect(vi.mocked(useConfirm())).not.toHaveBeenCalled()
	})

	it.each(["cancel", "accept", "edit", "transient", "retire"] as const)(
		"workspace replacement starts no picker before a current explicit discard: %s",
		async (decision) => {
			const hook = await setup()
			act(() => hook.result.current.updateContent("unsaved source"))
			const pending = Promise.withResolvers<boolean>()
			vi.mocked(useConfirm()).mockReturnValueOnce(pending.promise)
			vi.mocked(selectOrgWorkspaceFlow).mockReturnValueOnce(async () => E.right({ ...workspace, capabilityToken: "G2" }))
			let replacing!: Promise<void>
			act(() => { replacing = hook.result.current.selectWorkspace() })
			expect(selectOrgWorkspaceFlow).not.toHaveBeenCalled()
			if (decision === "edit") act(() => hook.result.current.updateContent("newer source"))
			if (decision === "transient") act(() => hook.result.current.setTransientDirty("new draft", true))
			if (decision === "retire") hook.unmount()
			await act(async () => {
				pending.resolve(decision !== "cancel")
				await replacing
			})
			if (decision === "accept") {
				expect(selectOrgWorkspaceFlow).toHaveBeenCalledTimes(1)
				expect(hook.result.current.workspaceSessionId).toBe("G2")
			} else {
				expect(selectOrgWorkspaceFlow).not.toHaveBeenCalled()
				if (decision !== "retire") expect(hook.result.current.workspaceSessionId).toBe("G1")
			}
		},
	)

	it.each(["cancel", "accept", "source-changed", "retire"] as const)(
		"legacy migration retains its read/recheck/write boundary across %s",
		async (decision) => {
			const hook = await setup()
			const source = hook.result.current.content
			const plan = planLegacyMigration({
				graph: {
					workspace: { id: "isolated", name: "Isolated legacy", description: null, createdAt: "11", updatedAt: "13" },
					nodes: [],
				},
				contents: [],
			})
			vi.mocked(prepareLegacyMigrationFlow).mockReturnValue(async () => E.right(plan))
			vi.mocked(areLegacyMigrationPlansEquivalent).mockReturnValue(decision !== "source-changed")
			vi.mocked(executeLegacyMigrationFlow).mockReturnValue(async () => E.left({
				type: "LEGACY_MIGRATION_ERROR",
				stage: "write-artifacts",
				cause: {
					type: "ORG_FILE_ERROR", operation: "write", command: "write_org_document",
					message: "Fixture write refused", cause: null,
				},
			}))
			const pending = Promise.withResolvers<boolean>()
			vi.mocked(useConfirm()).mockReturnValueOnce(pending.promise)
			let migrating!: Promise<void>
			act(() => { migrating = hook.result.current.migrateLegacyWorkspace({ id: "isolated", title: "Isolated legacy" } as WorkspaceInterface) })
			await act(async () => { await Promise.resolve() })
			expect(prepareLegacyMigrationFlow).toHaveBeenCalledTimes(1)
			expect(executeLegacyMigrationFlow).not.toHaveBeenCalled()
			if (decision === "retire") hook.unmount()
			await act(async () => {
				pending.resolve(decision !== "cancel")
				await migrating
			})
			expect(prepareLegacyMigrationFlow).toHaveBeenCalledTimes(decision === "accept" || decision === "source-changed" ? 2 : 1)
			expect(executeLegacyMigrationFlow).toHaveBeenCalledTimes(decision === "accept" ? 1 : 0)
			if (decision !== "retire") {
				expect(hook.result.current.content).toBe(source)
				expect(hook.result.current.isLoading).toBe(false)
			}
		},
	)


	const agendaRow = (
		source: string,
		path = "z.org",
		revision = "z-1",
		live = false,
	): OrgAgendaEntry => {
		const row = parseOrgAgenda(path, source)[0]
		return {
			...row,
			origin: {
				...row.origin,
				source: live ? "live" : "disk",
				workspaceRoot: workspace.rootPath,
				capabilityToken: workspace.capabilityToken,
				sourceRevision: revision,
				diskRevision: "z-1",
				workspaceSessionId: agendaOwner().workspaceSessionId!,
				...(live
					? {
							runtimeIncarnation: agendaOwner().liveBuffers.find(
								(buffer) => buffer.bufferId === revision,
							)!.runtimeIncarnation,
							sourceGeneration: agendaOwner().liveBuffers.find(
								(buffer) => buffer.bufferId === revision,
							)!.sourceGeneration,
						}
					: {}),
			},
		}
	}
	const todoStamp = "[2026-07-01 Wed 00:01]"
	it.each([
		["#+TODO: NEXT(n) | FINISHED(f!)", "NEXT", "FINISHED"],
		["#+TODO: NEXT(n/!) | FINISHED(f)", "NEXT", "FINISHED"],
		["#+TODO: NEXT(n/!) | FINISHED(f!)", "NEXT", "FINISHED"],
	])("cycles custom logging state atomically: %s", async (declaration, from, to) => {
		const { result } = await setup()
		const source = `${declaration}\r\n* ${from} café 😀\r\n<2026-07-01 Wed>\r\nbody\r\n`
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		const active = result.current.activeBufferRuntime
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(agendaRow(source), {
					kind: "cycle-todo",
					timestamp: todoStamp,
				}),
			).toEqual({ kind: "confirmed" })
		})
		const parked = result.current.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "z.org",
		)!
		const log = `- State "${to}"${" ".repeat(12 - to.length)}from "${from}" ${todoStamp}\r\n`
		expect(parked.runtime.source).toBe(
			source.replace(`* ${from} café 😀\r\n`, `* ${to ? `${to} ` : ""}café 😀\r\n${log}`),
		)
		expect(parked.runtime.source.match(/- State/g)).toHaveLength(1)
		expect(parked.isDirty).toBe(true)
		expect(parked.document.revision).toBe("z-1")
		expect(undoDepth(parked.runtime.state)).toBe(1)
		expect(result.current.activeBufferRuntime).toBe(active)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		const editor = attachRuntime(parked.runtime, result.current, "todo-undo")
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(parked.runtime.source).toBe(source)
		act(() => {
			expect(editor.handle.redo()).toBe(true)
		})
		expect(undoDepth(parked.runtime.state)).toBe(1)
		editor.dispose()
	})
	it("batches startup CLOSED and drawer logs in a dirty live buffer without changing disk revision", async () => {
		const { result } = await setup()
		const source =
			"#+STARTUP: logdone logdrawer\r\n#+TODO: NEXT | FINISHED(!)\n* NEXT café 😀\r\n:PROPERTIES:\r\n:ID: untouched\r\n:END:\r\n<2026-07-01 Wed>\r\nbody\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current, "todo-dirty")
		act(() =>
			editor.view.dispatch({
				changes: { from: editor.view.state.doc.length, insert: "unsaved\r\n" },
				annotations: isolateHistory.of("full"),
			}),
		)
		const original = runtime.source
		const depth = undoDepth(runtime.state)
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(
					agendaRow(original, "z.org", result.current.activeBufferId!, true),
					{ kind: "cycle-todo", timestamp: todoStamp },
				),
			).toEqual({ kind: "confirmed" })
		})
		const expected = original
			.replace("* NEXT café 😀\r\n", `* FINISHED café 😀\r\nCLOSED: ${todoStamp}\r\n`)
			.replace(
				":END:\r\n",
				`:END:\r\n:LOGBOOK:\r\n- State "FINISHED"    from "NEXT" ${todoStamp}\r\n:END:\r\n`,
			)
		expect(runtime.source).toBe(expected)
		expect(result.current.content).toBe(expected)
		expect(result.current.activeDocument?.revision).toBe("z-1")
		expect(result.current.isDirty).toBe(true)
		expect(undoDepth(runtime.state)).toBe(depth + 1)
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe(original)
		expect(result.current.isDirty).toBe(true)
		editor.dispose()
	})
	it.each([
		"NEXT(n/@) | FINISHED(f)",
		"NEXT(n) | FINISHED(f@)",
	])("prepares note-required %s without allocating an unopened buffer", async (states) => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const source = `#+TODO: ${states}\n* NEXT task\n<2026-07-01 Wed>\n`
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		const create = vi.spyOn(runtimeFactory, "createOrgBufferRuntime")
		const park = vi.spyOn(observed.reservoir, "park")
		const before = result.current.liveBuffers
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(agendaRow(source), {
					kind: "cycle-todo",
					timestamp: todoStamp,
				}),
			).toMatchObject({ kind: "needs-note", entry: agendaRow(source) })
		})
		expect(create).not.toHaveBeenCalled()
		expect(park).not.toHaveBeenCalled()
		expect(result.current.liveBuffers).toEqual(before)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		"active",
		"parked",
	] as const)("pins an already-open %s disk note row to its exact runtime revision", async (target) => {
		const { result } = await setup()
		const source = "#+TODO: NEXT | FINISHED(f@)\n* NEXT task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const buffer = result.current.liveBuffers.find(
			(item) => item.document.relativePath === "z.org",
		)!
		if (target === "parked") {
			vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () =>
				E.right({ content: "* Other\n", relativePath: "other.org", revision: "other-1" }),
			)
			await act(async () => {
				await result.current.openDocumentPath("other.org")
			})
		}
		const row = agendaRow(source)
		const prepared = await result.current.executeAgendaCommand(row, {
			kind: "cycle-todo",
			timestamp: todoStamp,
		})
		expect(prepared.kind).toBe("needs-note")
		if (prepared.kind !== "needs-note") throw new Error("expected note request")
		expect(prepared.entry.origin).toEqual({
			...row.origin,
			source: "live",
			sourceRevision: buffer.bufferId,
			runtimeIncarnation: buffer.runtimeIncarnation,
			sourceGeneration: buffer.runtime.revision,
		})
		expect(Object.isFrozen(prepared.entry)).toBe(true)
		expect(Object.isFrozen(prepared.entry.origin)).toBe(true)
		expect(Object.isFrozen(prepared.entry.origin?.heading)).toBe(true)
		expect(Object.isFrozen(prepared.entry.origin?.timestamp)).toBe(true)
		const editor = attachRuntime(buffer.runtime, result.current, `disk-note-${target}`)
		act(() => {
			editor.view.dispatch({
				changes: { from: editor.view.state.doc.length, insert: "edit\n" },
				annotations: isolateHistory.of("full"),
			})
			expect(editor.handle.undo()).toBe(true)
		})
		expect(buffer.runtime.source).toBe(source)
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(prepared.entry, {
					kind: "cycle-todo",
					note: "late",
					timestamp: todoStamp,
				}),
			).toEqual({ kind: "stale" })
		})
		expect(buffer.runtime.source).toBe(source)
		editor.dispose()
		const fresh = await result.current.executeAgendaCommand(row, {
			kind: "cycle-todo",
			timestamp: todoStamp,
		})
		if (fresh.kind !== "needs-note") throw new Error("expected fresh note request")
		await act(async () => {
			expect(await result.current.closeDocumentPath("z.org")).toBe(true)
			await result.current.openDocumentPath("z.org")
			expect(
				await result.current.executeAgendaCommand(fresh.entry, {
					kind: "cycle-todo",
					note: "late",
					timestamp: todoStamp,
				}),
			).toEqual({ kind: "stale" })
		})
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("rejects disk command edit/undo ABA inside the commit-start callback", async () => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current, "disk-commit-aba")
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(
					agendaRow(source),
					{ kind: "cycle-todo", timestamp: todoStamp },
					undefined,
					{
						onCommitStarted: () => {
							editor.view.dispatch({
								changes: { from: editor.view.state.doc.length, insert: "edit\n" },
								annotations: isolateHistory.of("full"),
							})
							expect(editor.handle.undo()).toBe(true)
						},
					},
				),
			).toEqual({ kind: "stale" })
		})
		expect(runtime.source).toBe(source)
		editor.dispose()
	})
	it("revalidates a frozen note snapshot and applies literal note atomically", async () => {
		const { result } = await setup()
		const source = "#+TODO: NEXT | FINISHED(f@)\n* NEXT task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		const row = agendaRow(source)
		const prepared = await result.current.executeAgendaCommand(row, {
			kind: "cycle-todo",
			timestamp: todoStamp,
		})
		expect(prepared.kind).toBe("needs-note")
		if (prepared.kind !== "needs-note") throw new Error("expected note request")
		expect(Object.isFrozen(prepared.entry)).toBe(true)
		expect(Object.isFrozen(prepared.entry.origin)).toBe(true)
		expect(prepared.entry).not.toBe(row)
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-2" }),
		)
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(prepared.entry, {
					kind: "cycle-todo",
					note: "literal [note]",
					timestamp: todoStamp,
				}),
			).toEqual({ kind: "stale" })
		})
		expect(
			result.current.liveBuffers.some((buffer) => buffer.document.relativePath === "z.org"),
		).toBe(false)
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(prepared.entry, {
					kind: "cycle-todo",
					note: "literal [note]",
					timestamp: todoStamp,
				}),
			).toEqual({ kind: "confirmed" })
		})
		const runtime = result.current.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "z.org",
		)!.runtime
		expect(runtime.source).toContain("* FINISHED task")
		expect(runtime.source).toContain("literal [note]")
		expect(undoDepth(runtime.state)).toBe(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("rejects invalid TODO clocks before reading or allocating", async () => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const create = vi.spyOn(runtimeFactory, "createOrgBufferRuntime")
		const park = vi.spyOn(observed.reservoir, "park")
		vi.mocked(openOrgDocumentFlow).mockClear()
		for (const timestamp of [
			"",
			"[2026-07-01 Tue 00:01]",
			"[2026-07-01 Wed 24:00]",
			"[2026-02-30 Mon 00:01]",
			"2026-07-01",
		]) {
			await act(async () => {
				expect(
					await result.current.executeAgendaCommand(agendaRow("* TODO task\n<2026-07-01 Wed>\n"), {
						kind: "cycle-todo",
						timestamp,
					}),
				).toMatchObject({ kind: "rejected" })
			})
		}
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(create).not.toHaveBeenCalled()
		expect(park).not.toHaveBeenCalled()
		expect(result.current.liveBuffers).toHaveLength(1)
	})
	it.each([
		"schedule",
		"deadline",
	] as const)("rejects invalid %s dates before reading or allocating", async (kind) => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const create = vi.spyOn(runtimeFactory, "createOrgBufferRuntime")
		const park = vi.spyOn(observed.reservoir, "park")
		vi.mocked(openOrgDocumentFlow).mockClear()
		const before = result.current.liveBuffers
		for (const date of [
			"2026-02-29",
			"2026-04-31",
			"2026-13-01",
			"",
			"2026-07-01 trailing",
		]) {
			await act(async () => {
				expect(
					await result.current.executeAgendaCommand(agendaRow("* TODO task\n<2026-07-01 Wed>\n"), {
						kind,
						date,
					}),
				).toMatchObject({ kind: "rejected" })
			})
		}
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(create).not.toHaveBeenCalled()
		expect(park).not.toHaveBeenCalled()
		expect(result.current.liveBuffers).toEqual(before)
		expect(result.current.isLoading).toBe(false)
	})
	it.each([
		"schedule",
		"deadline",
	] as const)("prepares unopened %s from current metadata without allocating a ghost", async (field) => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const source =
			"* TODO 😀 task\r\nSCHEDULED: <2026-07-01 Wed> DEADLINE: <2026-07-03 Fri>\r\nbody\r\n"
		const selected = parseOrgAgenda("z.org", source).find(
			(entry) => entry.kind === (field === "schedule" ? "deadline" : "scheduled"),
		)!
		const row = {
			...selected,
			origin: {
				...selected.origin,
				...agendaRow(source).origin!,
				timestamp: selected.origin!.timestamp,
				workspaceRoot: workspace.rootPath,
				capabilityToken: workspace.capabilityToken,
				sourceRevision: "z-1",
				diskRevision: "z-1",
				workspaceSessionId: result.current.workspaceSessionId!,
			},
		}
		const create = vi.spyOn(runtimeFactory, "createOrgBufferRuntime")
		const park = vi.spyOn(observed.reservoir, "park")
		const before = result.current.liveBuffers
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			expect(await result.current.prepareAgendaCommand(row, field)).toMatchObject({
				kind: "ready",
				entry: row,
			})
		})
		expect(row.kind).toBe(field === "schedule" ? "deadline" : "scheduled")
		expect(create).not.toHaveBeenCalled()
		expect(park).not.toHaveBeenCalled()
		expect(result.current.liveBuffers).toEqual(before)
		expect(result.current.activeDocument?.relativePath).toBe("inbox.org")
		expect(result.current.revealTarget).toBeNull()
		expect(result.current.isLoading).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		"schedule",
		"deadline",
	] as const)("prepares live %s with null when absent and preserves raw history and revision", async (field) => {
		const { result } = await setup()
		const source = "* TODO task\r\n<2026-07-01 Wed>\r\nbody\r\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current, `prepare-${field}`)
		act(() =>
			editor.view.dispatch({
				changes: { from: editor.view.state.doc.length, insert: "unsaved\n" },
			}),
		)
		const raw = runtime.source
		const revision = runtime.revision
		const depth = undoDepth(runtime.state)
		const row = agendaRow(raw, "z.org", result.current.activeBufferId!, true)
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(await result.current.prepareAgendaCommand(row, field)).toEqual({
				kind: "ready",
				entry: row,
				date: null,
			})
		})
		expect(runtime.source).toBe(raw)
		expect(runtime.revision).toBe(revision)
		expect(undoDepth(runtime.state)).toBe(depth)
		expect(result.current.content).toBe(raw)
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		editor.dispose()
	})
	it.each([
		"schedule",
		"deadline",
	] as const)("applies one canonical %s edit, supports undo, and saves inactive exact CAS", async (kind) => {
		const { result } = await setup()
		const source =
			"* TODO 😀 task\r\nSCHEDULED: <2026-07-01 Wed> DEADLINE: <2026-07-03 Fri>\r\nbody\r\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		const active = result.current.activeBufferRuntime
		const row = agendaRow(source)
		await act(async () => {
			expect(await result.current.executeAgendaCommand(row, { kind, date: "2026-07-09" })).toEqual({
				kind: "confirmed",
			})
		})
		const parked = result.current.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "z.org",
		)!
		const expected = source.replace(
			kind === "schedule" ? "<2026-07-01 Wed>" : "<2026-07-03 Fri>",
			"<2026-07-09>",
		)
		expect(parked.runtime.source).toBe(expected)
		expect(parked.content).toBe(expected)
		expect(undoDepth(parked.runtime.state)).toBe(1)
		expect(result.current.activeBufferRuntime).toBe(active)
		expect(nativeState.hasDirtyBuffers).toBe(true)
		const editor = attachRuntime(parked.runtime, result.current, `planning-undo-${kind}`)
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(parked.runtime.source).toBe(source)
		expect(redoDepth(parked.runtime.state)).toBe(1)
		act(() => {
			expect(editor.handle.redo()).toBe(true)
		})
		vi.mocked(saveOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ relativePath: "z.org", revision: "z-2" }),
		)
		await act(async () => {
			expect(await result.current.saveAllDocuments()).toMatchObject({
				kind: "success",
				savedPaths: ["z.org"],
			})
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledExactlyOnceWith({
			content: expected,
			expectedRevision: "z-1",
			relativePath: "z.org",
			capabilityToken: "G1",
			workspaceRoot: "/notes",
		})
		expect(result.current.activeBufferRuntime).toBe(active)
		expect(
			result.current.liveBuffers.find((buffer) => buffer.bufferId === parked.bufferId),
		).toMatchObject({ isDirty: false, document: { revision: "z-2" } })
		editor.dispose()
	})
	it.each([
		"schedule",
		"deadline",
	] as const)("leaves unchanged %s raw bytes, canonical revision and history intact", async (kind) => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const source =
			"* TODO 😀 task\r\nSCHEDULED: <2026-07-01 Wed> DEADLINE: <2026-07-03 Fri>\r\nbody\r\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		const create = vi.spyOn(runtimeFactory, "createOrgBufferRuntime")
		const park = vi.spyOn(observed.reservoir, "park")
		const command = { kind, date: kind === "schedule" ? "2026-07-01" : "2026-07-03" }
		await act(async () => {
			expect(await result.current.executeAgendaCommand(agendaRow(source), command)).toEqual({
				kind: "unchanged",
			})
		})
		expect(create).not.toHaveBeenCalled()
		expect(park).not.toHaveBeenCalled()
		expect(result.current.liveBuffers).toHaveLength(1)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const revision = runtime.revision
		const depth = undoDepth(runtime.state)
		const redo = redoDepth(runtime.state)
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(
					agendaRow(source, "z.org", result.current.activeBufferId!, true),
					command,
				),
			).toEqual({ kind: "unchanged" })
		})
		expect(runtime.source).toBe(source)
		expect(result.current.content).toBe(source)
		expect(runtime.revision).toBe(revision)
		expect(undoDepth(runtime.state)).toBe(depth)
		expect(redoDepth(runtime.state)).toBe(redo)
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		"throw",
		"abort",
		"source-drift",
	] as const)("rechecks a fresh Root owner after a %s commit-start observer", async (effect) => {
		const { result } = await setup()
		const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const revision = runtime.revision
		const row = agendaRow(source, "z.org", result.current.activeBufferId!, true)
		const controller = new AbortController()
		const onCommitStarted = vi.fn(() => {
			if (effect === "throw") throw new Error("observer failed before publication")
			if (effect === "abort") controller.abort()
			if (effect === "source-drift") result.current.updateContent(source + "new body\n")
		})
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(
					row,
					{ kind: "schedule", date: "2026-07-09" },
					controller.signal,
					{ onCommitStarted },
				),
			).toMatchObject({ kind: effect === "throw" ? "rejected" : "stale" })
		})
		expect(onCommitStarted).toHaveBeenCalledTimes(1)
		expect(runtime.source).toBe(effect === "source-drift" ? source + "new body\n" : source)
		expect(result.current.content).toBe(runtime.source)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(0)
		if (effect !== "source-drift") expect(runtime.revision).toBe(revision)
		expect(result.current.isLoading).toBe(false)
		expect(nativeState.isBusy).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		"active",
		"parked",
	] as const)("rechecks synchronous late pause/conflict before the canonical Agenda Tx (%s)", async (target) => {
		const { result } = await setup()
		const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockImplementation(
			(input) => async () => E.right(
				input.relativePath === "z.org"
					? { content: source, relativePath: "z.org", revision: "z-1" }
					: captured,
			),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const id = result.current.activeBufferId!
		const row = agendaRow(source, "z.org", id, true)
		if (target === "parked") {
			await act(async () => {
				expect(await result.current.openDocumentPath("inbox.org")).toBe(true)
			})
			expect(result.current.activeDocument?.relativePath).toBe("inbox.org")
			expect(result.current.liveBuffers.find((buffer) => buffer.bufferId === id)?.runtime).toBe(runtime)
		}
		const before = runtime.state
		const revision = runtime.revision
		// A synchronous uncertain-write exception runs the real Root catch/finally:
		// it latches path-local flags and releases busy ownership before returning.
		vi.mocked(captureOrgEntryFlow).mockImplementationOnce(() => () => {
			throw new Error("late uncertain capture")
		})
		let capture!: Promise<unknown>
		const onCommitStarted = vi.fn(() => {
			capture = result.current.captureEntry({ entryType: "entry", entrySource: "* captured\n", target: { kind: "file", relativePath: "z.org" } })
		})
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(
					row,
					{ kind: "schedule", date: "2026-07-09" },
					undefined,
					{ onCommitStarted },
				),
			).toMatchObject({ kind: "rejected" })
			expect(await capture).toMatchObject({ kind: "uncertain" })
		})
		expect(onCommitStarted).toHaveBeenCalledTimes(1)
		expect(captureOrgEntryFlow).toHaveBeenCalledTimes(1)
		expect(runtime.state).toBe(before)
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(revision)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(0)
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "z.org"),
		).toMatchObject({ hasConflict: true, autosavePaused: true })
		expect(result.current.isLoading).toBe(false)
		expect(nativeState.isBusy).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("does not release a fresh Root read owner started reentrantly by the commit-start observer", async () => {
		const hook = renderHook(() => useOrgWorkspace())
		agendaOwner = () => hook.result.current
		await act(async () => {
			await hook.result.current.openDefaultWorkspace()
		})
		const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await hook.result.current.openDocumentPath("z.org")
		})
		const runtime = hook.result.current.activeBufferRuntime!
		const revision = runtime.revision
		const row = agendaRow(source, "z.org", hook.result.current.activeBufferId!, true)
		const inboxRow = agendaRow(source, "inbox.org", "old")
		const nextRow = { ...inboxRow, origin: { ...inboxRow.origin!, diskRevision: "old" } }
		let settle!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(openOrgDocumentFlow).mockReturnValue(
			() =>
				new Promise((resolve) => {
					settle = resolve
				}),
		)
		const controller = new AbortController()
		let next!: Promise<unknown>
		const onCommitStarted = vi.fn(() => {
			controller.abort()
			next = hook.result.current.executeAgendaCommand(nextRow, {
				kind: "schedule",
				date: "2026-07-09",
			})
		})
		await act(async () => {
			expect(
				await hook.result.current.executeAgendaCommand(
					row,
					{ kind: "schedule", date: "2026-07-09" },
					controller.signal,
					{ onCommitStarted },
				),
			).toEqual({ kind: "stale" })
		})
		expect(onCommitStarted).toHaveBeenCalledTimes(1)
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(revision)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(hook.result.current.isWorkspaceBusy).toBe(true)
		expect(nativeState.isBusy).toBe(true)
		await act(async () => {
			settle(E.right({ content: source, relativePath: "inbox.org", revision: "old" }))
			expect(await next).toEqual({ kind: "confirmed" })
		})
		expect(hook.result.current.isWorkspaceBusy).toBe(false)
		expect(nativeState.isBusy).toBe(false)
		const nextBuffer = hook.result.current.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "inbox.org",
		)!
		expect(nextBuffer.content).toBe(source.replace("<2026-07-01 Wed>", "<2026-07-09>"))
		expect(undoDepth(nextBuffer.runtime.state)).toBe(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		"unopened",
		"live",
	] as const)("does not notify the commit-start observer or create history for unchanged %s planning", async (target) => {
		const { result } = await setup()
		const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		if (target === "live") {
			await act(async () => {
				await result.current.openDocumentPath("z.org")
			})
		}
		const before = result.current.liveBuffers
		const runtime = result.current.activeBufferRuntime!
		const revision = runtime.revision
		const onCommitStarted = vi.fn(() => {
			throw new Error("must not observe unchanged")
		})
		const row =
			target === "live"
				? agendaRow(source, "z.org", result.current.activeBufferId!, true)
				: agendaRow(source)
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(
					row,
					{ kind: "schedule", date: "2026-07-01" },
					undefined,
					{ onCommitStarted },
				),
			).toEqual({ kind: "unchanged" })
		})
		expect(onCommitStarted).not.toHaveBeenCalled()
		expect(result.current.liveBuffers).toEqual(before)
		expect(runtime.revision).toBe(revision)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(redoDepth(runtime.state)).toBe(0)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		["orgBehaviorConfigurationJson", " "],
		["orgKeymapConfigurationJson", " "],
		["orgBehaviorConfigurationJson", ""],
	] as const)("retires an actual Root Agenda read on %s reload through %j without late ghost buffers", async (configuration, intermediate) => {
		vi.useRealTimers()
		const previous = useSettings.getState()
		const previousConfiguration = useConfigurationState.getState()
		let signal!: AbortSignal
		const hook = renderHook(() => {
			const owner = useOrgWorkspace()
			const parameters = useOrgAgendaParameters({
				controller: {
					prepareAgendaCommand: (...args) => {
						signal = args[2]!
						return owner.prepareAgendaCommand(...args)
					},
					executeAgendaCommand: owner.executeAgendaCommand,
				},
				scope: owner.workspaceSessionId ?? "",
				sourceVersion: JSON.stringify(owner.liveBuffers.map((buffer) => buffer.content)),
				reload: vi.fn(),
				restoreFocus: vi.fn(),
				now: () => new Date(2026, 8, 30, 23, 59),
			})
			return { owner, parameters }
		})
		try {
			act(() => {
				useSettings.setState({ orgBehaviorConfigurationJson: "", orgKeymapConfigurationJson: "" })
			})
			agendaOwner = () => hook.result.current.owner
			await act(async () => {
				await hook.result.current.owner.openDefaultWorkspace()
			})
			const before = hook.result.current.owner.liveBuffers
			const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed>\n"
			let settle!: (value: E.Either<never, OrgDocumentInterface>) => void
			vi.mocked(openOrgDocumentFlow).mockReturnValue(
				() => new Promise((resolve) => { settle = resolve }),
			)
			await act(async () => {
				hook.result.current.parameters.start(agendaRow(source), "schedule")
			})
			act(() => {
				useConfigurationState.setState({ status: "loading", error: "Reloading configuration.", generation: {} })
				useSettings.setState({ [configuration]: intermediate })
				useConfigurationState.setState({ status: "ready", error: null, generation: {} })
				useConfigurationState.setState({ status: "loading", error: "Reloading configuration.", generation: {} })
				useSettings.setState({ [configuration]: "" })
				useConfigurationState.setState({ status: "ready", error: null, generation: {} })
			})
			expect(hook.result.current.parameters.session).toBeNull()
			expect(signal.aborted).toBe(true)
			await act(async () => {
				settle(E.right({ content: source, relativePath: "z.org", revision: "z-1" }))
			})
			expect(hook.result.current.owner.liveBuffers).toEqual(before)
			expect(hook.result.current.owner.activeDocument).toBeNull()
			expect(hook.result.current.owner.isWorkspaceBusy).toBe(false)
			expect(hook.result.current.parameters.isPending()).toBe(false)
		} finally {
			hook.unmount()
			act(() => {
				useSettings.setState({
					orgBehaviorConfigurationJson: previous.orgBehaviorConfigurationJson,
					orgKeymapConfigurationJson: previous.orgKeymapConfigurationJson,
				})
				useConfigurationState.setState(previousConfiguration)
			})
		}
	})
	// The wrapper delays only RESULT delivery: canonical commit and Root publication
	// have already happened when cancellation is attempted. Never fake a confirmed edit.
	const resultGate = () => {
		let release!: () => void
		const promise = new Promise<void>((resolve) => {
			release = resolve
		})
		return { promise, release }
	}
	it.each([
		"schedule",
		"deadline",
	] as const)("keeps a real Root %s commit authoritative when the accepting session calls onCancel", async (kind) => {
		vi.useRealTimers()
		const gate = resultGate()
		const reload = vi.fn()
		const restoreFocus = vi.fn()
		let signal!: AbortSignal
		let committed = false
		const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed> DEADLINE: <2026-07-03 Fri>\n"
		const hook = renderHook(() => {
			const owner = useOrgWorkspace()
			const parameters = useOrgAgendaParameters({
				controller: {
					prepareAgendaCommand: owner.prepareAgendaCommand,
					executeAgendaCommand: async (...args) => {
						signal = args[2]!
						const outcome = await owner.executeAgendaCommand(...args)
						expect(outcome).toEqual({ kind: "confirmed" })
						committed = true
						await gate.promise
						return outcome
					},
				},
				scope: owner.workspaceSessionId ?? "",
				// Exercise publication while the accepting request still awaits RESULT.
				sourceVersion: JSON.stringify(owner.liveBuffers.map((buffer) => buffer.content)),
				reload,
				restoreFocus,
			})
			return { owner, parameters }
		})
		agendaOwner = () => hook.result.current.owner
		await act(async () => {
			await hook.result.current.owner.openDefaultWorkspace()
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			hook.result.current.parameters.start(agendaRow(source), kind)
		})
		const session = hook.result.current.parameters.session!
		let accepted!: ReturnType<typeof session.onAccept>
		await act(async () => {
			accepted = session.onAccept("2026-07-09")
		})
		expect(committed).toBe(true)
		const buffer = hook.result.current.owner.liveBuffers[0]!
		const expected = source.replace(
			kind === "schedule" ? "<2026-07-01 Wed>" : "<2026-07-03 Fri>",
			"<2026-07-09>",
		)
		expect(buffer.content).toBe(expected)
		expect(buffer.runtime.source).toBe(expected)
		expect(buffer.isDirty).toBe(true)
		expect(undoDepth(buffer.runtime.state)).toBe(1)
		const revision = buffer.runtime.revision
		act(() => {
			session.onCancel()
			session.onCancel()
			hook.result.current.parameters.cancel()
		})
		expect(signal.aborted).toBe(false)
		expect(hook.result.current.parameters.pending).toBe(true)
		expect(reload).not.toHaveBeenCalled()
		expect(restoreFocus).not.toHaveBeenCalled()
		await act(async () => {
			gate.release()
			await accepted
		})
		expect(hook.result.current.parameters.session).toBeNull()
		expect(hook.result.current.parameters.pending).toBe(false)
		expect(hook.result.current.parameters.isPending()).toBe(false)
		expect(reload).toHaveBeenCalledTimes(1)
		// Hook-only delivery has no owned minibuffer host; body is not completion ownership.
		expect(restoreFocus).not.toHaveBeenCalled()
		expect(buffer.runtime.revision).toBe(revision)
		expect(buffer.runtime.source).toBe(expected)
		expect(undoDepth(buffer.runtime.state)).toBe(1)
		expect(hook.result.current.owner.isLoading).toBe(false)
		expect(nativeState.isBusy).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		"scope-change",
		"unmount",
	] as const)("suppresses late UI completion after real Root publication and %s", async (boundary) => {
		vi.useRealTimers()
		const gate = resultGate()
		const reload = vi.fn()
		const restoreFocus = vi.fn()
		const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed>\n"
		let signal!: AbortSignal
		let committed = false
		const hook = renderHook(
			({ surfaceScope }) => {
				const owner = useOrgWorkspace()
				const parameters = useOrgAgendaParameters({
					controller: {
						prepareAgendaCommand: owner.prepareAgendaCommand,
						executeAgendaCommand: async (...args) => {
							signal = args[2]!
							const outcome = await owner.executeAgendaCommand(...args)
							expect(outcome).toEqual({ kind: "confirmed" })
							committed = true
							await gate.promise
							return outcome
						},
					},
					scope: surfaceScope,
					reload,
					restoreFocus,
				})
				return { owner, parameters }
			},
			{ initialProps: { surfaceScope: "agenda-G1" } },
		)
		agendaOwner = () => hook.result.current.owner
		await act(async () => {
			await hook.result.current.owner.openDefaultWorkspace()
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			hook.result.current.parameters.start(agendaRow(source), "schedule")
		})
		const session = hook.result.current.parameters.session!
		let accepted!: ReturnType<typeof session.onAccept>
		await act(async () => {
			accepted = session.onAccept("2026-07-09")
		})
		expect(committed).toBe(true)
		const buffer = hook.result.current.owner.liveBuffers[0]!
		const expected = source.replace("<2026-07-01 Wed>", "<2026-07-09>")
		expect(buffer.content).toBe(expected)
		expect(buffer.runtime.source).toBe(expected)
		expect(undoDepth(buffer.runtime.state)).toBe(1)
		const revision = buffer.runtime.revision
		if (boundary === "scope-change") hook.rerender({ surfaceScope: "agenda-G2" })
		else hook.unmount()
		expect(signal.aborted).toBe(true)
		await act(async () => {
			gate.release()
			await accepted
		})
		expect(reload).not.toHaveBeenCalled()
		expect(restoreFocus).not.toHaveBeenCalled()
		if (boundary === "scope-change") {
			expect(hook.result.current.parameters.result).toBeNull()
			expect(hook.result.current.parameters.session).toBeNull()
			expect(hook.result.current.parameters.pending).toBe(false)
			expect(hook.result.current.parameters.isPending()).toBe(false)
			expect(hook.result.current.owner.isLoading).toBe(false)
		}
		expect(buffer.runtime.source).toBe(expected)
		expect(buffer.runtime.revision).toBe(revision)
		expect(undoDepth(buffer.runtime.state)).toBe(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		{ kind: "schedule", label: "Schedule", key: "Escape", ctrlKey: false },
		{ kind: "deadline", label: "Deadline", key: "g", ctrlKey: true },
		{ kind: "cycle-todo", label: "Cycle TODO", key: "Escape", ctrlKey: false },
	] as const)("ignores outer Agenda $key cancellation after real Root $kind publication", async ({
		kind,
		label,
		key,
		ctrlKey,
	}) => {
		vi.useRealTimers()
		const gate = resultGate()
		const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed> DEADLINE: <2026-07-03 Fri>\n"
		let owner!: ReturnType<typeof useOrgWorkspace>
		let signal!: AbortSignal
		let committed = false
		const onShowEditor = vi.fn()
		vi.mocked(loadOrgAgendaFlow).mockImplementation(() => async () => {
			const live = owner.liveBuffers.find((buffer) => buffer.document.relativePath === "z.org")
			const row = live ? agendaRow(live.content, "z.org", live.bufferId, true) : agendaRow(source)
			// Keep the same scheduled row: after rescheduling, parseOrgAgenda's
			// first date-sorted entry is the deadline, a different focus identity.
			const scheduled = parseOrgAgenda("z.org", live?.content ?? source).find(
				(entry) => entry.kind === "scheduled",
			)!
			const stableRow = {
				...scheduled,
				origin: { ...row.origin!, timestamp: scheduled.origin!.timestamp },
			}
			return E.right([stableRow])
		})
		const RootAgenda = () => {
			owner = useOrgWorkspace()
			agendaOwner = () => owner
			const root = owner
			return createElement(OrgAgendaContainer, {
				controller: {
					...root,
					executeAgendaCommand: async (...args) => {
						signal = args[2]!
						const outcome = await root.executeAgendaCommand(...args)
						expect(outcome).toEqual({ kind: "confirmed" })
						committed = true
						await gate.promise
						return outcome
					},
				},
				onShowEditor,
			})
		}
		render(createElement(RootAgenda))
		await act(async () => {
			await owner.openDefaultWorkspace()
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		const button = await screen.findByRole("button", { name: `${label} for task` })
		await act(async () => {
			button.focus()
			fireEvent.click(button)
		})
		if (kind !== "cycle-todo") {
			const input = await within(screen.getByRole("region", { name: "Minibuffer" })).findByRole("combobox", { name: kind === "schedule" ? /^Schedule \(/ : /^Deadline \(/ })
			fireEvent.change(input, { target: { value: "2026-07-09" } })
			await act(async () => {
				fireEvent.keyDown(input, { key: "Enter" })
			})
		}
		expect(committed).toBe(true)
		const buffer = owner.liveBuffers[0]!
		const revision = buffer.runtime.revision
		const expected =
			kind === "cycle-todo"
				? source.replace("TODO", "DONE")
				: source.replace(
						kind === "schedule" ? "<2026-07-01 Wed>" : "<2026-07-03 Fri>",
						"<2026-07-09>",
					)
		expect(buffer.runtime.source).toBe(expected)
		expect(buffer.content).toBe(expected)
		expect(undoDepth(buffer.runtime.state)).toBe(1)
		// Reservoir publication can render before the runtime revision advances.
		// Wait for the committed generation before counting RESULT's reload.
		await waitFor(() =>
			expect(vi.mocked(loadOrgAgendaFlow).mock.calls.at(-1)?.[3]).toEqual([
				expect.objectContaining({ content: expected, sourceGeneration: revision }),
			]),
		)
		const loadsAfterPublication = vi.mocked(loadOrgAgendaFlow).mock.calls.length
		fireEvent.keyDown(screen.getByRole("main"), { key, ctrlKey })
		fireEvent.keyDown(screen.getByRole("main"), { key, ctrlKey })
		expect(signal.aborted).toBe(false)
		await act(async () => {
			gate.release()
		})
		await waitFor(() =>
			expect(document.activeElement).toBe(
				screen.getByRole("button", { name: `${label} for task` }),
			),
		)
		// Container source refreshes may overlap RESULT's explicit reload;
		// the parameter-hook tests separately assert exactly one reload request.
		expect(vi.mocked(loadOrgAgendaFlow).mock.calls.length).toBeGreaterThan(loadsAfterPublication)
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: `${label} for task` })).not.toBeDisabled()
		expect(buffer.runtime.source).toBe(expected)
		expect(buffer.runtime.revision).toBe(revision)
		expect(undoDepth(buffer.runtime.state)).toBe(1)
		expect(owner.isLoading).toBe(false)
		expect(nativeState.isBusy).toBe(false)
		expect(onShowEditor).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each([
		"preparation",
		"execution",
	] as const)("still cancels real Root %s reads without late ghost buffers", async (phase) => {
		vi.useRealTimers()
		const observed = observeParkedReservoir()
		const reload = vi.fn()
		const restoreFocus = vi.fn()
		const source = "* TODO task\nSCHEDULED: <2026-07-01 Wed>\n"
		let signal!: AbortSignal
		let settle!: (value: E.Either<never, OrgDocumentInterface>) => void
		const lateRead = () =>
			vi.mocked(openOrgDocumentFlow).mockReturnValue(
				() =>
					new Promise((resolve) => {
						settle = resolve
					}),
			)
		const hook = renderHook(() => {
			const owner = useOrgWorkspace()
			const parameters = useOrgAgendaParameters({
				controller: {
					prepareAgendaCommand: (...args) => {
						signal = args[2]!
						return owner.prepareAgendaCommand(...args)
					},
					executeAgendaCommand: (...args) => {
						signal = args[2]!
						return owner.executeAgendaCommand(...args)
					},
				},
				scope: owner.workspaceSessionId ?? "",
				reload,
				restoreFocus,
			})
			return { owner, parameters }
		})
		agendaOwner = () => hook.result.current.owner
		await act(async () => {
			await hook.result.current.owner.openDefaultWorkspace()
		})
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		const create = vi.spyOn(runtimeFactory, "createOrgBufferRuntime")
		const park = vi.spyOn(observed.reservoir, "park")
		if (phase === "preparation") lateRead()
		await act(async () => {
			hook.result.current.parameters.start(agendaRow(source), "schedule")
		})
		let accepted: unknown
		if (phase === "execution") {
			lateRead()
			await act(async () => {
				accepted = hook.result.current.parameters.session!.onAccept("2026-07-09")
			})
			act(() => hook.result.current.parameters.session!.onCancel())
		} else act(() => hook.result.current.parameters.cancel())
		expect(signal.aborted).toBe(true)
		expect(hook.result.current.parameters.session).toBeNull()
		expect(hook.result.current.parameters.isPending()).toBe(false)
		await act(async () => {
			settle(E.right({ content: source, relativePath: "z.org", revision: "z-1" }))
			await accepted
		})
		expect(hook.result.current.parameters.pending).toBe(false)
		expect(hook.result.current.owner.liveBuffers).toEqual([])
		expect(create).not.toHaveBeenCalled()
		expect(park).not.toHaveBeenCalled()
		expect(reload).not.toHaveBeenCalled()
		// No focused origin or minibuffer host was mounted by this hook-only test.
		expect(restoreFocus).not.toHaveBeenCalled()
		expect(hook.result.current.owner.isLoading).toBe(false)
		expect(nativeState.isBusy).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	const planningOperations = [
		{ field: "schedule", prepare: true },
		{ field: "deadline", prepare: true },
		{ field: "schedule", prepare: false },
		{ field: "deadline", prepare: false },
	] as const
	const runPlanning = (
		owner: ReturnType<typeof useOrgWorkspace>,
		row: OrgAgendaEntry,
		operation: (typeof planningOperations)[number],
		signal?: AbortSignal,
	) =>
		operation.prepare
			? owner.prepareAgendaCommand(row, operation.field, signal)
			: owner.executeAgendaCommand(row, { kind: operation.field, date: "2026-07-09" }, signal)
	it.each(
		planningOperations,
	)("rejects false Right planning RPCs before allocation: %j", async (operation) => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const create = vi.spyOn(runtimeFactory, "createOrgBufferRuntime")
		const park = vi.spyOn(observed.reservoir, "park")
		const before = result.current.liveBuffers
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		for (const response of [
			{ _tag: "Invalid", right: { content: source, relativePath: "z.org", revision: "z-1" } },
			{ _tag: "Right", right: null },
			{ _tag: "Right", right: { content: 42, relativePath: "z.org", revision: "z-1" } },
			{ _tag: "Right", right: { content: source, relativePath: "other.org", revision: "z-1" } },
			{ _tag: "Right", right: { content: source, relativePath: "z.org", revision: "" } },
		]) {
			vi.mocked(openOrgDocumentFlow).mockReturnValue(async () => response as never)
			await act(async () => {
				expect(await runPlanning(result.current, agendaRow(source), operation)).toMatchObject({
					kind: "rejected",
				})
			})
			expect(result.current.isLoading).toBe(false)
			expect(nativeState.isBusy).toBe(false)
		}
		expect(create).not.toHaveBeenCalled()
		expect(park).not.toHaveBeenCalled()
		expect(result.current.liveBuffers).toEqual(before)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each(
		planningOperations,
	)("ignores late G1 planning RPC after G2 replaces its session: %j", async (operation) => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		const row = agendaRow(source)
		let settle!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(openOrgDocumentFlow).mockReturnValue(
			() =>
				new Promise((resolve) => {
					settle = resolve
				}),
		)
		const create = vi.spyOn(runtimeFactory, "createOrgBufferRuntime")
		const park = vi.spyOn(observed.reservoir, "park")
		const controller = new AbortController()
		let pending!: Promise<unknown>
		act(() => {
			pending = runPlanning(result.current, row, operation, controller.signal)
		})
		act(() => controller.abort())
		await act(async () => {
			expect(await pending).toEqual({ kind: "stale" })
		})
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			settle(E.right({ content: source, relativePath: "z.org", revision: "z-1" }))
			expect(await pending).toEqual({ kind: "stale" })
		})
		expect(create).not.toHaveBeenCalled()
		expect(park).not.toHaveBeenCalled()
		expect(result.current.liveBuffers).toEqual([])
		expect(result.current.workspaceSessionId).toBe("G2")
		expect(result.current.error).toBeNull()
		expect(result.current.isLoading).toBe(false)
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(await runPlanning(result.current, row, operation)).toEqual({ kind: "stale" })
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it.each(
		planningOperations,
	)("rejects planning against a real disk conflict without changing history: %j", async (operation) => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		act(() => result.current.updateContent(source + "dirty\n"))
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({
				...workspace,
				documents: workspace.documents.map((document) =>
					document.relativePath === "z.org" ? { ...document, revision: "z-2" } : document,
				),
			}),
		)
		await act(async () => {
			await result.current.refreshWorkspace()
		})
		const runtime = result.current.activeBufferRuntime!
		const raw = runtime.source
		const revision = runtime.revision
		const depth = undoDepth(runtime.state)
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(
				await runPlanning(
					result.current,
					agendaRow(raw, "z.org", result.current.activeBufferId!, true),
					operation,
				),
			).toMatchObject({ kind: "rejected" })
		})
		expect(runtime.source).toBe(raw)
		expect(runtime.revision).toBe(revision)
		expect(undoDepth(runtime.state)).toBe(depth)
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("commands an unopened exact disk revision without activation and retains one undo cycle", async () => {
		const { result } = await setup()
		const source = "#+TODO: NEXT | FINISHED\r\n* NEXT 😀 task\r\nDEADLINE: <2026-07-01 Wed>\r\n"
		const document = { content: source, relativePath: "z.org", revision: "z-1" }
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () => E.right(document))
		const active = result.current.activeBufferRuntime
		let outcome
		await act(async () => {
			outcome = await result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" })
		})
		expect(outcome).toEqual({ kind: "confirmed" })
		expect(result.current.activeBufferRuntime).toBe(active)
		expect(result.current.activeDocument?.relativePath).toBe("inbox.org")
		expect(result.current.revealTarget).toBeNull()
		const parked = result.current.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "z.org",
		)!
		expect(parked.content).toBe(source.replace("* NEXT", "* FINISHED"))
		expect(parked.isDirty).toBe(true)
		expect(undoDepth(parked.runtime.state)).toBe(1)
		expect(nativeState.hasDirtyBuffers).toBe(true)
		const editor = attachRuntime(parked.runtime, result.current, "agenda-undo")
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(parked.runtime.source).toBe(source)
		expect(redoDepth(parked.runtime.state)).toBe(1)
		editor.dispose()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("uses current dirty live anchors, not the disk body, and rejects stale rows", async () => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		act(() => {
			result.current.updateContent(source + "unsaved\n")
		})
		const raw = result.current.content
		const id = result.current.activeBufferId!
		await act(async () => {
			expect(await result.current.executeAgendaCommand(agendaRow(raw, "z.org", id, true), { kind: "cycle-todo" })).toEqual({
				kind: "confirmed",
			})
		})
		expect(result.current.content).toBe(raw.replace("* TODO", "* DONE"))
		await act(async () => {
			expect(await result.current.executeAgendaCommand(agendaRow(raw, "z.org", id, true), { kind: "cycle-todo" })).toEqual({
				kind: "stale",
			})
		})
		expect(undoDepth(result.current.activeBufferRuntime!.state)).toBe(1)
	})
	it("publishes runtime identity and rejects generation drift even after undo restores the body", async () => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const live = result.current.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "z.org",
		)!
		const row = agendaRow(source, "z.org", live.bufferId, true)
		const bound = {
			...row,
			origin: {
				...row.origin!,
				workspaceSessionId: result.current.workspaceSessionId!,
				runtimeIncarnation: live.runtimeIncarnation,
				sourceGeneration: live.sourceGeneration,
			},
		}
		const editor = attachRuntime(live.runtime, result.current, "agenda-generation")
		act(() => {
			editor.view.dispatch({ changes: { from: source.length, insert: "body edit\n" } })
		})
		const edited = result.current.liveBuffers.find((buffer) => buffer.bufferId === live.bufferId)!
		expect(edited.runtimeIncarnation).toBe(live.runtimeIncarnation)
		expect(edited.sourceGeneration).toBe(live.runtime.revision)
		expect(edited.sourceGeneration).toBeGreaterThan(live.sourceGeneration)
		const editRevision = live.runtime.revision
		const editDepth = undoDepth(live.runtime.state)
		await act(async () => {
			expect(await result.current.executeAgendaCommand(bound, { kind: "cycle-todo" })).toEqual({ kind: "stale" })
		})
		expect(live.runtime.revision).toBe(editRevision)
		expect(undoDepth(live.runtime.state)).toBe(editDepth)
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(live.runtime.source).toBe(source)
		const undoRevision = live.runtime.revision
		const undoHistory = undoDepth(live.runtime.state)
		await act(async () => {
			expect(await result.current.executeAgendaCommand(bound, { kind: "cycle-todo" })).toEqual({ kind: "stale" })
		})
		expect(live.runtime.revision).toBe(undoRevision)
		expect(undoDepth(live.runtime.state)).toBe(undoHistory)
		const fresh = result.current.liveBuffers.find((buffer) => buffer.bufferId === live.bufferId)!
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand({
					...bound,
					origin: {
						...bound.origin,
						runtimeIncarnation: "retired-runtime",
						sourceGeneration: fresh.sourceGeneration,
					},
				}, { kind: "cycle-todo" }),
			).toEqual({ kind: "stale" })
			expect(
				await result.current.executeAgendaCommand({
					...bound,
					origin: { ...bound.origin, sourceGeneration: fresh.sourceGeneration },
				}, { kind: "cycle-todo" }),
			).toEqual({ kind: "confirmed" })
		})
		editor.dispose()
	})
	it.each([
		"schedule",
		"deadline",
	] as const)("planning %s: publishes runtime identity and rejects generation drift even after undo restores the body", async (field) => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const live = result.current.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "z.org",
		)!
		const row = agendaRow(source, "z.org", live.bufferId, true)
		const bound = {
			...row,
			origin: {
				...row.origin!,
				workspaceSessionId: result.current.workspaceSessionId!,
				runtimeIncarnation: live.runtimeIncarnation,
				sourceGeneration: live.sourceGeneration,
			},
		}
		const editor = attachRuntime(live.runtime, result.current, "agenda-generation")
		act(() => {
			editor.view.dispatch({ changes: { from: source.length, insert: "body edit\n" } })
		})
		const edited = result.current.liveBuffers.find((buffer) => buffer.bufferId === live.bufferId)!
		expect(edited.runtimeIncarnation).toBe(live.runtimeIncarnation)
		expect(edited.sourceGeneration).toBe(live.runtime.revision)
		expect(edited.sourceGeneration).toBeGreaterThan(live.sourceGeneration)
		const editRevision = live.runtime.revision
		const editDepth = undoDepth(live.runtime.state)
		await act(async () => {
			expect(await result.current.prepareAgendaCommand(bound, field)).toEqual({ kind: "stale" })
		})
		expect(live.runtime.revision).toBe(editRevision)
		expect(undoDepth(live.runtime.state)).toBe(editDepth)
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(live.runtime.source).toBe(source)
		const undoRevision = live.runtime.revision
		const undoHistory = undoDepth(live.runtime.state)
		await act(async () => {
			expect(await result.current.prepareAgendaCommand(bound, field)).toEqual({ kind: "stale" })
		})
		expect(live.runtime.revision).toBe(undoRevision)
		expect(undoDepth(live.runtime.state)).toBe(undoHistory)
		const fresh = result.current.liveBuffers.find((buffer) => buffer.bufferId === live.bufferId)!
		await act(async () => {
			expect(
				await result.current.prepareAgendaCommand(
					{
						...bound,
						origin: {
							...bound.origin,
							runtimeIncarnation: "retired-runtime",
							sourceGeneration: fresh.sourceGeneration,
						},
					},
					field,
				),
			).toEqual({ kind: "stale" })
			expect(
				await result.current.prepareAgendaCommand(
					{
						...bound,
						origin: { ...bound.origin, sourceGeneration: fresh.sourceGeneration },
					},
					field,
				),
			).toMatchObject({ kind: "ready", date: null })
		})
		editor.dispose()
	})
	it.each([
		"schedule",
		"deadline",
	] as const)("command %s: publishes runtime identity and rejects generation drift even after undo restores the body", async (field) => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const live = result.current.liveBuffers.find(
			(buffer) => buffer.document.relativePath === "z.org",
		)!
		const row = agendaRow(source, "z.org", live.bufferId, true)
		const bound = {
			...row,
			origin: {
				...row.origin!,
				workspaceSessionId: result.current.workspaceSessionId!,
				runtimeIncarnation: live.runtimeIncarnation,
				sourceGeneration: live.sourceGeneration,
			},
		}
		const editor = attachRuntime(live.runtime, result.current, "agenda-generation")
		act(() => {
			editor.view.dispatch({ changes: { from: source.length, insert: "body edit\n" } })
		})
		const edited = result.current.liveBuffers.find((buffer) => buffer.bufferId === live.bufferId)!
		expect(edited.runtimeIncarnation).toBe(live.runtimeIncarnation)
		expect(edited.sourceGeneration).toBe(live.runtime.revision)
		expect(edited.sourceGeneration).toBeGreaterThan(live.sourceGeneration)
		const editRevision = live.runtime.revision
		const editDepth = undoDepth(live.runtime.state)
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(bound, { kind: field, date: "2026-07-09" }),
			).toEqual({ kind: "stale" })
		})
		expect(live.runtime.revision).toBe(editRevision)
		expect(undoDepth(live.runtime.state)).toBe(editDepth)
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(live.runtime.source).toBe(source)
		const undoRevision = live.runtime.revision
		const undoHistory = undoDepth(live.runtime.state)
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(bound, { kind: field, date: "2026-07-09" }),
			).toEqual({ kind: "stale" })
		})
		expect(live.runtime.revision).toBe(undoRevision)
		expect(undoDepth(live.runtime.state)).toBe(undoHistory)
		const fresh = result.current.liveBuffers.find((buffer) => buffer.bufferId === live.bufferId)!
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(
					{
						...bound,
						origin: {
							...bound.origin,
							runtimeIncarnation: "retired-runtime",
							sourceGeneration: fresh.sourceGeneration,
						},
					},
					{ kind: field, date: "2026-07-09" },
				),
			).toEqual({ kind: "stale" })
			expect(
				await result.current.executeAgendaCommand(
					{
						...bound,
						origin: { ...bound.origin, sourceGeneration: fresh.sourceGeneration },
					},
					{ kind: field, date: "2026-07-09" },
				),
			).toEqual({ kind: "confirmed" })
		})
		editor.dispose()
	})
	it("refuses disk rows when unrelated unsaved body edits leave their anchors intact", async () => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		act(() => {
			result.current.updateContent(source + "unrelated body edit\n")
		})
		const before = result.current.content
		await act(async () => {
			expect(await result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" })).toEqual({ kind: "stale" })
		})
		expect(result.current.content).toBe(before)
	})
	it("rejects foreign sessions before reading unopened disk entries", async () => {
		const { result } = await setup()
		vi.mocked(openOrgDocumentFlow).mockClear()
		const row = agendaRow("* TODO task\n<2026-07-01 Wed>\n")
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand({
					...row,
					origin: {
						...row.origin!,
						workspaceSessionId: "old-session",
					},
				}, { kind: "cycle-todo" }),
			).toEqual({ kind: "stale" })
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("aborts an unopened read, releases only its busy owner, and ignores its late G1 body", async () => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		let settle!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(openOrgDocumentFlow).mockReturnValue(
			() =>
				new Promise((resolve) => {
					settle = resolve
				}),
		)
		const controller = new AbortController()
		let command!: Promise<unknown>
		act(() => {
			command = result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" }, controller.signal)
		})
		expect(result.current.isWorkspaceBusy).toBe(true)
		act(() => {
			controller.abort()
		})
		expect(result.current.isLoading).toBe(false)
		// Cancellation settles independently of the unresolved native read.
		await act(async () => {
			expect(await command).toEqual({ kind: "stale" })
		})
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			settle(E.right({ content: source, relativePath: "z.org", revision: "z-1" }))
		})
		expect(result.current.liveBuffers).toEqual([])
		expect(result.current.workspaceSessionId).toBe("G2")
		expect(result.current.isLoading).toBe(false)
	})
	it.each([
		"schedule",
		"deadline",
	] as const)("planning %s: aborts an unopened read, releases only its busy owner, and ignores its late G1 body", async (field) => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		let settle!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(openOrgDocumentFlow).mockReturnValue(
			() =>
				new Promise((resolve) => {
					settle = resolve
				}),
		)
		const controller = new AbortController()
		let command!: Promise<unknown>
		act(() => {
			command = result.current.prepareAgendaCommand(agendaRow(source), field, controller.signal)
		})
		expect(result.current.isWorkspaceBusy).toBe(true)
		act(() => {
			controller.abort()
		})
		expect(result.current.isLoading).toBe(false)
		// Cancellation settles independently of the unresolved native read.
		await act(async () => {
			expect(await command).toEqual({ kind: "stale" })
		})
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			settle(E.right({ content: source, relativePath: "z.org", revision: "z-1" }))
		})
		expect(result.current.liveBuffers).toEqual([])
		expect(result.current.workspaceSessionId).toBe("G2")
		expect(result.current.isLoading).toBe(false)
	})
	it("ignores a cancelled read's late G1 failure without releasing the next read owner", async () => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		let failFirst!: (error: Error) => void
		let settleSecond!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(openOrgDocumentFlow)
			.mockReturnValueOnce(
				() =>
					new Promise((_resolve, reject) => {
						failFirst = reject
					}),
			)
			.mockReturnValueOnce(
				() =>
					new Promise((resolve) => {
						settleSecond = resolve
					}),
			)
		const controller = new AbortController()
		let first!: Promise<unknown>
		act(() => {
			first = result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" }, controller.signal)
		})
		act(() => {
			controller.abort()
		})
		await act(async () => {
			expect(await first).toEqual({ kind: "stale" })
		})
		let second!: Promise<unknown>
		act(() => {
			second = result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" })
		})
		await act(async () => {
			failFirst(new Error("late G1 read failure"))
		})
		expect(result.current.isWorkspaceBusy).toBe(true)
		expect(result.current.error).toBeNull()
		expect(result.current.liveBuffers).toHaveLength(1)
		await act(async () => {
			settleSecond(E.right({ content: source, relativePath: "z.org", revision: "z-1" }))
			expect(await second).toEqual({ kind: "confirmed" })
		})
		expect(result.current.isLoading).toBe(false)
		expect(result.current.liveBuffers).toHaveLength(2)
	})
	it.each([
		"schedule",
		"deadline",
	] as const)("preparation %s: ignores a cancelled read's late G1 failure without releasing the next read owner", async (field) => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		let failFirst!: (error: Error) => void
		let settleSecond!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(openOrgDocumentFlow)
			.mockReturnValueOnce(
				() =>
					new Promise((_resolve, reject) => {
						failFirst = reject
					}),
			)
			.mockReturnValueOnce(
				() =>
					new Promise((resolve) => {
						settleSecond = resolve
					}),
			)
		const controller = new AbortController()
		let first!: Promise<unknown>
		act(() => {
			first = result.current.prepareAgendaCommand(agendaRow(source), field, controller.signal)
		})
		act(() => {
			controller.abort()
		})
		await act(async () => {
			expect(await first).toEqual({ kind: "stale" })
		})
		let second!: Promise<unknown>
		act(() => {
			second = result.current.prepareAgendaCommand(agendaRow(source), field)
		})
		await act(async () => {
			failFirst(new Error("late G1 read failure"))
		})
		expect(result.current.isWorkspaceBusy).toBe(true)
		expect(result.current.error).toBeNull()
		expect(result.current.liveBuffers).toHaveLength(1)
		await act(async () => {
			settleSecond(E.right({ content: source, relativePath: "z.org", revision: "z-1" }))
			expect(await second).toMatchObject({ kind: "ready", date: null })
		})
		expect(result.current.isLoading).toBe(false)
		expect(result.current.liveBuffers).toHaveLength(1)
	})
	it("retains a confirmed canonical command when its mirror observer aborts reentrantly", async () => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const source = "#+TODO: NEXT | FINISHED\r\n* NEXT 😀 task\r\n<2026-07-01 Wed>\r\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({
				content: source,
				relativePath: "z.org",
				revision: "z-1",
			}),
		)
		const controller = new AbortController()
		const unsubscribe = observed.reservoir.subscribe(() => {
			if (observed.reservoir.read(observed.scope, "z.org")?.isDirty) controller.abort()
		})
		await act(async () => {
			expect(await result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" }, controller.signal)).toEqual({
				kind: "confirmed",
			})
		})
		unsubscribe()
		expect(controller.signal.aborted).toBe(true)
		const buffer = result.current.liveBuffers.find(
			(copy) => copy.document.relativePath === "z.org",
		)!
		expect(buffer.runtime.source).toBe(source.replace("* NEXT", "* FINISHED"))
		expect(buffer.content).toBe(buffer.runtime.source)
		expect(buffer.isDirty).toBe(true)
		expect(undoDepth(buffer.runtime.state)).toBe(1)
		expect(nativeState.hasDirtyBuffers).toBe(true)
		expect(result.current.isLoading).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("commands use the captured runtime ports' live active mirror after focus changes", async () => {
		const { result } = await setup()
		const source = "* TODO task\r\n<2026-07-01 Wed>\r\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({
				content: source,
				relativePath: "z.org",
				revision: "z-1",
			}),
		)
		await act(async () => {
			await result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" })
		})
		const parked = result.current.liveBuffers.find(
			(copy) => copy.document.relativePath === "z.org",
		)!
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		expect(result.current.activeBufferRuntime).toBe(parked.runtime)
		const raw = result.current.content
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(agendaRow(raw, "z.org", parked.bufferId, true), { kind: "cycle-todo" }),
			).toEqual({ kind: "confirmed" })
		})
		expect(result.current.content).toBe(source.replace("* TODO", "*"))
		expect(parked.runtime.source).toBe(result.current.content)
		expect(result.current.isDirty).toBe(true)
	})
	it("does not park or allocate command history for a mismatched disk revision", async () => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-2" }),
		)
		await act(async () => {
			expect(await result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" })).toEqual({ kind: "stale" })
		})
		expect(result.current.liveBuffers).toHaveLength(1)
		expect(result.current.isLoading).toBe(false)
		expect(nativeState.isBusy).toBe(false)
	})

	it.each([
		{
			_tag: "Invalid",
			right: { content: "* TODO task\n<2026-07-01 Wed>\n", relativePath: "z.org", revision: "z-1" },
		},
		{ _tag: "Right", right: null },
		{ _tag: "Right", right: { content: 42, relativePath: "z.org", revision: "z-1" } },
		{ _tag: "Right", right: { content: "", relativePath: "other.org", revision: "z-1" } },
		{ _tag: "Right", right: { content: "", relativePath: "z.org", revision: "" } },
	])("rejects malformed command reads before runtime or parked allocation: %j", async (response) => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const create = vi.spyOn(runtimeFactory, "createOrgBufferRuntime")
		const park = vi.spyOn(observed.reservoir, "park")
		const before = result.current.liveBuffers
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () => response as never)
		await act(async () => {
			expect(
				await result.current.executeAgendaCommand(agendaRow("* TODO task\n<2026-07-01 Wed>\n"), { kind: "cycle-todo" }),
			).toMatchObject({ kind: "rejected" })
		})
		expect(create).not.toHaveBeenCalled()
		expect(park).not.toHaveBeenCalled()
		expect(result.current.liveBuffers).toEqual(before)
		expect(result.current.isLoading).toBe(false)
		expect(nativeState.isBusy).toBe(false)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("retains a real failed-save pause after canonical undo restores baseline", async () => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current, "paused-agenda")
		act(() => editor.view.dispatch({ changes: { from: source.length, insert: "dirty body\n" } }))
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "uncertain write" } as never),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe(source)
		expect(result.current.isDirty).toBe(false)
		const generation = runtime.revision
		const depth = undoDepth(runtime.state)
		await act(async () => {
			expect(await result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" })).toMatchObject({
				kind: "rejected",
			})
			expect(
				await result.current.executeAgendaCommand(
					agendaRow(source, "z.org", result.current.activeBufferId!, true),
					{ kind: "cycle-todo" },
				),
			).toMatchObject({ kind: "rejected" })
			await vi.advanceTimersByTimeAsync(6000)
		})
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(generation)
		expect(undoDepth(runtime.state)).toBe(depth)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		editor.dispose()
	})
	it.each(
		planningOperations,
	)("planning %j: retains a real failed-save pause after canonical undo restores baseline", async (operation) => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current, "paused-agenda")
		act(() => editor.view.dispatch({ changes: { from: source.length, insert: "dirty body\n" } }))
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.left({ type: "IO_ERROR", message: "uncertain write" } as never),
		)
		await act(async () => {
			await result.current.saveDocument()
		})
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe(source)
		expect(result.current.isDirty).toBe(false)
		const generation = runtime.revision
		const depth = undoDepth(runtime.state)
		await act(async () => {
			expect(await runPlanning(result.current, agendaRow(source), operation)).toMatchObject({
				kind: "rejected",
			})
			expect(
				await runPlanning(
					result.current,
					agendaRow(source, "z.org", result.current.activeBufferId!, true),
					operation,
				),
			).toMatchObject({ kind: "rejected" })
			await vi.advanceTimersByTimeAsync(6000)
		})
		expect(runtime.source).toBe(source)
		expect(runtime.revision).toBe(generation)
		expect(undoDepth(runtime.state)).toBe(depth)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		editor.dispose()
	})
	it("requires complete live and disk command provenance before any read", async () => {
		const { result } = await setup()
		const source = "* TODO task\n<2026-07-01 Wed>\n"
		const disk = agendaRow(source)
		vi.mocked(openOrgDocumentFlow).mockClear()
		for (const key of [
			"workspaceSessionId",
			"sourceRevision",
			"diskRevision",
			"workspaceRoot",
			"capabilityToken",
			"timestamp",
			"heading",
		] as const) {
			await act(async () => {
				expect(
					await result.current.executeAgendaCommand({
						...disk,
						origin: { ...disk.origin!, [key]: undefined },
					}, { kind: "cycle-todo" }),
				).toEqual({ kind: "stale" })
			})
		}
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ content: source, relativePath: "z.org", revision: "z-1" }),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const live = agendaRow(source, "z.org", result.current.activeBufferId!, true)
		const runtime = result.current.activeBufferRuntime!
		vi.mocked(openOrgDocumentFlow).mockClear()
		for (const key of [
			"workspaceSessionId",
			"sourceRevision",
			"diskRevision",
			"runtimeIncarnation",
			"sourceGeneration",
		] as const) {
			for (const value of [undefined, key === "sourceGeneration" ? -1 : "tampered"]) {
				await act(async () => {
					expect(
						await result.current.executeAgendaCommand({
							...live,
							origin: { ...live.origin!, [key]: value },
						}, { kind: "cycle-todo" }),
					).toEqual({ kind: "stale" })
				})
			}
		}
		expect(runtime.source).toBe(source)
		expect(undoDepth(runtime.state)).toBe(0)
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it.each([
		"conflict",
		"pause",
	] as const)("late G1 %s refresh cannot deny a G2 exact-path Editor note permit", async (failure) => {
		const { result } = await setup()
		const oldRuntime = result.current.activeBufferRuntime!
		const oldEditor = attachRuntime(oldRuntime, result.current, "old-note-pane")
		const pendingRead = Promise.withResolvers<E.Either<never, OrgDocumentInterface>>()
		const read = vi.fn(() => pendingRead.promise)
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(read)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000)
		})
		expect(read).toHaveBeenCalledOnce()
		act(() => oldEditor.view.dispatch({ changes: { from: 0, insert: "dirty " } }))
		vi.mocked(useConfirm()).mockResolvedValue(true)
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current, "G2-note-pane")
		const permit = result.current.captureBufferWindowPermit("G2-note-pane", runtime.key.bufferId)
		expect(result.current.workspaceSessionId).toBe("G2")
		expect(permit()).toBe(true)
		const state = runtime.state
		await act(async () => {
			pendingRead.resolve(
				failure === "conflict"
					? E.right({ ...captured, revision: "late-G1-revision" })
					: E.left({ type: "IO_ERROR", message: "late G1 refresh failure" } as never),
			)
		})
		expect(permit()).toBe(true)
		expect(runtime.state).toBe(state)
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "inbox.org"),
		).toMatchObject({ hasConflict: false, autosavePaused: false })
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		editor.dispose()
		oldEditor.dispose()
	})

	it("captures exact window registrations without reviving revoked same-ID permits", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId!
		const missing = result.current.captureBufferWindowPermit("exact-pane", id)
		expect(missing()).toBe(false)
		const release = result.current.registerBufferWindow("exact-pane", id)
		const captured = result.current.captureBufferWindowPermit("exact-pane", id)
		expect(captured()).toBe(true)
		expect(missing()).toBe(false)
		expect(result.current.captureBufferWindowPermit("exact-pane", "wrong-buffer")()).toBe(false)
		release()
		expect(captured()).toBe(false)
		const replacementRelease = result.current.registerBufferWindow("exact-pane", id)
		const replacement = result.current.captureBufferWindowPermit("exact-pane", id)
		expect(captured()).toBe(false)
		expect(replacement()).toBe(true)
		release()
		expect(replacement()).toBe(true)
		const newerRelease = result.current.registerBufferWindow("exact-pane", id)
		expect(replacement()).toBe(false)
		expect(result.current.captureBufferWindowPermit("exact-pane", id)()).toBe(true)
		replacementRelease()
		newerRelease()
	})

	it("edits parked live buffers only through matching window leases and preserves history on focus", async () => {
		const { result } = await setup()
		const a = result.current.activeBufferRuntime!
		const aId = result.current.activeBufferId!
		const editor = attachRuntime(a, result.current, "pane-a", false)
		const releaseOld = result.current.registerBufferWindow("pane-a", aId)
		const release = result.current.registerBufferWindow("pane-a", aId)
		releaseOld() // stale cleanup cannot revoke a replacement lease
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const b = result.current.activeBufferRuntime!
		const bId = result.current.activeBufferId!
		act(() => {
			editor.view.dispatch({ changes: { from: 0, insert: "parked " } })
		})
		expect(result.current.content).toBe(captured.content)
		expect(result.current.liveBuffers.find((buffer) => buffer.bufferId === aId)).toMatchObject({
			content: `parked ${captured.content}`,
			isDirty: true,
		})
		expect(result.current.liveBuffers.find((buffer) => buffer.bufferId === aId)?.runtime).toBe(a)
		const depth = undoDepth(a.state)
		const reads = vi.mocked(openOrgDocumentFlow).mock.calls.length
		const activate = result.current.activateOpenBuffer
		act(() => {
			expect(activate(aId)).toBe(true)
			expect(activate(bId)).toBe(true)
			expect(activate(aId)).toBe(true)
		})
		expect(result.current.activeBufferRuntime).toBe(a)
		expect(result.current.content).toBe(`parked ${captured.content}`)
		expect(undoDepth(a.state)).toBe(depth)
		expect(result.current.liveBuffers.find((buffer) => buffer.bufferId === bId)?.runtime).toBe(b)
		expect(vi.mocked(openOrgDocumentFlow).mock.calls.length).toBe(reads)
		act(() => {
			expect(activate(bId)).toBe(true)
		})
		release()
		const before = a.source
		act(() => {
			expect(() => editor.view.dispatch({ changes: { from: 0, insert: "denied " } })).toThrow()
		})
		expect(a.source).toBe(before)
		const wrong = result.current.registerBufferWindow("pane-a", bId)
		act(() => {
			expect(() => editor.view.dispatch({ changes: { from: 0, insert: "wrong " } })).toThrow()
		})
		expect(a.source).toBe(before)
		wrong()
		editor.dispose()
	})

	it("revoked and rebound attached windows cannot edit/undo/redo either parked or focused A", async () => {
		const { result } = await setup()
		const a = result.current.activeBufferRuntime!
		const editor = attachRuntime(a, result.current, "revoked-A", false)
		const release = result.current.registerBufferWindow("revoked-A", a.key.bufferId)
		act(() => {
			editor.view.dispatch({
				changes: { from: 0, insert: "one " },
				annotations: isolateHistory.of("full"),
			})
			editor.view.dispatch({
				changes: { from: 0, insert: "two " },
				annotations: isolateHistory.of("full"),
			})
			expect(editor.handle.undo()).toBe(true)
		})
		expect(undoDepth(a.state)).toBe(1)
		expect(redoDepth(a.state)).toBe(1)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const bId = result.current.activeBufferId!
		release()
		const baseline = a.state
		const deny = () => {
			expect(() => editor.view.dispatch({ changes: { from: 0, insert: "denied " } })).toThrow(
				"Commit guard rejected source",
			)
			expect(() => editor.handle.undo()).toThrow("Commit guard rejected source")
			expect(() => editor.handle.redo()).toThrow("Commit guard rejected source")
			expect(a.state).toBe(baseline)
		}
		act(deny)
		act(() => {
			expect(result.current.activateOpenBuffer(a.key.bufferId)).toBe(true)
		})
		act(deny)
		const rebound = result.current.registerBufferWindow("revoked-A", bId)
		act(deny)
		act(() => {
			expect(result.current.activateOpenBuffer(bId)).toBe(true)
		})
		act(deny)
		rebound()
		editor.dispose()
	})

	it("parked history checks caller Y's lease independently of historical origin X selection", async () => {
		const { result } = await setup()
		const a = result.current.activeBufferRuntime!
		const x = attachRuntime(a, result.current, "history-X", false)
		const y = attachRuntime(a, result.current, "history-Y", false)
		const releaseX = result.current.registerBufferWindow("history-X", a.key.bufferId)
		let releaseY = result.current.registerBufferWindow("history-Y", a.key.bufferId)
		const original = a.source
		act(() => {
			x.view.dispatch({
				selection: EditorSelection.create(
					[EditorSelection.cursor(3), EditorSelection.cursor(6)],
					1,
				),
			})
			y.view.dispatch({ selection: { anchor: 1 } })
		})
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		act(() => {
			x.view.dispatch({
				changes: { from: 0, insert: "X " },
				selection: EditorSelection.create(
					[EditorSelection.cursor(5), EditorSelection.cursor(8)],
					1,
				),
			})
		})
		const edited = a.state
		releaseY()
		act(() => {
			expect(() => y.handle.undo()).toThrow("Commit guard rejected source")
		})
		expect(a.state).toBe(edited)
		releaseY = result.current.registerBufferWindow("history-Y", a.key.bufferId)
		releaseX()
		act(() => {
			expect(y.handle.undo()).toBe(true)
		})
		expect(a.source).toBe(original)
		expect(x.view.state.selection.ranges.map((range) => range.anchor)).toEqual([3, 6])
		expect(x.view.state.selection.mainIndex).toBe(1)
		expect(a.state.selection.eq(x.view.state.selection)).toBe(true)
		expect(y.view.state.selection.main.anchor).toBe(1)
		act(() => {
			expect(y.handle.redo()).toBe(true)
		})
		expect(a.source).toBe(`X ${original}`)
		expect(x.view.state.selection.ranges.map((range) => range.anchor)).toEqual([5, 8])
		expect(a.state.selection.eq(x.view.state.selection)).toBe(true)
		releaseY()
		x.dispose()
		y.dispose()
	})


	it("fences reentrant focus and parked edits during source notification", async () => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const a = result.current.activeBufferRuntime!
		const aId = result.current.activeBufferId!
		const editor = attachRuntime(a, result.current, "pane-a", false)
		const release = result.current.registerBufferWindow("pane-a", aId)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		let focusDenied = false
		let commitDenied = false
		const stop = observed.reservoir.subscribe(() => {
			focusDenied = !result.current.activateOpenBuffer(aId)
			try {
				editor.view.dispatch({ changes: { from: 0, insert: "reentrant " } })
			} catch {
				commitDenied = true
			}
		})
		act(() => {
			editor.view.dispatch({ changes: { from: 0, insert: "accepted " } })
		})
		expect(focusDenied).toBe(true)
		expect(commitDenied).toBe(true)
		expect(a.source).toBe(`accepted ${captured.content}`)
		stop()
		release()
		editor.dispose()
	})

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
		vi.mocked(useConfirm()).mockResolvedValue(true)
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
	it("authorizes fresh legacy updates without a window lease or history but denies bare source commits", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const oldUpdate = result.current.updateContent
		expect(() => runtime.applyControllerSource(runtime.source, "bare")).toThrow(
			"Commit guard rejected source",
		)
		act(() => {
			result.current.updateContent("legacy body")
		})
		expect(runtime.source).toBe("legacy body")
		expect(result.current.content).toBe("legacy body")
		expect(undoDepth(runtime.state)).toBe(0)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		act(() => {
			oldUpdate("stale legacy body")
		})
		expect(runtime.source).toBe("legacy body")
		expect(result.current.content).toBe(captured.content)
	})

	it("mirrors a runtime edit synchronously before native close and save capture", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current)
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
		const first = attachRuntime(runtime, result.current)
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
		const second = attachRuntime(runtime, result.current)
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
		const first = attachRuntime(runtime, result.current)
		const second = attachRuntime(runtime, result.current, "second-window")
		const firstPermit = result.current.captureBufferWindowPermit("workspace-test", runtime.key.bufferId)
		const oldIncarnation = result.current.liveBuffers.find((buffer) => buffer.runtime === runtime)!.runtimeIncarnation
		expect(firstPermit()).toBe(true)
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
		expect(firstPermit()).toBe(true)
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
		expect(firstPermit()).toBe(false)
		expect(result.current.captureBufferWindowPermit("workspace-test", fresh.key.bufferId)()).toBe(false)
		expect(result.current.liveBuffers.find((buffer) => buffer.runtime === fresh)!.runtimeIncarnation).not.toBe(oldIncarnation)
		expect(fresh.source).toBe(replacement)
		expect(undoDepth(fresh.state)).toBe(0)
		expect(redoDepth(fresh.state)).toBe(0)
		expect(fresh.adoptLegacyState(oldHistory)).toBe(false)
		expect(() => first.view.dispatch({ changes: { from: 0, insert: "stale" } })).toThrow()
		expect(() => second.view.dispatch({ changes: { from: 0, insert: "stale" } })).toThrow()
		expect(() => runtime.applyControllerSource(saved, replacement)).toThrow()
		expect(result.current.content).toBe(replacement)
		expect(result.current.isDirty).toBe(false)
		const releaseFresh = result.current.registerBufferWindow("workspace-test", fresh.key.bufferId)
		const freshPermit = result.current.captureBufferWindowPermit("workspace-test", fresh.key.bufferId)
		expect(freshPermit()).toBe(true)
		first.dispose()
		second.dispose()
		expect(freshPermit()).toBe(true)
		expect(firstPermit()).toBe(false)
		releaseFresh()
		expect(freshPermit()).toBe(false)
	})
	it("retains dirty parked working body and history on an unknown disk replacement", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current)
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
		const editor = attachRuntime(runtime, result.current)
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
	it("restores the approved default workspace after mount-effect replay without reviving retired callbacks", async () => {
		setDefaultWorkspacePreference(true)
		vi.mocked(reopenDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
		const hook = renderHook(() => useOrgWorkspace(), {
			wrapper: ({ children }) => createElement(StrictMode, null, children),
		})
		await act(async () => {
			await Promise.resolve()
		})
		expect(hook.result.current.workspaceSessionId).toBe("G1")
		expect(hook.result.current.isLoading).toBe(false)
		await act(async () => {
			expect(await hook.result.current.openDocumentPath("inbox.org")).toBe(true)
		})
		expect(hook.result.current.content).toBe(captured.content)
		const runtime = hook.result.current.activeBufferRuntime!
		const permitRelease = hook.result.current.registerBufferWindow("replayed-pane", runtime.key.bufferId)
		const permit = hook.result.current.captureBufferWindowPermit("replayed-pane", runtime.key.bufferId)
		expect(permit()).toBe(true)
		hook.unmount()
		expect(permit()).toBe(false)
		expect(runtime.closed).toBe(true)
		permitRelease()
	})

	it("closes retired and old-grant runtimes and mints a fresh reopened identity", async () => {
		const { result, unmount } = await setup()
		const first = result.current.activeBufferRuntime!
		const releaseFirst = result.current.registerBufferWindow("retired-pane", first.key.bufferId)
		const firstPermit = result.current.captureBufferWindowPermit("retired-pane", first.key.bufferId)
		await act(async () => {
			expect(await result.current.closeActiveDocument()).toBe(true)
		})
		expect(first.closed).toBe(true)
		expect(firstPermit()).toBe(false)
		releaseFirst()
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
		const releaseNext = result.current.registerBufferWindow("unmount-pane", next.key.bufferId)
		const nextPermit = result.current.captureBufferWindowPermit("unmount-pane", next.key.bufferId)
		expect(nextPermit()).toBe(true)
		unmount()
		expect(next.closed).toBe(true)
		expect(nextPermit()).toBe(false)
		releaseNext()
	})
	it("releases both exact grants when scope retirement unmounts the owner before replacement activation", async () => {
		const observed = observeParkedReservoir()
		const hook = await setup()
		const first = hook.result.current.activeBufferRuntime!
		await act(async () => {
			await hook.result.current.openDocumentPath("z.org")
		})
		const second = hook.result.current.activeBufferRuntime!
		const retained = hook.result.current
		const release = retained.registerBufferWindow("retirement-pane", second.key.bufferId)
		const permit = retained.captureBufferWindowPermit("retirement-pane", second.key.bufferId)
		let retired = false
		const stopObserving = observed.reservoir.subscribe(() => {
			if (!retired && observed.reservoir.getSnapshot().copies.length === 0) {
				retired = true
				hook.unmount()
			}
		})
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			await retained.openDefaultWorkspace()
		})
		expect(retired).toBe(true)
		expect(first.closed).toBe(true)
		expect(second.closed).toBe(true)
		expect(permit()).toBe(false)
		expect(vi.mocked(releaseOrgWorkspace).mock.calls.filter(([, token]) => token === "G1")).toHaveLength(1)
		expect(vi.mocked(releaseOrgWorkspace).mock.calls.filter(([, token]) => token === "G2")).toHaveLength(1)
		await act(async () => {
			expect(await retained.openDocumentPath("inbox.org")).toBe(false)
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(watchOrgWorkspace).not.toHaveBeenCalledWith(workspace.rootPath, "G2")
		stopObserving()
		release()
	})

	it("allows runtime typing during own save without installing the older ACK body", async () => {
		const { result } = await setup()
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current)
		act(() => editor.view.dispatch({ changes: { from: 0, insert: "first " } }))
		const saving = runtime.source
		let resolve!: (value: E.Either<never, OrgDocumentInterface>) => void
		vi.mocked(saveOrgDocumentFlow).mockReturnValue(
			() =>
				new Promise((done) => {
					resolve = done
				}),
		)
		let pending!: Promise<boolean>
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
		const editor = attachRuntime(runtime, result.current)
		act(() => {
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe("")
		expect(result.current.content).toBe("")
		expect(result.current.isDirty).toBe(true)
		editor.dispose()
	})
	it("rejects unleased direct runtime writes independently of a loading read", async () => {
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

	it("publishes one authoritative source per path throughout synchronous parked handoff notifications", async () => {
		const observed = observeParkedReservoir()
		const { result } = await setup()
		const raw = "* Target\r\nbody\0😀"
		vi.mocked(openOrgDocumentFlow).mockImplementation(
			(input) => async () => E.right(
				input.relativePath === "z.org"
					? { relativePath: "z.org", revision: "z-1", content: raw }
					: captured,
			),
		)
		await act(async () => {
			expect(await result.current.openDocumentPath("z.org")).toBe(true)
		})
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current, "snapshot-handoff")
		act(() => editor.view.dispatch({ changes: { from: 0, insert: "working\r\n" } }))
		const before = runtime.state
		const generation = runtime.revision
		const sourcesBeforeHandoff = new Map(result.current.liveBuffers.map((buffer) => [
			buffer.document.relativePath,
			{ runtime: buffer.runtime, incarnation: buffer.runtimeIncarnation },
		]))
		const snapshots: (readonly OrgLiveBuffer[])[] = []
		const stop = observed.reservoir.subscribe(() => {
			snapshots.push(snapshotSources())
		})
		try {
			await act(async () => {
				expect(await result.current.openDocumentPath("inbox.org")).toBe(true)
			})
			expect(snapshots[0]?.map((buffer) => buffer.document.relativePath).sort())
				.toEqual(["inbox.org", "z.org"])
			expect(snapshots.at(-1)?.map((buffer) => buffer.document.relativePath))
				.toEqual(["z.org"])
			for (const snapshot of snapshots) {
				const paths = snapshot.map((buffer) => buffer.document.relativePath)
				expect(new Set(paths).size).toBe(paths.length)
				for (const buffer of snapshot) {
					const previous = sourcesBeforeHandoff.get(buffer.document.relativePath)!
					expect(buffer.runtime).toBe(previous.runtime)
					expect(buffer.runtimeIncarnation).toBe(previous.incarnation)
				}
				expect(snapshot.find((buffer) => buffer.document.relativePath === "z.org")).toMatchObject({
					content: "working\r\n" + raw,
					sourceGeneration: generation,
				})
			}
			expect(result.current.activeDocument?.relativePath).toBe("inbox.org")
			expect(result.current.liveBuffers.map((buffer) => buffer.document.relativePath).sort())
				.toEqual(["inbox.org", "z.org"])
			expect(runtime.state).toBe(before)
			expect(undoDepth(runtime.state)).toBe(1)
			expect(redoDepth(runtime.state)).toBe(0)
			expect(result.current.liveBuffers.find((buffer) => buffer.document.relativePath === "z.org")?.runtime)
				.toBe(runtime)
			act(() => { expect(editor.handle.undo()).toBe(true) })
			expect(runtime.source).toBe(raw)
			expect(result.current.liveBuffers.find((buffer) => buffer.document.relativePath === "z.org")?.content)
				.toBe(raw)
			expect(undoDepth(runtime.state)).toBe(0)
			expect(redoDepth(runtime.state)).toBe(1)
			act(() => { expect(editor.handle.redo()).toBe(true) })
			expect(runtime.source).toBe("working\r\n" + raw)
			expect(undoDepth(runtime.state)).toBe(1)
			expect(redoDepth(runtime.state)).toBe(0)
			await act(async () => {
				expect(await result.current.openDocumentPath("z.org")).toBe(true)
			})
			expect(result.current.activeBufferRuntime).toBe(runtime)
			expect(result.current.content).toBe("working\r\n" + raw)
			expect(runtime.closed).toBe(false)
			expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		} finally {
			stop()
			editor.dispose()
		}
	})

	it("rejects a live link target's edit/undo ABA without navigating or losing parked history", async () => {
		const { result } = await setup()
		const diskTarget = {
			relativePath: "z.org",
			revision: "z-1",
			content: "* Target\r\n:PROPERTIES:\r\n:ID: parked-id\r\n:END:\r\nbody\r\n",
		}
		vi.mocked(openOrgDocumentFlow).mockImplementation(
			(input) => async () => E.right(input.relativePath === "z.org" ? diskTarget : captured),
		)
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		const runtime = result.current.activeBufferRuntime!
		const editor = attachRuntime(runtime, result.current, "link-target")
		act(() => editor.view.dispatch({ changes: { from: 0, insert: "working\r\n" } }))
		await act(async () => {
			await result.current.openDocumentPath("inbox.org")
		})
		const before = runtime.source
		const generation = runtime.revision
		const evaluated = deferred<void>()
		const finish = deferred<void>()
		vi.mocked(resolveOrgLinkTargetFlow).mockImplementation((grant, target, overlays, repository, cache, metadata, signal) => {
			const task = productionResolveLink(grant, target, overlays, repository, cache ?? new Map(), metadata, signal)
			return async () => {
				const resolved = await task()
				evaluated.resolve()
				await finish.promise
				return resolved
			}
		})
		vi.mocked(openOrgDocumentFlow).mockClear()
		let navigating!: Promise<boolean>
		await act(async () => {
			navigating = result.current.openOrgLink({ kind: "id", relativePath: null, value: "parked-id" })
			await evaluated.promise
		})
		act(() => {
			editor.view.dispatch({ changes: { from: editor.view.state.doc.length, insert: "ABA" }, annotations: isolateHistory.of("full") })
			expect(editor.handle.undo()).toBe(true)
		})
		expect(runtime.source).toBe(before)
		expect(runtime.revision).toBeGreaterThan(generation)
		await act(async () => {
			finish.resolve()
			expect(await navigating).toBe(false)
		})
		expect(result.current.activeDocument?.relativePath).toBe("inbox.org")
		expect(result.current.revealTarget).toBeNull()
		expect(result.current.error).toContain("target changed")
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(undoDepth(runtime.state)).toBe(1)
		expect(redoDepth(runtime.state)).toBe(1)
		editor.dispose()
	})

	it("rejects a disk link result when an agenda command creates its canonical parked working copy", async () => {
		const { result } = await setup()
		const source = "* TODO target\n<2026-07-01 Wed>\n"
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () =>
			E.right({ relativePath: "z.org", revision: "z-1", content: source }),
		)
		const evaluated = deferred<void>()
		const finish = deferred<void>()
		vi.mocked(resolveOrgLinkTargetFlow).mockImplementation((grant, target, overlays, repository, cache, metadata, signal) => {
			const task = productionResolveLink(grant, target, overlays, repository, cache ?? new Map(), metadata, signal)
			return async () => {
				const resolved = await task()
				evaluated.resolve()
				await finish.promise
				return resolved
			}
		})
		let navigating!: Promise<boolean>
		await act(async () => {
			navigating = result.current.openOrgLink({ kind: "file", relativePath: "z.org", value: null })
			await evaluated.promise
		})
		await act(async () => {
			expect(await result.current.executeAgendaCommand(agendaRow(source), { kind: "cycle-todo" }))
				.toEqual({ kind: "confirmed" })
		})
		const parked = result.current.liveBuffers.find((buffer) => buffer.document.relativePath === "z.org")!
		const state = parked.runtime.state
		await act(async () => {
			finish.resolve()
			expect(await navigating).toBe(false)
		})
		expect(result.current.activeDocument?.relativePath).toBe("inbox.org")
		expect(result.current.revealTarget).toBeNull()
		expect(parked.runtime.state).toBe(state)
		expect(parked.isDirty).toBe(true)
		expect(orgFileRepository.readDocument).not.toHaveBeenCalled()
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})
	it("looks up targets without state effects and forwards explicit heading selection", async () => {
		const { result } = await setup()
		const snapshot = createOrgRefileTargetSnapshot("z.org", "fresh", "preamble\n** Exact\r\nraw\0😀\r\n")
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
			snapshot,
			targetHeading: { from: 9, heading: "** Exact" },
		}
		vi.mocked(refileOrgSubtreeFlow).mockReturnValue(async () =>
			E.right({ source: captured, target: { ...captured, relativePath: "z.org" } }),
		)
		await act(async () => {
			await result.current.refileSubtree(0, "z.org", target)
		})
		expect(refileOrgSubtreeFlow).toHaveBeenCalledWith(
			expect.objectContaining({
				expectedTargetRevision: snapshot.revision, expectedTargetContent: snapshot.source,
				targetHeading: target.targetHeading, targetRelativePath: "z.org",
			}),
		)
	})
	it("cancels immediately without waiting for native IO and removes its listener", async () => {
		const { result } = await setup()
		let resolve!: (
			value: Awaited<ReturnType<ReturnType<typeof readOrgRefileTargetFlow>>>,
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
			resolve(E.right({ relativePath: "z.org", revision: "late", source: "", headings: [] }))
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
		pendingRead.resolve(E.right({ relativePath: "z.org", revision: "late", source: "", headings: [] }))
		expect((await pending).kind).toBe("rejected")
		expect(readOrgRefileTargetFlow).toHaveBeenCalledOnce()
	})

	it.each(["target-aba", "forged"] as const)("rejects a reviewed target %s despite identical path, revision and bytes before transfer IO", async (mode) => {
		const { result } = await setup()
		await act(async () => { expect(await result.current.openDocumentPath("z.org")).toBe(true) })
		const target = result.current.activeBufferRuntime!
		const targetDocument = result.current.activeDocument!
		await act(async () => { expect(await result.current.openDocumentPath("inbox.org")).toBe(true) })
		const source = result.current.activeBufferRuntime!
		vi.mocked(readOrgRefileTargetFlow).mockReturnValueOnce(async () =>
			E.right(createOrgRefileTargetSnapshot("z.org", targetDocument.revision, target.source)),
		)
		const lookup = await result.current.readRefileTarget("z.org")
		if (lookup.kind !== "ready") throw new Error(lookup.message)
		if (mode === "target-aba") {
			await act(async () => { expect(await result.current.closeDocumentPath("z.org")).toBe(true) })
			await act(async () => { expect(await result.current.openDocumentPath("z.org")).toBe(true) })
			expect(result.current.activeBufferRuntime).not.toBe(target)
			expect(result.current.content).toBe(lookup.snapshot.source)
			expect(result.current.activeDocument!.revision).toBe(lookup.snapshot.revision)
			await act(async () => { expect(await result.current.openDocumentPath("inbox.org")).toBe(true) })
		}
		const snapshot = mode === "forged"
			? createOrgRefileTargetSnapshot(lookup.snapshot.relativePath, lookup.snapshot.revision, lookup.snapshot.source)
			: lookup.snapshot
		await act(async () => {
			expect(await result.current.refileSubtree(0, "z.org", { snapshot })).toMatchObject({ kind: "rejected" })
		})
		expect(refileOrgSubtreeFlow).not.toHaveBeenCalled()
		expect(result.current.activeBufferRuntime).toBe(source)
		expect(source.source).toBe(captured.content)
		expect(target.source).toBe(lookup.snapshot.source)
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
			value: Awaited<ReturnType<ReturnType<typeof readOrgRefileTargetFlow>>>,
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
		resolve(E.right({ relativePath: "z.org", revision: "late", source: "", headings: [] }))
		expect(await pending).toMatchObject({ kind: "rejected" })
	})
	it.each([
		"lease",
		"close",
		"rename",
	])("rejects pending snapshots after source context changes: %s", async (action) => {
		const { result } = await setup()
		let resolve!: (
			value: Awaited<ReturnType<ReturnType<typeof readOrgRefileTargetFlow>>>,
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
				await result.current.moveDocument(result.current.activeDocument!, "renamed.org")
			})
		}
		resolve(E.right({ relativePath: "z.org", revision: "late", source: "", headings: [] }))
		expect(await pending).toMatchObject({ kind: "rejected" })
		expect(await oldReader("z.org")).toMatchObject({ kind: "rejected" })
		expect(readOrgRefileTargetFlow).toHaveBeenCalledTimes(1)
	})
	it("does not expose an older lookup after a newer request completes", async () => {
		const { result } = await setup()
		let resolve!: (
			value: Awaited<ReturnType<ReturnType<typeof readOrgRefileTargetFlow>>>,
		) => void
		vi.mocked(readOrgRefileTargetFlow).mockReturnValueOnce(
			() =>
				new Promise((r) => {
					resolve = r
				}),
		)
		const pending = result.current.readRefileTarget("z.org")
		vi.mocked(readOrgRefileTargetFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "z.org", revision: "new", source: "", headings: [] }),
		)
		expect(await result.current.readRefileTarget("z.org")).toMatchObject({ kind: "ready" })
		resolve(E.right({ relativePath: "z.org", revision: "old", source: "", headings: [] }))
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
			await result.current.captureEntry({ entryType: "entry", entrySource: "* Entry\n", target: { kind: "file", relativePath: path } })
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
				snapshot: createOrgRefileTargetSnapshot("z.org", "<missing>", ""),
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
			expect(setter("draft", true)).toBe(true)
			expect(setter("draft", true)).toBe(true)
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
		act(() => expect(setter("draft", false)).toBe(true))
		expect(nativeState.hasDirtyBuffers).toBe(false)
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		act(() => expect(result.current.setTransientDirty("draft", true)).toBe(true))
		act(() => {
			expect(setter("draft", false)).toBe(false)
			expect(setter("old-draft", true)).toBe(false)
		})
		expect(nativeState.hasDirtyBuffers).toBe(true)
		await act(async () => {
			expect(await staleCapture({ entryType: "entry", entrySource: "* Old", target: { kind: "file", relativePath: "inbox.org" } })).toMatchObject({ kind: "rejected" })
		})
		expect(captureOrgEntryFlow).not.toHaveBeenCalled()
	})
	it("protects the captured file from compatibility edits until its accepted write settles", async () => {
		const { result } = await setup()
		const pending = deferred<Awaited<ReturnType<ReturnType<typeof captureOrgEntryFlow>>>>()
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(() => pending.promise)
		let capturing!: ReturnType<typeof result.current.captureEntry>
		act(() => {
			capturing = result.current.captureEntry({ entryType: "entry", entrySource: "* New", target: { kind: "file", relativePath: "inbox.org" } })
		})
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
			expect(await result.current.captureEntry({ entryType: "entry", entrySource: "* New", target: { kind: "file", relativePath: "inbox.org" } })).toMatchObject({
				kind: "rejected",
			})
		})
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		await act(async () => {
			expect(await result.current.captureEntry({ entryType: "entry", entrySource: "* New", target: { kind: "file", relativePath: "inbox.org" } })).toMatchObject({
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
		const editor = attachRuntime(runtime, result.current)
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
			if (operation === "captureEntry") await result.current.captureEntry({ entryType: "entry", entrySource: "* Added\n", target: { kind: "file", relativePath: "inbox.org" } })
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
					? result.current.captureEntry({ entryType: "entry", entrySource: "* Added", target: { kind: "file", relativePath: "inbox.org" } })
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
			expect(await result.current.captureEntry({ entryType: "entry", entrySource: "* New", target: { kind: "file", relativePath: "inbox.org" } })).toEqual({ kind: "success" })
		})
		await act(async () => {
			await result.current.openDocumentPath("z.org")
		})
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(async () =>
			E.right({ ...captured, content: "parked captured", revision: "parked" }),
		)
		await act(async () => {
			await result.current.captureEntry({ entryType: "entry", entrySource: "* New", target: { kind: "file", relativePath: "inbox.org" } })
		})
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "inbox.org")
				?.baseRevision,
		).toBe("parked")
		vi.mocked(captureOrgEntryFlow).mockReturnValueOnce(async () =>
			E.right({ ...captured, relativePath: "new.org" }),
		)
		await act(async () => {
			await result.current.captureEntry({ entryType: "entry", entrySource: "* New", target: { kind: "file", relativePath: "new.org" } })
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
			expect(await result.current.captureEntry({ entryType: "entry", entrySource: "* Captured", target: { kind: "file", relativePath: "inbox.org" } })).toMatchObject({
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
			expect(await result.current.captureEntry({ entryType: "entry", entrySource: "* Retry", target: { kind: "file", relativePath: "inbox.org" } })).toMatchObject({
				kind: "rejected",
			})
			await result.current.openDefaultWorkspace()
		})
		expect(openDefaultOrgWorkspaceFlow).toHaveBeenCalledTimes(1)
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
			await result.current.captureEntry({ entryType: "entry", entrySource: "* Entry", target: { kind: "file", relativePath: "inbox.org" } })
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
			expect((await result.current.captureEntry({ entryType: "entry", entrySource: "* New", target: { kind: "file", relativePath: "inbox.org" } })).kind).toBe(
				mode === "rejected" ? "rejected" : "uncertain",
			)
		})
		expect(nativeState.isBusy).toBe(false)
		expect(nativeState.hasDirtyBuffers).toBe(mode !== "rejected")
		if (mode === "rejected")
			await act(async () => {
				expect(await result.current.captureEntry({ entryType: "entry", entrySource: "* Fixed", target: { kind: "file", relativePath: "inbox.org" } })).toEqual({
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
		vi.mocked(useConfirm()).mockResolvedValue(false)
		vi.mocked(watchOrgWorkspace).mockReturnValue(async () => E.right("watch-G1"))
		vi.mocked(unwatchOrgWorkspace).mockReturnValue(async () => E.right(undefined))
		vi.mocked(releaseOrgWorkspace).mockReturnValue(async () => E.right(undefined))
		window.localStorage.clear()
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () => E.right(workspace))
		vi.mocked(openOrgDocumentFlow).mockReturnValue(async () => E.right(captured))
		vi.mocked(refileOrgSubtreeFlow).mockReturnValue(async () => E.right(moved))
		vi.mocked(archiveOrgSubtreeFlow).mockReturnValue(async () =>
			E.right({ ...moved, target: { ...moved.target, relativePath: "inbox_archive.org" } }),
		)
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
			expect(await result.current.archiveSubtree(0)).toMatchObject({ kind: "rejected" })
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			expect(await result.current.archiveSubtree(0)).toMatchObject({ kind: "rejected" })
			await result.current.openDocument(workspace.documents[1])
		})
		act(() => result.current.updateContent("dirty"))
		await act(async () => {
			expect(await result.current.refileSubtree(0, "archive.org")).toMatchObject({
				kind: "rejected",
			})
		})
		expect(result.current.content).toBe("dirty")
		expect(result.current.activeBufferRuntime?.source).toBe("dirty")
		expect(result.current.isDirty).toBe(true)
		expect(result.current.activeDocument).toEqual(captured)
		expect(result.current.error).toEqual(expect.any(String))
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
			).toMatchObject({ kind: "rejected" })
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
			relativePath: operation === "archive" ? "inbox_archive.org" : "archive.org",
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
			expect(await result.current.archiveSubtree(0)).toMatchObject({ kind: "rejected" })
		})
		act(() => result.current.updateContent("newer input"))
		await act(async () => {
			transfer.resolve(E.right(moved))
			expect(await outcome).toEqual({ kind: "success" })
		})
		expect(result.current.content).toBe(moved.source.content)
		expect(result.current.isDirty).toBe(false)
		expect(result.current.activeDocument).toEqual(moved.source)
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
		vi.mocked(useConfirm()).mockResolvedValue(false)
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
		expect(result.current.isWorkspaceBusy).toBe(true)
		act(() => controller.abort())
		// Cancellation must release loading while the IO promise is still pending.
		expect(result.current.isWorkspaceBusy).toBe(false)
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
		expect(result.current.isWorkspaceBusy).toBe(true)
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
		expect(result.current.isWorkspaceBusy).toBe(true)
		act(() => controller.abort())
		expect(result.current.isWorkspaceBusy).toBe(true)
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
		expect(result.current.isWorkspaceBusy).toBe(true)
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

	it("preserves an independent save commit when navigation is canceled", async () => {
		const { result } = await setup()
		const save = deferred<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => save.promise)
		act(() => result.current.updateContent("saved edits"))
		let saving: Promise<boolean> | undefined
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
		vi.mocked(useConfirm()).mockResolvedValue(true)
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

	it("reveals without changing dirty buffers or accepting unscanned targets, and reports opener failure", async () => {
		const { result } = await parkDirtyA()
		const runtime = result.current.activeBufferRuntime
		const buffers = result.current.openBuffers
		vi.mocked(revealOrgWorkspacePathFlow).mockReturnValue(async () => E.right(undefined))
		await act(async () => {
			expect(await result.current.revealWorkspacePath(null)).toBe(true)
			expect(await result.current.revealWorkspacePath(a.relativePath)).toBe(true)
			expect(await result.current.revealWorkspacePath("../outside.org")).toBe(false)
		})
		expect(result.current.activeBufferRuntime).toBe(runtime)
		expect(result.current.openBuffers).toEqual(buffers)
		vi.mocked(revealOrgWorkspacePathFlow).mockReturnValue(async () => E.left(fileError))
		await act(async () => {
			expect(await result.current.revealWorkspacePath(a.relativePath)).toBe(false)
		})
		expect(result.current.error).toBe(fileError.message)
		expect(result.current.activeBufferRuntime).toBe(runtime)
	})

	it("returns creation acceptance only after success and rejects failed or retired creation", async () => {
		const { result } = await setup()
		const retired = result.current
		vi.mocked(createOrgDirectoryFlow).mockReturnValue(async () => E.left(fileError))
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () => E.left(fileError))
		await act(async () => {
			expect(await result.current.createDirectory("blocked")).toBe(false)
			expect(await result.current.createDocument("blocked.org")).toBe(false)
		})
		vi.mocked(createOrgDirectoryFlow).mockReturnValue(async () => E.right(undefined))
		await act(async () => {
			expect(await result.current.createDirectory("accepted")).toBe(true)
			expect(await result.current.createDocument("accepted.org")).toBe(true)
		})
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			expect(await retired.createDirectory("retired")).toBe(false)
			expect(await retired.createDocument("retired.org")).toBe(false)
			expect(await retired.revealWorkspacePath(null)).toBe(false)
		})
	})

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

	it("aborted explicit open releases only its target read and cannot activate late", async () => {
		const { result } = await parkDirtyA()
		const id = result.current.openBuffers.find(
			(buffer) => buffer.relativePath === a.relativePath,
		)!.bufferId
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		const controller = new AbortController()
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.openDocumentPath(a.relativePath, undefined, controller.signal)
		})
		expect(result.current.getBufferEffectState(id)?.loading).toBe(true)
		act(() => controller.abort())
		expect(result.current.getBufferEffectState(id)?.loading).toBe(false)
		await act(async () => {
			read.resolve(E.right(a))
			expect(await opening).toBe(false)
		})
		expect(result.current.activeDocument?.relativePath).toBe(b.relativePath)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("closing the parked target during a read cancels activation by logical ID", async () => {
		const { result } = await setup()
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		const read = deferred<Awaited<ReturnType<ReturnType<typeof openOrgDocumentFlow>>>>()
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(() => read.promise)
		let opening!: Promise<boolean>
		act(() => {
			opening = result.current.openDocumentPath(a.relativePath)
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
			opening = result.current.openDocumentPath(a.relativePath)
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
		vi.mocked(deleteOrgDocumentFlow).mockImplementationOnce((input) => async () => E.right({
			sourceRelativePath: input.relativePath,
			relativePath: `.grain-originals/deleted/${input.relativePath}`,
			kind: "delete",
			object: "original",
		}))
		await act(async () => {
			await result.current.deleteDocument(result.current.activeDocument!)
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
			run: (controller: OrgWorkspaceController) =>
				controller.moveDocument(controller.activeDocument!, "other.org"),
		},
		{
			name: "delete",
			flow: deleteOrgDocumentFlow,
			run: (controller: OrgWorkspaceController) => controller.deleteDocument(controller.activeDocument!),
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

	it("retains a failed A save after independent B navigation and permits a later owned A save", async () => {
		const { result } = await setup()
		act(() => result.current.updateContent("retained input"))
		const old = result.current
		const runtime = old.activeBufferRuntime!
		const write = deferred<E.Either<OrgFileError, OrgDocumentWriteResultInterface>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => write.promise)
		let saving!: Promise<boolean>
		act(() => { saving = old.saveDocument() })
		await act(async () => {
			expect(await result.current.openDocumentPath(b.relativePath)).toBe(true)
		})
		await act(async () => {
			write.reject(new Error("unknown write outcome"))
			expect(await saving).toBe(false)
		})
		expect(result.current.content).toBe(b.content)
		expect(runtime.source).toBe("retained input")
		expect(result.current.openBuffers.find((buffer) => buffer.bufferId === runtime.key.bufferId))
			.toMatchObject({ isDirty: true, hasConflict: true, baseRevision: a.revision })
		await act(async () => {
			expect(await old.saveDocument()).toBe(true)
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(expect.objectContaining({
			relativePath: a.relativePath,
			content: "retained input",
			expectedRevision: a.revision,
		}))
		expect(result.current.content).toBe(b.content)
		expect(result.current.liveBuffers.find((buffer) => buffer.runtime === runtime))
			.toMatchObject({ isDirty: false, document: { content: "retained input", revision: "saved" } })
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
		expect(result.current.isWorkspaceBusy).toBe(true)
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

	it("rejects old A compatibility editor callbacks after B navigation and after ABA navigation", async () => {
		const { result } = await setup()
		const old = result.current
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		act(() => old.updateContent("wrong A input"))
		expect(result.current.content).toBe(b.content)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		act(() => old.updateContent("stale ABA input"))
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
		expect(vi.mocked(releaseOrgWorkspace).mock.calls.filter(([, token]) => token === "lease-1")).toHaveLength(1)
		expect(hook.result.current.workspaceSessionId).toBe("lease-2")
		hook.unmount()
		expect(releaseOrgWorkspace).toHaveBeenCalledWith(workspace.rootPath, "lease-2")
		expect(vi.mocked(releaseOrgWorkspace).mock.calls.filter(([, token]) => token === "lease-2")).toHaveLength(1)
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
			if (command === "delete") await retained.deleteDocument(a)
			if (command === "capture") await retained.captureTodo("old A", a.relativePath)
			if (command === "move") await retained.moveDocument(a, "moved.org")
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
		const retainedDelete = result.current.deleteDocument
		act(() => result.current.updateContent("saved A body"))
		await act(async () => {
			await result.current.saveDocument()
		})
		vi.mocked(deleteOrgDocumentFlow).mockImplementationOnce((input) => async () => E.right({
			sourceRelativePath: input.relativePath,
			relativePath: `.grain-originals/deleted/${input.relativePath}`,
			kind: "delete",
			object: "original",
		}))
		await act(async () => {
			await retainedDelete(result.current.activeDocument!)
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
			await retained.deleteDocument(a)
			await retained.moveDocument(a, "old-move.org")
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
		vi.mocked(useConfirm()).mockResolvedValue(false)
		vi.mocked(openDefaultOrgWorkspaceFlow).mockClear()
		await act(async () => {
			await retainedOpen()
		})
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

	const parkAutosaveA = async () => {
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValue(async () => E.right({
			...workspace,
			documents: [{ relativePath: a.relativePath, revision: a.revision }, workspace.documents[0]],
		}))
		return parkDirtyA()
	}
	it("keeps active and parked input unsaved when autosave is off, cancels queued admission, and still permits manual Save", async () => {
		useSettings.setState({ autoSave: false })
		const { result } = await parkAutosaveA()
		act(() => result.current.updateContent("B explicitly unsaved"))
		await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		act(() => useSettings.setState({ autoSave: true }))
		await act(async () => { await vi.advanceTimersByTimeAsync(400) })
		act(() => useSettings.setState({ autoSave: false }))
		await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(result.current.liveBuffers.find(buffer => buffer.document.relativePath === a.relativePath)).toMatchObject({
			content: "A edits", isDirty: true, document: { content: a.content, revision: a.revision },
		})
		expect(result.current.content).toBe("B explicitly unsaved")
		expect(result.current.isDirty).toBe(true)
		await act(async () => { expect(await result.current.saveDocument()).toBe(true) })
		expect(result.current.activeDocument).toMatchObject({ content: "B explicitly unsaved", revision: "saved" })
		expect(result.current.isDirty).toBe(false)
		expect(result.current.liveBuffers.find(buffer => buffer.document.relativePath === a.relativePath)?.isDirty).toBe(true)
	})

	it("keeps dirty input unsaved when the persisted quiet interval is a numeric-looking string", async () => {
		useSettings.setState({ autoSaveInterval: "3" as unknown as number })
		const { result } = await parkAutosaveA()
		act(() => result.current.updateContent("B retained with invalid saved interval"))
		await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(result.current.liveBuffers.find(buffer => buffer.document.relativePath === a.relativePath)).toMatchObject({
			content: "A edits", isDirty: true, document: { content: a.content, revision: a.revision },
		})
		expect(result.current.content).toBe("B retained with invalid saved interval")
		expect(result.current.isDirty).toBe(true)
	})

	it("rearms already queued input for a changed configured quiet interval", async () => {
		const { result } = await parkAutosaveA()
		await act(async () => { await vi.advanceTimersByTimeAsync(400) })
		act(() => useSettings.setState({ autoSaveInterval: 3 }))
		await act(async () => { await vi.advanceTimersByTimeAsync(2999) })
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(result.current.liveBuffers.find(buffer => buffer.document.relativePath === a.relativePath)?.isDirty).toBe(true)
		await act(async () => { await vi.advanceTimersByTimeAsync(1) })
		expect(result.current.liveBuffers.find(buffer => buffer.document.relativePath === a.relativePath)).toMatchObject({
			content: "A edits", isDirty: false, document: { content: "A edits", revision: "saved" },
		})
		expect(result.current.activeDocument).toMatchObject({ relativePath: b.relativePath, content: b.content, revision: b.revision })
	})


	it("autosaves quiet parked input while another buffer keeps receiving edits", async () => {
		const { result } = await parkAutosaveA()
		const aRuntime = result.current.liveBuffers.find((buffer) => buffer.document.relativePath === a.relativePath)!.runtime
		await act(async () => { await vi.advanceTimersByTimeAsync(400) })
		act(() => result.current.updateContent("B first input"))
		await act(async () => { await vi.advanceTimersByTimeAsync(300) })
		act(() => result.current.updateContent("B second input"))
		await act(async () => { await vi.advanceTimersByTimeAsync(300) })
		expect(result.current.liveBuffers.find((buffer) => buffer.runtime === aRuntime)).toMatchObject({
			content: "A edits", isDirty: false, document: { content: "A edits", revision: "saved" },
		})
		expect(result.current.activeDocument?.relativePath).toBe(b.relativePath)
		expect(result.current.content).toBe("B second input")
		expect(result.current.isDirty).toBe(true)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith(expect.objectContaining({
			relativePath: a.relativePath, content: "A edits", expectedRevision: a.revision,
		}))
		await act(async () => { await vi.advanceTimersByTimeAsync(699) })
		expect(result.current.isDirty).toBe(true)
		await act(async () => { await vi.advanceTimersByTimeAsync(1) })
		expect(result.current.isDirty).toBe(false)
		expect(result.current.activeDocument).toMatchObject({ content: "B second input", revision: "saved" })
	})

	it("retains parked typing and its undo when an inactive autosave ACKs an older snapshot", async () => {
		const { result } = await parkAutosaveA()
		const runtime = result.current.liveBuffers.find((buffer) => buffer.document.relativePath === a.relativePath)!.runtime
		const release = result.current.registerBufferWindow("inactive-autosave", runtime.key.bufferId)
		let handle!: OrgBufferWindowHandle
		const view = new EditorView({
			state: EditorState.create({ doc: runtime.state.doc, extensions: runtime.historyFreeSourceExtensions }),
			dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
		})
		handle = runtime.attachWindow({ windowId: "inactive-autosave", view })
		try {
			const pending = Promise.withResolvers<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
			vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
			await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
			expect(result.current.isEditorReadOnly).toBe(false)
			act(() => {
				useSettings.setState({ autoSave: false })
				view.dispatch({ changes: { from: view.state.doc.length, insert: " tail" } })
				result.current.updateContent("B concurrent input")
			})
			await act(async () => { pending.resolve(E.right({ relativePath: a.relativePath, revision: "saved-A" })) })
			expect(result.current.liveBuffers.find((buffer) => buffer.runtime === runtime)).toMatchObject({
				content: "A edits tail", isDirty: true, document: { content: "A edits", revision: "saved-A" },
			})
			expect(result.current.content).toBe("B concurrent input")
			act(() => { expect(handle.undo()).toBe(true) })
			expect(runtime.source).toBe("A edits")
			expect(result.current.liveBuffers.find((buffer) => buffer.runtime === runtime)?.isDirty).toBe(false)
			expect(result.current.content).toBe("B concurrent input")
		} finally {
			release()
			handle.detach()
			view.destroy()
		}
	})

	it("pauses only the failed inactive autosave and still saves another dirty buffer", async () => {
		const { result } = await parkAutosaveA()
		act(() => result.current.updateContent("B eligible input"))
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(async () => E.left(fileError))
		await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
		await act(async () => { await vi.advanceTimersByTimeAsync(1) })
		expect(result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath)).toMatchObject({
			isDirty: true, hasConflict: true, autosavePaused: true, baseRevision: a.revision,
		})
		expect(result.current.liveBuffers.find((buffer) => buffer.document.relativePath === a.relativePath)?.content).toBe("A edits")
		expect(result.current.activeDocument).toMatchObject({ relativePath: b.relativePath, content: "B eligible input" })
		expect(result.current.isDirty).toBe(false)
		const blocker = vi.mocked(useBlocker).mock.calls.at(-1)?.[0] as unknown as {
			enableBeforeUnload: boolean
		}
		vi.mocked(useConfirm()).mockResolvedValue(false)
		expect(blocker.enableBeforeUnload).toBe(true)
		await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
	})

	it("retains file-owned autosave confirmation across memory-only focus and unrelated B input", async () => {
		const { result } = await parkAutosaveA()
		const pending = Promise.withResolvers<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
		const id = result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath)!.bufferId
		act(() => result.current.updateContent("B input while A saves"))
		act(() => { expect(result.current.activateOpenBuffer(id)).toBe(true) })
		await act(async () => {
			pending.resolve(E.right({ relativePath: a.relativePath, revision: "saved-A" }))
		})
		expect(result.current.activeDocument?.relativePath).toBe(a.relativePath)
		expect(result.current.content).toBe("A edits")
		expect(result.current.activeDocument).toMatchObject({ content: "A edits", revision: "saved-A" })
		expect(result.current.isDirty).toBe(false)
		expect(result.current.liveBuffers.find((buffer) => buffer.document.relativePath === b.relativePath)).toMatchObject({
			content: "B input while A saves", isDirty: true, document: { content: b.content },
		})
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
			await result.current.moveDocument(result.current.activeDocument!, a.relativePath)
		})
		expect(captureOrgTodoFlow).not.toHaveBeenCalled()
		expect(moveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === a.relativePath)?.isDirty,
		).toBe(true)
	})

	it("serializes inactive close on its own file and retains newer active input", async () => {
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
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(captureOrgTodoFlow).not.toHaveBeenCalled()
		expect(openDefaultOrgWorkspaceFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			write.resolve(E.right({ relativePath: a.relativePath, revision: "saved" }))
			expect(await closing).toBe(true)
		})
		expect(result.current.content).toBe("new B input")
		expect(result.current.isDirty).toBe(true)
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

	it("rejects a slow navigation after ABA source edits without replacing the canonical buffer", async () => {
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
			expect(await opening).toBe(false)
		})
		expect(result.current.activeDocument).toEqual(a)
		expect(result.current.content).toBe(a.content)
		expect(result.current.openBuffers).toHaveLength(1)
		expect(saveOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("preserves a newer active edit while an in-flight save advances its baseline and rejects waiting navigation", async () => {
		const { result } = await setup()
		act(() => result.current.updateContent("persist this"))
		const write = deferred<Awaited<ReturnType<ReturnType<typeof saveOrgDocumentFlow>>>>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => write.promise)
		let saving!: Promise<boolean>
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
		await act(async () => { await Promise.resolve() })
		expect(result.current.isLoading).toBe(true)
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

	it("isolates same-root/path identities and runtime incarnations from retained G1 lifecycle callbacks", async () => {
		const { result } = await setup()
		const old = result.current
		const oldId = old.activeBufferId!
		const oldRuntime = old.activeBufferRuntime!
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({ ...workspace, capabilityToken: "G2" }),
		)
		await act(async () => {
			await result.current.openDefaultWorkspace()
		})
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		const id = result.current.activeBufferId!
		const runtime = result.current.activeBufferRuntime!
		expect(id).not.toBe(oldId)
		expect(runtime).not.toBe(oldRuntime)
		vi.mocked(openOrgDocumentFlow).mockClear()
		vi.mocked(moveOrgDocumentFlow).mockClear()
		vi.mocked(deleteOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(await old.switchBuffer(id)).toBe(false)
			expect(await old.closeDocumentPath(a.relativePath)).toBe(false)
			expect(await old.closeActiveDocument()).toBe(false)
			await old.moveDocument(a, "stale.org")
			await old.deleteDocument(a)
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		expect(moveOrgDocumentFlow).not.toHaveBeenCalled()
		expect(deleteOrgDocumentFlow).not.toHaveBeenCalled()
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.activeBufferRuntime).toBe(runtime)
		expect(result.current.openBuffers).toHaveLength(1)
		await act(async () => {
			expect(await result.current.closeActiveDocument()).toBe(true)
		})
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		expect(result.current.activeBufferId).not.toBe(id)
		expect(result.current.activeBufferRuntime).not.toBe(runtime)
	})

	it("retires a clean externally removed active identity before reopening the same path", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId!
		const runtime = result.current.activeBufferRuntime!
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValueOnce(async () =>
			E.right({ ...workspace, documents: [] }),
		)
		await act(async () => {
			await result.current.refreshWorkspace()
		})
		expect(result.current.openBuffers).toEqual([])
		expect(result.current.activeBufferId).toBeNull()
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(false)
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
		vi.mocked(scanOrgWorkspaceFlow).mockReturnValueOnce(async () => E.right(workspace))
		await act(async () => {
			await result.current.refreshWorkspace()
		})
		await act(async () => {
			expect(await result.current.openDocumentPath(a.relativePath)).toBe(true)
		})
		expect(result.current.activeBufferId).not.toBeNull()
		expect(result.current.activeBufferRuntime).not.toBeNull()
		expect(result.current.activeBufferId).not.toBe(id)
		expect(result.current.activeBufferRuntime).not.toBe(runtime)
	})

	it("retires an approved clean destination before preserving the source rename identity", async () => {
		const { result } = await setup()
		const sourceId = result.current.activeBufferId!
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		const destinationId = result.current.activeBufferId!
		await act(async () => {
			await result.current.openDocumentPath(a.relativePath)
		})
		vi.mocked(moveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: b.relativePath, revision: "moved" }),
		)
		await act(async () => {
			await result.current.moveDocument(result.current.activeDocument!, b.relativePath)
		})
		expect(result.current.activeBufferId).toBe(sourceId)
		expect(result.current.openBuffers).toHaveLength(1)
		expect(result.current.openBuffers[0]).toMatchObject({
			bufferId: sourceId,
			relativePath: b.relativePath,
		})
		vi.mocked(openOrgDocumentFlow).mockClear()
		await act(async () => {
			expect(await result.current.switchBuffer(destinationId)).toBe(false)
		})
		expect(openOrgDocumentFlow).not.toHaveBeenCalled()
	})

	it("retains the logical buffer ID when renaming the active document", async () => {
		const { result } = await setup()
		const id = result.current.activeBufferId
		vi.mocked(moveOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ relativePath: "renamed.org", revision: a.revision }),
		)
		await act(async () => {
			await result.current.moveDocument(result.current.activeDocument!, "renamed.org")
		})
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.openBuffers[0]?.relativePath).toBe("renamed.org")
		await act(async () => {
			await result.current.openDocumentPath(b.relativePath)
		})
		await act(async () => {
			expect(await result.current.switchBuffer(id!)).toBe(true)
		})
		expect(result.current.activeDocument?.relativePath).toBe("renamed.org")
		expect(result.current.content).toBe(a.content)
		expect(result.current.activeBufferId).toBe(id)
	})
})

describe("Org save-all snapshot transaction", () => {
	const documents = ["a.org", "b.org", "c.org"].map((relativePath) => ({
		relativePath,
		revision: `${relativePath}-1`,
		content: `base ${relativePath}`,
	}))
	type SaveResult = E.Either<OrgFileError, OrgDocumentWriteResultInterface>
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetAllMocks()
		vi.mocked(useConfirm()).mockResolvedValue(false)
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
	it("ACKs the live same-ID parked mirror after deferred batch write without losing newer input", async () => {
		const { result } = await setup(2)
		const id = result.current.openBuffers.find(
			(buffer) => buffer.relativePath === "a.org",
		)!.bufferId
		const runtime = result.current.liveBuffers.find((buffer) => buffer.bufferId === id)!.runtime
		const editor = attachRuntime(runtime, result.current, "saveall-newer-parked")
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let saving!: ReturnType<typeof result.current.saveAllDocuments>
		act(() => {
			saving = result.current.saveAllDocuments()
		})
		act(() => editor.view.dispatch({
			changes: { from: 0, to: editor.view.state.doc.length, insert: "newest parked body" },
		}))
		const newerState = runtime.state
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "ack" }))
			expect(await saving).toMatchObject({ kind: "partial", remainingDirtyPaths: ["a.org"] })
		})
		expect(runtime.state).toBe(newerState)
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "a.org"),
		).toMatchObject({ bufferId: id, baseRevision: "ack", isDirty: true, hasConflict: false })
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ ...documents[0], content: "edited a.org", revision: "ack" }),
		)
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(true)
		})
		expect(result.current.content).toBe("newest parked body")
		expect(result.current.activeDocument).toMatchObject({
			content: "edited a.org",
			revision: "ack",
		})
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({ content: "newest parked body", expectedRevision: "ack" }),
		)
		editor.dispose()
	})
	it("rejects real active transactions, undo and known installations during Save All parked ACK notification", async () => {
		const observed = observeParkedReservoir()
		const createRuntime = runtimeFactory.createOrgBufferRuntime
		const commits = vi.fn()
		vi.spyOn(runtimeFactory, "createOrgBufferRuntime").mockImplementation((options) =>
			createRuntime({
				...options,
				onCommit: (commit) => {
					commits(commit)
					options.onCommit(commit)
				},
			}),
		)
		const createRegistry = registryFactory.createOrgWorkspaceRuntimeRegistry
		let registry!: ReturnType<typeof createRegistry>
		vi.spyOn(registryFactory, "createOrgWorkspaceRuntimeRegistry").mockImplementation(() => {
			registry = createRegistry()
			return registry
		})
		const { result } = await setup(2)
		const runtime = result.current.activeBufferRuntime!
		let handle!: OrgBufferWindowHandle
		const view = new EditorView({
			state: EditorState.create({
				doc: runtime.state.doc,
				extensions: runtime.historyFreeSourceExtensions,
			}),
			dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
		})
		const release = result.current.registerBufferWindow("ack-reentrancy", runtime.key.bufferId)
		handle = runtime.attachWindow({ windowId: "ack-reentrancy", view })
		act(() => view.dispatch({ changes: { from: 0, insert: "typed " } }))
		const source = runtime.source
		const state = runtime.state
		const revision = runtime.revision
		const depth = undoDepth(state)
		expect(depth).toBeGreaterThan(0)
		const parked = observed.reservoir.read(observed.scope, "a.org")!
		const parkedRuntime = registry.get({ ...runtime.key, bufferId: parked.bufferId })!
		const parkedState = parkedRuntime.state
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let saving!: ReturnType<typeof result.current.saveAllDocuments>
		act(() => {
			saving = result.current.saveAllDocuments()
		})
		commits.mockClear()
		const listener = vi.fn(() => {
			expect(observed.reservoir.canMutate()).toBe(false)
			expect(() => view.dispatch({ changes: { from: 0, insert: "nested " } })).toThrow(
				"Commit guard rejected source",
			)
			expect(() => handle.undo()).toThrow("Commit guard rejected source")
			expect(() => registry.install(runtime.key, "nested active installation")).toThrow(
				"Commit guard rejected source",
			)
			expect(() => registry.install(parkedRuntime.key, "nested parked installation")).toThrow(
				"Commit guard rejected source",
			)
			expect(runtime.state).toBe(state)
			expect(runtime.source).toBe(source)
			expect(runtime.revision).toBe(revision)
			expect(undoDepth(runtime.state)).toBe(depth)
			expect(redoDepth(runtime.state)).toBe(0)
			expect(parkedRuntime.state).toBe(parkedState)
			expect(commits).not.toHaveBeenCalled()
			// Rejection must not roll back the receipt already published to observers.
			expect(observed.reservoir.read(observed.scope, "a.org")).toMatchObject({
				document: { content: "edited a.org", revision: "ack" },
				isDirty: false,
			})
		})
		const stop = observed.reservoir.subscribe(listener)
		try {
			await act(async () => {
				pending.resolve(E.right({ relativePath: "a.org", revision: "ack" }))
				expect(await saving).toMatchObject({ kind: "success", remainingDirtyPaths: [] })
			})
			expect(listener).toHaveBeenCalledOnce()
			expect(commits).not.toHaveBeenCalled()
			expect(result.current.content).toBe(source)
			expect(result.current.activeDocument?.content).toBe(source)
			expect(runtime.state).toBe(state)
			expect(view.state.doc.toString()).toBe(source)
			expect(result.current.openBuffers.every((buffer) => !buffer.isDirty)).toBe(true)
			expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
				expect.objectContaining({
					relativePath: "b.org",
					content: source,
				}),
			)
			// No accepted mirror/phantom edit: the next real undo still consumes the original event.
			act(() => {
				expect(handle.undo()).toBe(true)
			})
			expect(runtime.source).toBe("edited b.org")
			expect(result.current.content).toBe("edited b.org")
			expect(result.current.isDirty).toBe(true)
		} finally {
			stop()
			handle.detach()
			release()
			view.destroy()
		}
	})
	it("subscribes the real root to parked receipts and fences reentrant foreign retirement", async () => {
		const observed = observeParkedReservoir()
		const { result } = await setup(2)
		const { reservoir, scope } = observed
		const parked = reservoir.read(scope, "a.org")!
		const foreign = { sessionId: scope.sessionId, grant: {} }
		let nestedClose!: Promise<boolean>
		const listener = vi.fn(() => {
			nestedClose = result.current.closeDocumentPath("a.org")
			result.current.updateContent("nested active input")
			const snapshot = reservoir.getSnapshot()
			expect(reservoir.retire(foreign, parked.bufferId)).toBe(false)
			expect(reservoir.retire(scope, parked.bufferId)).toBe(false)
			expect(reservoir.getSnapshot()).toBe(snapshot)
		})
		const stop = reservoir.subscribe(listener)
		act(() => {
			reservoir.mirrorReplacement(scope, parked.bufferId, {
				previous: parked.content,
				source: parked.document.content,
			})
		})
		expect(listener).toHaveBeenCalledOnce()
		expect(await nestedClose).toBe(false)
		expect(
			result.current.openBuffers.find((buffer) => buffer.bufferId === parked.bufferId)?.isDirty,
		).toBe(false)
		expect(result.current.content).toBe("edited b.org")
		expect(result.current.error).toContain("reentrant")
		stop()
	})
	it.each([
		"same-revision",
		"new-revision",
	])("rejects parked batch baseline drift (%s) without overwriting and latches conflict", async (mode) => {
		const observed = observeParkedReservoir()
		const { result } = await setup(2)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		const parked = observed.reservoir.read(observed.scope, "a.org")!
		let saving!: ReturnType<typeof result.current.saveAllDocuments>
		act(() => {
			saving = result.current.saveAllDocuments()
		})
		const drift = {
			...documents[0],
			content: "drift under same ID",
			revision: mode === "same-revision" ? "a.org-1" : "new-revision",
		}
		act(() => {
			observed.reservoir.installConfirmedBaseline(observed.scope, parked.bufferId, parked, {
				document: drift,
				isDirty: true,
			})
		})
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "must-not-install" }))
			expect(await saving).toMatchObject({
				kind: "rejected",
				remainingDirtyPaths: ["a.org", "b.org"],
			})
		})
		expect(observed.reservoir.read(observed.scope, "a.org")?.document).toEqual(drift)
		expect(parked.content).toBe("edited a.org")
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "a.org"),
		).toMatchObject({ baseRevision: drift.revision, hasConflict: true })
		expect(result.current.error).not.toBeNull()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})
	it.each([
		"same-revision",
		"new-revision",
	])("rejects active batch baseline drift (%s) instead of overwriting", async (mode) => {
		const { result } = await setup(1)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let saving!: ReturnType<typeof result.current.saveAllDocuments>
		act(() => {
			saving = result.current.saveAllDocuments()
		})
		// Simulate baseline corruption after capture without adding production authority.
		const baseline = result.current.activeDocument as { content: string; revision: string }
		baseline.content = "drift"
		if (mode === "new-revision") baseline.revision = "new-revision"
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "must-not-install" }))
			await saving
		})
		expect(result.current.activeDocument?.content).toBe("drift")
		expect(result.current.content).toBe("edited a.org")
		expect(result.current.openBuffers[0].hasConflict).toBe(true)
		baseline.content = "base a.org"
		baseline.revision = "a.org-1"
	})
	it.each([
		[2, "revision"],
		[2, "content"],
		[2, "relativePath"],
		[2, "logicalID"],
		[3, "revision"],
		[3, "content"],
		[3, "relativePath"],
		[3, "logicalID"],
	] as const)("stops before a later member write on baseline/lease drift (count %s, %s)", async (count, drift) => {
		const observed = observeParkedReservoir()
		const { result } = await setup(count)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		const flow = vi.spyOn(saveAllFlow, "saveAllOrgDocumentsFlow")
		let ids!: Map<string, string>
		const get = Map.prototype.get
		const mapSpy = vi.spyOn(Map.prototype, "get").mockImplementation(function (
			this: Map<unknown, unknown>,
			key: unknown,
		) {
			const value = get.call(this, key)
			if (
				key === "b.org" &&
				typeof value === "string" &&
				value ===
					result.current.openBuffers.find((buffer) => buffer.relativePath === "b.org")?.bufferId
			)
				ids = this as Map<string, string>
			return value
		})
		let saving!: ReturnType<typeof result.current.saveAllDocuments>
		act(() => {
			saving = result.current.saveAllDocuments()
		})
		mapSpy.mockRestore()
		const captures = flow.mock.calls[0][0]
		const captured = captures[1].document
		expect(Object.isFrozen(captured)).toBe(true)
		expect(captured).not.toBe(documents[1])
		expect(captured).toMatchObject({
			relativePath: "b.org",
			revision: "b.org-1",
			content: "base b.org",
		})
		const original = { ...documents[1] }
		const id = ids.get("b.org")!
		try {
			if (drift === "logicalID") ids.set("b.org", "replacement-logical-ID")
			else if (count === 3) {
				const parked = observed.reservoir.read(observed.scope, "b.org")!
				// Paths cannot be corrupted through this port; replace the baseline instead.
				act(() => {
					observed.reservoir.installConfirmedBaseline(observed.scope, parked.bufferId, parked, {
						document: {
							...parked.document,
							[drift === "relativePath" ? "revision" : drift]: `mutated ${drift}`,
						},
						isDirty: true,
					})
				})
			} else documents[1][drift] = `mutated ${drift}`
			expect(captured).toEqual(original)
			await act(async () => {
				pending.resolve(E.right({ relativePath: "a.org", revision: "first-confirmed" }))
				expect(await saving).toMatchObject({ kind: "partial", savedPaths: ["a.org"] })
			})
			expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
			expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
				expect.objectContaining({ relativePath: "a.org", expectedRevision: "a.org-1" }),
			)
			expect(
				result.current.workspace?.documents.find((document) => document.relativePath === "a.org")
					?.revision,
			).toBe("first-confirmed")
			if (count === 2) expect(result.current.content).toBe("edited b.org")
			else
				expect(
					result.current.openBuffers.find((buffer) => buffer.relativePath === "b.org")?.isDirty,
				).toBe(true)
			await act(async () => {
				await vi.advanceTimersByTimeAsync(1000)
			})
			expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		} finally {
			Object.assign(documents[1], original)
			ids.set("b.org", id)
		}
	})
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
		let saving!: Promise<boolean>
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
			await result.current.moveDocument(result.current.activeDocument!, "renamed.org")
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
			vi.mocked(useConfirm()).mockResolvedValueOnce(true)
			vi.mocked(deleteOrgDocumentFlow).mockImplementationOnce((input) => async () => E.right({
				sourceRelativePath: input.relativePath,
				relativePath: `.grain-originals/deleted/${input.relativePath}`,
				kind: "delete",
				object: "original",
			}))
			await act(async () => {
				await result.current.deleteDocument(result.current.activeDocument!)
			})
		} else {
			vi.mocked(useConfirm()).mockResolvedValueOnce(true)
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
	it("owns native Busy throughout deferred writes and retains newer typing", async () => {
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
			expect(await result.current.closeDocumentPath("a.org")).toBe(false)
			expect(await result.current.closeActiveDocument()).toBe(false)
			await result.current.saveDocument()
			await result.current.captureTodo("todo", "a.org")
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
		let saving!: Promise<boolean>
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
	it("is a clean no-op and rejects stale same-root G1 callbacks", async () => {
		const { result } = await setup(1)
		act(() => result.current.updateContent("base a.org"))
		await act(async () => {
			await result.current.saveAllDocuments()
		})
		const oldGrant = result.current.saveAllDocuments
		vi.mocked(useConfirm()).mockResolvedValue(true)
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
	it("ordinary save ACKs the captured body without replacing newer input or disabling typing", async () => {
		const { result } = await setup(1)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let saving!: Promise<boolean>
		act(() => {
			saving = result.current.saveDocument()
		})
		expect(result.current.isEditorReadOnly).toBe(false)
		act(() => result.current.updateContent("newer body during write"))
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "ack" }))
			await saving
		})
		expect(result.current.activeDocument).toEqual({
			...documents[0],
			content: "edited a.org",
			revision: "ack",
		})
		expect(result.current.content).toBe("newer body during write")
		expect(result.current.isDirty).toBe(true)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})

	it.each([
		"right",
		"rejection",
	])("holds native Busy while draining an ordinary save notification throw: %s", async (mode) => {
		const register = windowCloseAdapter.registerOrgWindowClose
		let readCloseState!: () => windowCloseAdapter.OrgWindowCloseState
		vi.spyOn(windowCloseAdapter, "registerOrgWindowClose").mockImplementation((options) => {
			readCloseState = options.getState
			return register(options)
		})
		const flow = workingCopyFlow.saveOrgWorkingCopyFlow
		vi.spyOn(workingCopyFlow, "saveOrgWorkingCopyFlow").mockImplementation((capture, ports) =>
			flow(capture, {
				...ports,
				onWriteStarted: (settled) => {
					ports.onWriteStarted?.(settled)
					throw new Error("observer fault after root notification")
				},
			}),
		)
		const { result } = await setup(1)
		const id = result.current.activeBufferId
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let completed = false
		let closing!: Promise<boolean>
		act(() => {
			closing = result.current.closeActiveDocument().then((value) => {
				completed = true
				return value
			})
		})
		await act(async () => {
			await Promise.resolve()
			await Promise.resolve()
		})
		expect(completed).toBe(false)
		expect(readCloseState().isBusy).toBe(true)
		expect(readCloseState().hasDirtyBuffers).toBe(true)
		expect(result.current.isSaving).toBe(true)
		await act(async () => {
			expect(await result.current.closeActiveDocument()).toBe(false)
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(readCloseState().isBusy).toBe(true)
		await act(async () => {
			if (mode === "right")
				pending.resolve(E.right({ relativePath: "a.org", revision: "unacknowledged" }))
			else pending.reject(new Error("late write rejection"))
			expect(await closing).toBe(false)
		})
		expect(readCloseState().isBusy).toBe(false)
		expect(readCloseState().hasDirtyBuffers).toBe(true)
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.content).toBe("edited a.org")
		expect(result.current.activeDocument).toEqual(documents[0])
		expect(result.current.openBuffers[0]).toMatchObject({ isDirty: true, hasConflict: true })
		expect(result.current.error).not.toBeNull()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})

	it("preserves a newer same-ID inactive baseline and body, latching conflict without retirement or retry", async () => {
		const observed = observeParkedReservoir()
		const { result } = await setup(2)
		const id = result.current.openBuffers.find(
			(buffer) => buffer.relativePath === "a.org",
		)!.bufferId
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let parked = observed.reservoir.read(observed.scope, "a.org")!
		const runtime = result.current.liveBuffers.find((buffer) => buffer.bufferId === id)!.runtime
		const editor = attachRuntime(runtime, result.current, "newer-baseline")
		let closing!: Promise<boolean>
		act(() => {
			closing = result.current.closeDocumentPath("a.org")
		})
		act(() => {
			editor.view.dispatch({
				changes: { from: 0, to: editor.view.state.doc.length, insert: "newer working body" },
			})
			parked = observed.reservoir.read(observed.scope, "a.org")!
			parked = observed.reservoir.installConfirmedBaseline(
				observed.scope,
				parked.bufferId,
				parked,
				{
					document: { ...documents[0], content: "newer baseline", revision: "newer-revision" },
					content: "newer working body",
					isDirty: true,
				},
			)!
		})
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "old-write-ack" }))
			expect(await closing).toBe(false)
		})
		expect(result.current.openBuffers.find((buffer) => buffer.bufferId === id)).toMatchObject({
			baseRevision: "newer-revision",
			isDirty: true,
			hasConflict: true,
		})
		expect(result.current.error).not.toBeNull()
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(true)
		})
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.content).toBe("newer working body")
		expect(result.current.activeDocument).toEqual(parked.document)
		expect(result.current.openBuffers.find((buffer) => buffer.bufferId === id)?.hasConflict).toBe(
			true,
		)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(vi.mocked(saveOrgDocumentFlow).mock.calls.some(([input]) =>
			input.relativePath === "a.org" && input.expectedRevision === "newer-revision",
		)).toBe(false)
		editor.dispose()
	})

	it("rejects an active save-close after unmount in the flow terminal microtask gap", async () => {
		const hook = await setup(1)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let closing!: Promise<boolean>
		act(() => {
			closing = hook.result.current.closeActiveDocument()
		})
		// The flow's write continuation commits before this handler, but the root
		// awaiting the flow cannot emit successful completion until after it.
		const retired = pending.promise.then(() => hook.unmount())
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "ack" }))
			await retired
			expect(await closing).toBe(false)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})

	it("confirms and retires an ordinary dirty inactive close", async () => {
		const { result } = await setup(2)
		const id = result.current.openBuffers.find(
			(buffer) => buffer.relativePath === "a.org",
		)!.bufferId
		await act(async () => {
			expect(await result.current.closeDocumentPath("a.org")).toBe(true)
		})
		expect(result.current.openBuffers.some((buffer) => buffer.bufferId === id)).toBe(false)
		expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
			expect.objectContaining({ content: "edited a.org", expectedRevision: "a.org-1" }),
		)
		expect(result.current.activeDocument?.relativePath).toBe("b.org")
	})

	it("ACKs the captured baseline while retaining a same-grant inactive body replacement before confirmation", async () => {
		const { result } = await setup(2)
		const id = result.current.openBuffers.find(
			(buffer) => buffer.relativePath === "a.org",
		)!.bufferId
		const runtime = result.current.liveBuffers.find((buffer) => buffer.bufferId === id)!.runtime
		const editor = attachRuntime(runtime, result.current, "close-newer-parked")
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let closing!: Promise<boolean>
		act(() => {
			closing = result.current.closeDocumentPath("a.org")
			editor.view.dispatch({
				changes: { from: 0, to: editor.view.state.doc.length, insert: "same-grant replacement" },
			})
		})
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "ack" }))
			expect(await closing).toBe(false)
		})
		// Reactivation must observe the disk baseline just confirmed by the write.
		vi.mocked(openOrgDocumentFlow).mockReturnValueOnce(async () =>
			E.right({ ...documents[0], content: "edited a.org", revision: "ack" }),
		)
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(true)
		})
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.content).toBe("same-grant replacement")
		expect(result.current.activeDocument).toMatchObject({
			content: "edited a.org",
			revision: "ack",
		})
		expect(result.current.isDirty).toBe(true)
		expect(result.current.error).toBeNull()
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({
				relativePath: "a.org",
				expectedRevision: "ack",
				content: "same-grant replacement",
			}),
		)
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.content).toBe("same-grant replacement")
		expect(result.current.isDirty).toBe(false)
		expect(result.current.error).toBeNull()
		editor.dispose()
	})

	it.each([
		"left",
		"invalid",
		"throw",
	])("latches an inactive close %s failure on the current owner despite a body replacement", async (failure) => {
		const { result } = await setup(2)
		const id = result.current.openBuffers.find(
			(buffer) => buffer.relativePath === "a.org",
		)!.bufferId
		const runtime = result.current.liveBuffers.find((buffer) => buffer.bufferId === id)!.runtime
		const editor = attachRuntime(runtime, result.current, "failed-close-replacement")
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let closing!: Promise<boolean>
		act(() => {
			closing = result.current.closeDocumentPath("a.org")
			editor.view.dispatch({
				changes: { from: 0, to: editor.view.state.doc.length, insert: "newer failed-close body" },
			})
		})
		await act(async () => {
			if (failure === "throw") pending.reject(new Error("write uncertain"))
			else if (failure === "left")
				pending.resolve(E.left({ type: "IO_ERROR", message: "write uncertain" } as never))
			else pending.resolve(E.right({ relativePath: "wrong.org", revision: "ack" }))
			expect(await closing).toBe(false)
		})
		expect(result.current.openBuffers.find((buffer) => buffer.bufferId === id)).toMatchObject({
			baseRevision: "a.org-1",
			hasConflict: true,
			isDirty: true,
		})
		expect(result.current.error).not.toBeNull()
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		expect(runtime.source).toBe("newer failed-close body")
		editor.dispose()
	})

	it("does not retire an inactive replacement installed in the flow terminal microtask gap", async () => {
		const { result } = await setup(2)
		const id = result.current.openBuffers.find(
			(buffer) => buffer.relativePath === "a.org",
		)!.bufferId
		const runtime = result.current.liveBuffers.find((buffer) => buffer.bufferId === id)!.runtime
		const editor = attachRuntime(runtime, result.current, "terminal-gap-replacement")
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let closing!: Promise<boolean>
		act(() => {
			closing = result.current.closeDocumentPath("a.org")
		})
		// Edit the real canonical runtime after confirmation but before the close continuation.
		const replacement = pending.promise.then(() =>
			editor.view.dispatch({
				changes: { from: 0, to: editor.view.state.doc.length, insert: "replacement a body" },
			}),
		)
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "ack" }))
			await replacement
			expect(await closing).toBe(false)
		})
		expect(
			result.current.workspace?.documents.find((document) => document.relativePath === "a.org")
				?.revision,
		).toBe("ack")
		expect(
			result.current.openBuffers.find((buffer) => buffer.relativePath === "a.org")?.bufferId,
		).toBe(id)
		await act(async () => {
			expect(await result.current.switchBuffer(id)).toBe(true)
		})
		expect(result.current.content).toBe("replacement a body")
		expect(result.current.activeDocument).toMatchObject({
			content: "edited a.org",
			revision: "ack",
		})
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.isDirty).toBe(true)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			await result.current.saveDocument()
		})
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({
				relativePath: "a.org",
				expectedRevision: "ack",
				content: "replacement a body",
			}),
		)
		expect(result.current.activeBufferId).toBe(id)
		expect(result.current.content).toBe("replacement a body")
		expect(result.current.isDirty).toBe(false)
		editor.dispose()
	})

	it("late unmounted G1 inactive completion cannot alter an already live same-root G2 buffer", async () => {
		const hook = await setup(2)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let closing!: Promise<boolean>
		act(() => {
			closing = hook.result.current.closeDocumentPath("a.org")
		})
		hook.unmount()
		vi.mocked(openDefaultOrgWorkspaceFlow).mockReturnValue(async () =>
			E.right({ ...workspace, documents, capabilityToken: "G2" }),
		)
		const fresh = await setup(2)
		const id = fresh.result.current.openBuffers.find(
			(buffer) => buffer.relativePath === "a.org",
		)!.bufferId
		const buffersBefore = fresh.result.current.openBuffers
		const workspaceBefore = fresh.result.current.workspace
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "G1-ack" }))
			expect(await closing).toBe(false)
		})
		expect(fresh.result.current.openBuffers).toEqual(buffersBefore)
		expect(fresh.result.current.workspace).toEqual(workspaceBefore)

		expect(fresh.result.current.workspaceSessionId).toBe("G2")
		expect(fresh.result.current.error).toBeNull()
		await act(async () => {
			expect(await fresh.result.current.switchBuffer(id)).toBe(true)
		})
		expect(fresh.result.current.content).toBe("edited a.org")
		expect(fresh.result.current.activeDocument?.revision).toBe("a.org-1")
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
	})

	it("retains the final confirmed path but rejects a completion retired in the terminal microtask gap", async () => {
		const hook = await setup(1)
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let saving!: ReturnType<typeof hook.result.current.saveAllDocuments>
		act(() => {
			saving = hook.result.current.saveAllDocuments()
		})
		// Registered after the flow's await: the flow commits first, then unmount
		// retires the origin before the hook's own await continuation runs.
		const retired = pending.promise.then(() => hook.unmount())
		let outcome!: Awaited<typeof saving>
		await act(async () => {
			pending.resolve(E.right({ relativePath: "a.org", revision: "confirmed-final" }))
			await retired
			outcome = await saving
		})
		expect(outcome).toMatchObject({
			kind: "partial",
			savedPaths: ["a.org"],
			remainingDirtyPaths: [],
		})
		expect(outcome.message).toMatch(/completion is stale.*origin is no longer current/i)
		expect(outcome.message).toMatch(/confirmed writes were retained/i)
		expect(outcome.message).toMatch(/no rollback.*do not automatically retry/i)
		// A fresh hook must not inherit the retired completion's error/conflict/pause.
		const fresh = await setup(1)
		expect(fresh.result.current.error).toBeNull()
		expect(fresh.result.current.openBuffers[0].hasConflict).toBe(false)
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(1)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledTimes(2)
		expect(saveOrgDocumentFlow).toHaveBeenLastCalledWith(
			expect.objectContaining({ relativePath: "a.org", expectedRevision: "a.org-1" }),
		)
	})
	it("reports newer raw canonical input after a confirmed batch ACK retires in the terminal gap", async () => {
		const hook = await setup(1)
		const runtime = hook.result.current.activeBufferRuntime!
		let handle!: OrgBufferWindowHandle
		const view = new EditorView({
			state: EditorState.create({
				doc: runtime.state.doc,
				extensions: runtime.historyFreeSourceExtensions,
			}),
			dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions),
		})
		const release = hook.result.current.registerBufferWindow("retired-batch", runtime.key.bufferId)
		handle = runtime.attachWindow({ windowId: "retired-batch", view })
		try {
			const pending = deferred<SaveResult>()
			vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
			let saving!: Promise<OrgSaveAllOutcome>
			act(() => {
				saving = hook.result.current.saveAllDocuments()
			})
			const extra = "\nnewer café\0😀"
			act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: extra } }))
			const before = runtime.state
			const generation = runtime.revision
			const retired = pending.promise.then(() => hook.unmount())
			await act(async () => {
				pending.resolve(E.right({ relativePath: "a.org", revision: "confirmed-final" }))
				await retired
				expect(await saving).toMatchObject({
					kind: "partial",
					savedPaths: ["a.org"],
					remainingDirtyPaths: ["a.org"],
				})
			})
			expect(runtime.closed).toBe(true)
			expect(runtime.source).toBe("edited a.org" + extra)
			expect(runtime.state).toBe(before)
			expect(runtime.revision).toBe(generation)
			expect(undoDepth(runtime.state)).toBe(1)
			expect(redoDepth(runtime.state)).toBe(0)
			expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
			expect(saveOrgDocumentFlow).toHaveBeenCalledWith(
				expect.objectContaining({ content: "edited a.org", expectedRevision: "a.org-1" }),
			)
		} finally {
			release()
			handle.detach()
			view.destroy()
		}
	})

	it("retains a confirmed parked ACK and stops the batch when its receipt observer unmounts", async () => {
		const observed = observeParkedReservoir()
		const hook = await setup(2)
		const buffers = hook.result.current.liveBuffers
		const pending = deferred<SaveResult>()
		vi.mocked(saveOrgDocumentFlow).mockReturnValueOnce(() => pending.promise)
		let saving!: Promise<OrgSaveAllOutcome>
		act(() => {
			saving = hook.result.current.saveAllDocuments()
		})
		const retire = vi.fn(() => {
			const copy = observed.reservoir.read(observed.scope, "a.org")
			if (copy?.document.revision !== "ack-before-retirement") return
			expect(copy.document.content).toBe("edited a.org")
			expect(copy.content).toBe("edited a.org")
			expect(copy.isDirty).toBe(false)
			hook.unmount()
		})
		const stop = observed.reservoir.subscribe(retire)
		try {
			await act(async () => {
				pending.resolve(E.right({ relativePath: "a.org", revision: "ack-before-retirement" }))
				expect(await saving).toMatchObject({
					kind: "partial",
					savedPaths: ["a.org"],
					remainingDirtyPaths: ["b.org"],
				})
			})
			expect(retire).toHaveBeenCalled()
			expect(buffers.every((buffer) => buffer.runtime.closed)).toBe(true)
			expect(buffers.map((buffer) => buffer.runtime.source)).toEqual(["edited a.org", "edited b.org"])
			expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
			expect(releaseOrgWorkspace).toHaveBeenCalledWith(workspace.rootPath, workspace.capabilityToken)
		} finally {
			stop()
		}
	})

	it("ignores a deferred completion after unmount and stops remaining writes", async () => {
		const hook = await setup()
		const retained = hook.result.current.liveBuffers.map((buffer) => ({
			runtime: buffer.runtime,
			state: buffer.runtime.state,
			source: buffer.content,
			generation: buffer.sourceGeneration,
		}))
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
		for (const buffer of retained) {
			expect(buffer.runtime.closed).toBe(true)
			expect(buffer.runtime.source).toBe(buffer.source)
			expect(buffer.runtime.state).toBe(buffer.state)
			expect(buffer.runtime.revision).toBe(buffer.generation)
		}
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(saveOrgDocumentFlow).toHaveBeenCalledOnce()
	})
})
