/**
 * @file fn/editor-history/editor-history.fn.ts
 * @description Editor History 纯函数
 *
 * 编辑器历史记录相关的纯函数：
 * - 无副作用
 * - 相同输入 → 相同输出
 * - 不修改输入参数
 */

import type { EditorHistoryEntry, HistoryStack } from "@/types/editor-history";
import { MAX_HISTORY_SIZE } from "@/types/editor-history";

// ============================================================================
// Entry Creation
// ============================================================================

/**
 * 创建带有当前时间戳的新历史条目
 * 纯函数 - 无副作用
 *
 * @param nodeId - 节点 ID
 * @param content - 编辑器内容
 * @param wordCount - 字数
 * @returns 新的历史条目
 */
export const createHistoryEntry = (
	nodeId: string,
	content: unknown,
	wordCount: number,
): EditorHistoryEntry => ({
	nodeId,
	content,
	timestamp: new Date().toISOString(),
	wordCount,
});

// ============================================================================
// Stack Operations (Pure Functions)
// ============================================================================

/**
 * 将条目推入节点的历史栈，强制执行最大大小限制
 * 返回新的 Map（不可变）
 *
 * @param stack - 当前历史栈
 * @param nodeId - 节点 ID
 * @param entry - 要推入的历史条目
 * @returns 新的历史栈
 */
export const pushToStack = (
	stack: HistoryStack,
	nodeId: string,
	entry: EditorHistoryEntry,
): HistoryStack => {
	const newStack = new Map(stack);
	const nodeHistory = [...(stack.get(nodeId) || []), entry];

	// 强制执行最大历史大小
	if (nodeHistory.length > MAX_HISTORY_SIZE) {
		nodeHistory.shift();
	}

	newStack.set(nodeId, nodeHistory);
	return newStack;
};

/**
 * 从节点的历史栈中弹出最后一个条目
 * 返回 [newStack, poppedEntry] 或 [stack, null]（如果为空）
 *
 * @param stack - 当前历史栈
 * @param nodeId - 节点 ID
 * @returns 元组 [新历史栈, 弹出的条目或 null]
 */
export const popFromStack = (
	stack: HistoryStack,
	nodeId: string,
): [HistoryStack, EditorHistoryEntry | null] => {
	const nodeHistory = stack.get(nodeId);

	if (!nodeHistory || nodeHistory.length === 0) {
		return [stack, null];
	}

	const newStack = new Map(stack);
	const newHistory = [...nodeHistory];
	const entry = newHistory.pop()!;

	newStack.set(nodeId, newHistory);
	return [newStack, entry];
};

/**
 * 清除特定节点的历史记录
 * 返回新的 Map（不可变）
 *
 * @param stack - 当前历史栈
 * @param nodeId - 节点 ID
 * @returns 新的历史栈
 */
export const clearNodeFromStack = (
	stack: HistoryStack,
	nodeId: string,
): HistoryStack => {
	const newStack = new Map(stack);
	newStack.delete(nodeId);
	return newStack;
};

/**
 * 创建空的历史栈
 *
 * @returns 空的历史栈
 */
export const createEmptyStack = (): HistoryStack => new Map();

// ============================================================================
// Query Functions (Pure)
// ============================================================================

/**
 * 获取节点的历史记录数量
 *
 * @param stack - 历史栈
 * @param nodeId - 节点 ID
 * @returns 历史记录数量
 */
export const getNodeHistoryCount = (
	stack: HistoryStack,
	nodeId: string,
): number => {
	return stack.get(nodeId)?.length ?? 0;
};

/**
 * 检查节点是否有历史记录
 *
 * @param stack - 历史栈
 * @param nodeId - 节点 ID
 * @returns 是否有历史记录
 */
export const hasHistory = (stack: HistoryStack, nodeId: string): boolean => {
	return getNodeHistoryCount(stack, nodeId) > 0;
};

// ============================================================================
// Serialization (for persistence)
// ============================================================================

/**
 * 将 HistoryStack 序列化为数组格式用于 JSON 存储
 *
 * @param stack - 历史栈
 * @returns 序列化的数组
 */
export const serializeStack = (
	stack: HistoryStack,
): Array<[string, EditorHistoryEntry[]]> => {
	return Array.from(stack.entries());
};

/**
 * 将数组格式反序列化为 HistoryStack
 *
 * @param data - 序列化的数据
 * @returns 历史栈
 */
export const deserializeStack = (
	data: Array<[string, EditorHistoryEntry[]]> | undefined,
): HistoryStack => {
	if (!data) return new Map();
	return new Map(data);
};
