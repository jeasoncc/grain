/**
 * @file open-file.action.ts
 * @description 打开文件 Action
 *
 * 通过队列串行执行，确保：
 * 1. 先从 DB 加载内容
 * 2. 再更新 Store（创建 tab + 设置 editorState）
 * 3. 最后 UI 渲染
 *
 * 使用 TaskEither 确保时序正确性：只有成功才继续执行后续操作
 *
 * 迁移说明：
 * - 从 Dexie 迁移到 Repository 层
 * - 使用 contentRepo 访问 SQLite 数据
 *
 * @see .kiro/steering/design-patterns.md
 * @see .kiro/specs/editor-tabs-dataflow-refactor/design.md
 */

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import type { AppError } from "@/lib/error.types";
import { fileOperationQueue } from "@/lib/file-operation-queue";
import logger from "@/log";
import * as contentRepo from "@/io/api/content.api";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import type { TabType } from "@/types/editor-tab";

/**
 * 打开文件参数
 */
export interface OpenFileParams {
	readonly workspaceId: string;
	readonly nodeId: string;
	readonly title: string;
	readonly type: TabType;
}

/**
 * 打开文件结果
 */
export interface OpenFileResult {
	/** 标签页 ID */
	readonly tabId: string;
	/** 是否是新创建的标签页 */
	readonly isNewTab: boolean;
	/** 是否成功加载了内容 */
	readonly hasContent: boolean;
}

/**
 * 打开文件 Action（TaskEither 版本）
 *
 * 通过队列串行执行，确保操作顺序：
 * 1. 检查是否已打开（已打开则切换）
 * 2. 从 DB 加载内容
 * 3. 创建 tab 并设置 editorState
 *
 * @param params - 打开文件参数
 * @returns TaskEither<AppError, OpenFileResult>
 */
export const openFile = (
	params: OpenFileParams,
): TE.TaskEither<AppError, OpenFileResult> => {
	return pipe(
		TE.tryCatch(
			() =>
				fileOperationQueue.add(async () => {
					const { workspaceId, nodeId, title, type } = params;
					logger.start("[OpenFile] 打开文件:", title);

					const { tabs, openTab, updateEditorState, setActiveTab } =
						useEditorTabsStore.getState();

					// 1. 检查是否已打开
					const existingTab = tabs.find((t) => t.nodeId === nodeId);
					if (existingTab) {
						logger.info("[OpenFile] 文件已打开，切换到标签:", existingTab.id);
						setActiveTab(existingTab.id);
						return {
							tabId: existingTab.id,
							isNewTab: false,
							hasContent: true,
						};
					}

					// 2. 从 DB 加载内容
					logger.info("[OpenFile] 从 DB 加载内容...");
					const contentResult = await contentRepo.getContentByNodeId(nodeId)();

					// 3. 创建 tab
					openTab({
						workspaceId,
						nodeId,
						title,
						type,
					});

					// 获取新创建的 tab ID
					const newTabs = useEditorTabsStore.getState().tabs;
					const newTab = newTabs.find((t) => t.nodeId === nodeId);
					const tabId = newTab?.id ?? nodeId;

					// 4. 设置编辑器内容
					let hasContent = false;
					if (E.isRight(contentResult) && contentResult.right) {
						try {
							const parsed = JSON.parse(contentResult.right.content);
							updateEditorState(tabId, { serializedState: parsed });
							hasContent = true;
							logger.success("[OpenFile] 内容加载成功");
						} catch {
							logger.warn("[OpenFile] 内容解析失败，使用空内容");
						}
					} else {
						logger.info("[OpenFile] 无内容，使用空编辑器");
					}

					return {
						tabId,
						isNewTab: true,
						hasContent,
					};
				}),
			(error): AppError => ({
				type: "UNKNOWN_ERROR",
				message: `打开文件失败: ${error instanceof Error ? error.message : String(error)}`,
			}),
		),
		// 处理 p-queue 返回 undefined 的情况
		TE.chain((result) =>
			result
				? TE.right(result)
				: TE.left<AppError>({
						type: "UNKNOWN_ERROR",
						message: "打开文件失败: 队列返回空结果",
					}),
		),
	);
};

/**
 * 打开文件 Action（Promise 版本，兼容旧代码）
 *
 * @param params - 打开文件参数
 * @returns Promise<OpenFileResult>
 * @throws Error 如果打开失败
 */
export const openFileAsync = async (
	params: OpenFileParams,
): Promise<OpenFileResult> => {
	const result = await openFile(params)();
	if (E.isLeft(result)) {
		throw new Error(result.left.message);
	}
	return result.right;
};
