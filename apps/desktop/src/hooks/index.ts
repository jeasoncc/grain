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

// Icon Theme Hook
export { useIconTheme } from "./use-icon-theme";
// Save Hooks
export {
	useHasUnsavedChanges,
	useIsManualSaving,
	useManualSave,
	useSaveStatus,
	useSaveStore,
} from "./use-save";
// Settings Hook
export { useSettings } from "./use-settings";
// Theme Hooks
export {
	initializeTheme,
	type ThemeMode,
	useTheme,
	useThemeStore,
} from "./use-theme";
// Theme DOM Hooks
export { applyThemeWithTransition, getSystemTheme } from "./use-theme-dom";

// ============================================================================
// UI 工具 Hooks
// ============================================================================

// Mobile Hook
export { useIsMobile } from "./use-mobile";

// Wiki Hover Preview Hook
export { useWikiHoverPreview } from "./use-wiki-hover-preview";
