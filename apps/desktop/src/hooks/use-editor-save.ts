/**
 * @file hooks/use-editor-save.ts
 * @description 统一编辑器保存 Hook
 *
 * 封装 EditorSaveService 的使用，为所有编辑器类型（Monaco、Lexical、Excalidraw）
 * 提供统一的保存逻辑和状态管理。
 *
 * 数据流：
 * Editor → useEditorSave → EditorSaveService → DB → SaveStore → UI 反馈
 *
 * 配置来源：
 * - autoSave 和 autoSaveInterval 从 useSettings 全局设置读取
 * - tabId 用于同步 EditorTab.isDirty 状态
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useCallback, useEffect, useMemo, useRef } from "react";

import {
	createEditorSaveService,
	type EditorSaveConfig,
	type EditorSaveServiceInterface,
} from "@/fn/save";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import { useSaveStore } from "@/stores/save.store";
import type { ContentType } from "@/types/content/content.interface";

import { useSettings } from "./use-settings";

// ============================================================================
// Types
// ============================================================================

/**
 * useEditorSave Hook 配置选项
 */
export interface UseEditorSaveOptions {
	/** 节点 ID */
	readonly nodeId: string;
	/** 内容类型 */
	readonly contentType: ContentType;
	/** 初始内容（用于设置保存基准） */
	readonly initialContent?: string;
	/** 保存成功回调 */
	readonly onSaveSuccess?: () => void;
	/** 保存失败回调 */
	readonly onSaveError?: (error: Error) => void;
	/** 标签页 ID，用于更新 isDirty 状态 */
	readonly tabId?: string;
}

/**
 * useEditorSave Hook 返回值
 */
export interface UseEditorSaveReturn {
	/** 更新内容（触发防抖保存） */
	updateContent: (content: string) => void;
	/** 立即保存当前内容（用于 Ctrl+S 快捷键） */
	saveNow: () => Promise<void>;
	/** 是否有未保存的更改 */
	hasUnsavedChanges: () => boolean;
	/** 设置初始内容（不触发保存） */
	setInitialContent: (content: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

/** 默认自动保存防抖延迟（秒） - 仅作为 fallback */
const DEFAULT_AUTOSAVE_INTERVAL = 3;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * 统一编辑器保存 Hook
 *
 * 封装 EditorSaveService，自动连接 SaveStore 更新状态，
 * 处理组件卸载时的清理逻辑。
 *
 * @param options - Hook 配置选项
 * @returns 保存相关的函数和状态
 *
 * @example
 * ```tsx
 * function MyEditor({ nodeId }: { nodeId: string }) {
 *   const { updateContent, saveNow, hasUnsavedChanges } = useEditorSave({
 *     nodeId,
 *     contentType: "text",
 *     autoSaveDelay: 1000,
 *     onSaveSuccess: () => console.log("保存成功"),
 *   });
 *
 *   const handleChange = (newContent: string) => {
 *     updateContent(newContent);
 *   };
 *
 *   const handleSave = async () => {
 *     await saveNow();
 *   };
 *
 *   return (
 *     <Editor
 *       onChange={handleChange}
 *       onSave={handleSave}
 *     />
 *   );
 * }
 * ```
 */
export function useEditorSave(
	options: UseEditorSaveOptions,
): UseEditorSaveReturn {
	const {
		nodeId,
		contentType,
		initialContent,
		onSaveSuccess,
		onSaveError,
		tabId,
	} = options;

	// ==============================
	// 读取全局设置
	// ==============================

	const { autoSave, autoSaveInterval } = useSettings();

	// 计算有效的自动保存延迟（毫秒）
	// 当 autoSave=false 时，设为 0 禁用自动保存
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
	// Refs
	// ==============================

	// 保存服务实例引用
	const serviceRef = useRef<EditorSaveServiceInterface | null>(null);

	// 用于追踪最新的回调函数（避免闭包陷阱）
	const callbacksRef = useRef({
		onSaveSuccess,
		onSaveError,
	});

	// 更新回调引用
	useEffect(() => {
		callbacksRef.current = {
			onSaveSuccess,
			onSaveError,
		};
	}, [onSaveSuccess, onSaveError]);

	// ==============================
	// 创建保存服务
	// ==============================

	const saveService = useMemo(() => {
		// 如果已有服务实例，先清理
		if (serviceRef.current) {
			serviceRef.current.dispose();
		}

		const config: EditorSaveConfig = {
			nodeId,
			contentType,
			autoSaveDelay: effectiveDelay,
			onSaving: () => {
				markAsSaving();
			},
			onSaved: () => {
				markAsSaved();
				// 保存成功后清除 tab dirty 状态
				if (tabId) {
					setTabDirty(tabId, false);
				}
				callbacksRef.current.onSaveSuccess?.();
			},
			onError: (error) => {
				markAsError(error.message);
				callbacksRef.current.onSaveError?.(error);
			},
		};

		const service = createEditorSaveService(config);
		serviceRef.current = service;

		logger.debug("[useEditorSave] 保存服务已创建:", {
			nodeId,
			contentType,
			autoSaveDelay: effectiveDelay,
			autoSaveEnabled: effectiveDelay > 0,
		});

		return service;
	}, [
		nodeId,
		contentType,
		effectiveDelay,
		tabId,
		setTabDirty,
		markAsSaving,
		markAsSaved,
		markAsError,
	]);

	// ==============================
	// 初始化内容
	// ==============================

	useEffect(() => {
		if (initialContent !== undefined) {
			saveService.setInitialContent(initialContent);
		}
	}, [saveService, initialContent]);

	// ==============================
	// 清理
	// ==============================

	useEffect(() => {
		return () => {
			// 组件卸载时，先保存未保存的更改，再清理资源
			if (serviceRef.current) {
				const service = serviceRef.current;

				// 如果有未保存的更改，立即保存
				if (service.hasUnsavedChanges()) {
					logger.info("[useEditorSave] 组件卸载，保存未保存的更改");
					service.saveNow().catch((error) => {
						logger.error("[useEditorSave] 卸载时保存失败:", error);
					});
				}

				// 清理资源
				service.dispose();
				serviceRef.current = null;
			}
		};
	}, []);

	// ==============================
	// 返回的函数
	// ==============================

	/**
	 * 更新内容（触发防抖保存）
	 */
	const updateContent = useCallback(
		(content: string) => {
			markAsUnsaved();
			// 同步更新 tab dirty 状态
			if (tabId) {
				setTabDirty(tabId, true);
			}
			saveService.updateContent(content);
		},
		[saveService, markAsUnsaved, tabId, setTabDirty],
	);

	/**
	 * 立即保存当前内容
	 * 用于 Ctrl+S 快捷键或手动保存按钮
	 */
	const saveNow = useCallback(async () => {
		await saveService.saveNow();
	}, [saveService]);

	/**
	 * 是否有未保存的更改
	 */
	const hasUnsavedChanges = useCallback(() => {
		return saveService.hasUnsavedChanges();
	}, [saveService]);

	/**
	 * 设置初始内容（不触发保存）
	 */
	const setInitialContent = useCallback(
		(content: string) => {
			saveService.setInitialContent(content);
		},
		[saveService],
	);

	return {
		updateContent,
		saveNow,
		hasUnsavedChanges,
		setInitialContent,
	};
}
