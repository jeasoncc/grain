import { useQuery } from "@tanstack/react-query"
import * as E from "fp-ts/Either"
import { getLegacyMigrationSnapshot, listLegacyWorkspaces } from "@/io/api/migration.api"

/** No generic historical CRUD queries or editable projections enter this surface. */
export function useLegacyMigrationSource(enabled = true) {
	return useQuery({
		queryKey: ["legacy-readonly", "workspaces"],
		enabled,
		retry: false,
		queryFn: async () => {
			const result = await listLegacyWorkspaces()()
			if (E.isLeft(result)) throw new Error(result.left.message)
			return result.right
		},
	})
}

export function useLegacyMigrationPreview(workspaceId: string | null) {
	return useQuery({
		queryKey: ["legacy-readonly", "snapshot", workspaceId],
		enabled: workspaceId !== null,
		retry: false,
		queryFn: async () => {
			if (!workspaceId) throw new Error("Select a historical workspace")
			const result = await getLegacyMigrationSnapshot(workspaceId)()
			if (E.isLeft(result)) throw new Error(result.left.message)
			if (result.right.graph.workspace.id !== workspaceId) throw new Error("Historical snapshot belongs to another workspace")
			return result.right
		},
	})
}
