/**
 * @file flows/save/save-service-manager.flow.ts
 * @description 保存服务管理器（单例多 model 模式）
 *
 * 核心设计：
 * - 单例管理器，按 nodeId 管理多个 SaveModel
 * - 组件只连接，不创建/销毁服务
 * - 组件卸载时 model 保留，Tab 关闭时才清理
 * - 解决 Tab 切换时的状态丢失和竞态条件问题
 *
 * 架构位置：flows/ 层（组合 io + 业务逻辑）
 *
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { type DebouncedFunction, debounce } from "es-toolkit";
import * as E from "fp-ts/Either";
import { updateContentByNodeId } from "@/io/api/content.api";
import type { ContentType } from "@/types/content/content.interface";

// ============================================================================
// Types
// ============================================================================

/**
 * SaveModel 配置
 */
export interface SaveModelConfig {
	/** 节点 ID */
	readonly nodeId: string;
	/** 内容类型 */
	readonly contentType: ContentType;
	/** 自动保存延迟（毫秒），0 禁用 */
	readonly autoSaveDelay?: number;
	/** Tab ID（用于更新 isDirty） */
	readonly tabId?: string;
	/** 更新 Tab isDirty 状态的函数 */
	readonly setTabDirty?: (tabId: string, isDirty: boolean) => void;
	/** 保存开始回调 */
	readonly onSaving?: () => void;
	/** 保存成功回调 */
	readonly onSaved?: () => void;
	/** 保存失败回调 */
	readonly onError?: (error: Error) => void;
}

/**
 * 单个节点的保存状态模型
 */
interface SaveModel {
	/** 节点 ID */
	nodeId: string;
	/** 内容类型 */
	contentType: ContentType;
	/** Tab ID */
	tabId?: string;
	/** 待保存的内容 */
	pendingContent: string | null;
	/** 上次保存的内容 */
	lastSavedContent: string;
	/** 是否正在保存 */
	isSaving: boolean;
	/** 防抖保存函数 */
	debouncedSave: DebouncedFunction<
		(content: string) => Promise<boolean>
	> | null;
	/** 自动保存延迟 */
	autoSaveDelay: number;
	/** 更新 Tab isDirty 状态的函数 */
	setTabDirty?: (tabId: string, isDirty: boolean) => void;
	/** 保存开始回调 */
	onSaving?: () => void;
	/** 保存成功回调 */
	onSaved?: () => void;
	/** 保存失败回调 */
	onError?: (error: Error) => void;
}

/**
 * 保存服务管理器接口
 */
export interface SaveServiceManagerInterface {
	/** 获取或创建 SaveModel */
	readonly getOrCreate: (config: SaveModelConfig) => void;
	/** 更新内容（触发防抖自动保存） */
	readonly updateContent: (nodeId: string, content: string) => void;
	/** 立即保存 */
	readonly saveNow: (nodeId: string) => Promise<boolean>;
	/** 设置初始内容（不触发保存） */
	readonly setInitialContent: (nodeId: string, content: string) => void;
	/** 是否有未保存的更改 */
	readonly hasUnsavedChanges: (nodeId: string) => boolean;
	/** 获取待保存的内容 */
	readonly getPendingContent: (nodeId: string) => string | null;
	/** 清理指定节点的 model */
	readonly dispose: (nodeId: string) => void;
	/** 清理所有 model */
	readonly disposeAll: () => void;
	/** 获取所有有未保存更改的节点 ID */
	readonly getUnsavedNodeIds: () => string[];
	/** 保存所有未保存的内容 */
	readonly saveAll: () => Promise<void>;
	/** 检查 model 是否存在 */
	readonly has: (nodeId: string) => boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** 默认自动保存延迟（毫秒） */
const DEFAULT_AUTOSAVE_DELAY = 3000;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * 创建保存服务管理器
 */
export const createSaveServiceManager = (): SaveServiceManagerInterface => {
	const models = new Map<string, SaveModel>();

	const saveContent = async (nodeId: string): Promise<boolean> => {
		const model = models.get(nodeId);
		if (!model) return false;

		if (model.pendingContent === null) return true;
		if (model.pendingContent === model.lastSavedContent) {
			model.pendingContent = null;
			return true;
		}
		if (model.isSaving) return false;

		model.isSaving = true;
		const contentToSave = model.pendingContent;
		model.onSaving?.();

		try {
			const result = await updateContentByNodeId(
				nodeId,
				contentToSave,
				model.contentType,
			)();

			if (E.isRight(result)) {
				model.lastSavedContent = contentToSave;
				model.pendingContent = null;
				if (model.tabId && model.setTabDirty) {
					model.setTabDirty(model.tabId, false);
				}
				model.onSaved?.();
				return true;
			}

			const error = new Error(result.left.message || "保存失败");
			model.onError?.(error);
			return false;
		} catch (err) {
			const error = err instanceof Error ? err : new Error("未知错误");
			model.onError?.(error);
			return false;
		} finally {
			model.isSaving = false;
		}
	};

	const createDebouncedSave = (
		nodeId: string,
		delay: number,
	): DebouncedFunction<(content: string) => Promise<boolean>> | null => {
		if (delay <= 0) return null;
		return debounce((_content: string) => saveContent(nodeId), delay);
	};

	return {
		getOrCreate: (config: SaveModelConfig): void => {
			const {
				nodeId,
				contentType,
				autoSaveDelay = DEFAULT_AUTOSAVE_DELAY,
				tabId,
				setTabDirty,
				onSaving,
				onSaved,
				onError,
			} = config;

			const existing = models.get(nodeId);

			if (existing) {
				existing.tabId = tabId;
				existing.setTabDirty = setTabDirty;
				existing.onSaving = onSaving;
				existing.onSaved = onSaved;
				existing.onError = onError;

				if (existing.autoSaveDelay !== autoSaveDelay) {
					existing.debouncedSave?.cancel();
					existing.debouncedSave = createDebouncedSave(nodeId, autoSaveDelay);
					existing.autoSaveDelay = autoSaveDelay;
				}
				return;
			}

			const model: SaveModel = {
				nodeId,
				contentType,
				tabId,
				pendingContent: null,
				lastSavedContent: "",
				isSaving: false,
				debouncedSave: createDebouncedSave(nodeId, autoSaveDelay),
				autoSaveDelay,
				setTabDirty,
				onSaving,
				onSaved,
				onError,
			};

			models.set(nodeId, model);
		},

		updateContent: (nodeId: string, content: string): void => {
			const model = models.get(nodeId);
			if (!model) return;

			model.pendingContent = content;

			if (
				model.tabId &&
				model.setTabDirty &&
				content !== model.lastSavedContent
			) {
				model.setTabDirty(model.tabId, true);
			}

			if (model.debouncedSave) {
				model.debouncedSave(content);
			}
		},

		saveNow: async (nodeId: string): Promise<boolean> => {
			const model = models.get(nodeId);
			if (!model) return false;

			model.debouncedSave?.cancel();
			return await saveContent(nodeId);
		},

		setInitialContent: (nodeId: string, content: string): void => {
			const model = models.get(nodeId);
			if (!model) return;
			model.lastSavedContent = content;
		},

		hasUnsavedChanges: (nodeId: string): boolean => {
			const model = models.get(nodeId);
			if (!model) return false;
			return (
				model.pendingContent !== null &&
				model.pendingContent !== model.lastSavedContent
			);
		},

		getPendingContent: (nodeId: string): string | null => {
			const model = models.get(nodeId);
			return model?.pendingContent ?? null;
		},

		dispose: (nodeId: string): void => {
			const model = models.get(nodeId);
			if (model) {
				model.debouncedSave?.cancel();
				models.delete(nodeId);
			}
		},

		disposeAll: (): void => {
			for (const model of models.values()) {
				model.debouncedSave?.cancel();
			}
			models.clear();
		},

		getUnsavedNodeIds: (): string[] => {
			const unsaved: string[] = [];
			for (const [nodeId, model] of models) {
				if (
					model.pendingContent !== null &&
					model.pendingContent !== model.lastSavedContent
				) {
					unsaved.push(nodeId);
				}
			}
			return unsaved;
		},

		saveAll: async (): Promise<void> => {
			const unsavedIds = [];
			for (const [nodeId, model] of models) {
				if (
					model.pendingContent !== null &&
					model.pendingContent !== model.lastSavedContent
				) {
					unsavedIds.push(nodeId);
				}
			}
			await Promise.all(unsavedIds.map((nodeId) => saveContent(nodeId)));
		},

		has: (nodeId: string): boolean => {
			return models.has(nodeId);
		},
	};
};

/**
 * 单例实例
 */
export const saveServiceManager = createSaveServiceManager();
