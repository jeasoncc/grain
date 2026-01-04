/**
 * TanStack Query Hooks - 数据查询层
 *
 * 使用 TanStack Query 包装 Repository 层的 TaskEither。
 * 这里是唯一允许「解包」TaskEither 的地方。
 *
 * 架构位置：
 * ```
 * Components (读取数据)
 *       │
 *       ▼
 * Query Hooks ← 你在这里
 *       │
 *       ▼
 * Repository Layer
 * ```
 *
 * 设计原则：
 * - 读取操作使用 useQuery（本文件）
 * - 写入操作使用纯 TaskEither 管道（在 actions 中）
 *
 * 使用示例：
 * ```tsx
 * import { useNodesByWorkspace, useWorkspaces } from '@/queries';
 *
 * const MyComponent = () => {
 *   const { data: workspaces } = useWorkspaces();
 *   const { data: nodes } = useNodesByWorkspace(workspaceId);
 *   // ...
 * };
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
export type {
	AttachmentQueryKey,
	ContentQueryKey,
	NodeQueryKey,
	TagQueryKey,
	UserQueryKey,
	WorkspaceQueryKey,
} from "./query-keys";
// Query Keys
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
