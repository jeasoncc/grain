import type { OrgQueryLiveOverlay } from "@/flows/org-workspace/org-query-source.flow"
import type { OrgWorkspaceController } from "./use-org-workspace"

/** Scope checks need no live Source payload or catalog traversal. */
export const orgQueryScopeFromController = (
	controller: Pick<OrgWorkspaceController, "workspace" | "workspaceSessionId">,
) => JSON.stringify([controller.workspace?.rootPath, controller.workspace?.capabilityToken, controller.workspaceSessionId])

/** A derived snapshot only: the controller's canonical buffers retain source/history ownership. */
export const orgQuerySourcesFromController = (
	controller: Pick<OrgWorkspaceController, "workspace" | "workspaceSessionId" | "liveBuffers">,
) => {
	const workspace = controller.workspace
	const session = controller.workspaceSessionId
	const overlays: readonly OrgQueryLiveOverlay[] = controller.liveBuffers.map((buffer) => ({
		workspaceRoot: workspace?.rootPath ?? "",
		capabilityToken: workspace?.capabilityToken,
		workspaceSessionId: session ?? undefined,
		relativePath: buffer.document.relativePath,
		content: buffer.content,
		sourceRevision: buffer.bufferId,
		diskRevision: buffer.document.revision,
		runtimeIncarnation: buffer.runtimeIncarnation,
		sourceGeneration: buffer.sourceGeneration,
	}))
	// Source generations fence unsaved edits and ABA; bodies stay only in the captured overlays.
	const liveSnapshotKey = JSON.stringify(controller.liveBuffers.map((buffer) => [
		buffer.bufferId, buffer.document.relativePath, buffer.document.revision,
		buffer.runtimeIncarnation, buffer.sourceGeneration,
	]))
	const scope = orgQueryScopeFromController(controller)
	const catalog = workspace && [
		workspace.documents.map((document) => [document.relativePath, document.revision]),
		workspace.directories,
		workspace.originalRecoveries?.map((recovery) => [
			recovery.relativePath, recovery.sourceRelativePath, recovery.kind, recovery.object,
		]),
	]
	return {
		workspace,
		session,
		overlays,
		liveSnapshotKey,
		scope,
		sourceKey: JSON.stringify([scope, catalog, liveSnapshotKey]),
	}
}
