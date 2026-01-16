import type { WorkspaceInterface } from "@/types"

export interface StoryWorkspaceContainerProps {
	readonly workspaces: readonly WorkspaceInterface[]
	readonly activeWorkspaceId?: string
}
