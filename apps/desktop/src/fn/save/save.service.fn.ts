/**
 * @file fn/save/save.service.fn.ts
 * @description 保存服务（有状态）
 *
 * 管理保存相关的运行时状态：
 * - 防抖定时器
 * - 上次保存的内容缓存
 * - 未保存更改标记
 *
 * 注意：这是一个有状态的服务，用于管理运行时状态
 * 核心保存逻辑在 save.document.fn.ts 中实现
 *
 * Requirements: 1.2, 5.3, 6.2
 */

import type { SerializedEditorState } from "lexical";
import logger from "@/log";
import {
	type SaveResult,
	saveDocumentAsync,
	serializeContent,
} from "./save.document.fn";

// ============================================================================
// Constants
// ============================================================================

/**
 * 防抖超时时间（毫秒）
 */
const DEBOUNCE_TIMEOUT = 500;

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * 保存服务接口
 */
export interface SaveServiceInterface {
	saveDocument(
		documentId: string,
		content: SerializedEditorState,
	): Promise<SaveResult>;
	debouncedSave(documentId: string, content: SerializedEditorState): void;
	hasUnsavedChanges(documentId: string): boolean;
	markAsChanged(documentId: string): void;
	markAsSaved(documentId: string, content: SerializedEditorState): void;
	clearDocument(documentId: string): void;
	flushAll(): Promise<void>;
}

/**
 * 创建保存服务实例
 *
 * 使用工厂函数而非类，便于测试和依赖注入
 */
export const createSaveService = (): SaveServiceInterface => {
	// 运行时状态
	const unsavedChanges = new Map<string, boolean>();
	const lastSavedContent = new Map<string, string>();
	const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

	return {
		/**
		 * 保存文档内容
		 */
		async saveDocument(
			documentId: string,
			content: SerializedEditorState,
		): Promise<SaveResult> {
			const contentString = serializeContent(content);
			const previousContent = lastSavedContent.get(documentId);

			const result = await saveDocumentAsync({
				documentId,
				content,
				previousContent,
			});

			if (result.success) {
				lastSavedContent.set(documentId, contentString);
				unsavedChanges.set(documentId, false);
			}

			return result;
		},

		/**
		 * 防抖保存文档内容
		 */
		debouncedSave(documentId: string, content: SerializedEditorState): void {
			unsavedChanges.set(documentId, true);

			const existingTimer = debounceTimers.get(documentId);
			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			const timer = setTimeout(async () => {
				await this.saveDocument(documentId, content);
				debounceTimers.delete(documentId);
			}, DEBOUNCE_TIMEOUT);

			debounceTimers.set(documentId, timer);
		},

		/**
		 * 检查是否有未保存的更改
		 */
		hasUnsavedChanges(documentId: string): boolean {
			return unsavedChanges.get(documentId) ?? false;
		},

		/**
		 * 标记为已更改
		 */
		markAsChanged(documentId: string): void {
			unsavedChanges.set(documentId, true);
		},

		/**
		 * 标记为已保存
		 */
		markAsSaved(documentId: string, content: SerializedEditorState): void {
			unsavedChanges.set(documentId, false);
			lastSavedContent.set(documentId, serializeContent(content));
		},

		/**
		 * 清除文档状态
		 */
		clearDocument(documentId: string): void {
			unsavedChanges.delete(documentId);
			lastSavedContent.delete(documentId);

			const timer = debounceTimers.get(documentId);
			if (timer) {
				clearTimeout(timer);
				debounceTimers.delete(documentId);
			}
		},

		/**
		 * 清空所有待处理的保存
		 */
		async flushAll(): Promise<void> {
			for (const [documentId, timer] of debounceTimers.entries()) {
				clearTimeout(timer);
				debounceTimers.delete(documentId);
				logger.info("[Save] 清除防抖定时器:", documentId);
			}
		},
	};
};

/**
 * 默认保存服务实例（单例）
 */
export const saveService = createSaveService();
