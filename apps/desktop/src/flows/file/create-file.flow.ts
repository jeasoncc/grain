/**
 * @file create-file.flow.ts
 * @description 创建文件 Flow
 *
 * 职责：组合 pipes + io，不包含业务逻辑
 *
 * 数据流：
 * 1. 校验参数
 * 2. 获取排序号 (io)
 * 3. 创建节点 (io)
 * 4. 计算 Tab 状态变更 (pipe)
 * 5. 返回结果（不直接操作 Store）
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as nodeRepo from "@/io/api/node.api"
import { info, success } from "@/io/log/logger.api"
import { calculateOpenTabChanges, type OpenTabResult } from "@/pipes/editor-tab"
import { fileOperationQueue } from "@/pipes/queue/queue.pipe"
import { useEditorTabsStore } from "@/state/editor-tabs.state"
import type { EditorInstanceState, EditorTab } from "@/types/editor-tab"
import type { AppError } from "@/types/error"
import type { NodeInterface, NodeType } from "@/types/node"

// ==============================
// Types
// ==============================

/**
 * 创建文件参数
 */
export interface CreateFileParams {
	readonly workspaceId: string
	readonly parentId: string | null
	readonly title: string
	readonly type: NodeType
	readonly content?: string
	readonly tags?: readonly string[]
	readonly collapsed?: boolean
}

/**
 * 创建文件结果
 */
export interface CreateFileResult {
	readonly node: NodeInterface
	readonly tabId: string | null
}

// ==============================
// Internal: Apply Tab Changes to Store
// ==============================

/**
 * 将 Tab 变更应用到 Store
 *
 * 这是唯一与 Store 交互的地方
 */
const applyTabChangesToStore = (changes: OpenTabResult): void => {
	const store = useEditorTabsStore.getState()

	if (changes.action === "activate_existing") {
		store.setActiveTabId(changes.newActiveTabId)
		if (changes.newEditorStates) {
			store.setEditorStates(changes.newEditorStates as Record<string, EditorInstanceState>)
		}
	} else {
		// create_new: 使用原子操作添加 tab 和 state
		if (changes.newTabs && changes.newEditorStates) {
			const newTab = changes.newTabs.find((t) => t.id === changes.tabId)
			const newEditorState = changes.newEditorStates[changes.tabId]
			if (newTab && newEditorState) {
				// addTabWithState 会同时添加 tab、设置 editorState 和激活 tab
				store.addTabWithState(newTab as EditorTab, newEditorState)
			}
		}
	}
}

// ==============================
// Flow
// ==============================

/**
 * 创建文件 Flow
 *
 * 通过队列串行执行，确保操作顺序
 */
export const createFile = (params: CreateFileParams): TE.TaskEither<AppError, CreateFileResult> =>
	pipe(
		TE.tryCatch(
			() =>
				fileOperationQueue.add(async () => {
					const {
						workspaceId,
						parentId,
						title,
						type,
						content = "",
						tags,
						collapsed = true,
					} = params

					info("[CreateFile] 创建文件", { title, type })

					// 1. 获取排序号
					const orderResult = await nodeRepo.getNextSortOrder(workspaceId, parentId)()
					const order = E.isRight(orderResult) ? orderResult.right : 0

					// 2. 创建节点
					const nodeResult = await nodeRepo.createNode(
						{
							collapsed,
							order,
							parent: parentId,
							title,
							type,
							workspace: workspaceId,
						},
						type !== "folder" ? content : undefined,
						tags ? [...tags] : undefined,
					)()

					if (E.isLeft(nodeResult)) {
						throw new Error(nodeResult.left.message)
					}

					const node = nodeResult.right

					// 3. 非文件夹：计算并应用 Tab 变更
					let tabId: string | null = null
					if (type !== "folder") {
						const store = useEditorTabsStore.getState()

						// 使用 pipe 计算状态变更
						const tabChanges = calculateOpenTabChanges({
							activeTabId: store.activeTabId,
							content,
							currentEditorStates: store.editorStates,
							currentTabs: store.tabs as readonly EditorTab[],
							node,
							workspaceId,
						})

						// 应用变更到 Store
						applyTabChangesToStore(tabChanges)
						tabId = tabChanges.tabId
					}

					success("[CreateFile] 完成", { nodeId: node.id })
					return { node, tabId }
				}),
			(error): AppError => ({
				message: `创建文件失败: ${error instanceof Error ? error.message : String(error)}`,
				type: "DB_ERROR",
			}),
		),
		TE.chain((result) =>
			result
				? TE.right(result)
				: TE.left<AppError>({ message: "创建文件失败: 队列返回空结果", type: "DB_ERROR" }),
		),
	)

/**
 * 创建文件（Promise 版本）
 */
export const createFileAsync = async (params: CreateFileParams): Promise<CreateFileResult> => {
	const result = await createFile(params)()
	if (E.isLeft(result)) {
		throw new Error(result.left.message)
	}
	return result.right
}
