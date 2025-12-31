/**
 * @file save-queue.ts
 * @description 编辑器保存队列服务
 *
 * 功能说明：
 * - 基于 p-queue 实现保存任务队列
 * - 解决 Tab 切换时的内容丢失问题
 * - 确保保存操作有序执行
 * - 支持等待特定节点的保存完成
 */

import PQueue from "p-queue";
import logger from "@/log";

/**
 * 保存任务函数类型
 */
export type SaveFunction = () => Promise<boolean>;

/**
 * 待处理保存任务
 */
interface PendingSaveTask {
	/** 保存完成的 Promise */
	readonly promise: Promise<void>;
	/** 保存函数（用于替换） */
	readonly saveFn: SaveFunction;
}

/**
 * 保存队列服务接口
 */
export interface SaveQueueService {
	/**
	 * 将保存任务入队
	 * 如果同一 nodeId 已有待处理任务，替换为新任务
	 *
	 * @param nodeId - 节点 ID
	 * @param saveFn - 保存函数
	 */
	readonly enqueueSave: (nodeId: string, saveFn: SaveFunction) => void;

	/**
	 * 等待指定节点的保存完成
	 * 如果没有待处理任务，立即返回
	 * 超时后自动返回（不抛出异常）
	 *
	 * @param nodeId - 节点 ID
	 * @param timeout - 超时时间（毫秒），默认 5000
	 */
	readonly waitForSave: (nodeId: string, timeout?: number) => Promise<void>;

	/**
	 * 检查是否有待处理的保存任务
	 *
	 * @param nodeId - 节点 ID
	 */
	readonly hasPendingSave: (nodeId: string) => boolean;

	/**
	 * 获取待处理保存的节点 ID 列表（用于调试）
	 */
	readonly getPendingNodeIds: () => string[];
}

/**
 * 默认超时时间（毫秒）
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * 创建保存队列服务
 */
export const createSaveQueueService = (): SaveQueueService => {
	// p-queue 实例，concurrency=1 确保顺序执行
	const queue = new PQueue({ concurrency: 1 });

	// 待处理保存任务 Map
	// key: nodeId, value: { promise, saveFn }
	const pendingSaves = new Map<string, PendingSaveTask>();

	// 待执行的保存函数 Map（用于去重，保留最新的 saveFn）
	// 使用 ref 对象包装，以便在任务执行时获取最新的函数
	const pendingSaveFnRefs = new Map<string, { current: SaveFunction }>();

	/**
	 * 执行保存任务
	 */
	const executeSave = async (nodeId: string): Promise<void> => {
		// 使用 queueMicrotask 确保所有同步的 enqueueSave 调用完成后再获取 ref
		// 这样可以保证获取到最新的保存函数
		await new Promise<void>((resolve) => queueMicrotask(resolve));

		// 获取最新的保存函数（通过 ref 获取）
		const saveFnRef = pendingSaveFnRefs.get(nodeId);
		if (!saveFnRef) {
			logger.warn(`[SaveQueue] 未找到保存函数: ${nodeId}`);
			return;
		}

		try {
			await saveFnRef.current();
			logger.success(`[SaveQueue] 保存成功: ${nodeId}`);
		} catch (error) {
			logger.error(`[SaveQueue] 保存失败: ${nodeId}`, error);
			// 不抛出异常，允许后续操作继续
		} finally {
			// 无论成功失败，都从 pending 中移除
			pendingSaves.delete(nodeId);
			pendingSaveFnRefs.delete(nodeId);
		}
	};

	/**
	 * 将保存任务入队
	 */
	const enqueueSave = (nodeId: string, saveFn: SaveFunction): void => {
		logger.info(`[SaveQueue] 入队保存: ${nodeId}`);

		// 如果已有待处理任务，只更新保存函数（去重：只保留最新的）
		const existingRef = pendingSaveFnRefs.get(nodeId);
		if (existingRef) {
			logger.info(`[SaveQueue] 已有待处理任务，更新保存函数: ${nodeId}`);
			existingRef.current = saveFn;
			return;
		}

		// 创建新的 ref 对象
		const saveFnRef = { current: saveFn };
		pendingSaveFnRefs.set(nodeId, saveFnRef);

		// 创建新的保存任务
		const promise = queue.add(() => executeSave(nodeId)).then(() => {});

		// 记录待处理任务
		pendingSaves.set(nodeId, {
			promise,
			saveFn,
		});
	};

	/**
	 * 等待指定节点的保存完成
	 */
	const waitForSave = async (
		nodeId: string,
		timeout: number = DEFAULT_TIMEOUT,
	): Promise<void> => {
		const pending = pendingSaves.get(nodeId);
		if (!pending) {
			// 没有待处理任务，立即返回
			return;
		}

		logger.info(`[SaveQueue] 等待保存完成: ${nodeId}`);

		try {
			await Promise.race([
				pending.promise,
				new Promise<void>((resolve) => {
					setTimeout(() => {
						logger.warn(`[SaveQueue] 等待超时: ${nodeId}`);
						resolve();
					}, timeout);
				}),
			]);
		} catch {
			// 忽略错误，允许加载继续
			logger.warn(`[SaveQueue] 等待时发生错误: ${nodeId}`);
		}
	};

	/**
	 * 检查是否有待处理的保存任务
	 */
	const hasPendingSave = (nodeId: string): boolean => {
		return pendingSaves.has(nodeId);
	};

	/**
	 * 获取待处理保存的节点 ID 列表
	 */
	const getPendingNodeIds = (): string[] => {
		return Array.from(pendingSaves.keys());
	};

	return {
		enqueueSave,
		waitForSave,
		hasPendingSave,
		getPendingNodeIds,
	};
};

/**
 * 单例实例
 */
export const saveQueueService = createSaveQueueService();
