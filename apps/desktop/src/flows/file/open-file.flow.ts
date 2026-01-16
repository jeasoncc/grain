/**
 * @file open-file.flow.ts
 * @description 打开文件 Flow - 纯 pipe 写法
 */

import dayjs from "dayjs"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import type { SerializedEditorState } from "lexical"
import * as contentRepo from "@/io/api/content.api"
import { info, success } from "@/io/log/logger.api"
import { evictLRUEditorStates, findTabByNodeId } from "@/pipes/editor-tab"
import { useEditorTabsStore } from "@/state/editor-tabs.state"
import type { EditorInstanceState, EditorTab, TabType } from "@/types/editor-tab"
import { EditorStateBuilder, EditorTabBuilder } from "@/types/editor-tab"
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
// Pipes (纯函数)
// ==============================

/** 解析 JSON 内容 */
const parseContent = (content: string): SerializedEditorState | undefined => {
	try {
		return JSON.parse(content) as SerializedEditorState
	} catch {
		return undefined
	}
}

/** 打开 Tab */
const openTab = (
	workspaceId: string,
	nodeId: string,
	title: string,
	type: TabType,
	content?: string,
): { tabId: string; isNewTab: boolean } => {
	const store = useEditorTabsStore.getState()
	const tabs = store.tabs as readonly EditorTab[]

	const existing = findTabByNodeId(tabs, nodeId)
	if (existing) {
		store.setActiveTabId(existing.id)
		store.editorStates[existing.id] &&
			store.updateEditorState(existing.id, { lastModified: dayjs().valueOf() })
		return { tabId: existing.id, isNewTab: false }
	}

	const newTab = EditorTabBuilder.create()
		.workspaceId(workspaceId)
		.nodeId(nodeId)
		.title(title)
		.type(type)
		.build()

	const parsed = content ? parseContent(content) : undefined
	const editorState = parsed
		? EditorStateBuilder.fromDefault().serializedState(parsed).build()
		: EditorStateBuilder.fromDefault().build()

	store.addTabWithState(newTab as EditorTab, editorState)

	const openTabIds = new Set(store.tabs.map((t: EditorTab) => t.id))
	const evicted = evictLRUEditorStates(store.editorStates, store.activeTabId, openTabIds as ReadonlySet<string>, 10)
	store.setEditorStates(evicted as Record<string, EditorInstanceState>)

	return { tabId: newTab.id, isNewTab: true }
}

// ==============================
// Flow (pipe 组合)
// ==============================

/**
 * 打开文件
 *
 * pipe 数据流：
 *   params
 *     → getContentByNodeId
 *     → openTab
 *     → result
 */
export const openFile = (params: OpenFileParams): TE.TaskEither<AppError, OpenFileResult> => {
	const { workspaceId, nodeId, title, type } = params

	info("[OpenFile] 打开文件", { title })

	return pipe(
		// 1. 加载内容
		contentRepo.getContentByNodeId(nodeId),
		TE.map((data) => data?.content),
		TE.orElse(() => TE.right(undefined as string | undefined)), // 失败则返回 undefined

		// 2. 打开 Tab
		TE.map((content) => {
			const hasContent = content ? parseContent(content) !== undefined : false
			const { tabId, isNewTab } = openTab(workspaceId, nodeId, title, type, content)

			success("[OpenFile] 完成", { tabId, isNewTab })
			return { tabId, isNewTab, hasContent }
		}),
	)
}


