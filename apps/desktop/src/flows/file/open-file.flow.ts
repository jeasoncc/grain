/**
 * @file open-file.flow.ts
 * @description 打开文件 Flow
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

import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import type { SerializedEditorState } from "lexical"
import * as contentRepo from "@/io/api/content.api"
import { debug, info, warn } from "@/io/log/logger.api"
import { evictLRUEditorStates, findTabByNodeId } from "@/pipes/editor-tab"
import { fileOperationQueue } from "@/pipes/queue/queue.pipe"
import { useEditorTabsStore } from "@/state/editor-tabs.state"
import type { EditorInstanceState, EditorTab, TabType } from "@/types/editor-tab"
import { EditorStateBuilder, EditorTabBuilder } from "@/types/editor-tab"
import type { AppError } from "@/types/error"

/**
 * 打开文件参数
 */
export interface OpenFileParams {
	readonly workspaceId: string
	readonly nodeId: string
	readonly title: string
	readonly type: TabType
}

/**
 * 打开文件结果
 */
export interface OpenFileResult {
	/** 标签页 ID */
	readonly tabId: string
	/** 是否是新创建的标签页 */
	readonly isNewTab: boolean
	/** 是否成功加载了内容 */
	readonly hasContent: boolean
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
export const openFile = (params: OpenFileParams): TE.TaskEither<AppError, OpenFileResult> => {
	return pipe(
		TE.tryCatch(
			() =>
				fileOperationQueue.add(async () => {
					const { workspaceId, nodeId, title, type } = params
					info("[OpenFile] 打开文件", { title }, "open-file.flow")

					const store = useEditorTabsStore.getState()

					// 1. 检查是否已打开
					const existingTab = findTabByNodeId(store.tabs as readonly EditorTab[], nodeId)
					if (existingTab) {
						info("[OpenFile] 文件已打开，切换到标签", { tabId: existingTab.id }, "open-file.flow")
						// 内联 setActiveTabFlow 逻辑，避免 flows/ 依赖 flows/
						store.setActiveTabId(existingTab.id)
						if (store.editorStates[existingTab.id]) {
							store.updateEditorState(existingTab.id, {
								lastModified: dayjs().valueOf(),
							})
						}
						return {
							hasContent: true,
							isNewTab: false,
							tabId: existingTab.id,
						}
					}

					// 2. 从 DB 加载内容
					info("[OpenFile] 从 DB 加载内容...")
					const contentResult = await contentRepo.getContentByNodeId(nodeId)()

					let parsedContent: SerializedEditorState | undefined
					let hasContent = false

					if (E.isRight(contentResult) && contentResult.right) {
						debug(
							"[OpenFile] 内容加载成功",
							{
								contentLength: contentResult.right.content.length,
								contentPreview: contentResult.right.content.substring(0, 100),
							},
							"open-file.flow",
						)

						// 解析内容
						try {
							parsedContent = JSON.parse(contentResult.right.content) as SerializedEditorState
							hasContent = true
							debug("[OpenFile] 内容解析成功")
						} catch (error) {
							warn("[OpenFile] 内容解析失败，使用空文档")
							debug("[OpenFile] 解析错误", { error }, "open-file.flow")
							parsedContent = undefined
						}
					} else {
						warn("[OpenFile] 内容加载失败或为空")
					}

					// 3. 创建 tab（内联 openTabFlow 逻辑，避免 flows/ 依赖 flows/）
					const newTab = EditorTabBuilder.create()
						.workspaceId(workspaceId)
						.nodeId(nodeId)
						.title(title)
						.type(type)
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

					return {
						hasContent,
						isNewTab: true,
						tabId: newTab.id,
					}
				}),
			(error): AppError => ({
				message: `打开文件失败: ${error instanceof Error ? error.message : String(error)}`,
				type: "UNKNOWN_ERROR",
			}),
		),
		// 处理 p-queue 返回 undefined 的情况
		TE.chain((result) =>
			result
				? TE.right(result)
				: TE.left<AppError>({
						message: "打开文件失败: 队列返回空结果",
						type: "UNKNOWN_ERROR",
					}),
		),
	)
}

/**
 * 打开文件 Action（Promise 版本，兼容旧代码）
 *
 * @param params - 打开文件参数
 * @returns Promise<OpenFileResult>
 * @throws Error 如果打开失败
 */
export const openFileAsync = async (params: OpenFileParams): Promise<OpenFileResult> => {
	const result = await openFile(params)()
	if (E.isLeft(result)) {
		throw new Error(result.left.message)
	}
	return result.right
}
