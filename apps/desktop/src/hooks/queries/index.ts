/**
 * @file hooks/queries/index.ts
 * @description TanStack Query hooks - 数据获取层
 *
 * 此目录包含所有 TanStack Query hooks，用于从 Rust 后端获取数据。
 * 这是架构中唯一允许 hooks 直接访问 io/api 的地方（TanStack Query 特例）。
 *
 * 使用示例：
 * ```tsx
 * import { useWorkspaces, queryKeys } from '@/hooks/queries';
 * // 或者
 * import { useAllWorkspaces } from '@/hooks';
 * ```
 */

// Attachment Queries
export {
	useAttachment,
	useAttachmentByPath,
	useAttachments,
	useAttachmentsByProject,
	useAttachmentsByType,
	useAudioFilesByProject,
	useImagesByProject,
} from "./attachment.queries"

// Content Queries
export { useContent, useContentVersion } from "./content.queries"

// Node Queries
export {
	useChildNodes,
	useDescendants,
	useNode,
	useNodesByParent,
	useNodesByType,
	useNodesByWorkspace,
	useRootNodes,
} from "./node.queries"

// Query Keys
export type {
	AttachmentQueryKey,
	ContentQueryKey,
	NodeQueryKey,
	TagQueryKey,
	UserQueryKey,
	WorkspaceQueryKey,
} from "./query-keys"
export { queryKeys } from "./query-keys"

// Tag Queries
export {
	useNodesByTag,
	useTag,
	useTagByName,
	useTagGraph,
	useTagSearch,
	useTagsByWorkspace,
	useTopTags,
} from "./tag.queries"

// User Queries
export {
	useCurrentUser as useCurrentUserQuery,
	useUser as useUserQuery,
	useUserByEmail as useUserByEmailQuery,
	useUserByUsername as useUserByUsernameQuery,
	useUsers as useUsersQuery,
	useUsersByPlan as useUsersByPlanQuery,
} from "./user.queries"

// Workspace Queries
export { useWorkspace, useWorkspaces } from "./workspace.queries"
