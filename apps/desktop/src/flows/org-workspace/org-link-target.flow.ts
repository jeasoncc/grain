import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { type OrgFileRepository, orgFileRepository } from "@/io/file/org-file.repository"
import { type OrgLinkClickTarget, type OrgLinkIndex, parseOrgLinkIndex } from "@/pipes/org"
import type { OrgDocumentInterface, OrgFileError, OrgWorkspaceInterface } from "@/types/org"
import {
	orgQueryDocumentCacheKey as cacheKey,
	orgQueryWorkspaceCachePrefix as workspacePrefix,
	snapshotOrgQuerySources,
	type OrgQueryLiveOverlay,
} from "./org-query-source.flow"

export interface ResolvedOrgLinkTarget {
	readonly relativePath: string
	readonly line: number
	/** Disk revision establishing `line`; live positions require exact runtime/source freshness instead. */
	readonly expectedRevision: string | null
	readonly source: "disk" | "live"
	readonly workspaceRoot: string
	readonly capabilityToken?: string
	readonly workspaceSessionId?: string
	readonly sourceRevision: string
	readonly diskRevision: string
	readonly runtimeIncarnation?: string
	readonly sourceGeneration?: number
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
	const prefix = workspacePrefix(workspace)
	const current = new Set(
		workspace.documents.map(({ relativePath }) => cacheKey(workspace, relativePath)),
	)
	for (const key of cache.keys()) {
		if (key.startsWith(prefix) && !current.has(key)) {
			cache.delete(key)
		}
	}
}

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

const invalidLinkQuery = (relativePath: string, message: string): OrgLinkTargetReadError => ({
	cause: {
		cause: message,
		command: "read_org_document",
		message,
		operation: "read",
		type: "ORG_FILE_ERROR",
	},
	message,
	relativePath,
	type: "ORG_LINK_TARGET_READ_ERROR",
})

/** Resolves existing link syntax from canonical working snapshots before unopened disk sources. */
export const resolveOrgLinkTargetFlow =
	(
		inputWorkspace: OrgWorkspaceInterface,
		inputTarget: OrgLinkClickTarget,
		overlays: readonly OrgQueryLiveOverlay[] = [],
		repository: OrgFileRepository = orgFileRepository,
		cache: OrgLinkTargetIndexCache = defaultOrgLinkTargetIndexCache,
		metadata: { readonly workspaceSessionId?: string } = {},
		signal?: AbortSignal,
	): TE.TaskEither<OrgLinkTargetFlowError, ResolvedOrgLinkTarget> =>
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: live/disk authority, IO and target syntax form one read transaction.
	async () => {
		const workspaceSessionId = metadata.workspaceSessionId
		const snapshot = snapshotOrgQuerySources(inputWorkspace, overlays, workspaceSessionId)
		if (E.isLeft(snapshot)) {
			return E.left(invalidLinkQuery(snapshot.left.relativePath, snapshot.left.message))
		}
		const { workspace, liveByPath } = snapshot.right
		const target = { ...inputTarget }
		if (signal?.aborted) return E.left(invalidLinkQuery("", "Org query cancelled."))
		pruneCache(cache, workspace)
		for (const relativePath of liveByPath.keys()) cache.delete(cacheKey(workspace, relativePath))
		const entries = new Map(workspace.documents.map((document) => [document.relativePath, document]))
		const resolved = (
			relativePath: string,
			line: number,
			revision: string | null,
		): ResolvedOrgLinkTarget => {
			const live = liveByPath.get(relativePath)
			const targetSession = live?.workspaceSessionId ?? workspaceSessionId
			return {
				relativePath,
				line,
				expectedRevision: live ? null : revision,
				source: live ? "live" : "disk",
				sourceRevision: live?.sourceRevision ?? revision!,
				diskRevision: live?.diskRevision ?? revision!,
				workspaceRoot: workspace.rootPath,
				...(workspace.capabilityToken === undefined
					? {}
					: { capabilityToken: workspace.capabilityToken }),
				...(targetSession === undefined ? {} : { workspaceSessionId: targetSession }),
				...(live?.runtimeIncarnation === undefined
					? {}
					: { runtimeIncarnation: live.runtimeIncarnation }),
				...(live?.sourceGeneration === undefined
					? {}
					: { sourceGeneration: live.sourceGeneration }),
			}
		}
		const readDisk = async (
			relativePath: string,
		): Promise<E.Either<OrgLinkTargetFlowError, OrgDocumentInterface>> => {
			if (signal?.aborted) return E.left(invalidLinkQuery("", "Org query cancelled."))
			let opened: E.Either<OrgFileError, OrgDocumentInterface>
			try {
				opened = await repository.readDocument({
					relativePath,
					workspaceRoot: workspace.rootPath,
					...(workspace.capabilityToken === undefined
						? {}
						: { capabilityToken: workspace.capabilityToken }),
				})()
			} catch (cause) {
				return E.left(invalidLinkQuery(relativePath, `Cannot read link target: ${String(cause)}`))
			}
			if (signal?.aborted) return E.left(invalidLinkQuery("", "Org query cancelled."))
			if (!opened || (opened._tag !== "Left" && opened._tag !== "Right")) {
				return E.left(invalidLinkQuery(relativePath, "Malformed link target read response"))
			}
			if (E.isLeft(opened)) {
				if (!opened.left || typeof opened.left.message !== "string") {
					return E.left(invalidLinkQuery(relativePath, "Malformed link target read error"))
				}
				return E.left({
					cause: opened.left,
					message: `Cannot resolve link target in ${relativePath}: ${opened.left.message}`,
					relativePath,
					type: "ORG_LINK_TARGET_READ_ERROR",
				})
			}
			if (
				!opened.right ||
				opened.right.relativePath !== relativePath ||
				typeof opened.right.content !== "string" ||
				typeof opened.right.revision !== "string" ||
				opened.right.revision.length === 0
			) {
				return E.left(invalidLinkQuery(relativePath, "Invalid link target document response"))
			}
			return opened
		}
		const loadIndex = async (
			relativePath: string,
		): Promise<E.Either<OrgLinkTargetFlowError, { readonly index: OrgLinkIndex; readonly revision: string | null }>> => {
			if (signal?.aborted) return E.left(invalidLinkQuery("", "Org query cancelled."))
			const live = liveByPath.get(relativePath)
			if (live) return E.right({ index: parseOrgLinkIndex(relativePath, live.content), revision: null })
			const document = entries.get(relativePath)
			if (!document) return E.left({
				message: `Org document does not exist: ${relativePath}`,
				relativePath,
				type: "ORG_LINK_TARGET_FILE_ABSENT",
			})
			const key = cacheKey(workspace, relativePath)
			const cached = cache.get(key)
			if (cached?.revision === document.revision) {
				touchCache(cache, key, cached)
				return E.right({ index: cached.index, revision: cached.revision })
			}
			const opened = await readDisk(relativePath)
			if (E.isLeft(opened)) return opened
			const index = parseOrgLinkIndex(relativePath, opened.right.content)
			touchCache(cache, key, { index, revision: opened.right.revision })
			return E.right({ index, revision: opened.right.revision })
		}

		if (target.kind !== "id" && !entries.has(target.relativePath)) {
			return E.left({
				message: `Org document does not exist: ${target.relativePath}`,
				relativePath: target.relativePath,
				type: "ORG_LINK_TARGET_FILE_ABSENT",
			})
		}
		if (target.kind === "file") {
			const live = liveByPath.get(target.relativePath)
			if (target.value === null) {
				return E.right(resolved(target.relativePath, 1, entries.get(target.relativePath)!.revision))
			}
			if (live) {
				const line = searchLine(live.content, target.value)
				return line === null
					? E.left(missingError(target, target.value))
					: E.right(resolved(target.relativePath, line, null))
			}
			// Generic file searches require verbatim disk text, not only an identifier index.
			const opened = await readDisk(target.relativePath)
			if (E.isLeft(opened)) return opened
			touchCache(cache, cacheKey(workspace, target.relativePath), {
				index: parseOrgLinkIndex(target.relativePath, opened.right.content),
				revision: opened.right.revision,
			})
			const line = searchLine(opened.right.content, target.value)
			return line === null
				? E.left(missingError(target, target.value))
				: E.right(resolved(target.relativePath, line, opened.right.revision))
		}
		const targetPaths = target.kind === "id"
			? workspace.documents.map(({ relativePath }) => relativePath)
			: [target.relativePath]
		const matches: ResolvedOrgLinkTarget[] = []
		for (const relativePath of targetPaths) {
			const loaded = await loadIndex(relativePath)
			if (E.isLeft(loaded)) return loaded
			for (const identifier of loaded.right.index.identifiers) {
				if (identifier.kind === target.kind && identifier.value === target.value) {
					matches.push(resolved(relativePath, identifier.line, loaded.right.revision))
				}
			}
		}
		if (signal?.aborted) return E.left(invalidLinkQuery("", "Org query cancelled."))
		if (matches.length === 0) return E.left(missingError(target, target.value))
		if (matches.length > 1) return E.left({
			matches,
			message: `Multiple ${target.kind} targets match ${target.value}`,
			targetKind: target.kind,
			type: "ORG_LINK_TARGET_AMBIGUOUS",
			value: target.value,
		})
		return E.right(matches[0])
	}
