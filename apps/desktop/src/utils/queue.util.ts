/**
 * @file file-operation-queue.ts
 * @description 文件操作队列 - 模块级单例
 *
 * 所有文件的创建和打开操作都通过此队列串行执行，
 * 避免竞态条件和数据不一致。
 *
 * @see .kiro/steering/design-patterns.md
 */

import PQueue from "p-queue"

/**
 * 队列状态类型
 */
export interface QueueStatus {
	/** 等待中的任务数 */
	readonly size: number
	/** 正在执行的任务数 */
	readonly pending: number
	/** 是否暂停 */
	readonly isPaused: boolean
}

/**
 * 文件操作队列 - 模块级单例
 *
 * 设置 concurrency 为 1，确保所有文件操作串行执行。
 * 这样可以避免：
 * 1. 用户快速点击导致的竞态条件
 * 2. 多个异步操作交错执行导致的数据不一致
 */
export const fileOperationQueue = new PQueue({
	autoStart: true,
	concurrency: 1,
})

/**
 * 获取队列状态
 *
 * 用于调试和监控队列运行情况。
 */
export const getQueueStatus = (): QueueStatus => ({
	isPaused: fileOperationQueue.isPaused,
	pending: fileOperationQueue.pending,
	size: fileOperationQueue.size,
})

/**
 * 等待队列空闲
 *
 * 用于测试或需要确保所有操作完成的场景。
 */
export const waitForQueueIdle = (): Promise<void> => {
	return fileOperationQueue.onIdle()
}
