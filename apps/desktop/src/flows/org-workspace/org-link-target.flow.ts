import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import { type OrgLinkClickTarget, type OrgLinkIndex, parseOrgLinkIndex } from "@/pipes/org"
import type { OrgFileError, OrgWorkspaceInterface } from "@/types/org"

export interface ResolvedOrgLinkTarget {
	readonly relativePath: string
	readonly line: number
	/** Revision whose content established `line`; null for the current unsaved source. */
	readonly expectedRevision: string | null
}

export interface OrgLinkTargetMissingError {
	readonly type: "ORG_LINK_TARGET_MISSING"
	readonly targetKind: OrgLinkClickTarget["kind"]
	readonly value: string
	readonly message: string
}

export interface OrgLinkTargetAmbiguousError {
	readonly type: "ORG_LINK_TARGET_AMBIGUOUS"
	readonly targetKind: "id" | "custom-id"
	readonly value: string
	readonly matches: readonly ResolvedOrgLinkTarget[]
	readonly message: string
}

export interface OrgLinkTargetFileAbsentError {
	readonly type: "ORG_LINK_TARGET_FILE_ABSENT"
	readonly relativePath: string
	readonly message: string
}

export interface OrgLinkTargetReadError {
	readonly type: "ORG_LINK_TARGET_READ_ERROR"
	readonly relativePath: string
	readonly cause: OrgFileError
	readonly message: string
}

export type OrgLinkTargetFlowError =
	| OrgLinkTargetMissingError
	| OrgLinkTargetAmbiguousError
	| OrgLinkTargetFileAbsentError
	| OrgLinkTargetReadError

export interface OrgLinkTargetIndexCacheEntry {
	readonly revision: string
	readonly index: OrgLinkIndex
}

/** Workspace-qualified, revision-keyed LRU index cache. */
export type OrgLinkTargetIndexCache = Map<string, OrgLinkTargetIndexCacheEntry>

export const ORG_LINK_TARGET_CACHE_MAX_ENTRIES = 500

const defaultOrgLinkTargetIndexCache: OrgLinkTargetIndexCache = new Map()

const workspacePrefix = (rootPath: string): string => `${rootPath.length}:${rootPath}:`
const cacheKey = (rootPath: string, relativePath: string): string =>
	`${workspacePrefix(rootPath)}${relativePath}`

const touchCache = (
	cache: OrgLinkTargetIndexCache,
	key: string,
	entry: OrgLinkTargetIndexCacheEntry,
): void => {
	cache.delete(key)
	cache.set(key, entry)
	while (cache.size > ORG_LINK_TARGET_CACHE_MAX_ENTRIES) {
		const oldest = cache.keys().next().value
		if (oldest === undefined) {
			return
		}
		cache.delete(oldest)
	}
}

const pruneCache = (cache: OrgLinkTargetIndexCache, workspace: OrgWorkspaceInterface): void => {
	const prefix = workspacePrefix(workspace.rootPath)
	const current = new Set(
		workspace.documents.map(({ relativePath }) => cacheKey(workspace.rootPath, relativePath)),
	)
	for (const key of cache.keys()) {
		if (key.startsWith(prefix) && !current.has(key)) {
			cache.delete(key)
		}
	}
}

const comparePaths = (
	left: { readonly relativePath: string },
	right: { readonly relativePath: string },
): number =>
	left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0

const missingError = (target: OrgLinkClickTarget, value: string): OrgLinkTargetMissingError => ({
	message: `No ${target.kind} target matches ${value}`,
	targetKind: target.kind,
	type: "ORG_LINK_TARGET_MISSING",
	value,
})

const searchLine = (source: string, search: string): number | null => {
	const lines = source.split(/\r\n|\r|\n/)
	if (/^[1-9]\d*$/.test(search)) {
		const line = Number(search)
		return line <= lines.length ? line : null
	}
	if (search.startsWith("*")) {
		const heading = search.replace(/^\*+\s*/, "")
		const index = lines.findIndex(
			(line) => /^\*+\s+/.test(line) && line.replace(/^\*+\s+/, "") === heading,
		)
		return index === -1 ? null : index + 1
	}
	const index = lines.findIndex((line) => line.includes(search))
	return index === -1 ? null : index + 1
}

/** Resolves a parsed click target through deterministic, revision-aware workspace reads. */
export const resolveOrgLinkTargetFlow =
	(
		workspace: OrgWorkspaceInterface,
		sourceDocumentPath: string,
		currentSourceContent: string,
		target: OrgLinkClickTarget,
		repository: OrgFileRepository = orgFileRepository,
		cache: OrgLinkTargetIndexCache = defaultOrgLinkTargetIndexCache,
	): TE.TaskEither<OrgLinkTargetFlowError, ResolvedOrgLinkTarget> =>
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: IO, cache validation, and target branches form one ordered resolution transaction.
	async () => {
		pruneCache(cache, workspace)
		cache.delete(cacheKey(workspace.rootPath, sourceDocumentPath))
		const documents = [...workspace.documents].sort(comparePaths)
		const entries = new Map(documents.map((document) => [document.relativePath, document]))

		const loadIndex = async (
			relativePath: string,
		): Promise<
			E.Either<
				OrgLinkTargetFlowError,
				{ readonly index: OrgLinkIndex; readonly revision: string | null }
			>
		> => {
			if (relativePath === sourceDocumentPath) {
				return E.right({
					index: parseOrgLinkIndex(relativePath, currentSourceContent),
					revision: null,
				})
			}
			const document = entries.get(relativePath)
			if (!document) {
				return E.left({
					message: `Org document does not exist: ${relativePath}`,
					relativePath,
					type: "ORG_LINK_TARGET_FILE_ABSENT",
				})
			}
			const key = cacheKey(workspace.rootPath, relativePath)
			const cached = cache.get(key)
			if (cached?.revision === document.revision) {
				touchCache(cache, key, cached)
				return E.right({ index: cached.index, revision: cached.revision })
			}
			const opened = await repository.readDocument({
				relativePath,
				workspaceRoot: workspace.rootPath,
			})()
			if (E.isLeft(opened)) {
				return E.left({
					cause: opened.left,
					message: `Cannot resolve link target in ${relativePath}: ${opened.left.message}`,
					relativePath,
					type: "ORG_LINK_TARGET_READ_ERROR",
				})
			}
			const index = parseOrgLinkIndex(relativePath, opened.right.content)
			touchCache(cache, key, { index, revision: opened.right.revision })
			return E.right({ index, revision: opened.right.revision })
		}

		if (target.kind === "file") {
			if (!entries.has(target.relativePath) && target.relativePath !== sourceDocumentPath) {
				return E.left({
					message: `Org document does not exist: ${target.relativePath}`,
					relativePath: target.relativePath,
					type: "ORG_LINK_TARGET_FILE_ABSENT",
				})
			}
			if (target.value === null) {
				return E.right({
					expectedRevision:
						target.relativePath === sourceDocumentPath
							? null
							: (entries.get(target.relativePath)?.revision ?? null),
					line: 1,
					relativePath: target.relativePath,
				})
			}
			if (target.relativePath === sourceDocumentPath) {
				const line = searchLine(currentSourceContent, target.value)
				return line === null
					? E.left(missingError(target, target.value))
					: E.right({ expectedRevision: null, line, relativePath: target.relativePath })
			}
			// Generic file searches require source text rather than only the cached index.
			const opened = await repository.readDocument({
				relativePath: target.relativePath,
				workspaceRoot: workspace.rootPath,
			})()
			if (E.isLeft(opened)) {
				return E.left({
					cause: opened.left,
					message: `Cannot resolve link target in ${target.relativePath}: ${opened.left.message}`,
					relativePath: target.relativePath,
					type: "ORG_LINK_TARGET_READ_ERROR",
				})
			}
			const index = parseOrgLinkIndex(target.relativePath, opened.right.content)
			touchCache(cache, cacheKey(workspace.rootPath, target.relativePath), {
				index,
				revision: opened.right.revision,
			})
			const line = searchLine(opened.right.content, target.value)
			return line === null
				? E.left(missingError(target, target.value))
				: E.right({
						expectedRevision: opened.right.revision,
						line,
						relativePath: target.relativePath,
					})
		}

		const targetPaths =
			target.kind === "id"
				? documents.map(({ relativePath }) => relativePath)
				: [target.relativePath]
		if (
			target.kind === "custom-id" &&
			!entries.has(target.relativePath) &&
			target.relativePath !== sourceDocumentPath
		) {
			return E.left({
				message: `Org document does not exist: ${target.relativePath}`,
				relativePath: target.relativePath,
				type: "ORG_LINK_TARGET_FILE_ABSENT",
			})
		}
		if (target.kind === "id" && !targetPaths.includes(sourceDocumentPath)) {
			targetPaths.push(sourceDocumentPath)
		}
		const matches: ResolvedOrgLinkTarget[] = []
		for (const relativePath of targetPaths) {
			const loaded = await loadIndex(relativePath)
			if (E.isLeft(loaded)) {
				return loaded
			}
			for (const identifier of loaded.right.index.identifiers) {
				if (identifier.kind === target.kind && identifier.value === target.value) {
					matches.push({
						expectedRevision: loaded.right.revision,
						line: identifier.line,
						relativePath,
					})
				}
			}
		}
		if (matches.length === 0) {
			return E.left(missingError(target, target.value))
		}
		if (matches.length > 1) {
			return E.left({
				matches,
				message: `Multiple ${target.kind} targets match ${target.value}`,
				targetKind: target.kind,
				type: "ORG_LINK_TARGET_AMBIGUOUS",
				value: target.value,
			})
		}
		return E.right(matches[0])
	}
