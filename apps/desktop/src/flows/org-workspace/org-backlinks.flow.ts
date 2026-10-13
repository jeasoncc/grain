import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import {
	type OrgLinkIndex,
	type OrgLinkReference,
	type OrgLinkTargetKind,
	parseOrgLinkIndex,
} from "@/pipes/org"
import type {
	OrgDocumentEntryInterface,
	OrgDocumentInterface,
	OrgFileError,
	OrgWorkspaceInterface,
} from "@/types/org"
import {
	orgQueryDocumentCacheKey as cacheKey,
	orgQueryWorkspaceCachePrefix as workspacePrefix,
	snapshotOrgQuerySources,
	type OrgQueryLiveOverlay,
} from "./org-query-source.flow"

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
	const prefix = workspacePrefix(workspace)
	const paths = new Set(
		workspace.documents.map(({ relativePath }) => cacheKey(workspace, relativePath)),
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

const invalidBacklinksInput = (relativePath: string, message: string): OrgBacklinksFlowError => ({
	cause: {
		cause: message,
		command: "read_org_document",
		message,
		operation: "read",
		type: "ORG_FILE_ERROR",
	},
	message,
	relativePath,
	type: "ORG_BACKLINKS_ERROR",
})

/** Canonical working snapshots precede disk; only unopened sources enter the revision cache. */
export const loadOrgBacklinksFlow =
	(
		inputWorkspace: OrgWorkspaceInterface,
		targetDocument: string | OrgDocumentEntryInterface,
		overlays: readonly OrgQueryLiveOverlay[] = [],
		repository: OrgFileRepository = orgFileRepository,
		cache: OrgBacklinksCache = defaultOrgBacklinksCache,
		metadata: { readonly workspaceSessionId?: string } = {},
		signal?: AbortSignal,
	): TE.TaskEither<OrgBacklinksFlowError, readonly OrgBacklink[]> =>
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: live precedence, disk IO and matching form one read transaction.
	async () => {
		const snapshot = snapshotOrgQuerySources(inputWorkspace, overlays, metadata.workspaceSessionId)
		if (E.isLeft(snapshot)) {
			return E.left(invalidBacklinksInput(snapshot.left.relativePath, snapshot.left.message))
		}
		const { workspace, liveByPath } = snapshot.right
		const targetPath = targetPathFrom(targetDocument)
		if (signal?.aborted) return E.left(invalidBacklinksInput("", "Org query cancelled."))
		pruneDeleted(cache, workspace)
		const indexes = new Map<string, OrgLinkIndex>()
		for (const document of workspace.documents) {
			if (signal?.aborted) return E.left(invalidBacklinksInput("", "Org query cancelled."))
			const key = cacheKey(workspace, document.relativePath)
			const live = liveByPath.get(document.relativePath)
			if (live) {
				cache.delete(key)
				indexes.set(document.relativePath, parseOrgLinkIndex(document.relativePath, live.content))
				continue
			}
			const cached = cache.get(key)
			if (cached?.revision === document.revision) {
				touch(cache, key, cached)
				indexes.set(document.relativePath, cached.index)
				continue
			}
			let opened: E.Either<OrgFileError, OrgDocumentInterface>
			try {
				opened = await repository.readDocument({
					relativePath: document.relativePath,
					workspaceRoot: workspace.rootPath,
					...(workspace.capabilityToken === undefined
						? {}
						: { capabilityToken: workspace.capabilityToken }),
				})()
			} catch (cause) {
				return E.left(invalidBacklinksInput(
					document.relativePath,
					`Cannot read backlink document: ${String(cause)}`,
				))
			}
			if (signal?.aborted) return E.left(invalidBacklinksInput("", "Org query cancelled."))
			if (!opened || (opened._tag !== "Left" && opened._tag !== "Right")) {
				return E.left(invalidBacklinksInput(document.relativePath, "Malformed backlink read response"))
			}
			if (E.isLeft(opened)) {
				if (!opened.left || typeof opened.left.message !== "string") {
					return E.left(invalidBacklinksInput(document.relativePath, "Malformed backlink read error"))
				}
				return E.left({
					cause: opened.left,
					message: `Cannot build backlinks from ${document.relativePath}: ${opened.left.message}`,
					relativePath: document.relativePath,
					type: "ORG_BACKLINKS_ERROR",
				})
			}
			if (
				!opened.right ||
				opened.right.relativePath !== document.relativePath ||
				typeof opened.right.content !== "string" ||
				typeof opened.right.revision !== "string" ||
				opened.right.revision.length === 0
			) {
				return E.left(invalidBacklinksInput(
					document.relativePath,
					"Invalid backlink document response path, content or revision",
				))
			}
			const index = parseOrgLinkIndex(document.relativePath, opened.right.content)
			touch(cache, key, { index, revision: opened.right.revision })
			indexes.set(document.relativePath, index)
		}
		const targetIndex = indexes.get(targetPath)
		if (!targetIndex) {
			return E.left(invalidBacklinksInput(targetPath, "Backlink target is no longer available."))
		}
		const ids = new Set(
			targetIndex.identifiers.filter(({ kind }) => kind === "id").map(({ value }) => value),
		)
		const customIds = new Set(
			targetIndex.identifiers.filter(({ kind }) => kind === "custom-id").map(({ value }) => value),
		)
		const backlinks: OrgBacklink[] = []
		for (const index of indexes.values()) {
			for (const link of index.links) {
				if (matchesTarget(link, targetPath, ids, customIds)) backlinks.push(backlinkFrom(link))
			}
		}
		return E.right(sortOrgBacklinks(backlinks))
	}
