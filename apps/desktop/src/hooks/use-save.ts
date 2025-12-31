/**
 * @file hooks/use-save.ts
 * @description Save Store Hooks 重新导出
 *
 * 从 save.store 重新导出保存状态相关的 hooks，
 * 便于组件统一从 hooks 目录导入。
 *
 * 注意：实际的保存逻辑请使用 useUnifiedSave hook
 */

import {
	useHasUnsavedChanges,
	useIsManualSaving,
	useSaveStatus,
	useSaveStore,
} from "@/stores/save.store";

/**
 * Hook to get save status
 *
 * @returns Current save status
 */
export { useSaveStatus };

/**
 * Hook to check if there are unsaved changes
 *
 * @returns True if there are unsaved changes
 */
export { useHasUnsavedChanges };

/**
 * Hook to check if manual save is in progress
 *
 * @returns True if manual save is in progress
 */
export { useIsManualSaving };

/**
 * Hook to access the full save store
 *
 * @returns Save store with all state and actions
 */
export { useSaveStore };
