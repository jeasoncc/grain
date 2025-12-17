/**
 * 手动保存 Hook - 处理 Ctrl+S 快捷键和手动保存逻辑
 * 基于 Node 文件树结构
 */

import type { SerializedEditorState } from "lexical";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSettings } from "@/hooks/use-settings";
import { keyboardShortcutManager } from "@/services/keyboard-shortcuts";
import { saveService } from "@/services/save";
import { useSaveStore } from "@/stores/save";

interface UseManualSaveOptions {
	/** 节点 ID */
	nodeId: string | null;
	currentContent: SerializedEditorState | null;
	onSaveSuccess?: () => void;
	onSaveError?: (error: string) => void;
}

export function useManualSave({
	nodeId,
	currentContent,
	onSaveSuccess,
	onSaveError,
}: UseManualSaveOptions) {
	const { markAsSaved, markAsError, setIsManualSaving, hasUnsavedChanges } =
		useSaveStore();

	const { autoSave } = useSettings();
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
				toast.success("Saved successfully");
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

			const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
