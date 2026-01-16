/**
 * @file create-file.flow.ts
 * @description 创建文件 Flow - 纯 pipe 写法
 */

import dayjs from "dayjs"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import type { SerializedEditorState } from "lexical"
import * as nodeRepo from "@/io/api/node.api"
import { info, success } from "@/io/log/logger.api"
import { evictLRUEditorStates, findTabByNodeId } from "@/pipes/editor-tab"
import { useEditorTabsStore } from "@/state/editor-tabs.state"
import type { EditorInstanceState, EditorTab, TabType } from "@/types/editor-tab"
import { EditorStateBuilder, EditorTabBuilder } from "@/types/editor-tab"
import type { AppError } from "@/types/error"
import type { NodeInterface, NodeType } from "@/types/node"

// ==============================
// Types
// ==============================

export interface CreateFileParams {
	readonly workspaceId: string
	readonly parentId: string | null
	readonly title: string
	readonly type: NodeType
	readonly content?: string
	readonly tags?: readonly string[]
	readonly collapsed?: boolean
}

export interface CreateFileResult {
	readonly node: NodeInterface
	readonly tabId: string | null
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

/** 打开 Tab（副作用，但逻辑内聚） */
const openTabForNode = (workspaceId: string, node: NodeInterface, content: string): string => {
	const store = useEditorTabsStore.getState()
	const tabs = store.tabs as readonly EditorTab[]

	const existing = findTabByNodeId(tabs, node.id)
	if (existing) {
		store.setActiveTabId(existing.id)
		store.editorStates[existing.id] &&
			store.updateEditorState(existing.id, { lastModified: dayjs().valueOf() })
		return existing.id
	}

	const newTab = EditorTabBuilder.create()
		.workspaceId(workspaceId)
		.nodeId(node.id)
		.title(node.title)
		.type(node.type as TabType)
		.build()

	const parsed = parseContent(content)
	const editorState = parsed
		? EditorStateBuilder.fromDefault().serializedState(parsed).build()
		: EditorStateBuilder.fromDefault().build()

	store.addTabWithState(newTab as EditorTab, editorState)

	const openTabIds = new Set(store.tabs.map((t: EditorTab) => t.id))
	const evicted = evictLRUEditorStates(store.editorStates, store.activeTabId, openTabIds as ReadonlySet<string>, 10)
	store.setEditorStates(evicted as Record<string, EditorInstanceState>)

	return newTab.id
}

// ==============================
// Flow (pipe 组合)
// ==============================

/**
 * 创建文件
 *
 * pipe 数据流：
 *   params
 *     → getNextSortOrder
 *     → createNode
 *     → openTabForNode (非文件夹)
 *     → result
 */
export const createFile = (params: CreateFileParams): TE.TaskEither<AppError, CreateFileResult> => {
	const { workspaceId, parentId, title, type, content = "", tags, collapsed = true } = params

	info("[CreateFile] 创建文件", { title, type })

	return pipe(
		// 1. 获取排序号
		nodeRepo.getNextSortOrder(workspaceId, parentId),
		TE.orElse(() => TE.right(0)), // 失败则默认 0

		// 2. 创建节点
		TE.chain((order) =>
			nodeRepo.createNode(
				{ collapsed, order, parent: parentId, title, type, workspace: workspaceId },
				type !== "folder" ? content : undefined,
				tags ? [...tags] : undefined,
			),
		),

		// 3. 非文件夹：打开 Tab
		TE.map((node) => {
			const tabId = type !== "folder" ? openTabForNode(workspaceId, node, content) : null
			success("[CreateFile] 完成", { nodeId: node.id, tabId })
			return { node, tabId }
		}),
	)
}


