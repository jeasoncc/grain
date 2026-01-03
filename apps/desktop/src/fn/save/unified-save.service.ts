/**
 * @file fn/save/unified-save.service.ts
 * @description 统一保存服务
 *
 * 核心设计原则：
 * - 不管是自动保存还是手动保存，都调用同一个保存函数
 * - 保存函数负责：更新 DB、更新 Tab isDirty 状态、更新 UI 状态
 * - 自动保存只是一个辅助功能，手动保存才是核心
 *
 * 数据流：
 * 触发保存（手动/自动/卸载）→ saveContent() → DB + Tab.isDirty + SaveStore
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { debounce } from "es-toolkit";
import * as E from "fp-ts/Either";
import logger from "@/log";
import { updateContentByNodeId } from "@/repo/content.repo.fn";
import type { ContentType } from "@/types/content/content.interface";

// ============================================================================
// Types
// ============================================================================

/**
 * 统一保存服务配置
 */
export interface UnifiedSaveConfig {
	/** 节点 ID */
	readonly nodeId: string;
	/** 内容类型 */
	readonly contentType: ContentType;
	/** 自动保存防抖延迟（毫秒），0 表示禁用自动保存 */
	readonly autoSaveDelay?: number;
	/** 标签页 ID，用于更新 isDirty 状态 */
	readonly tabId?: string;
	/** 保存开始回调 */
	readonly onSaving?: () => void;
	/** 保存成功回调 */
	readonly onSaved?: () => void;
	/** 保存失败回调 */
	readonly onError?: (error: Error) => void;
	/** 更新 Tab isDirty 状态的函数 */
	readonly setTabDirty?: (tabId: string, isDirty: boolean) => void;
}

/**
 * 统一保存服务接口
 */
export interface UnifiedSaveServiceInterface {
	/** 更新内容（触发防抖自动保存） */
	updateContent: (content: string) => void;
	/** 立即保存当前内容（手动保存核心函数） */
	saveNow: () => Promise<boolean>;
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
const DEFAULT_AUTOSAVE_DELAY = 3000;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * 创建统一保存服务实例
 *
 * 核心设计：
 * - saveContent 是唯一的保存函数，所有保存操作都通过它
 * - 自动保存通过 debounce 包装 saveContent
 * - 手动保存直接调用 saveContent
 * - 保存成功后统一更新：DB、Tab.isDirty、SaveStore
 *
 * @param config - 保存服务配置
 * @returns 统一保存服务实例
 */
export const createUnifiedSaveService = (
	config: UnifiedSaveConfig,
): UnifiedSaveServiceInterface => {
	const {
		nodeId,
		contentType,
		autoSaveDelay = DEFAULT_AUTOSAVE_DELAY,
		tabId,
		onSaving,
		onSaved,
		onError,
		setTabDirty,
	} = config;

	// 内部状态
	let lastSavedContent = "";
	let pendingContent: string | null = null;
	let isSaving = false;

	// 是否启用自动保存（autoSaveDelay > 0 时启用）
	const isAutoSaveEnabled = autoSaveDelay > 0;

	/**
	 * 核心保存函数
	 * 所有保存操作（手动/自动/卸载）都通过这个函数
	 *
	 * @param content - 要保存的内容
	 * @returns 是否保存成功
	 */
	const saveContent = async (content: string): Promise<boolean> => {
		// 如果内容没有变化，跳过保存
		if (content === lastSavedContent) {
			logger.debug("[UnifiedSave] 内容未变化，跳过保存");
			return true;
		}

		// 防止重复保存
		if (isSaving) {
			logger.debug("[UnifiedSave] 正在保存中，跳过");
			return false;
		}

		isSaving = true;
		logger.info("[UnifiedSave] 开始保存:", { nodeId, contentType });

		// 1. 通知开始保存
		onSaving?.();

		try {
			// 2. 执行数据库保存
			const result = await updateContentByNodeId(
				nodeId,
				content,
				contentType,
			)();

			if (E.isRight(result)) {
				// 3. 保存成功：更新内部状态
				lastSavedContent = content;
				pendingContent = null;

				// 4. 更新 Tab isDirty 状态
				if (tabId && setTabDirty) {
					setTabDirty(tabId, false);
				}

				// 5. 通知保存成功
				onSaved?.();

				logger.success("[UnifiedSave] 保存成功:", nodeId);
				return true;
			}
			// 保存失败
			const error = new Error(result.left.message || "保存失败");
			onError?.(error);
			logger.error("[UnifiedSave] 保存失败:", result.left);
			return false;
		} catch (err) {
			const error = err instanceof Error ? err : new Error("未知错误");
			onError?.(error);
			logger.error("[UnifiedSave] 保存异常:", error);
			return false;
		} finally {
			isSaving = false;
		}
	};

	/**
	 * 防抖保存函数（用于自动保存）
	 * 当 autoSaveDelay = 0 时禁用自动保存
	 */
	const debouncedSave = isAutoSaveEnabled
		? debounce(saveContent, autoSaveDelay)
		: null;

	return {
		/**
		 * 更新内容（触发防抖自动保存）
		 *
		 * 每次调用都会：
		 * 1. 更新 pendingContent
		 * 2. 如果启用自动保存，重置防抖定时器
		 */
		updateContent: (content: string): void => {
			pendingContent = content;

			// 标记为有未保存更改（用于 UI 显示）
			if (tabId && setTabDirty && content !== lastSavedContent) {
				setTabDirty(tabId, true);
			}

			// 触发防抖自动保存
			if (debouncedSave) {
				debouncedSave(content);
			}
		},

		/**
		 * 立即保存当前内容（手动保存核心函数）
		 *
		 * 用于：
		 * - Ctrl+S 快捷键
		 * - 组件卸载时
		 * - 任何需要立即保存的场景
		 *
		 * @returns 是否保存成功
		 */
		saveNow: async (): Promise<boolean> => {
			// 取消防抖定时器（避免重复保存）
			debouncedSave?.cancel();

			// 如果有待保存的内容，立即保存
			if (pendingContent !== null) {
				return await saveContent(pendingContent);
			}

			// 没有待保存的内容
			logger.debug("[UnifiedSave] 没有待保存的内容");
			return true;
		},

		/**
		 * 设置初始内容（不触发保存）
		 *
		 * 用于组件初始化时设置已保存的内容基准
		 */
		setInitialContent: (content: string): void => {
			lastSavedContent = content;
			// 不设置 pendingContent，因为这是已保存的内容
		},

		/**
		 * 清理资源
		 *
		 * 取消防抖定时器，释放资源
		 * 注意：不会自动保存未保存的内容，调用者需要先调用 saveNow()
		 */
		dispose: (): void => {
			debouncedSave?.cancel();
			logger.debug("[UnifiedSave] 资源已清理:", nodeId);
		},

		/**
		 * 是否有未保存的更改
		 */
		hasUnsavedChanges: (): boolean => {
			return pendingContent !== null && pendingContent !== lastSavedContent;
		},

		/**
		 * 获取当前待保存的内容
		 */
		getPendingContent: (): string | null => {
			return pendingContent;
		},
	};
};
