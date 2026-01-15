/**
 * @file create-file.flow.ts
 * @description 创建文件 Flow
 *
 * 通过队列串行执行，确保：
 * 1. 先创建 Node
 * 2. 再创建 Content（如果不是文件夹）
 * 3. 最后更新 Store
 *
 * 使用 TaskEither 确保时序正确性：只有成功才继续执行后续操作
 *
 * 迁移说明：
 * - 从 Dexie 迁移到 Repository 层
 * - 使用 nodeRepo 和 contentRepo 访问 SQLite 数据
 *
 * @see .kiro/steering/design-patterns.md
 * @see .kiro/specs/editor-tabs-dataflow-refactor/design.md
 */

import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import type { SerializedEditorState } from "lexical"
import * as nodeRepo from "@/io/api/node.api"
import { debug, error, info, success, warn } from "@/io/log/logger.api"
import { evictLRUEditorStates, findTabByNodeId } from "@/pipes/editor-tab"
import { fileOperationQueue } from "@/pipes/queue/queue.pipe"
import { useEditorTabsStore } from "@/state/editor-tabs.state"
import type { EditorInstanceState, EditorTab, TabType } from "@/types/editor-tab"
import { EditorStateBuilder, EditorTabBuilder } from "@/types/editor-tab"
import type { AppError } from "@/types/error"
import type { NodeInterface, NodeType } from "@/types/node"

/**
 * 创建文件参数
 */
export interface CreateFileParams {
	/** 工作区 ID */
	readonly workspaceId: string
	/** 父节点 ID，根级为 null */
	readonly parentId: string | null
	/** 文件标题 */
	readonly title: string
	/** 节点类型 */
	readonly type: NodeType
	/** 初始内容（JSON 字符串） */
	readonly content?: string
	/** 标签数组 */
	readonly tags?: readonly string[]
	/** 文件夹是否折叠（默认 true） */
	readonly collapsed?: boolean
}

/**
 * 创建文件结果
 */
export interface CreateFileResult {
	/** 创建的节点 */
	readonly node: NodeInterface
	/** 标签页 ID（文件夹为 null） */
	readonly tabId: string | null
}

/**
 * 创建文件 Action（TaskEither 版本）
 *
 * 通过队列串行执行，确保操作顺序：
 * 1. 获取排序号
 * 2. 创建节点（带初始内容和标签）
 * 3. 更新 Store（非文件夹）
 *
 * @param params - 创建文件参数
 * @returns TaskEither<AppError, CreateFileResult>
 */
export const createFile = (params: CreateFileParams): TE.TaskEither<AppError, CreateFileResult> => {
	return pipe(
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

					info("[CreateFile] 创建文件", { title, type }, "create-file")
					debug("[CreateFile] 参数详情", {
						collapsed,
						contentLength: content.length,
						contentPreview: content.substring(0, 100),
						parentId,
						tags,
						title,
						type,
						workspaceId,
					})

					// 1. 获取排序号
					const orderResult = await nodeRepo.getNextSortOrder(workspaceId, parentId)()
					const order = E.isRight(orderResult) ? orderResult.right : 0

					// 2. 创建节点（带初始内容和标签）
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
						error("[CreateFile] 创建节点失败", { message: nodeResult.left.message }, "create-file")
						throw new Error(nodeResult.left.message)
					}

					const node = nodeResult.right
					info("[CreateFile] 节点创建成功", { nodeId: node.id }, "create-file")
					debug(
						"[CreateFile] 节点详情",
						{
							id: node.id,
							parent: node.parent,
							title: node.title,
							type: node.type,
							workspace: node.workspace,
						},
						"create-file",
					)

					// 3. 更新 Store（非文件夹）
					let tabId: string | null = null
					if (type !== "folder") {
						debug("[CreateFile] 开始更新编辑器状态...")
						const store = useEditorTabsStore.getState()

						// 解析内容（如果有）
						let parsedContent: SerializedEditorState | undefined
						if (content) {
							try {
								parsedContent = JSON.parse(content) as SerializedEditorState
								debug("[CreateFile] 内容解析成功")
							} catch (error) {
								warn("[CreateFile] 内容解析失败，使用空文档")
								debug("[CreateFile] 解析错误", { error }, "create-file")
								parsedContent = undefined
							}
						}

						// 打开 tab：直接操作 state，避免 flows/ 依赖 flows/
						const existingTab = findTabByNodeId(store.tabs as readonly EditorTab[], node.id)

						if (existingTab) {
							// Tab 已存在，激活它
							store.setActiveTabId(existingTab.id)
							if (store.editorStates[existingTab.id]) {
								store.updateEditorState(existingTab.id, {
									lastModified: dayjs().valueOf(),
								})
							}
							tabId = existingTab.id
						} else {
							// 创建新 tab
							const newTab = EditorTabBuilder.create()
								.workspaceId(workspaceId)
								.nodeId(node.id)
								.title(title)
								.type(type as TabType)
								.build()

							// 如果有初始内容，使用它；否则创建空状态
							const newEditorState = parsedContent
								? EditorStateBuilder.fromDefault().serializedState(parsedContent).build()
								: EditorStateBuilder.fromDefault().build()

							// 使用原子操作同时添加 tab、设置 editorState 和激活 tab
							store.addTabWithState(newTab as EditorTab, newEditorState)

							// LRU eviction
							const MAX_EDITOR_STATES = 10
							const openTabIds = new Set(store.tabs.map((t: EditorTab) => t.id))
							const evictedStates = evictLRUEditorStates(
								store.editorStates,
								store.activeTabId,
								openTabIds as ReadonlySet<string>,
								MAX_EDITOR_STATES,
							)
							store.setEditorStates(evictedStates as Record<string, EditorInstanceState>)

							tabId = newTab.id
						}
						debug("[CreateFile] Tab 已打开，内容已设置")
						debug("[CreateFile] Tab ID", { tabId }, "create-file")
					}

					success("[CreateFile] 文件创建完成", { nodeId: node.id }, "create-file")

					return {
						node,
						tabId,
					}
				}),
			(error): AppError => ({
				message: `创建文件失败: ${error instanceof Error ? error.message : String(error)}`,
				type: "DB_ERROR",
			}),
		),
		// 处理 p-queue 返回 undefined 的情况
		TE.chain((result) =>
			result
				? TE.right(result)
				: TE.left<AppError>({
						message: "创建文件失败: 队列返回空结果",
						type: "DB_ERROR",
					}),
		),
	)
}

/**
 * 创建文件 Action（Promise 版本，兼容旧代码）
 *
 * @param params - 创建文件参数
 * @returns Promise<CreateFileResult>
 * @throws Error 如果创建失败
 */
export const createFileAsync = async (params: CreateFileParams): Promise<CreateFileResult> => {
	const result = await createFile(params)()
	if (E.isLeft(result)) {
		throw new Error(result.left.message)
	}
	return result.right
}
