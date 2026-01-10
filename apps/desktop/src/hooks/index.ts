/**
 * @file hooks/index.ts
 * @description Hooks 统一导出
 *
 * 提供所有 React Hooks 的统一入口，包括：
 * - 数据访问 Hooks（Node、Workspace、Content、Drawing 等）
 * - 状态管理 Hooks（Theme、Settings、Save 等）
 * - UI 工具 Hooks（Mobile、Wiki Preview 等）
 */

// ============================================================================
// 数据访问 Hooks
// ============================================================================

// Attachment Hooks
export {
	useAllAttachments,
	useAttachment,
	useAttachmentCount,
	useAttachmentCountByProject,
	useAttachmentExists,
	useAttachmentsByProject,
	useAttachmentsByProjectAndType,
	useAttachmentsByType,
	useGlobalAttachments,
	useProjectAttachmentSize,
	useProjectAudioFiles,
	useProjectImages,
} from "./use-attachment";
// Content Hooks
export {
	useContentById,
	useContentByNodeId,
	useContentExists,
	useContentsByNodeIds,
} from "./use-content";
// Drawing Hooks
export {
	useAllDrawings,
	useDrawing,
	useDrawingCount,
	useDrawingExists,
	useDrawingSearch,
	useDrawingsByProject,
	useDrawingsByWorkspace,
	useDrawingWorkspace,
	useRecentDrawings,
} from "./use-drawing";
// Node Hooks
export {
	useChildNodes,
	useNode,
	useNodeCount,
	useNodeExists,
	useNodesByIds,
	useNodesByType,
	useNodesByWorkspace,
	useRootNodes,
} from "./use-node";
// Tag Hooks
export {
	useNodesByTag,
	usePopularTags,
	useRecentTags,
	useTag,
	useTagCount,
	useTagGraph,
	useTagSearch,
	useTagsByWorkspace,
} from "./use-tag";

// User Hooks
export {
	useAllUsers,
	useCurrentUser,
	useUser,
	useUserByEmail,
	useUserByUsername,
	useUserCount,
	useUserExists,
	useUserFeatures,
	useUsernameExists,
	useUserSettings,
	useUserSubscription,
	useUsersByPlan,
} from "./use-user";
// Workspace Hooks
export {
	useAllWorkspaces,
	useRecentWorkspaces,
	useWorkspace,
	useWorkspaceCount,
	useWorkspaceExists,
	useWorkspaceSearch,
	useWorkspacesByOwner,
} from "./use-workspace";

// ============================================================================
// 状态管理 Hooks
// ============================================================================

// Editor Tabs Hooks
export {
	useActiveTab,
	useActiveTabId,
	useEditorState,
	useEditorStates,
	useEditorTabs,
	useHasDirtyTabs,
	useIsActiveTab,
	useTabCount,
	useTabs,
} from "./use-editor-tabs";
// Icon Theme Hook
export { useIconTheme } from "./use-icon-theme";
// Save Hooks
export {
	useHasUnsavedChanges,
	useIsManualSaving,
	useSaveStatus,
	useSaveStore,
} from "./use-save";
// Settings Hook
export { useSettings } from "./use-settings";
// Theme Hooks
export {
	useEnableTransition,
	useIsDarkTheme,
	useIsSystemMode,
	useTheme,
	useThemeInitialization,
	useThemeKey,
	useThemeMode,
} from "./use-theme";
// Theme DOM Hooks (re-export from io for backward compatibility)
export { applyThemeWithTransition, getSystemTheme } from "./use-theme-dom";
// Writing Hooks
export {
	useFocusMode,
	useHasActiveSession,
	useMinimalToolbar,
	useTodayDate,
	useTodayWordCount,
	useTypewriterMode,
	useWriting,
	useWritingGoal,
	useWritingSession,
} from "./use-writing";

// ============================================================================
// UI 工具 Hooks
// ============================================================================

// Mobile Hook
export { useIsMobile } from "./use-mobile";
// Update Checker Hook
export { useUpdateChecker } from "./use-update-checker";

// Wiki Hooks
export { useWikiFiles } from "./use-wiki";
// Wiki Hover Preview Hook
export { useWikiHoverPreview } from "./use-wiki-hover-preview";
// Wiki Preview Fetcher Hook
export { useWikiPreviewFetcher, type WikiPreviewData } from "./use-wiki-preview";

// Node Operations Hooks
export { useGetNodeById, useSetNodeCollapsed } from "./use-node-operations";

// Optimistic Update Hooks
export { useOptimisticCollapse } from "./use-optimistic-collapse";

// ============================================================================
// Query Keys (从 queries/ 合并)
// ============================================================================

export type {
	AttachmentQueryKey,
	ContentQueryKey,
	NodeQueryKey,
	TagQueryKey,
	UserQueryKey,
	WorkspaceQueryKey,
} from "./query-keys";
export { queryKeys } from "./query-keys";
