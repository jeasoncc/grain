import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import { type AnchoredOrgAgendaEntry, parseOrgAgenda, sortOrgAgendaEntries } from "@/pipes/org"
import type { OrgAgendaSourceMetadata } from "@/pipes/org/org-agenda.pipe"
import {
	nonemptyOrgQueryValue as nonempty,
	orgQueryDocumentCacheKey as documentCacheKey,
	orgQueryWorkspaceCachePrefix as workspaceCachePrefix,
	snapshotOrgQuerySources,
	type OrgQueryLiveOverlay,
} from "./org-query-source.flow"
import type { OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import type { OrgAgendaViewConfiguration } from "@/pipes/org/org-agenda-configuration.pipe"
import { isOrgCalendarISO, type OrgDateContext } from "@/pipes/org/org-date-reader.pipe"
import type { OrgInheritanceConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"
import { DEFAULT_ORG_BEHAVIOR_CONFIGURATION } from "@/pipes/org/org-behavior-configuration.pipe"
import { buildOrgSparseTreePlan, parseOrgSparseTreeQuery } from "@/pipes/org/org-sparse-tree.pipe"
import { prepareOrgSparseTreeContext, type OrgSparseClockAdapter } from "@/flows/org-command/org-sparse-tree-context"
import { projectOrgAgendaEntries, ORG_AGENDA_MAX_PROJECTED_ROWS } from "@/pipes/org/org-agenda-projection.pipe"

export interface OrgAgendaProjectionRequest {
	readonly view: OrgAgendaViewConfiguration | null
	readonly calendar?: OrgDateContext
	readonly inheritance: OrgInheritanceConfiguration
	readonly captureClockContext?: (source: string, filename: string | null) => OrgSparseClockAdapter
}

const invalidAgendaInput = (relativePath: string, message: string): OrgAgendaFlowError => ({
	cause: {
		cause: message,
		command: "read_org_document",
		message,
		operation: "read",
		type: "ORG_FILE_ERROR",
	},
	message,
	relativePath,
	type: "ORG_AGENDA_ERROR",
})

export interface OrgAgendaFlowError {
	readonly type: "ORG_AGENDA_ERROR"
	readonly relativePath: string
	readonly message: string
	readonly cause: OrgFileError
}

export interface OrgAgendaCacheEntry {
	readonly revision: string
	readonly content: string
	readonly entries: readonly AnchoredOrgAgendaEntry[]
}

/** Mutable so callers can provide a short-lived cache for tests or an isolated consumer. */
export type OrgAgendaCache = Map<string, OrgAgendaCacheEntry>

export const ORG_AGENDA_CACHE_MAX_ENTRIES = 500

const defaultOrgAgendaCache: OrgAgendaCache = new Map()

const enrichedEntries = (
	workspace: OrgWorkspaceInterface,
	relativePath: string,
	content: string,
	sourceRevision: string,
	source: "disk" | "live",
	diskRevision: string,
	metadata: OrgAgendaSourceMetadata = {},
): readonly AnchoredOrgAgendaEntry[] =>
	Object.freeze(
		parseOrgAgenda(relativePath, content, true).map((entry) =>
			Object.freeze({
				...entry,
				origin: Object.freeze({
					...entry.origin,
					...metadata,
					diskRevision,
					source,
					sourceRevision,
					workspaceRoot: workspace.rootPath,
					...(workspace.capabilityToken === undefined
						? {}
						: { capabilityToken: workspace.capabilityToken }),
				}),
			}),
		),
	)

const pruneDeletedDocuments = (
	cache: OrgAgendaCache,
	workspace: OrgWorkspaceInterface,
	currentKeys: ReadonlySet<string>,
): void => {
	const prefix = workspaceCachePrefix(workspace)
	for (const key of cache.keys()) {
		if (key.startsWith(prefix) && !currentKeys.has(key)) {
			cache.delete(key)
		}
	}
}

const touchCacheEntry = (cache: OrgAgendaCache, key: string, entry: OrgAgendaCacheEntry): void => {
	// Map insertion order gives the module cache inexpensive least-recently-used eviction.
	cache.delete(key)
	cache.set(key, entry)
	while (cache.size > ORG_AGENDA_CACHE_MAX_ENTRIES) {
		const oldestKey = cache.keys().next().value
		if (oldestKey === undefined) {
			return
		}
		cache.delete(oldestKey)
	}
}

/** Aggregates immutable Source snapshots, then applies an explicitly bounded view projection. */
export const loadOrgAgendaFlow =
	(
		inputWorkspace: OrgWorkspaceInterface,
		repository: OrgFileRepository = orgFileRepository,
		cache: OrgAgendaCache = defaultOrgAgendaCache,
		overlays: readonly OrgQueryLiveOverlay[] = [],
		inputMetadata: Pick<OrgAgendaSourceMetadata, "workspaceSessionId"> = {},
		signal?: AbortSignal,
		projection?: OrgAgendaProjectionRequest,
	): TE.TaskEither<OrgAgendaFlowError, readonly AnchoredOrgAgendaEntry[]> =>
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: guard external snapshots before the revision-aware sequential read/cache orchestration.
	async () => {
		const metadata = { ...inputMetadata }
		const snapshot = snapshotOrgQuerySources(inputWorkspace, overlays, metadata.workspaceSessionId)
		if (E.isLeft(snapshot)) {
			return E.left(invalidAgendaInput(snapshot.left.relativePath, snapshot.left.message))
		}
		const { workspace, liveByPath } = snapshot.right
		const selectedFiles = projection?.view?.files === null || !projection?.view ? null : new Set(projection.view.files)
		const documents = selectedFiles ? workspace.documents.filter(document => selectedFiles.has(document.relativePath)) : workspace.documents
		const agendaEntries: AnchoredOrgAgendaEntry[] = []
		const view = projection?.view ?? null
		if (view && (!isOrgCalendarISO(projection?.calendar?.today) || typeof projection?.calendar?.now !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(projection.calendar.now)))
			return E.left(invalidAgendaInput("", "Configured Agenda requires an explicitly captured local calendar day and time."))
		const inheritance = projection?.inheritance ?? DEFAULT_ORG_BEHAVIOR_CONFIGURATION.inheritance
		const match = view?.match === null || !view?.match ? null : parseOrgSparseTreeQuery(view.match, inheritance)
		if (view?.match && !match) return E.left(invalidAgendaInput("", "Invalid Agenda match expression."))
		const append = async (relativePath: string, content: string, entries: readonly AnchoredOrgAgendaEntry[]) => {
			try {
				const filename = `${workspace.rootPath.replace(/[\\/]+$/, "")}/${relativePath}`
				const nativeContext = match ? await prepareOrgSparseTreeContext(content, match, filename, signal,
					projection?.captureClockContext?.(content, filename)) : undefined
				if (signal?.aborted) return invalidAgendaInput(relativePath, "Org query cancelled.")
				const starts = match ? new Set(buildOrgSparseTreePlan(content, match, inheritance, projection?.calendar, nativeContext).matchedHeadingStarts) : undefined
				const projected = projectOrgAgendaEntries(entries, view, projection?.calendar, starts)
				if (view?.mode === "dates" && agendaEntries.length + projected.length > ORG_AGENDA_MAX_PROJECTED_ROWS) return invalidAgendaInput(relativePath, `Agenda exceeds ${ORG_AGENDA_MAX_PROJECTED_ROWS} rows; narrow the view.`)
				for (const entry of projected) agendaEntries.push(entry)
				return null
			} catch (cause) {
				return invalidAgendaInput(relativePath, signal?.aborted ? "Org query cancelled." : `Cannot project Agenda: ${cause instanceof Error ? cause.message : String(cause)}`)
			}
		}
		if (signal?.aborted) return E.left(invalidAgendaInput("", "Org query cancelled."))
		const currentKeys = new Set(
			workspace.documents.map(({ relativePath }) => documentCacheKey(workspace, relativePath)),
		)
		pruneDeletedDocuments(cache, workspace, currentKeys)

		for (const documentEntry of documents) {
			if (signal?.aborted) return E.left(invalidAgendaInput("", "Org query cancelled."))
			const key = documentCacheKey(workspace, documentEntry.relativePath)
			const live = liveByPath.get(documentEntry.relativePath)
			// Every open working copy is authoritative, including parked/conflicted disk drift.
			// Their original disk revision remains the eventual write precondition.
			if (live) {
				cache.delete(key)
				const error = await append(live.relativePath, live.content,
					enrichedEntries(
						workspace,
						live.relativePath,
						live.content,
						live.sourceRevision,
						"live",
						live.diskRevision,
						{
							...metadata,
							...(live.workspaceSessionId === undefined
								? {}
								: { workspaceSessionId: live.workspaceSessionId }),
							...(live.runtimeIncarnation === undefined
								? {}
								: { runtimeIncarnation: live.runtimeIncarnation }),
							...(live.sourceGeneration === undefined
								? {}
								: { sourceGeneration: live.sourceGeneration }),
						},
					),
				)
				if (error) return E.left(error)
				continue
			}
			const cached = cache.get(key)
			if (cached && cached.revision === documentEntry.revision) {
				touchCacheEntry(cache, key, cached)
				const error = await append(documentEntry.relativePath, cached.content, cached.entries)
				if (error) return E.left(error)
				continue
			}

			const opened = await (async () => {
				try {
					return await repository.readDocument({
						relativePath: documentEntry.relativePath,
						workspaceRoot: workspace.rootPath,
						...(workspace.capabilityToken === undefined
							? {}
							: { capabilityToken: workspace.capabilityToken }),
					})()
				} catch (cause) {
					return E.left(
						invalidAgendaInput(
							documentEntry.relativePath,
							`Cannot read agenda document: ${String(cause)}`,
						).cause,
					)
				}
			})()
			if (signal?.aborted) return E.left(invalidAgendaInput("", "Org query cancelled."))
			if (!opened || (opened._tag !== "Left" && opened._tag !== "Right")) {
				return E.left(
					invalidAgendaInput(documentEntry.relativePath, "Malformed agenda read response"),
				)
			}
			if (E.isLeft(opened)) {
				if (!opened.left || typeof opened.left.message !== "string") {
					return E.left(
						invalidAgendaInput(documentEntry.relativePath, "Malformed agenda read error"),
					)
				}
				return E.left({
					cause: opened.left,
					message: `Cannot build agenda from ${documentEntry.relativePath}: ${opened.left.message}`,
					relativePath: documentEntry.relativePath,
					type: "ORG_AGENDA_ERROR" as const,
				})
			}
			if (
				!opened.right ||
				opened.right.relativePath !== documentEntry.relativePath ||
				typeof opened.right.content !== "string" ||
				!nonempty(opened.right.revision)
			) {
				return E.left(
					invalidAgendaInput(
						documentEntry.relativePath,
						"Invalid agenda document response path, content or revision",
					),
				)
			}
			const entries = enrichedEntries(
				workspace,
				documentEntry.relativePath,
				opened.right.content,
				opened.right.revision,
				"disk",
				opened.right.revision,
			)
			const error = await append(documentEntry.relativePath, opened.right.content, entries)
			if (error) return E.left(error)
			touchCacheEntry(cache, key, { content: opened.right.content, entries, revision: opened.right.revision })
		}

		return E.right(
			Object.freeze(
				sortOrgAgendaEntries(agendaEntries).map((entry) =>
					metadata.workspaceSessionId === undefined || entry.origin.workspaceSessionId !== undefined
						? entry
						: Object.freeze({ ...entry, origin: Object.freeze({ ...entry.origin, ...metadata }) }),
				),
			),
		)
	}
