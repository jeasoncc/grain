/**
 * @file create-file.action.ts
 * @description 创建文件 Action
 *
 * 通过队列串行执行，确保：
 * 1. 先创建 Content（如果不是文件夹）
 * 2. 再创建 Node
 * 3. 最后更新 Store
 *
 * @see .kiro/steering/design-patterns.md
 * @see .kiro/specs/editor-tabs-dataflow-refactor/design.md
 */

import * as E from "fp-ts/Either";
import { addContent, addNode, getNextOrder } from "@/db";
import { fileOperationQueue } from "@/lib/file-operation-queue";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import type { TabType } from "@/types/editor-tab";
import type { NodeInterface, NodeType } from "@/types/node";

/**
 * 创建文件参数
 */
export interface CreateFileParams {
	/** 工作区 ID */
	readonly workspaceId: string;
	/** 父节点 ID，根级为 null */
	readonly parentId: string | null;
	/** 文件标题 */
	readonly title: string;
	/** 节点类型 */
	readonly type: NodeType;
	/** 初始内容（JSON 字符串） */
	readonly content?: string;
	/** 标签数组 */
	readonly tags?: string[];
	/** 文件夹是否折叠（默认 true） */
	readonly collapsed?: boolean;
}

/**
 * 创建文件结果
 */
export interface CreateFileResult {
	/** 创建的节点 */
	readonly node: NodeInterface;
	/** 标签页 ID（文件夹为 null） */
	readonly tabId: string | null;
}

/**
 * 创建文件 Action
 *
 * 通过队列串行执行，确保操作顺序：
 * 1. 获取排序号
 * 2. 创建节点
 * 3. 创建内容（非文件夹）
 * 4. 更新 Store（非文件夹）
 *
 * @param params - 创建文件参数
 * @returns Promise<CreateFileResult> - 创建结果
 */
export const createFile = (
	params: CreateFileParams,
): Promise<CreateFileResult | undefined> => {
	return fileOperationQueue.add(async () => {
		const {
			workspaceId,
			parentId,
			title,
			type,
			content = "",
			tags,
			collapsed = true,
		} = params;

		logger.start("[CreateFile] 创建文件:", title, type);

		// 1. 获取排序号
		const orderResult = await getNextOrder(parentId, workspaceId)();
		const order = E.isRight(orderResult) ? orderResult.right : 0;

		// 2. 创建节点
		const nodeResult = await addNode(workspaceId, title, {
			parent: parentId,
			type,
			order,
			collapsed,
			tags,
		})();

		if (E.isLeft(nodeResult)) {
			logger.error("[CreateFile] 创建节点失败:", nodeResult.left.message);
			throw new Error(nodeResult.left.message);
		}

		const node = nodeResult.right;
		logger.info("[CreateFile] 节点创建成功:", node.id);

		// 3. 创建内容（非文件夹）
		if (type !== "folder") {
			const contentResult = await addContent(node.id, content)();
			if (E.isLeft(contentResult)) {
				logger.warn("[CreateFile] 创建内容失败:", contentResult.left.message);
				// 内容创建失败不阻塞，继续执行
			} else {
				logger.info("[CreateFile] 内容创建成功");
			}
		}

		// 4. 更新 Store（非文件夹）
		let tabId: string | null = null;
		if (type !== "folder") {
			const { openTab, updateEditorState } = useEditorTabsStore.getState();

			openTab({
				workspaceId,
				nodeId: node.id,
				title,
				type: type as TabType,
			});

			// 获取新创建的 tab ID
			const newTabs = useEditorTabsStore.getState().tabs;
			const newTab = newTabs.find((t) => t.nodeId === node.id);
			tabId = newTab?.id ?? node.id;

			// 设置初始内容
			if (content) {
				try {
					const parsed = JSON.parse(content);
					updateEditorState(tabId, { serializedState: parsed });
				} catch {
					// 非 JSON 内容，跳过
					logger.debug("[CreateFile] 内容非 JSON，跳过 editorState 设置");
				}
			}
		}

		logger.success("[CreateFile] 文件创建完成:", node.id);

		return {
			node,
			tabId,
		};
	});
};
