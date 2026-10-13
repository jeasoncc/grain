import * as E from "fp-ts/Either"
import type { OrgAgendaSourceMetadata } from "@/pipes/org/org-agenda.pipe"
import { isSafeRelativeOrgPath } from "@/pipes/org/org-subtree-refile.pipe"
import type { OrgWorkspaceInterface } from "@/types/org"

/** Verbatim canonical working source, scoped to the grant/session that owns it. */
export interface OrgQueryLiveOverlay extends OrgAgendaSourceMetadata {
	readonly workspaceRoot: string
	readonly capabilityToken?: string
	readonly relativePath: string
	readonly content: string
	readonly sourceRevision: string
	readonly diskRevision: string
}

interface OrgQuerySourceError {
	readonly relativePath: string
	readonly message: string
}

export const nonemptyOrgQueryValue = (value: unknown): value is string =>
	typeof value === "string" && value.length > 0

const safePath = (path: unknown): path is string =>
	typeof path === "string" &&
	isSafeRelativeOrgPath(path) &&
	![...path].some(
		(character) =>
			character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === ":",
	)

export const orgQueryWorkspaceCachePrefix = (workspace: OrgWorkspaceInterface): string => {
	const token = workspace.capabilityToken
	return `${workspace.rootPath.length}:${workspace.rootPath}:${token === undefined ? "absent" : `present:${token.length}:${token}`}:`
}

export const orgQueryDocumentCacheKey = (
	workspace: OrgWorkspaceInterface,
	relativePath: string,
): string => `${orgQueryWorkspaceCachePrefix(workspace)}${relativePath}`

/** Snapshot before IO; protected buffers may outlive removal from the latest disk scan. */
export const snapshotOrgQuerySources = (
	workspace: OrgWorkspaceInterface,
	overlays: readonly OrgQueryLiveOverlay[],
	workspaceSessionId?: string,
): E.Either<
	OrgQuerySourceError,
	{
		readonly workspace: OrgWorkspaceInterface
		readonly liveByPath: ReadonlyMap<string, OrgQueryLiveOverlay>
	}
> => {
	if (
		!workspace ||
		!nonemptyOrgQueryValue(workspace.rootPath) ||
		!Array.isArray(workspace.documents) ||
		(workspace.capabilityToken !== undefined && typeof workspace.capabilityToken !== "string") ||
		!Array.isArray(overlays) ||
		(workspaceSessionId !== undefined && !nonemptyOrgQueryValue(workspaceSessionId))
	) {
		return E.left({ relativePath: "", message: "Invalid query workspace or session" })
	}
	const liveByPath = new Map<string, OrgQueryLiveOverlay>()
	for (const overlay of overlays) {
		if (
			!overlay ||
			overlay.workspaceRoot !== workspace.rootPath ||
			overlay.capabilityToken !== workspace.capabilityToken ||
			(workspaceSessionId !== undefined &&
				overlay.workspaceSessionId !== undefined &&
				overlay.workspaceSessionId !== workspaceSessionId)
		) {
			continue
		}
		if (
			!safePath(overlay.relativePath) ||
			typeof overlay.content !== "string" ||
			!nonemptyOrgQueryValue(overlay.sourceRevision) ||
			!nonemptyOrgQueryValue(overlay.diskRevision) ||
			(overlay.runtimeIncarnation !== undefined &&
				!nonemptyOrgQueryValue(overlay.runtimeIncarnation)) ||
			(overlay.workspaceSessionId !== undefined &&
				!nonemptyOrgQueryValue(overlay.workspaceSessionId)) ||
			(overlay.sourceGeneration !== undefined &&
				(!Number.isSafeInteger(overlay.sourceGeneration) || overlay.sourceGeneration < 0)) ||
			liveByPath.has(overlay.relativePath)
		) {
			return E.left({
				relativePath: overlay.relativePath ?? "",
				message: "Invalid or ambiguous live query snapshot",
			})
		}
		liveByPath.set(overlay.relativePath, { ...overlay })
	}
	const documents = workspace.documents.map((document) => ({ ...document }))
	const paths = new Set<string>()
	for (const document of documents) {
		if (
			!safePath(document.relativePath) ||
			!nonemptyOrgQueryValue(document.revision) ||
			paths.has(document.relativePath)
		) {
			return E.left({
				relativePath: document.relativePath ?? "",
				message: "Invalid query document path or revision",
			})
		}
		paths.add(document.relativePath)
	}
	for (const live of liveByPath.values()) {
		if (!paths.has(live.relativePath)) {
			documents.push({ relativePath: live.relativePath, revision: live.diskRevision })
		}
	}
	documents.sort((left, right) =>
		left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0,
	)
	return E.right({ workspace: { ...workspace, documents }, liveByPath })
}
