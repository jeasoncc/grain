/**
 * @file hooks/use-unified-save.ts
 * @description 统一编辑器保存 Hook（单例模式）
 *
 * 核心设计原则：
 * - 组件只连接 SaveServiceManager，不创建/销毁服务
 * - 组件卸载时 model 保留，Tab 关闭时才清理
 * - 所有编辑器（Lexical、Excalidraw、Diagram、Code）共用此 hook
 *
 * 功能：
 * - 自动保存（防抖，可配置间隔，可禁用）
 * - 手动保存（Ctrl+S 快捷键）
 * - isDirty 状态同步（Tab 圆点显示）
 *
 * 数据流：
 * Editor → useUnifiedSave → SaveServiceManager → DB + Tab.isDirty + SaveStore
 */

import { useCallback, useEffect, useRef } from "react";
import { keyboardShortcutManager } from "@/fn/keyboard";
import { saveServiceManager } from "@/lib/save-service-manager";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import { useSaveStore } from "@/stores/save.store";
import type { ContentType } from "@/types/content/content.interface";

import { useSettings } from "./use-settings";

// ============================================================================
// Types
// ============================================================================

/**
 * useUnifiedSave Hook 配置选项
 */
export interface UseUnifiedSaveOptions {
	/** 节点 ID */
	readonly nodeId: string;
	/** 内容类型 */
	readonly contentType: ContentType;
	/** 标签页 ID，用于更新 isDirty 状态 */
	readonly tabId?: string;
	/** 初始内容（用于设置保存基准） */
	readonly initialContent?: string;
	/** 保存成功回调 */
	readonly onSaveSuccess?: () => void;
	/** 保存失败回调 */
	readonly onSaveError?: (error: Error) => void;
	/** 是否注册 Ctrl+S 快捷键（默认 true） */
	readonly registerShortcut?: boolean;
}

/**
 * useUnifiedSave Hook 返回值
 */
export interface UseUnifiedSaveReturn {
	/** 更新内容（触发防抖自动保存） */
	updateContent: (content: string) => void;
	/** 立即保存当前内容（手动保存） */
	saveNow: () => Promise<boolean>;
	/** 是否有未保存的更改 */
	hasUnsavedChanges: () => boolean;
	/** 设置初始内容（不触发保存） */
	setInitialContent: (content: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

/** 默认自动保存间隔（秒） */
const DEFAULT_AUTOSAVE_INTERVAL = 3;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * 统一编辑器保存 Hook（单例模式）
 *
 * 组件只负责连接 SaveServiceManager，不负责创建/销毁服务：
 * - 组件挂载时注册/更新 model
 * - 组件卸载时不清理 model（model 保留）
 * - Tab 关闭时由 store 调用 dispose 清理
 *
 * @param options - Hook 配置选项
 * @returns 保存相关的函数和状态
 */
export function useUnifiedSave(
	options: UseUnifiedSaveOptions,
): UseUnifiedSaveReturn {
	const {
		nodeId,
		contentType,
		tabId,
		initialContent,
		onSaveSuccess,
		onSaveError,
		registerShortcut = true,
	} = options;

	// ==============================
	// 读取全局设置
	// ==============================

	const { autoSave, autoSaveInterval } = useSettings();

	// 计算有效的自动保存延迟（毫秒）
	const effectiveDelay = autoSave
		? (autoSaveInterval ?? DEFAULT_AUTOSAVE_INTERVAL) * 1000
		: 0;

	// ==============================
	// Store 连接
	// ==============================

	const { markAsUnsaved, markAsSaving, markAsSaved, markAsError } =
		useSaveStore();

	const setTabDirty = useEditorTabsStore((s) => s.setTabDirty);

	// ==============================
	// Refs（用于回调）
	// ==============================

	const callbacksRef = useRef({
		onSaveSuccess,
		onSaveError,
	});

	useEffect(() => {
		callbacksRef.current = {
			onSaveSuccess,
			onSaveError,
		};
	}, [onSaveSuccess, onSaveError]);

	// ==============================
	// 注册/更新 model（组件挂载时）
	// ==============================

	useEffect(() => {
		logger.debug(`[useUnifiedSave] 注册 model: ${nodeId}`);

		saveServiceManager.getOrCreate({
			nodeId,
			contentType,
			autoSaveDelay: effectiveDelay,
			tabId,
			setTabDirty,
			onSaving: () => {
				markAsSaving();
			},
			onSaved: () => {
				markAsSaved();
				callbacksRef.current.onSaveSuccess?.();
			},
			onError: (error) => {
				markAsError(error.message);
				callbacksRef.current.onSaveError?.(error);
			},
		});

		// 注意：组件卸载时不清理 model！
	}, [nodeId, contentType, effectiveDelay, tabId, setTabDirty, markAsSaving, markAsSaved, markAsError]);

	// ==============================
	// 设置初始内容
	// ==============================

	useEffect(() => {
		if (initialContent !== undefined) {
			saveServiceManager.setInitialContent(nodeId, initialContent);
		}
	}, [nodeId, initialContent]);

	// ==============================
	// 注册 Ctrl+S 快捷键
	// ==============================

	useEffect(() => {
		if (!registerShortcut || !nodeId) return;

		const handleSave = async () => {
			// 检查是否有未保存的更改
			if (!saveServiceManager.hasUnsavedChanges(nodeId)) {
				logger.debug("[useUnifiedSave] 没有需要保存的更改");
				return;
			}
			logger.info("[useUnifiedSave] 执行手动保存 (Ctrl+S)");
			await saveServiceManager.saveNow(nodeId);
		};

		const shortcutKey = "ctrl+s";
		const metaShortcutKey = "meta+s"; // Mac 的 Cmd+S

		keyboardShortcutManager.registerShortcut(shortcutKey, handleSave);
		keyboardShortcutManager.registerShortcut(metaShortcutKey, handleSave);

		return () => {
			keyboardShortcutManager.unregisterShortcut(shortcutKey);
			keyboardShortcutManager.unregisterShortcut(metaShortcutKey);
		};
	}, [registerShortcut, nodeId]);

	// ==============================
	// 返回的函数
	// ==============================

	/**
	 * 更新内容（触发防抖自动保存）
	 */
	const updateContent = useCallback(
		(content: string) => {
			markAsUnsaved();
			saveServiceManager.updateContent(nodeId, content);
		},
		[nodeId, markAsUnsaved],
	);

	/**
	 * 立即保存当前内容（手动保存）
	 */
	const saveNow = useCallback(async (): Promise<boolean> => {
		// 检查是否有未保存的更改
		if (!saveServiceManager.hasUnsavedChanges(nodeId)) {
			logger.debug("[useUnifiedSave] 没有需要保存的更改");
			return true;
		}

		logger.info("[useUnifiedSave] 执行手动保存");
		return await saveServiceManager.saveNow(nodeId);
	}, [nodeId]);

	/**
	 * 是否有未保存的更改
	 */
	const hasUnsavedChanges = useCallback(() => {
		return saveServiceManager.hasUnsavedChanges(nodeId);
	}, [nodeId]);

	/**
	 * 设置初始内容（不触发保存）
	 */
	const setInitialContent = useCallback(
		(content: string) => {
			saveServiceManager.setInitialContent(nodeId, content);
		},
		[nodeId],
	);

	return {
		updateContent,
		saveNow,
		hasUnsavedChanges,
		setInitialContent,
	};
}
