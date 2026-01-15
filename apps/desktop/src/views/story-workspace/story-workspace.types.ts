import type { WorkspaceInterface } from "@/types"

export interface StoryWorkspaceContainerProps {
	readonly workspaces: WorkspaceInterface[]
	readonly activeWorkspaceId?: string
}
