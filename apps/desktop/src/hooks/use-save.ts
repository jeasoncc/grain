/**
 * @file hooks/use-save.ts
 * @description Save React Hooks
 *
 * Provides React hooks for document save functionality including:
 * - Manual save with Ctrl+S / Cmd+S keyboard shortcuts
 * - Save status tracking
 * - Auto-save integration
 *
 * @requirements 3.3
 */

import type { SerializedEditorState } from "lexical";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { keyboardShortcutManager } from "@/fn/keyboard";
import { saveService } from "@/fn/save";
import { useSettings } from "@/hooks/use-settings";
import {
	useHasUnsavedChanges,
	useIsManualSaving,
	useSaveStatus,
	useSaveStore,
} from "@/stores/save.store";

// ============================================================================
// Types
// ============================================================================

interface UseManualSaveOptions {
	/** 节点 ID */
	nodeId: string | null;
	/** 当前编辑器内容 */
	currentContent: SerializedEditorState | null;
	/** 保存成功回调 */
	onSaveSuccess?: () => void;
	/** 保存失败回调 */
	onSaveError?: (error: string) => void;
}

interface UseManualSaveReturn {
	/** 执行手动保存 */
	performManualSave: () => Promise<void>;
	/** 是否可以保存 */
	canSave: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 手动保存 Hook - 处理 Ctrl+S 快捷键和手动保存逻辑
 *
 * @param options - 保存选项
 * @returns 保存函数和状态
 *
 * @example
 * ```tsx
 * function Editor({ nodeId, content }) {
 *   const { performManualSave, canSave } = useManualSave({
 *     nodeId,
 *     currentContent: content,
 *     onSaveSuccess: () => console.log('Saved!'),
 *   });
 *
 *   return (
 *     <button onClick={performManualSave} disabled={!canSave}>
 *       Save
 *     </button>
 *   );
 * }
 * ```
 */
export function useManualSave({
	nodeId,
	currentContent,
	onSaveSuccess,
	onSaveError,
}: UseManualSaveOptions): UseManualSaveReturn {
	const { markAsSaved, markAsError, setIsManualSaving, hasUnsavedChanges } =
		useSaveStore();

	const { autoSave: _autoSave } = useSettings();
	const saveTimeoutRef = useRef<number | null>(null);

	// 执行手动保存
	const performManualSave = useCallback(async () => {
		if (!nodeId || !currentContent) {
			toast.info("No content to save");
			return;
		}

		// 如果没有未保存的更改，显示提示但不执行保存
		if (!hasUnsavedChanges && !saveService.hasUnsavedChanges(nodeId)) {
			toast.info("No changes to save");
			return;
		}

		setIsManualSaving(true);

		// 设置保存超时
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = window.setTimeout(() => {
			markAsError("Save timeout");
			toast.error("Save timeout, please check your network connection");
		}, 10000);

		try {
			const result = await saveService.saveDocument(nodeId, currentContent);

			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
				saveTimeoutRef.current = null;
			}

			if (result.success) {
				markAsSaved();
				// 不显示 toast，依赖状态指示器
				// 用户可以通过顶部的保存状态看到结果
				onSaveSuccess?.();
			} else {
				markAsError(result.error || "Save failed");
				toast.error(`Save failed: ${result.error || "Unknown error"}`);
				onSaveError?.(result.error || "Unknown error");
			}
		} catch (error) {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
				saveTimeoutRef.current = null;
			}

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			markAsError(errorMessage);
			toast.error(`Save failed: ${errorMessage}`);
			onSaveError?.(errorMessage);
		} finally {
			setIsManualSaving(false);
		}
	}, [
		nodeId,
		currentContent,
		hasUnsavedChanges,
		setIsManualSaving,
		markAsSaved,
		markAsError,
		onSaveSuccess,
		onSaveError,
	]);

	// 注册 Ctrl+S 快捷键
	useEffect(() => {
		const shortcutKey = "ctrl+s";
		const metaShortcutKey = "meta+s"; // 支持 Mac 的 Cmd+S

		keyboardShortcutManager.registerShortcut(shortcutKey, performManualSave);
		keyboardShortcutManager.registerShortcut(
			metaShortcutKey,
			performManualSave,
		);

		return () => {
			keyboardShortcutManager.unregisterShortcut(shortcutKey);
			keyboardShortcutManager.unregisterShortcut(metaShortcutKey);
		};
	}, [performManualSave]);

	// 清理超时
	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	return {
		performManualSave,
		canSave: Boolean(nodeId && currentContent),
	};
}

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
