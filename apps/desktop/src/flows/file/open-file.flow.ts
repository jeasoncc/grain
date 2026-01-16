/**
 * @file open-file.flow.ts
 * @description 打开文件 Flow
 *
 * 职责：组合 pipes + io，不包含业务逻辑
 *
 * 数据流：
 * 1. 从 DB 加载内容 (io)
 * 2. 计算 Tab 状态变更 (pipe)
 * 3. 应用状态变更 (state)
 */

import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as contentRepo from "@/io/api/content.api"
import { info, success, warn } from "@/io/log/logger.api"
import {
	calculateOpenTabChangesSimple,
	parseContentSafe,
	type OpenTabResult,
} from "@/pipes/editor-tab"
import { fileOperationQueue } from "@/pipes/queue/queue.pipe"
import { useEditorTabsStore } from "@/state/editor-tabs.state"
import type { EditorInstanceState, EditorTab, TabType } from "@/types/editor-tab"
import type { AppError } from "@/types/error"

// ==============================
// Types
// ==============================

export interface OpenFileParams {
	readonly workspaceId: string
	readonly nodeId: string
	readonly title: string
	readonly type: TabType
}

export interface OpenFileResult {
	readonly tabId: string
	readonly isNewTab: boolean
	readonly hasContent: boolean
}

// ==============================
// Internal: Apply Tab Changes to Store
// ==============================

const applyTabChangesToStore = (changes: OpenTabResult): void => {
	const store = useEditorTabsStore.getState()

	if (changes.action === "activate_existing") {
		store.setActiveTabId(changes.newActiveTabId)
		if (changes.newEditorStates) {
			store.setEditorStates(changes.newEditorStates as Record<string, EditorInstanceState>)
		}
	} else {
		// create_new
		if (changes.newTabs && changes.newEditorStates) {
			const newTab = changes.newTabs.find((t) => t.id === changes.tabId)
			const newEditorState = changes.newEditorStates[changes.tabId]
			if (newTab && newEditorState) {
				store.addTabWithState(newTab as EditorTab, newEditorState)
				store.setEditorStates(changes.newEditorStates as Record<string, EditorInstanceState>)
			}
		}
	}
}

// ==============================
// Flow
// ==============================

/**
 * 打开文件 Flow
 */
export const openFile = (params: OpenFileParams): TE.TaskEither<AppError, OpenFileResult> =>
	pipe(
		TE.tryCatch(
			() =>
				fileOperationQueue.add(async () => {
					const { workspaceId, nodeId, title, type } = params
					info("[OpenFile] 打开文件", { title })

					const store = useEditorTabsStore.getState()

					// 1. 从 DB 加载内容
					const contentResult = await contentRepo.getContentByNodeId(nodeId)()
					let content: string | undefined
					let hasContent = false

					if (E.isRight(contentResult) && contentResult.right) {
						content = contentResult.right.content
						hasContent = parseContentSafe(content) !== undefined
					} else {
						warn("[OpenFile] 内容加载失败或为空")
					}

					// 2. 使用 pipe 计算状态变更
					const tabChanges = calculateOpenTabChangesSimple({
						content,
						currentEditorStates: store.editorStates,
						currentTabs: store.tabs as readonly EditorTab[],
						nodeId,
						title,
						type,
						workspaceId,
					})

					// 3. 应用变更到 Store
					applyTabChangesToStore(tabChanges)

					success("[OpenFile] 完成", { tabId: tabChanges.tabId })

					return {
						hasContent,
						isNewTab: tabChanges.action === "create_new",
						tabId: tabChanges.tabId,
					}
				}),
			(error): AppError => ({
				message: `打开文件失败: ${error instanceof Error ? error.message : String(error)}`,
				type: "UNKNOWN_ERROR",
			}),
		),
		TE.chain((result) =>
			result
				? TE.right(result)
				: TE.left<AppError>({ message: "打开文件失败: 队列返回空结果", type: "UNKNOWN_ERROR" }),
		),
	)

/**
 * 打开文件（Promise 版本）
 */
export const openFileAsync = async (params: OpenFileParams): Promise<OpenFileResult> => {
	const result = await openFile(params)()
	if (E.isLeft(result)) {
		throw new Error(result.left.message)
	}
	return result.right
}
