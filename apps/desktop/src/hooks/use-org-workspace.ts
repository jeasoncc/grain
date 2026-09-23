import { useBlocker } from "@tanstack/react-router"
import * as E from "fp-ts/Either"
import { useCallback, useEffect, useRef, useState } from "react"
import {
	archiveOrgSubtreeFlow,
	areLegacyMigrationPlansEquivalent,
	captureOrgTodoFlow,
	clearOrgDerivedIndexFlow,
	createOrgDirectoryFlow,
	deleteOrgDocumentFlow,
	executeLegacyMigrationFlow,
	moveOrgDocumentFlow,
	openDefaultOrgWorkspaceFlow,
	openOrgDocumentFlow,
	prepareLegacyMigrationFlow,
	rebuildOrgDerivedIndexFlow,
	refileOrgSubtreeFlow,
	reopenDefaultOrgWorkspaceFlow,
	resolveOrgLinkTargetFlow,
	runLegacyMigrationRecoveryDrillFlow,
	saveOrgDocumentFlow,
	scanOrgWorkspaceFlow,
	selectOrgWorkspaceFlow,
	verifyLegacyMigrationRecoveryFlow,
} from "@/flows/org-workspace"
import { orgWorkspaceEventAdapter } from "@/io/event/org-workspace-event.adapter"
import {
	releaseOrgWorkspace,
	unwatchOrgWorkspace,
	watchOrgWorkspace,
} from "@/io/file/org-file.repository"
import type { OrgLinkClickTarget } from "@/pipes/org"
import type {
	OrgDocumentEntryInterface,
	OrgDocumentInterface,
	OrgWorkspaceInterface,
} from "@/types/org"
import type { WorkspaceInterface } from "@/types/workspace"
import { createDebouncedOrgWorkspaceRefresh, matchesOrgWorkspaceWatch } from "./org-workspace-watch"

export const ORG_WORKSPACE_PREFERENCE_KEY = "grain:org-workspace-preference"
const DEFAULT_ORG_WORKSPACE_PREFERENCE = "default"

export interface OrgWorkspacePreferenceStorage {
	readonly getItem: (key: string) => string | null
	readonly removeItem: (key: string) => void
	readonly setItem: (key: string, value: string) => void
}

export const hasDefaultWorkspacePreference = (storage?: OrgWorkspacePreferenceStorage): boolean => {
	try {
		const target = storage ?? window.localStorage
		return target.getItem(ORG_WORKSPACE_PREFERENCE_KEY) === DEFAULT_ORG_WORKSPACE_PREFERENCE
	} catch {
		return false
	}
}

export const setDefaultWorkspacePreference = (
	enabled: boolean,
	storage?: OrgWorkspacePreferenceStorage,
): void => {
	try {
		const target = storage ?? window.localStorage
		if (enabled) {
			target.setItem(ORG_WORKSPACE_PREFERENCE_KEY, DEFAULT_ORG_WORKSPACE_PREFERENCE)
		} else {
			target.removeItem(ORG_WORKSPACE_PREFERENCE_KEY)
		}
	} catch {
		// Preference storage is optional UI state; capability-backed file access still works.
	}
}

export interface OrgWorkspaceRevealTarget {
	readonly relativePath: string
	readonly line: number
	readonly requestId: number
}

export interface OrgWorkspaceController {
	readonly workspace: OrgWorkspaceInterface | null
	readonly activeDocument: OrgDocumentInterface | null
	readonly content: string
	readonly isDirty: boolean
	readonly isLoading: boolean
	readonly isSaving: boolean
	readonly error: string | null
	readonly migrationStatus: string | null
	readonly derivedIndexStatus: string | null
	readonly revealTarget: OrgWorkspaceRevealTarget | null
	readonly openDefaultWorkspace: () => Promise<void>
	readonly selectWorkspace: () => Promise<void>
	readonly refreshWorkspace: () => Promise<void>
	readonly openDocument: (
		entry: OrgDocumentEntryInterface,
		expectedRevision?: string | null,
	) => Promise<boolean>
	readonly openDocumentPath: (
		relativePath: string,
		expectedRevision?: string | null,
	) => Promise<boolean>
	readonly openDocumentAt: (
		relativePath: string,
		line: number,
		expectedRevision?: string | null,
	) => Promise<boolean>
	readonly openOrgLink: (target: OrgLinkClickTarget) => Promise<boolean>
	readonly createDocument: (relativePath: string) => Promise<void>
	readonly captureTodo: (title: string, targetRelativePath?: string) => Promise<void>
	readonly refileSubtree: (cursor: number, targetRelativePath: string) => Promise<void>
	readonly archiveSubtree: (cursor: number) => Promise<void>
	readonly createDirectory: (relativePath: string) => Promise<void>
	readonly moveActiveDocument: (targetRelativePath: string) => Promise<void>
	readonly deleteActiveDocument: () => Promise<void>
	readonly migrateLegacyWorkspace: (legacyWorkspace: WorkspaceInterface) => Promise<void>
	readonly verifyLegacyMigration: (legacyWorkspace: WorkspaceInterface) => Promise<void>
	readonly runLegacyRecoveryDrill: (legacyWorkspace: WorkspaceInterface) => Promise<void>
	readonly rebuildDerivedIndex: () => Promise<void>
	readonly clearDerivedIndex: () => Promise<void>
	readonly updateContent: (content: string) => void
	readonly saveDocument: () => Promise<void>
}

const initialOrgContent = (relativePath: string): string => {
	const filename = relativePath.split("/").at(-1) ?? relativePath
	const title = filename.replace(/\.org$/i, "")
	return `#+title: ${title}\n\n`
}

const directoryAndAncestors = (relativePath: string): readonly string[] => {
	const segments = relativePath.split("/").filter(Boolean)
	return segments.map((_, index) => segments.slice(0, index + 1).join("/"))
}

const shouldSkipExternalCheck = (checking: boolean, mutating: boolean): boolean =>
	checking || mutating

const canRefreshWorkspace = (
	workspace: OrgWorkspaceInterface | null,
	mutating: boolean,
): workspace is OrgWorkspaceInterface => workspace !== null && !mutating

export const updateWorkspaceDocument = (
	workspace: OrgWorkspaceInterface,
	document: OrgDocumentInterface,
): OrgWorkspaceInterface => {
	const entry = { relativePath: document.relativePath, revision: document.revision }
	const exists = workspace.documents.some(
		(current) => current.relativePath === document.relativePath,
	)
	return {
		...workspace,
		documents: (exists
			? workspace.documents.map((current) =>
					current.relativePath === document.relativePath ? entry : current,
				)
			: [...workspace.documents, entry]
		).sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
	}
}

export const isDirtyCaptureTarget = (
	activeDocument: OrgDocumentInterface | null,
	isDirty: boolean,
	targetRelativePath: string,
): boolean => isDirty && activeDocument?.relativePath === targetRelativePath

/** Runtime state for the file-authoritative Org workspace. */
export const useOrgWorkspace = (): OrgWorkspaceController => {
	const [workspace, setWorkspace] = useState<OrgWorkspaceInterface | null>(null)
	const [activeDocument, setActiveDocument] = useState<OrgDocumentInterface | null>(null)
	const [content, setContent] = useState("")
	const latestContentRef = useRef("")
	const [isDirty, setDirty] = useState(false)
	const [isLoading, setLoading] = useState(false)
	const [isSaving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [migrationStatus, setMigrationStatus] = useState<string | null>(null)
	const [derivedIndexStatus, setDerivedIndexStatus] = useState<string | null>(null)
	const [revealTarget, setRevealTarget] = useState<OrgWorkspaceRevealTarget | null>(null)
	const revealRequestRef = useRef(0)
	const linkRequestRef = useRef(0)
	const openRequestRef = useRef(0)
	const mutationInProgressRef = useRef(false)
	const refreshWorkspaceRef = useRef<() => Promise<void>>(async () => undefined)
	const restoreAttemptedRef = useRef(false)
	const refreshRetryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	const workspaceRoot = workspace?.rootPath ?? null

	useBlocker({
		disabled: !isDirty,
		enableBeforeUnload: isDirty,
		shouldBlockFn: () => !window.confirm("Discard unsaved Org document changes?"),
	})

	useEffect(() => {
		if (!workspace || !activeDocument) {
			return
		}
		let disposed = false
		let checking = false
		const checkForExternalChange = async () => {
			if (shouldSkipExternalCheck(checking, mutationInProgressRef.current)) {
				return
			}
			checking = true
			const result = await openOrgDocumentFlow({
				relativePath: activeDocument.relativePath,
				workspaceRoot: workspace.rootPath,
			})()
			checking = false
			if (disposed) {
				return
			}
			if (E.isLeft(result)) {
				setError(`Cannot refresh ${activeDocument.relativePath}: ${result.left.message}`)
				return
			}
			if (result.right.revision === activeDocument.revision) {
				return
			}
			if (isDirty) {
				setError(`External modification detected for ${activeDocument.relativePath}.`)
				return
			}
			setActiveDocument(result.right)
			setContent(result.right.content)
			latestContentRef.current = result.right.content
			setWorkspace((current) =>
				current ? updateWorkspaceDocument(current, result.right) : current,
			)
		}
		const timer = window.setInterval(() => void checkForExternalChange(), 2000)
		return () => {
			disposed = true
			window.clearInterval(timer)
		}
	}, [activeDocument, isDirty, workspace])

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: async generation/conflict guards must stay adjacent to state commits.
	const refreshWorkspace = useCallback(async () => {
		if (!workspace) {
			return
		}
		if (!canRefreshWorkspace(workspace, mutationInProgressRef.current)) {
			if (refreshRetryTimerRef.current !== undefined) {
				clearTimeout(refreshRetryTimerRef.current)
			}
			refreshRetryTimerRef.current = setTimeout(() => {
				refreshRetryTimerRef.current = undefined
				void refreshWorkspaceRef.current()
			}, 250)
			return
		}
		const requestGeneration = openRequestRef.current
		const contentAtStart = latestContentRef.current
		const result = await scanOrgWorkspaceFlow(workspace.rootPath)()
		if (requestGeneration !== openRequestRef.current) {
			return
		}
		if (E.isLeft(result)) {
			setError(result.left.message)
			return
		}
		setWorkspace(result.right)
		if (!activeDocument) {
			return
		}

		const scannedDocument = result.right.documents.find(
			(document) => document.relativePath === activeDocument.relativePath,
		)
		if (!scannedDocument) {
			if (isDirty || latestContentRef.current !== contentAtStart) {
				setError(
					`The open document ${activeDocument.relativePath} no longer exists in the workspace.`,
				)
			} else {
				setActiveDocument(null)
				setContent("")
				latestContentRef.current = ""
			}
			return
		}
		if (scannedDocument.revision === activeDocument.revision) {
			return
		}
		if (isDirty) {
			setError(`External modification detected for ${activeDocument.relativePath}.`)
			return
		}

		const opened = await openOrgDocumentFlow({
			relativePath: activeDocument.relativePath,
			workspaceRoot: workspace.rootPath,
		})()
		if (requestGeneration !== openRequestRef.current) {
			return
		}
		if (latestContentRef.current !== contentAtStart || mutationInProgressRef.current) {
			setError(`External modification detected for ${activeDocument.relativePath}.`)
			return
		}
		if (E.isLeft(opened)) {
			setError(`Cannot refresh ${activeDocument.relativePath}: ${opened.left.message}`)
			return
		}
		setActiveDocument(opened.right)
		setContent(opened.right.content)
		latestContentRef.current = opened.right.content
		setWorkspace((current) => (current ? updateWorkspaceDocument(current, opened.right) : current))
	}, [activeDocument, isDirty, workspace])

	useEffect(() => {
		refreshWorkspaceRef.current = refreshWorkspace
	}, [refreshWorkspace])

	useEffect(() => {
		if (!workspaceRoot) {
			return
		}
		let disposed = false
		let stopListening: (() => void) | undefined
		let watchToken: string | undefined
		const debouncedRefresh = createDebouncedOrgWorkspaceRefresh(() => {
			void refreshWorkspaceRef.current()
		})

		const setupWatch = async () => {
			try {
				const listener = await orgWorkspaceEventAdapter.listen((event) => {
					if (watchToken && matchesOrgWorkspaceWatch(event, workspaceRoot, watchToken)) {
						debouncedRefresh.schedule()
					}
				})
				if (disposed) {
					listener()
					return
				}
				stopListening = listener
				const watched = await watchOrgWorkspace(workspaceRoot)()
				if (E.isLeft(watched)) {
					stopListening()
					stopListening = undefined
					return
				}
				if (disposed) {
					void unwatchOrgWorkspace(watched.right)()
					return
				}
				watchToken = watched.right
				// Close the gap between the initial scan and watcher establishment.
				debouncedRefresh.schedule()
			} catch {
				// Watching is an optimization. Revision polling below remains the quiet fallback.
				stopListening?.()
				stopListening = undefined
			}
		}

		void setupWatch()
		return () => {
			disposed = true
			debouncedRefresh.cancel()
			stopListening?.()
			stopListening = undefined
			if (watchToken) {
				void unwatchOrgWorkspace(watchToken)()
			}
		}
	}, [workspaceRoot])

	useEffect(() => {
		if (!workspaceRoot) {
			return
		}
		return () => {
			void releaseOrgWorkspace(workspaceRoot)()
		}
	}, [workspaceRoot])

	useEffect(
		() => () => {
			if (refreshRetryTimerRef.current !== undefined) {
				clearTimeout(refreshRetryTimerRef.current)
			}
		},
		[],
	)

	const openWorkspace = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: capability cleanup and stale-request guards form one transaction.
		async (source: "default" | "default-existing" | "picker") => {
			if (mutationInProgressRef.current) {
				return
			}
			if (isDirty && !window.confirm("Discard unsaved changes and open another workspace?")) {
				return
			}
			const requestId = openRequestRef.current + 1
			openRequestRef.current = requestId
			setLoading(true)
			setError(null)
			const result =
				source === "default"
					? await openDefaultOrgWorkspaceFlow()()
					: source === "default-existing"
						? await reopenDefaultOrgWorkspaceFlow()()
						: await selectOrgWorkspaceFlow()()
			if (requestId !== openRequestRef.current) {
				if (E.isRight(result) && result.right) {
					void releaseOrgWorkspace(result.right.rootPath)()
				}
				return
			}
			setLoading(false)
			if (E.isLeft(result)) {
				if (source === "default-existing") {
					setDefaultWorkspacePreference(false)
				}
				setError(result.left.message)
				return
			}
			if (!result.right && source === "default-existing") {
				setDefaultWorkspacePreference(false)
			}
			if (result.right) {
				setDefaultWorkspacePreference(source !== "picker")
				// Invalidate refreshes that may have started while the native picker was open.
				openRequestRef.current += 1
				if (workspace && workspace.rootPath !== result.right.rootPath) {
					void releaseOrgWorkspace(workspace.rootPath)()
				}
				setWorkspace(result.right)
				setActiveDocument(null)
				setContent("")
				latestContentRef.current = ""
				setDirty(false)
			}
		},
		[isDirty, workspace],
	)

	const openDefaultWorkspace = useCallback(async () => openWorkspace("default"), [openWorkspace])
	const selectWorkspace = useCallback(async () => openWorkspace("picker"), [openWorkspace])

	useEffect(() => {
		if (restoreAttemptedRef.current) {
			return
		}
		restoreAttemptedRef.current = true
		if (hasDefaultWorkspacePreference()) {
			void openWorkspace("default-existing")
		}
	}, [openWorkspace])

	const openDocument = useCallback(
		async (
			entry: OrgDocumentEntryInterface,
			expectedRevision?: string | null,
		): Promise<boolean> => {
			if (!workspace || mutationInProgressRef.current) {
				return false
			}
			if (isDirty && !window.confirm("Discard unsaved changes and open another document?")) {
				return false
			}
			const requestId = openRequestRef.current + 1
			const contentAtStart = latestContentRef.current
			openRequestRef.current = requestId
			setLoading(true)
			setError(null)
			const result = await openOrgDocumentFlow({
				relativePath: entry.relativePath,
				workspaceRoot: workspace.rootPath,
			})()
			if (requestId !== openRequestRef.current) {
				return false
			}
			setLoading(false)
			if (latestContentRef.current !== contentAtStart) {
				setError("Document changed while another document was opening; the open was cancelled.")
				return false
			}
			if (E.isLeft(result)) {
				setError(result.left.message)
				return false
			}
			if (expectedRevision && result.right.revision !== expectedRevision) {
				setError(`Org link target changed while opening: ${entry.relativePath}`)
				return false
			}
			// Invalidate refreshes that may have started while this document was opening.
			openRequestRef.current += 1
			setRevealTarget(null)
			setActiveDocument(result.right)
			setContent(result.right.content)
			latestContentRef.current = result.right.content
			setDirty(false)
			return true
		},
		[isDirty, workspace],
	)

	const openDocumentPath = useCallback(
		async (relativePath: string, expectedRevision?: string | null): Promise<boolean> => {
			const entry = workspace?.documents.find((document) => document.relativePath === relativePath)
			if (!entry) {
				setError(`Org link target does not exist: ${relativePath}`)
				return false
			}
			return openDocument(entry, expectedRevision)
		},
		[openDocument, workspace],
	)

	const openDocumentAt = useCallback(
		async (
			relativePath: string,
			line: number,
			expectedRevision?: string | null,
		): Promise<boolean> => {
			if (activeDocument?.relativePath !== relativePath) {
				const opened = await openDocumentPath(relativePath, expectedRevision)
				if (!opened) {
					return false
				}
			}
			revealRequestRef.current += 1
			setRevealTarget({ line, relativePath, requestId: revealRequestRef.current })
			return true
		},
		[activeDocument, openDocumentPath],
	)

	const openOrgLink = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: scan, stale guards, resolution, and navigation form one transaction.
		async (target: OrgLinkClickTarget): Promise<boolean> => {
			if (!workspace || !activeDocument || mutationInProgressRef.current) {
				return false
			}
			const sourcePath = activeDocument.relativePath
			const contentAtStart = latestContentRef.current
			const requestGeneration = openRequestRef.current
			const linkRequest = linkRequestRef.current + 1
			linkRequestRef.current = linkRequest
			setError(null)

			// Explicit navigation rescans first instead of trusting a possibly stale watcher snapshot.
			const scanned = await scanOrgWorkspaceFlow(workspace.rootPath)()
			if (linkRequest !== linkRequestRef.current || requestGeneration !== openRequestRef.current) {
				return false
			}
			if (latestContentRef.current !== contentAtStart) {
				setError("Document changed while resolving the Org link; try again.")
				return false
			}
			if (E.isLeft(scanned)) {
				setError(scanned.left.message)
				return false
			}
			setWorkspace(scanned.right)
			const result = await resolveOrgLinkTargetFlow(
				scanned.right,
				sourcePath,
				contentAtStart,
				target,
			)()
			if (linkRequest !== linkRequestRef.current || requestGeneration !== openRequestRef.current) {
				return false
			}
			if (latestContentRef.current !== contentAtStart) {
				setError("Document changed while resolving the Org link; try again.")
				return false
			}
			if (E.isLeft(result)) {
				setError(result.left.message)
				return false
			}
			return openDocumentAt(
				result.right.relativePath,
				result.right.line,
				result.right.expectedRevision,
			)
		},
		[activeDocument, openDocumentAt, workspace],
	)

	const transferSubtree = useCallback(
		async (cursor: number, targetRelativePath?: string) => {
			if (!workspace || !activeDocument || mutationInProgressRef.current) {
				return
			}
			if (isDirty) {
				setError("Save the current document before refiling or archiving a subtree.")
				return
			}
			const sourceContent = latestContentRef.current
			const sourcePath = activeDocument.relativePath
			const expectedSourceRevision = activeDocument.revision
			openRequestRef.current += 1
			mutationInProgressRef.current = true
			setSaving(true)
			setError(null)
			const commonInput = {
				confirmSourceUnchanged: () => latestContentRef.current === sourceContent,
				cursor,
				expectedSourceRevision,
				sourceContent,
				sourceRelativePath: sourcePath,
				workspaceRoot: workspace.rootPath,
			}
			const result = await (targetRelativePath
				? refileOrgSubtreeFlow({ ...commonInput, targetRelativePath })()
				: archiveOrgSubtreeFlow(commonInput)())
			mutationInProgressRef.current = false
			setSaving(false)
			if (E.isLeft(result)) {
				if (result.left.type === "ORG_SUBTREE_REFILE_PARTIAL_ERROR") {
					const persistedTarget = result.left.target
					setWorkspace((current) =>
						current ? updateWorkspaceDocument(current, persistedTarget) : current,
					)
				}
				setError(result.left.message)
				return
			}
			setWorkspace((current) => {
				if (!current) {
					return current
				}
				return updateWorkspaceDocument(
					updateWorkspaceDocument(current, result.right.target),
					result.right.source,
				)
			})
			setActiveDocument(result.right.source)
			if (latestContentRef.current === sourceContent) {
				setContent(result.right.source.content)
				latestContentRef.current = result.right.source.content
				setDirty(false)
			} else {
				setDirty(true)
				setError(
					"The subtree moved, but newer editor input was retained. Review and save the source to reconcile it.",
				)
			}
		},
		[activeDocument, isDirty, workspace],
	)

	const refileSubtree = useCallback(
		async (cursor: number, targetRelativePath: string) =>
			transferSubtree(cursor, targetRelativePath),
		[transferSubtree],
	)

	const archiveSubtree = useCallback(
		async (cursor: number) => transferSubtree(cursor),
		[transferSubtree],
	)

	const updateContent = useCallback((nextContent: string) => {
		latestContentRef.current = nextContent
		setContent(nextContent)
		setDirty(true)
	}, [])

	const saveDocument = useCallback(async () => {
		if (!workspace || !activeDocument || mutationInProgressRef.current) {
			return
		}
		openRequestRef.current += 1
		mutationInProgressRef.current = true
		const sourcePath = activeDocument.relativePath
		const sourceRevision = activeDocument.revision
		const contentBeingSaved = latestContentRef.current
		setSaving(true)
		setError(null)
		const result = await saveOrgDocumentFlow({
			content: contentBeingSaved,
			expectedRevision: sourceRevision,
			relativePath: sourcePath,
			workspaceRoot: workspace.rootPath,
		})()
		mutationInProgressRef.current = false
		setSaving(false)
		if (E.isLeft(result)) {
			setError(result.left.message)
			return
		}
		setActiveDocument((current) =>
			current?.relativePath === sourcePath && current.revision === sourceRevision
				? { ...current, content: contentBeingSaved, revision: result.right.revision }
				: current,
		)
		setWorkspace((current) =>
			current
				? {
						...current,
						documents: current.documents.map((document) =>
							document.relativePath === sourcePath ? result.right : document,
						),
					}
				: current,
		)
		if (
			activeDocument.relativePath === sourcePath &&
			latestContentRef.current === contentBeingSaved
		) {
			setDirty(false)
		}
	}, [activeDocument, workspace])

	const captureTodo = useCallback(
		async (title: string, targetRelativePath = "inbox.org") => {
			if (!workspace || mutationInProgressRef.current) {
				return
			}
			const relativePath = targetRelativePath.trim() || "inbox.org"
			if (isDirtyCaptureTarget(activeDocument, isDirty, relativePath)) {
				setError(`Save or discard changes before capturing to ${relativePath}.`)
				return
			}
			const activeContentAtStart = latestContentRef.current
			openRequestRef.current += 1
			mutationInProgressRef.current = true
			setSaving(true)
			setError(null)
			const result = await captureOrgTodoFlow({
				relativePath,
				title,
				workspaceRoot: workspace.rootPath,
			})()
			mutationInProgressRef.current = false
			setSaving(false)
			if (E.isLeft(result)) {
				setError(result.left.message)
				return
			}
			setWorkspace((current) =>
				current ? updateWorkspaceDocument(current, result.right) : current,
			)
			if (activeDocument?.relativePath === relativePath && !isDirty) {
				if (latestContentRef.current !== activeContentAtStart) {
					setError(
						`Captured to ${relativePath}, but the active editor changed during capture. Reload before saving.`,
					)
					return
				}
				setActiveDocument(result.right)
				setContent(result.right.content)
				latestContentRef.current = result.right.content
				setDirty(false)
			}
		},
		[activeDocument, isDirty, workspace],
	)

	const createDocument = useCallback(
		async (relativePath: string) => {
			if (!workspace || mutationInProgressRef.current || !relativePath.trim()) {
				return
			}
			if (isDirty && !window.confirm("Discard unsaved changes and create a new document?")) {
				return
			}
			openRequestRef.current += 1
			mutationInProgressRef.current = true
			setSaving(true)
			setError(null)
			const initialContent = initialOrgContent(relativePath)
			const result = await saveOrgDocumentFlow({
				content: initialContent,
				expectedRevision: "<missing>",
				relativePath,
				workspaceRoot: workspace.rootPath,
			})()
			mutationInProgressRef.current = false
			setSaving(false)
			if (E.isLeft(result)) {
				setError(result.left.message)
				return
			}
			const document = { ...result.right, content: initialContent }
			setWorkspace((current) =>
				current
					? {
							...current,
							documents: [...current.documents, result.right].sort((left, right) =>
								left.relativePath.localeCompare(right.relativePath),
							),
						}
					: current,
			)
			setActiveDocument(document)
			setContent(initialContent)
			latestContentRef.current = initialContent
			setDirty(false)
		},
		[isDirty, workspace],
	)

	const createDirectory = useCallback(
		async (relativePath: string) => {
			if (!workspace || mutationInProgressRef.current || !relativePath.trim()) {
				return
			}
			openRequestRef.current += 1
			mutationInProgressRef.current = true
			setSaving(true)
			setError(null)
			const result = await createOrgDirectoryFlow({
				relativePath,
				workspaceRoot: workspace.rootPath,
			})()
			mutationInProgressRef.current = false
			setSaving(false)
			if (E.isLeft(result)) {
				setError(result.left.message)
				return
			}
			setWorkspace((current) => {
				if (!current) {
					return current
				}
				const directories = new Set(current.directories)
				for (const directory of directoryAndAncestors(relativePath)) {
					directories.add(directory)
				}
				return { ...current, directories: [...directories].sort() }
			})
		},
		[workspace],
	)

	const moveActiveDocument = useCallback(
		async (targetRelativePath: string) => {
			if (
				!workspace ||
				!activeDocument ||
				mutationInProgressRef.current ||
				!targetRelativePath.trim()
			) {
				return
			}
			if (isDirty) {
				setError("Save or discard the current changes before moving this document.")
				return
			}
			openRequestRef.current += 1
			mutationInProgressRef.current = true
			setSaving(true)
			setError(null)
			const result = await moveOrgDocumentFlow({
				expectedSourceRevision: activeDocument.revision,
				sourceRelativePath: activeDocument.relativePath,
				targetRelativePath,
				workspaceRoot: workspace.rootPath,
			})()
			mutationInProgressRef.current = false
			setSaving(false)
			if (E.isLeft(result)) {
				setError(result.left.message)
				return
			}
			const sourcePath = activeDocument.relativePath
			setActiveDocument((current) =>
				current?.relativePath === sourcePath
					? { ...current, relativePath: result.right.relativePath }
					: current,
			)
			setWorkspace((current) =>
				current
					? {
							...current,
							documents: current.documents
								.map((document) => (document.relativePath === sourcePath ? result.right : document))
								.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
						}
					: current,
			)
		},
		[activeDocument, isDirty, workspace],
	)

	const migrateLegacyWorkspace = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: preview, source rechecks, atomic publication, and verification are one migration transaction.
		async (legacyWorkspace: WorkspaceInterface) => {
			if (!workspace || mutationInProgressRef.current) {
				return
			}
			openRequestRef.current += 1
			mutationInProgressRef.current = true
			setLoading(true)
			setError(null)
			setMigrationStatus(null)
			const prepared = await prepareLegacyMigrationFlow(legacyWorkspace)()
			if (E.isLeft(prepared)) {
				mutationInProgressRef.current = false
				setLoading(false)
				setError(`Migration ${prepared.left.stage} failed: ${prepared.left.cause.message}`)
				return
			}
			const plan = prepared.right
			const placeholders = plan.nodeResults.filter(({ status }) => status === "placeholder").length
			const warnedNodes = plan.nodeResults.filter(({ warnings }) => warnings.length > 0)
			const warningEntries = [
				...warnedNodes.map(({ path, warnings }) => `• ${path}: ${warnings.join(", ")}`),
				...plan.warnings.map((warning) => `• ${warning}`),
			]
			const warningCount =
				plan.nodeResults.reduce((count, result) => count + result.warnings.length, 0) +
				plan.warnings.length
			const omittedWarnings = Math.max(0, warningEntries.length - 8)
			const warningPreview = [
				...warningEntries.slice(0, 8),
				...(omittedWarnings > 0 ? [`…and ${omittedWarnings} more affected paths.`] : []),
			].join("\n")
			const confirmed = window.confirm(
				`Migrate “${legacyWorkspace.title}” into ${plan.rootDirectory}?\n\n` +
					`${plan.documents.length} Org documents, ${plan.directories.length} directories, ` +
					`${plan.rawBackups.length} raw backups, ${placeholders} placeholders, ` +
					`${warningCount} warnings.\n\n` +
					(warningPreview ? `Warning preview:\n${warningPreview}\n\n` : "") +
					"Every selected-workspace and recoverable orphan content row is backed up. Existing paths will never be reused or overwritten.",
			)
			if (!confirmed) {
				mutationInProgressRef.current = false
				setLoading(false)
				return
			}
			const refreshedPlan = await prepareLegacyMigrationFlow(legacyWorkspace)()
			if (E.isLeft(refreshedPlan)) {
				mutationInProgressRef.current = false
				setLoading(false)
				setError(
					`Migration source recheck ${refreshedPlan.left.stage} failed: ${refreshedPlan.left.cause.message}`,
				)
				return
			}
			if (!areLegacyMigrationPlansEquivalent(refreshedPlan.right, plan)) {
				mutationInProgressRef.current = false
				setLoading(false)
				setError("Legacy source changed during confirmation; review the new plan and retry.")
				return
			}
			const written = await executeLegacyMigrationFlow(workspace.rootPath, refreshedPlan.right)()
			if (E.isLeft(written)) {
				mutationInProgressRef.current = false
				setLoading(false)
				setError(`Migration ${written.left.stage} failed: ${written.left.cause.message}`)
				return
			}
			const finalPlan = await prepareLegacyMigrationFlow(legacyWorkspace)()
			mutationInProgressRef.current = false
			if (
				E.isLeft(finalPlan) ||
				!areLegacyMigrationPlansEquivalent(finalPlan.right, refreshedPlan.right)
			) {
				setLoading(false)
				setError(
					"Migration artifacts are verified, but the legacy source changed during publication. The output is a recoverable snapshot of the earlier state and must not be treated as current.",
				)
				return
			}
			setMigrationStatus(
				`Verified ${written.right.verification.checkedCount} migrated artifacts. Evidence: ${written.right.write.verificationPath}. Recovery database script: ${refreshedPlan.right.recoverySqlPath}`,
			)
			const rescanned = await scanOrgWorkspaceFlow(workspace.rootPath)()
			setLoading(false)
			if (E.isLeft(rescanned)) {
				setError(`Migration completed, but refresh failed: ${rescanned.left.message}`)
				return
			}
			setWorkspace(rescanned.right)
		},
		[workspace],
	)

	const verifyLegacyMigration = useCallback(
		async (legacyWorkspace: WorkspaceInterface) => {
			if (!workspace || mutationInProgressRef.current) {
				return
			}
			openRequestRef.current += 1
			mutationInProgressRef.current = true
			setLoading(true)
			setError(null)
			setMigrationStatus(null)
			const result = await verifyLegacyMigrationRecoveryFlow(legacyWorkspace, workspace.rootPath)()
			mutationInProgressRef.current = false
			setLoading(false)
			if (E.isLeft(result)) {
				setError(`Recovery verification ${result.left.stage} failed: ${result.left.cause.message}`)
				return
			}
			setMigrationStatus(
				`Recovery verified ${result.right.verification.checkedCount} artifacts against current legacy source.`,
			)
		},
		[workspace],
	)

	const rebuildDerivedIndex = useCallback(async () => {
		if (!workspace || mutationInProgressRef.current) {
			return
		}
		if (isDirty) {
			setError("Save the current document before rebuilding the derived index.")
			return
		}
		openRequestRef.current += 1
		mutationInProgressRef.current = true
		setLoading(true)
		setError(null)
		setDerivedIndexStatus(null)
		const rescanned = await scanOrgWorkspaceFlow(workspace.rootPath)()
		if (E.isLeft(rescanned)) {
			mutationInProgressRef.current = false
			setLoading(false)
			setError(rescanned.left.message)
			return
		}
		setWorkspace(rescanned.right)
		const result = await rebuildOrgDerivedIndexFlow(rescanned.right)()
		mutationInProgressRef.current = false
		setLoading(false)
		if (E.isLeft(result)) {
			setError(result.left.message)
			return
		}
		setDerivedIndexStatus(
			`Derived index rebuilt: ${result.right.documentCount} documents, ${result.right.headingCount} headings, ${result.right.linkCount} links, ${result.right.agendaCount} agenda entries.`,
		)
	}, [isDirty, workspace])

	const clearDerivedIndex = useCallback(async () => {
		if (!workspace || mutationInProgressRef.current) {
			return
		}
		mutationInProgressRef.current = true
		setLoading(true)
		setError(null)
		setDerivedIndexStatus(null)
		const result = await clearOrgDerivedIndexFlow(workspace.rootPath)()
		mutationInProgressRef.current = false
		setLoading(false)
		if (E.isLeft(result)) {
			setError(result.left.message)
			return
		}
		setDerivedIndexStatus("Derived index cleared. Org files were not modified.")
	}, [workspace])

	const runLegacyRecoveryDrill = useCallback(
		async (legacyWorkspace: WorkspaceInterface) => {
			if (!workspace || mutationInProgressRef.current) {
				return
			}
			mutationInProgressRef.current = true
			setLoading(true)
			setError(null)
			setMigrationStatus(null)
			const result = await runLegacyMigrationRecoveryDrillFlow(
				legacyWorkspace,
				workspace.rootPath,
			)()
			mutationInProgressRef.current = false
			setLoading(false)
			if (E.isLeft(result)) {
				setError(`Recovery drill ${result.left.stage} failed: ${result.left.cause.message}`)
				return
			}
			setMigrationStatus(
				`Recovery drill passed: reconstructed ${result.right.recoveredContentCount} legacy content rows from raw backups and verified ${result.right.verification.checkedCount} artifacts. Recovery database script: ${result.right.recoverySqlPath}`,
			)
		},
		[workspace],
	)

	const deleteActiveDocument = useCallback(async () => {
		if (!workspace || !activeDocument || mutationInProgressRef.current) {
			return
		}
		if (isDirty && !window.confirm("Delete this file and permanently discard unsaved changes?")) {
			return
		}
		openRequestRef.current += 1
		mutationInProgressRef.current = true
		setSaving(true)
		setError(null)
		const sourcePath = activeDocument.relativePath
		const result = await deleteOrgDocumentFlow({
			expectedRevision: activeDocument.revision,
			relativePath: sourcePath,
			workspaceRoot: workspace.rootPath,
		})()
		mutationInProgressRef.current = false
		setSaving(false)
		if (E.isLeft(result)) {
			setError(result.left.message)
			return
		}
		setWorkspace((current) =>
			current
				? {
						...current,
						documents: current.documents.filter((document) => document.relativePath !== sourcePath),
					}
				: current,
		)
		setActiveDocument(null)
		setContent("")
		latestContentRef.current = ""
		setDirty(false)
	}, [activeDocument, isDirty, workspace])

	return {
		activeDocument,
		archiveSubtree,
		captureTodo,
		clearDerivedIndex,
		content,
		createDirectory,
		createDocument,
		deleteActiveDocument,
		derivedIndexStatus,
		error,
		isDirty,
		isLoading,
		isSaving,
		migrateLegacyWorkspace,
		migrationStatus,
		moveActiveDocument,
		openDefaultWorkspace,
		openDocument,
		openDocumentAt,
		openDocumentPath,
		openOrgLink,
		rebuildDerivedIndex,
		refileSubtree,
		refreshWorkspace,
		revealTarget,
		runLegacyRecoveryDrill,
		saveDocument,
		selectWorkspace,
		updateContent,
		verifyLegacyMigration,
		workspace,
	}
}
