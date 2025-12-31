/**
 * @file hooks/use-unified-save.ts
 * @description 统一编辑器保存 Hook
 *
 * 核心设计原则：
 * - 不管是自动保存还是手动保存，都调用同一个保存函数
 * - 手动保存是核心功能，自动保存是辅助功能
 * - 所有编辑器（Lexical、Excalidraw、Diagram、Code）共用此 hook
 *
 * 功能：
 * - 自动保存（防抖，可配置间隔，可禁用）
 * - 手动保存（Ctrl+S 快捷键）
 * - isDirty 状态同步（Tab 圆点显示）
 * - 组件卸载时自动保存
 *
 * 数据流：
 * Editor → useUnifiedSave → UnifiedSaveService → DB + Tab.isDirty + SaveStore
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { keyboardShortcutManager } from "@/fn/keyboard";
import {
	createUnifiedSaveService,
	type UnifiedSaveServiceInterface,
} from "@/fn/save/unified-save.service";
import { saveQueueService } from "@/lib/save-queue";
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
 * 统一编辑器保存 Hook
 *
 * 所有编辑器共用此 hook，确保保存行为一致：
 * - 自动保存和手动保存调用同一个保存函数
 * - 保存成功后统一更新 DB、Tab.isDirty、SaveStore
 * - 支持 Ctrl+S 快捷键
 * - 组件卸载时自动保存未保存的更改
 *
 * @param options - Hook 配置选项
 * @returns 保存相关的函数和状态
 *
 * @example
 * ```tsx
 * function MyEditor({ nodeId, tabId }: Props) {
 *   const { updateContent, saveNow, hasUnsavedChanges } = useUnifiedSave({
 *     nodeId,
 *     tabId,
 *     contentType: "lexical",
 *     onSaveSuccess: () => console.log("保存成功"),
 *   });
 *
 *   const handleChange = (newContent: string) => {
 *     updateContent(newContent); // 触发防抖自动保存
 *   };
 *
 *   // Ctrl+S 会自动调用 saveNow()
 *
 *   return <Editor onChange={handleChange} />;
 * }
 * ```
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
	const serviceRef = useRef<UnifiedSaveServiceInterface | null>(null);

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

		const service = createUnifiedSaveService({
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

		serviceRef.current = service;

		logger.debug("[useUnifiedSave] 保存服务已创建:", {
			nodeId,
			contentType,
			autoSaveDelay: effectiveDelay,
			autoSaveEnabled: effectiveDelay > 0,
			tabId,
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
	// 手动保存函数（Ctrl+S 调用）
	// ==============================

	const performManualSave = useCallback(async () => {
		if (!nodeId) {
			toast.info("没有可保存的内容");
			return;
		}

		// 检查是否有未保存的更改
		if (!saveService.hasUnsavedChanges()) {
			toast.info("没有需要保存的更改");
			return;
		}

		logger.info("[useUnifiedSave] 执行手动保存");
		const success = await saveService.saveNow();

		if (!success) {
			toast.error("保存失败，请重试");
		}
	}, [nodeId, saveService]);

	// ==============================
	// 注册 Ctrl+S 快捷键
	// ==============================

	useEffect(() => {
		if (!registerShortcut || !nodeId) return;

		const shortcutKey = "ctrl+s";
		const metaShortcutKey = "meta+s"; // Mac 的 Cmd+S

		keyboardShortcutManager.registerShortcut(shortcutKey, performManualSave);
		keyboardShortcutManager.registerShortcut(
			metaShortcutKey,
			performManualSave,
		);

		return () => {
			keyboardShortcutManager.unregisterShortcut(shortcutKey);
			keyboardShortcutManager.unregisterShortcut(metaShortcutKey);
		};
	}, [registerShortcut, nodeId, performManualSave]);

	// ==============================
	// 清理（组件卸载时保存）
	// ==============================

	useEffect(() => {
		// 捕获当前的 nodeId、tabId 和 setTabDirty，避免闭包问题
		const currentNodeId = nodeId;
		const currentTabId = tabId;
		const currentSetTabDirty = setTabDirty;

		return () => {
			if (serviceRef.current) {
				const service = serviceRef.current;

				// 如果有未保存的更改，入队保存（fire-and-forget）
				if (service.hasUnsavedChanges()) {
					logger.info("[useUnifiedSave] 组件卸载，入队保存");
					saveQueueService.enqueueSave(currentNodeId, () => service.saveNow());

					// 清除 isDirty 状态（因为已入队）
					if (currentTabId && currentSetTabDirty) {
						currentSetTabDirty(currentTabId, false);
					}
				}

				// 清理资源
				service.dispose();
				serviceRef.current = null;
			}
		};
	}, [nodeId, tabId, setTabDirty]);

	// ==============================
	// 返回的函数
	// ==============================

	/**
	 * 更新内容（触发防抖自动保存）
	 */
	const updateContent = useCallback(
		(content: string) => {
			markAsUnsaved();
			saveService.updateContent(content);
		},
		[saveService, markAsUnsaved],
	);

	/**
	 * 立即保存当前内容
	 */
	const saveNow = useCallback(async () => {
		return await saveService.saveNow();
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
