/**
 * @file open-tab.pipe.ts
 * @description 打开 Tab 的纯函数
 *
 * 计算打开 Tab 时需要的状态变更，不执行实际的状态更新。
 * 返回需要执行的操作描述，由调用方执行。
 */

import dayjs from "dayjs"
import type { SerializedEditorState } from "lexical"
import { EditorStateBuilder, EditorTabBuilder } from "@/types/editor-tab"
import type { EditorInstanceState, EditorTab, TabType } from "@/types/editor-tab"
import type { NodeInterface } from "@/types/node"
import { evictLRUEditorStates, findTabByNodeId } from "./editor-tab.pipe"

// ==============================
// Types
// ==============================

/**
 * 打开 Tab 的输入参数
 */
export interface OpenTabInput {
	/** 节点信息 */
	readonly node: NodeInterface
	/** 工作区 ID */
	readonly workspaceId: string
	/** 初始内容（可选） */
	readonly content?: string
	/** 当前 tabs 列表 */
	readonly currentTabs: readonly EditorTab[]
	/** 当前 editorStates */
	readonly currentEditorStates: Readonly<Record<string, EditorInstanceState>>
	/** 当前活动 tab ID */
	readonly activeTabId: string | null
	/** 最大缓存状态数 */
	readonly maxEditorStates?: number
}

/**
 * 打开 Tab 的操作结果
 */
export interface OpenTabResult {
	/** 操作类型 */
	readonly action: "activate_existing" | "create_new"
	/** Tab ID */
	readonly tabId: string
	/** 新的 tabs 列表（如果需要更新） */
	readonly newTabs?: readonly EditorTab[]
	/** 新的 editorStates（如果需要更新） */
	readonly newEditorStates?: Readonly<Record<string, EditorInstanceState>>
	/** 新的活动 tab ID */
	readonly newActiveTabId: string
}

// ==============================
// Constants
// ==============================

const DEFAULT_MAX_EDITOR_STATES = 10

// ==============================
// Pure Functions
// ==============================

/**
 * 尝试解析内容为 Lexical JSON
 */
export const parseContentSafe = (content: string | undefined): SerializedEditorState | undefined => {
	if (!content) return undefined
	try {
		return JSON.parse(content) as SerializedEditorState
	} catch {
		return undefined
	}
}

/**
 * 计算打开 Tab 需要的状态变更
 *
 * 纯函数：不执行任何副作用，只返回需要执行的操作
 */
export const calculateOpenTabChanges = (input: OpenTabInput): OpenTabResult => {
	const {
		node,
		workspaceId,
		content,
		currentTabs,
		currentEditorStates,
		maxEditorStates = DEFAULT_MAX_EDITOR_STATES,
	} = input

	// 1. 检查是否已存在
	const existingTab = findTabByNodeId(currentTabs, node.id)

	if (existingTab) {
		// Tab 已存在，只需激活
		const updatedEditorStates = currentEditorStates[existingTab.id]
			? {
					...currentEditorStates,
					[existingTab.id]: {
						...currentEditorStates[existingTab.id],
						lastModified: dayjs().valueOf(),
					},
				}
			: currentEditorStates

		return {
			action: "activate_existing",
			newActiveTabId: existingTab.id,
			newEditorStates: updatedEditorStates,
			tabId: existingTab.id,
		}
	}

	// 2. 创建新 Tab
	const newTab = EditorTabBuilder.create()
		.workspaceId(workspaceId)
		.nodeId(node.id)
		.title(node.title)
		.type(node.type as TabType)
		.build()

	// 3. 创建 EditorState
	const parsedContent = parseContentSafe(content)
	const newEditorState = parsedContent
		? EditorStateBuilder.fromDefault().serializedState(parsedContent).build()
		: EditorStateBuilder.fromDefault().build()

	// 4. 计算新的 tabs 列表
	const newTabs = [...currentTabs, newTab as EditorTab]

	// 5. 计算新的 editorStates（包含 LRU 清理）
	const openTabIds = new Set(newTabs.map((t) => t.id))
	const statesWithNew = {
		...currentEditorStates,
		[newTab.id]: newEditorState,
	}
	const evictedStates = evictLRUEditorStates(
		statesWithNew,
		newTab.id,
		openTabIds as ReadonlySet<string>,
		maxEditorStates,
	)

	return {
		action: "create_new",
		newActiveTabId: newTab.id,
		newEditorStates: evictedStates,
		newTabs,
		tabId: newTab.id,
	}
}
