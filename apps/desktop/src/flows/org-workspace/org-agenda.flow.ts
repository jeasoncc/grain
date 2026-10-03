import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import { type AnchoredOrgAgendaEntry, parseOrgAgenda, sortOrgAgendaEntries } from "@/pipes/org"
import type { OrgAgendaSourceMetadata } from "@/pipes/org/org-agenda.pipe"
import { isSafeRelativeOrgPath } from "@/pipes/org/org-subtree-refile.pipe"
import type { OrgFileError, OrgWorkspaceInterface } from "@/types/org"

const safePath = (path: unknown): path is string =>
	typeof path === "string" &&
	isSafeRelativeOrgPath(path) &&
	![...path].some(
		(character) =>
			character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === ":",
	)
const nonempty = (value: unknown): value is string => typeof value === "string" && value.length > 0
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
	readonly entries: readonly AnchoredOrgAgendaEntry[]
}

/** Mutable so callers can provide a short-lived cache for tests or an isolated consumer. */
export type OrgAgendaCache = Map<string, OrgAgendaCacheEntry>

export const ORG_AGENDA_CACHE_MAX_ENTRIES = 500

const defaultOrgAgendaCache: OrgAgendaCache = new Map()

/** A verbatim working-copy snapshot, scoped to the exact grant that opened it. */
export interface OrgAgendaLiveOverlay extends OrgAgendaSourceMetadata {
	readonly workspaceRoot: string
	readonly capabilityToken?: string
	readonly relativePath: string
	readonly content: string
	readonly sourceRevision: string
	readonly diskRevision: string
}

const workspaceCachePrefix = (workspace: OrgWorkspaceInterface): string => {
	const token = workspace.capabilityToken
	return `${workspace.rootPath.length}:${workspace.rootPath}:${token === undefined ? "absent" : `present:${token.length}:${token}`}:`
}

const documentCacheKey = (workspace: OrgWorkspaceInterface, relativePath: string): string =>
	`${workspaceCachePrefix(workspace)}${relativePath}`

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
		parseOrgAgenda(relativePath, content).map((entry) =>
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
	if (cache !== defaultOrgAgendaCache) {
		return
	}
	while (cache.size > ORG_AGENDA_CACHE_MAX_ENTRIES) {
		const oldestKey = cache.keys().next().value
		if (oldestKey === undefined) {
			return
		}
		cache.delete(oldestKey)
	}
}

const comparePaths = (
	left: { readonly relativePath: string },
	right: { readonly relativePath: string },
): number => {
	if (left.relativePath < right.relativePath) {
		return -1
	}
	if (left.relativePath > right.relativePath) {
		return 1
	}
	return 0
}

/** Aggregates dated Org entries, reading only documents whose scan revision changed. */
export const loadOrgAgendaFlow =
	(
		workspace: OrgWorkspaceInterface,
		repository: OrgFileRepository = orgFileRepository,
		cache: OrgAgendaCache = defaultOrgAgendaCache,
		overlays: readonly OrgAgendaLiveOverlay[] = [],
		inputMetadata: Pick<OrgAgendaSourceMetadata, "workspaceSessionId"> = {},
	): TE.TaskEither<OrgAgendaFlowError, readonly AnchoredOrgAgendaEntry[]> =>
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: guard external snapshots before the revision-aware sequential read/cache orchestration.
	async () => {
		const metadata = { ...inputMetadata }
		const agendaEntries: AnchoredOrgAgendaEntry[] = []
		if (
			!workspace ||
			!nonempty(workspace.rootPath) ||
			!Array.isArray(workspace.documents) ||
			(workspace.capabilityToken !== undefined && typeof workspace.capabilityToken !== "string") ||
			!Array.isArray(overlays) ||
			(metadata.workspaceSessionId !== undefined && !nonempty(metadata.workspaceSessionId))
		) {
			return E.left(invalidAgendaInput("", "Invalid agenda workspace or session"))
		}
		// Snapshot inputs before the first read; live content never enters the disk cache.
		const liveByPath = new Map<string, OrgAgendaLiveOverlay>()
		for (const overlay of overlays) {
			if (
				!overlay ||
				overlay.workspaceRoot !== workspace.rootPath ||
				overlay.capabilityToken !== workspace.capabilityToken ||
				(metadata.workspaceSessionId !== undefined &&
					overlay.workspaceSessionId !== undefined &&
					overlay.workspaceSessionId !== metadata.workspaceSessionId)
			) {
				continue
			}
			if (
				!safePath(overlay.relativePath) ||
				typeof overlay.content !== "string" ||
				!nonempty(overlay.sourceRevision) ||
				!nonempty(overlay.diskRevision) ||
				(overlay.runtimeIncarnation !== undefined && !nonempty(overlay.runtimeIncarnation)) ||
				(overlay.workspaceSessionId !== undefined && !nonempty(overlay.workspaceSessionId)) ||
				(overlay.sourceGeneration !== undefined &&
					(!Number.isSafeInteger(overlay.sourceGeneration) || overlay.sourceGeneration < 0)) ||
				liveByPath.has(overlay.relativePath)
			) {
				return E.left(
					invalidAgendaInput(
						overlay.relativePath ?? "",
						"Invalid or ambiguous live agenda snapshot",
					),
				)
			}
			liveByPath.set(overlay.relativePath, { ...overlay })
		}
		const documents = workspace.documents.map((document) => ({ ...document })).sort(comparePaths)
		const paths = new Set<string>()
		for (const document of documents) {
			if (
				!safePath(document.relativePath) ||
				!nonempty(document.revision) ||
				paths.has(document.relativePath)
			) {
				return E.left(
					invalidAgendaInput(
						document.relativePath ?? "",
						"Invalid agenda document path or revision",
					),
				)
			}
			paths.add(document.relativePath)
		}
		// A protected working copy may outlive deletion from the latest scan.
		for (const live of liveByPath.values()) {
			if (!paths.has(live.relativePath)) {
				documents.push({ relativePath: live.relativePath, revision: live.diskRevision })
			}
		}
		documents.sort(comparePaths)
		const currentKeys = new Set(
			documents.map(({ relativePath }) => documentCacheKey(workspace, relativePath)),
		)
		pruneDeletedDocuments(cache, workspace, currentKeys)

		for (const documentEntry of documents) {
			const key = documentCacheKey(workspace, documentEntry.relativePath)
			const live = liveByPath.get(documentEntry.relativePath)
			// Dirty working copies are authoritative even when a scan detects disk drift.
			// Their original disk revision remains the eventual write precondition.
			if (live) {
				agendaEntries.push(
					...enrichedEntries(
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
				continue
			}
			const cached = cache.get(key)
			if (cached && cached.revision === documentEntry.revision) {
				touchCacheEntry(cache, key, cached)
				agendaEntries.push(...cached.entries)
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
			touchCacheEntry(cache, key, { entries, revision: opened.right.revision })
			agendaEntries.push(...entries)
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
