import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { orgFileRepository, type OrgFileRepository } from "@/io/file/org-file.repository"
import { markAmbiguousOrgRoamNodes, parseOrgRoamNodes, type OrgRoamNode } from "@/pipes/org/org-roam.pipe"
import type { OrgWorkspaceInterface } from "@/types/org"
import { snapshotOrgQuerySources, type OrgQueryLiveOverlay } from "./org-query-source.flow"

export interface OrgRoamQueryError {
	readonly message: string
	readonly relativePath: string
}

/** Capability-approved reads only; canonical working sources always supersede disk. */
export const loadOrgRoamNodesFlow = (
	inputWorkspace: OrgWorkspaceInterface,
	overlays: readonly OrgQueryLiveOverlay[] = [],
	repository: Pick<OrgFileRepository, "readDocument"> = orgFileRepository,
	metadata: { readonly workspaceSessionId?: string } = {},
	signal?: AbortSignal,
): TE.TaskEither<OrgRoamQueryError, readonly OrgRoamNode[]> => async () => {
	const snapshot = snapshotOrgQuerySources(inputWorkspace, overlays, metadata.workspaceSessionId)
	if (E.isLeft(snapshot)) return snapshot
	const { workspace, liveByPath } = snapshot.right
	const nodes: OrgRoamNode[] = []
	const cancelled = () => E.left<OrgRoamQueryError, readonly OrgRoamNode[]>({ relativePath: "", message: "Roam query cancelled." })
	for (const document of workspace.documents) {
		if (signal?.aborted) return cancelled()
		if (document.relativePath.endsWith("-notes.org")) continue
		const live = liveByPath.get(document.relativePath)
		if (live) {
			nodes.push(...parseOrgRoamNodes(document.relativePath, live.content, JSON.stringify([live.runtimeIncarnation, live.sourceGeneration, live.sourceRevision, live.content])))
			continue
		}
		try {
			const read = await repository.readDocument({ workspaceRoot: workspace.rootPath, relativePath: document.relativePath, ...(workspace.capabilityToken === undefined ? {} : { capabilityToken: workspace.capabilityToken }) })()
			if (signal?.aborted) return cancelled()
			if (!read || (read._tag !== "Left" && read._tag !== "Right")) return E.left({ relativePath: document.relativePath, message: "Malformed Roam read response." })
			if (E.isLeft(read)) return E.left({ relativePath: document.relativePath, message: read.left?.message ?? "Roam read failed." })
			if (!read.right || read.right.relativePath !== document.relativePath || typeof read.right.content !== "string" || typeof read.right.revision !== "string" || !read.right.revision) return E.left({ relativePath: document.relativePath, message: "Invalid Roam document path, content or revision." })
			nodes.push(...parseOrgRoamNodes(document.relativePath, read.right.content, read.right.revision))
		} catch (cause) {
			return E.left({ relativePath: document.relativePath, message: `Cannot read Roam nodes: ${String(cause)}` })
		}
	}
	if (signal?.aborted) return cancelled()
	nodes.sort((a, b) => a.title.localeCompare(b.title) || a.relativePath.localeCompare(b.relativePath) || a.line - b.line)
	return E.right(markAmbiguousOrgRoamNodes(nodes))
}
