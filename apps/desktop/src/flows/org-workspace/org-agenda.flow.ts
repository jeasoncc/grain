import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import { type OrgAgendaEntry, parseOrgAgenda, sortOrgAgendaEntries } from "@/pipes/org"
import type { OrgFileError, OrgWorkspaceInterface } from "@/types/org"

export interface OrgAgendaFlowError {
	readonly type: "ORG_AGENDA_ERROR"
	readonly relativePath: string
	readonly message: string
	readonly cause: OrgFileError
}

export interface OrgAgendaCacheEntry {
	readonly revision: string
	readonly entries: readonly OrgAgendaEntry[]
}

/** Mutable so callers can provide a short-lived cache for tests or an isolated consumer. */
export type OrgAgendaCache = Map<string, OrgAgendaCacheEntry>

export const ORG_AGENDA_CACHE_MAX_ENTRIES = 500

const defaultOrgAgendaCache: OrgAgendaCache = new Map()

const workspaceCachePrefix = (workspaceRoot: string): string =>
	`${workspaceRoot.length}:${workspaceRoot}:`

const documentCacheKey = (workspaceRoot: string, relativePath: string): string =>
	`${workspaceCachePrefix(workspaceRoot)}${relativePath}`

const pruneDeletedDocuments = (
	cache: OrgAgendaCache,
	workspaceRoot: string,
	currentKeys: ReadonlySet<string>,
): void => {
	const prefix = workspaceCachePrefix(workspaceRoot)
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
	): TE.TaskEither<OrgAgendaFlowError, readonly OrgAgendaEntry[]> =>
	async () => {
		const agendaEntries: OrgAgendaEntry[] = []
		const documents = [...workspace.documents].sort(comparePaths)
		const currentKeys = new Set(
			documents.map(({ relativePath }) => documentCacheKey(workspace.rootPath, relativePath)),
		)
		pruneDeletedDocuments(cache, workspace.rootPath, currentKeys)

		for (const documentEntry of documents) {
			const key = documentCacheKey(workspace.rootPath, documentEntry.relativePath)
			const cached = cache.get(key)
			if (cached?.revision === documentEntry.revision) {
				touchCacheEntry(cache, key, cached)
				agendaEntries.push(...cached.entries)
				continue
			}

			const opened = await repository.readDocument({
				relativePath: documentEntry.relativePath,
				workspaceRoot: workspace.rootPath,
			})()
			if (E.isLeft(opened)) {
				return E.left({
					cause: opened.left,
					message: `Cannot build agenda from ${documentEntry.relativePath}: ${opened.left.message}`,
					relativePath: documentEntry.relativePath,
					type: "ORG_AGENDA_ERROR" as const,
				})
			}
			const entries = parseOrgAgenda(documentEntry.relativePath, opened.right.content)
			touchCacheEntry(cache, key, { entries, revision: opened.right.revision })
			agendaEntries.push(...entries)
		}

		return E.right(sortOrgAgendaEntries(agendaEntries))
	}
