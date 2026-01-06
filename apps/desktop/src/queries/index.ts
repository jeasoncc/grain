/**
 * @file queries/index.ts
 * @deprecated 此目录已合并到 hooks/，请使用新路径：
 *
 * - queries/*.queries.ts → hooks/use-*.ts
 * - queries/query-keys.ts → hooks/query-keys.ts
 *
 * 使用示例：
 * ```tsx
 * // 旧方式（已废弃）
 * import { useWorkspaces, queryKeys } from '@/queries';
 *
 * // 新方式
 * import { useAllWorkspaces, queryKeys } from '@/hooks';
 * ```
 */

// 兼容性重导出（将在未来版本移除）

// Attachment Queries
export {
	useAttachment,
	useAttachmentByPath,
	useAttachments,
	useAttachmentsByProject,
	useAttachmentsByType,
	useAudioFilesByProject,
	useImagesByProject,
} from "./attachment.queries";

// Content Queries
export { useContent, useContentVersion } from "./content.queries";

// Node Queries
export {
	useChildNodes,
	useDescendants,
	useNode,
	useNodesByParent,
	useNodesByType,
	useNodesByWorkspace,
	useRootNodes,
} from "./node.queries";

// Query Keys
export type {
	AttachmentQueryKey,
	ContentQueryKey,
	NodeQueryKey,
	TagQueryKey,
	UserQueryKey,
	WorkspaceQueryKey,
} from "./query-keys";
export { queryKeys } from "./query-keys";

// Tag Queries
export {
	useNodesByTag,
	useTag,
	useTagByName,
	useTagGraph,
	useTagSearch,
	useTagsByWorkspace,
	useTopTags,
} from "./tag.queries";

// User Queries
export {
	useCurrentUser as useCurrentUserQuery,
	useUser as useUserQuery,
	useUserByEmail as useUserByEmailQuery,
	useUserByUsername as useUserByUsernameQuery,
	useUsers as useUsersQuery,
	useUsersByPlan as useUsersByPlanQuery,
} from "./user.queries";

// Workspace Queries
export { useWorkspace, useWorkspaces } from "./workspace.queries";
