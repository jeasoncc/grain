/**
 * @file fn/save/editor-save.service.ts
 * @description 统一编辑器保存服务
 *
 * 为所有编辑器类型（Monaco、Lexical、Excalidraw）提供统一的保存逻辑：
 * - 防抖自动保存
 * - 手动保存（Ctrl+S）
 * - 未保存更改追踪
 * - 组件卸载时保存
 *
 * 数据流：
 * Editor → updateContent → 防抖 → saveContent → DB → 回调通知
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { debounce } from "es-toolkit";
import * as E from "fp-ts/Either";

import { updateContentByNodeId } from "@/db";
import logger from "@/log";
import type { ContentType } from "@/types/content/content.interface";

// ============================================================================
// Types
// ============================================================================

/**
 * 保存服务配置
 */
export interface EditorSaveConfig {
	/** 节点 ID */
	readonly nodeId: string;
	/** 内容类型 */
	readonly contentType: ContentType;
	/** 自动保存防抖延迟（毫秒），默认 1000ms */
	readonly autoSaveDelay?: number;
	/** 保存开始回调 */
	readonly onSaving?: () => void;
	/** 保存成功回调 */
	readonly onSaved?: () => void;
	/** 保存失败回调 */
	readonly onError?: (error: Error) => void;
}

/**
 * 编辑器保存服务接口
 */
export interface EditorSaveServiceInterface {
	/** 更新内容（触发防抖保存） */
	updateContent: (content: string) => void;
	/** 立即保存当前内容 */
	saveNow: () => Promise<void>;
	/** 设置初始内容（不触发保存） */
	setInitialContent: (content: string) => void;
	/** 清理资源（取消防抖定时器） */
	dispose: () => void;
	/** 是否有未保存的更改 */
	hasUnsavedChanges: () => boolean;
	/** 获取当前待保存的内容 */
	getPendingContent: () => string | null;
}

// ============================================================================
// Constants
// ============================================================================

/** 默认自动保存防抖延迟（毫秒） */
const DEFAULT_AUTOSAVE_DELAY = 1000;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * 创建编辑器保存服务实例
 *
 * 使用工厂函数创建独立的保存服务实例，每个编辑器组件拥有自己的实例。
 * 这样可以避免全局状态污染，便于测试和组件隔离。
 *
 * @param config - 保存服务配置
 * @returns 编辑器保存服务实例
 *
 * @example
 * ```typescript
 * const saveService = createEditorSaveService({
 *   nodeId: "node-123",
 *   contentType: "text",
 *   autoSaveDelay: 1000,
 *   onSaving: () => markAsSaving(),
 *   onSaved: () => markAsSaved(),
 *   onError: (error) => markAsError(error.message),
 * });
 *
 * // 更新内容（触发防抖保存）
 * saveService.updateContent("new content");
 *
 * // 手动保存（Ctrl+S）
 * await saveService.saveNow();
 *
 * // 组件卸载时清理
 * saveService.dispose();
 * ```
 */
export const createEditorSaveService = (
	config: EditorSaveConfig,
): EditorSaveServiceInterface => {
	const {
		nodeId,
		contentType,
		autoSaveDelay = DEFAULT_AUTOSAVE_DELAY,
		onSaving,
		onSaved,
		onError,
	} = config;

	// 内部状态
	let lastSavedContent = "";
	let pendingContent: string | null = null;

	// 是否启用自动保存（autoSaveDelay > 0 时启用）
	const isAutoSaveEnabled = autoSaveDelay > 0;

	/**
	 * 执行保存操作
	 * 内部函数，被防抖包装和直接调用
	 */
	const saveContent = async (content: string): Promise<void> => {
		// 如果内容没有变化，跳过保存
		if (content === lastSavedContent) {
			logger.debug("[EditorSaveService] 内容未变化，跳过保存");
			return;
		}

		logger.info("[EditorSaveService] 开始保存:", { nodeId, contentType });
		onSaving?.();

		const result = await updateContentByNodeId(nodeId, content, contentType)();

		if (E.isRight(result)) {
			lastSavedContent = content;
			pendingContent = null;
			onSaved?.();
			logger.success("[EditorSaveService] 保存成功:", nodeId);
		} else {
			const error = new Error(result.left.message || "保存失败");
			onError?.(error);
			logger.error("[EditorSaveService] 保存失败:", result.left);
		}
	};

	/**
	 * 防抖保存函数
	 * 当 autoSaveDelay = 0 时禁用自动保存
	 */
	const debouncedSave = isAutoSaveEnabled
		? debounce(saveContent, autoSaveDelay)
		: null;

	return {
		/**
		 * 更新内容（触发防抖保存）
		 *
		 * 每次调用都会重置防抖定时器，只有在用户停止输入后才会触发保存。
		 * 当 autoSaveDelay = 0 时，只更新 pendingContent，不触发自动保存。
		 */
		updateContent: (content: string): void => {
			pendingContent = content;
			if (debouncedSave) {
				debouncedSave(content);
			}
		},

		/**
		 * 立即保存当前内容
		 *
		 * 取消防抖定时器，立即执行保存。
		 * 用于手动保存（Ctrl+S）或组件卸载时。
		 */
		saveNow: async (): Promise<void> => {
			// 取消防抖定时器
			debouncedSave?.cancel();

			// 如果有待保存的内容，立即保存
			if (pendingContent !== null) {
				await saveContent(pendingContent);
			}
		},

		/**
		 * 设置初始内容（不触发保存）
		 *
		 * 用于组件初始化时设置已保存的内容基准。
		 */
		setInitialContent: (content: string): void => {
			lastSavedContent = content;
			// 不设置 pendingContent，因为这是已保存的内容
		},

		/**
		 * 清理资源
		 *
		 * 取消防抖定时器，释放资源。
		 * 注意：不会自动保存未保存的内容，调用者需要先调用 saveNow()。
		 */
		dispose: (): void => {
			debouncedSave?.cancel();
			logger.debug("[EditorSaveService] 资源已清理:", nodeId);
		},

		/**
		 * 是否有未保存的更改
		 */
		hasUnsavedChanges: (): boolean => {
			return pendingContent !== null && pendingContent !== lastSavedContent;
		},

		/**
		 * 获取当前待保存的内容
		 *
		 * 用于调试或特殊场景。
		 */
		getPendingContent: (): string | null => {
			return pendingContent;
		},
	};
};
