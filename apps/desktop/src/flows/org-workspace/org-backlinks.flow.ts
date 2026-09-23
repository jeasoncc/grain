import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import {
	type OrgLinkIndex,
	type OrgLinkReference,
	type OrgLinkTargetKind,
	parseOrgLinkIndex,
} from "@/pipes/org"
import type { OrgDocumentEntryInterface, OrgFileError, OrgWorkspaceInterface } from "@/types/org"

export interface OrgBacklink {
	readonly sourceRelativePath: string
	readonly line: number
	readonly column: number
	readonly sourceHeading: string | null
	readonly sourceTitle: string | null
	readonly label: string
	readonly targetKind: OrgLinkTargetKind
}

export interface OrgBacklinksFlowError {
	readonly type: "ORG_BACKLINKS_ERROR"
	readonly relativePath: string
	readonly message: string
	readonly cause: OrgFileError
}

export interface OrgBacklinksCacheEntry {
	readonly revision: string
	readonly index: OrgLinkIndex
}

/** Revision-keyed LRU cache. Callers may inject a map to isolate lifetime and tests. */
export type OrgBacklinksCache = Map<string, OrgBacklinksCacheEntry>

export const ORG_BACKLINKS_CACHE_MAX_ENTRIES = 500

const defaultOrgBacklinksCache: OrgBacklinksCache = new Map()

const workspacePrefix = (rootPath: string): string => `${rootPath.length}:${rootPath}:`
const cacheKey = (rootPath: string, relativePath: string): string =>
	`${workspacePrefix(rootPath)}${relativePath}`

const touch = (cache: OrgBacklinksCache, key: string, entry: OrgBacklinksCacheEntry): void => {
	cache.delete(key)
	cache.set(key, entry)
	while (cache.size > ORG_BACKLINKS_CACHE_MAX_ENTRIES) {
		const oldest = cache.keys().next().value
		if (oldest === undefined) {
			return
		}
		cache.delete(oldest)
	}
}

const pruneDeleted = (cache: OrgBacklinksCache, workspace: OrgWorkspaceInterface): void => {
	const prefix = workspacePrefix(workspace.rootPath)
	const paths = new Set(
		workspace.documents.map(({ relativePath }) => cacheKey(workspace.rootPath, relativePath)),
	)
	for (const key of cache.keys()) {
		if (key.startsWith(prefix) && !paths.has(key)) {
			cache.delete(key)
		}
	}
}

const targetPathFrom = (target: string | OrgDocumentEntryInterface): string =>
	typeof target === "string" ? target : target.relativePath

const matchesTarget = (
	link: OrgLinkReference,
	targetPath: string,
	ids: ReadonlySet<string>,
	customIds: ReadonlySet<string>,
): boolean => {
	if (link.targetKind === "file") {
		return link.targetRelativePath === targetPath
	}
	if (link.targetKind === "id") {
		return link.targetValue !== null && ids.has(link.targetValue)
	}
	return (
		link.targetRelativePath === targetPath &&
		link.targetValue !== null &&
		customIds.has(link.targetValue)
	)
}

const backlinkFrom = (link: OrgLinkReference): OrgBacklink => ({
	column: link.column,
	label: link.label,
	line: link.line,
	sourceHeading: link.sourceHeading,
	sourceRelativePath: link.relativePath,
	sourceTitle: link.sourceTitle,
	targetKind: link.targetKind,
})

const compareText = (left: string, right: string): number =>
	left < right ? -1 : left > right ? 1 : 0

export const sortOrgBacklinks = (backlinks: readonly OrgBacklink[]): readonly OrgBacklink[] =>
	[...backlinks].sort(
		(left, right) =>
			compareText(left.sourceRelativePath, right.sourceRelativePath) ||
			left.line - right.line ||
			left.column - right.column ||
			compareText(left.targetKind, right.targetKind) ||
			compareText(left.label, right.label),
	)

/**
 * Finds links to the active target. The active document is always parsed from the
 * supplied editor content; only unchanged, non-active documents use the revision cache.
 */
export const loadOrgBacklinksFlow =
	(
		workspace: OrgWorkspaceInterface,
		targetDocument: string | OrgDocumentEntryInterface,
		currentTargetContent: string,
		repository: OrgFileRepository = orgFileRepository,
		cache: OrgBacklinksCache = defaultOrgBacklinksCache,
	): TE.TaskEither<OrgBacklinksFlowError, readonly OrgBacklink[]> =>
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cache, IO, and matching form one ordered read transaction.
	async () => {
		const targetPath = targetPathFrom(targetDocument)
		const targetIndex = parseOrgLinkIndex(targetPath, currentTargetContent)
		const ids = new Set(
			targetIndex.identifiers.filter(({ kind }) => kind === "id").map(({ value }) => value),
		)
		const customIds = new Set(
			targetIndex.identifiers.filter(({ kind }) => kind === "custom-id").map(({ value }) => value),
		)
		const backlinks: OrgBacklink[] = []
		pruneDeleted(cache, workspace)
		cache.delete(cacheKey(workspace.rootPath, targetPath))

		const documents = [...workspace.documents].sort((left, right) =>
			compareText(left.relativePath, right.relativePath),
		)
		for (const document of documents) {
			let index: OrgLinkIndex
			if (document.relativePath === targetPath) {
				index = targetIndex
			} else {
				const key = cacheKey(workspace.rootPath, document.relativePath)
				const cached = cache.get(key)
				if (cached?.revision === document.revision) {
					touch(cache, key, cached)
					index = cached.index
				} else {
					const opened = await repository.readDocument({
						relativePath: document.relativePath,
						workspaceRoot: workspace.rootPath,
					})()
					if (E.isLeft(opened)) {
						return E.left({
							cause: opened.left,
							message: `Cannot build backlinks from ${document.relativePath}: ${opened.left.message}`,
							relativePath: document.relativePath,
							type: "ORG_BACKLINKS_ERROR" as const,
						})
					}
					index = parseOrgLinkIndex(document.relativePath, opened.right.content)
					touch(cache, key, { index, revision: opened.right.revision })
				}
			}
			for (const link of index.links) {
				if (matchesTarget(link, targetPath, ids, customIds)) {
					backlinks.push(backlinkFrom(link))
				}
			}
		}

		return E.right(sortOrgBacklinks(backlinks))
	}
