/**
 * Editor Tabs - Builder Pattern Implementation
 *
 * 使用函数式 Builder 模式构建复杂对象，支持链式调用
 */

import dayjs from "dayjs"
import type { SerializedEditorState } from "lexical"
import type {
	EditorInstanceState,
	EditorSelectionState,
	EditorStateBuilderInterface,
	EditorTab,
	EditorTabBuilderInterface,
	TabType,
} from "./editor-tab.interface"

import { createInitialDocumentState } from "@grain/editor-lexical"

// ==============================
// Default Editor State Factory
// ==============================

/**
 * 创建默认的编辑器实例状态
 * 
 * 注意：serializedState 必须有值，使用空文档作为默认值
 */
export const createDefaultEditorState = (): EditorInstanceState => ({
	isDirty: false,
	lastModified: dayjs().valueOf(),
	scrollLeft: 0,
	scrollTop: 0,
	selectionState: undefined,
	serializedState: JSON.parse(createInitialDocumentState("")) as SerializedEditorState,
})

// ==============================
// EditorTab Builder State
// ==============================

interface EditorTabBuilderState {
	readonly workspaceId: string
	readonly nodeId: string
	readonly title: string
	readonly type: TabType
	readonly isDirty: boolean
}

const createInitialTabBuilderState = (): EditorTabBuilderState => ({
	isDirty: false,
	nodeId: "",
	title: "",
	type: "file",
	workspaceId: "",
})

// ==============================
// EditorTab Builder Functions
// ==============================

const createTabBuilder = (
	state: EditorTabBuilderState = createInitialTabBuilderState(),
): EditorTabBuilderInterface => ({
	build: (): EditorTab => {
		if (!state.workspaceId) {
			throw new Error("EditorTab requires workspaceId")
		}
		if (!state.nodeId) {
			throw new Error("EditorTab requires nodeId")
		}
		if (!state.title) {
			throw new Error("EditorTab requires title")
		}

		return Object.freeze({
			id: state.nodeId, // 使用 nodeId 作为 id
			isDirty: state.isDirty,
			nodeId: state.nodeId,
			title: state.title,
			type: state.type,
			workspaceId: state.workspaceId,
		})
	},
	dirty: (isDirty: boolean = true) => createTabBuilder({ ...state, isDirty }),
	from: (tab: Partial<EditorTab>) =>
		createTabBuilder({
			...state,
			...(tab.workspaceId && { workspaceId: tab.workspaceId }),
			...(tab.nodeId && { nodeId: tab.nodeId }),
			...(tab.title && { title: tab.title }),
			...(tab.type && { type: tab.type }),
			...(tab.isDirty !== undefined && { isDirty: tab.isDirty }),
		}),
	nodeId: (id: string) => createTabBuilder({ ...state, nodeId: id }),
	title: (title: string) => createTabBuilder({ ...state, title }),
	type: (type: TabType) => createTabBuilder({ ...state, type }),
	workspaceId: (id: string) => createTabBuilder({ ...state, workspaceId: id }),
})

export const EditorTabBuilder = {
	create: () => createTabBuilder(),
}

// ==============================
// EditorInstanceState Builder State
// ==============================

interface EditorStateBuilderState {
	readonly serializedState: SerializedEditorState | undefined
	readonly selectionState: EditorSelectionState | undefined
	readonly scrollTop: number
	readonly scrollLeft: number
	readonly isDirty: boolean
	readonly lastModified: number
}

const createInitialEditorStateBuilderState = (): EditorStateBuilderState => ({
	isDirty: false,
	lastModified: dayjs().valueOf(),
	scrollLeft: 0,
	scrollTop: 0,
	selectionState: undefined,
	serializedState: undefined,
})

// ==============================
// EditorInstanceState Builder Functions
// ==============================

const createEditorState = (
	state: EditorStateBuilderState = createInitialEditorStateBuilderState(),
): EditorStateBuilderInterface => ({
	build: (): EditorInstanceState =>
		Object.freeze({
			isDirty: state.isDirty,
			lastModified: state.lastModified,
			scrollLeft: state.scrollLeft,
			scrollTop: state.scrollTop,
			selectionState: state.selectionState,
			serializedState: state.serializedState,
		}),
	dirty: (isDirty: boolean = true) => createEditorState({ ...state, isDirty }),
	from: (partialState: Partial<EditorInstanceState>) =>
		createEditorState({
			...state,
			...(partialState.serializedState !== undefined && {
				serializedState: partialState.serializedState,
			}),
			...(partialState.selectionState && { selectionState: partialState.selectionState }),
			...(partialState.scrollTop !== undefined && { scrollTop: partialState.scrollTop }),
			...(partialState.scrollLeft !== undefined && { scrollLeft: partialState.scrollLeft }),
			...(partialState.isDirty !== undefined && { isDirty: partialState.isDirty }),
			...(partialState.lastModified !== undefined && { lastModified: partialState.lastModified }),
		}),
	scrollPosition: (top: number, left: number = 0) =>
		createEditorState({ ...state, scrollLeft: left, scrollTop: top }),
	selection: (
		anchor: { readonly key: string; readonly offset: number },
		focus: { readonly key: string; readonly offset: number },
	) => createEditorState({ ...state, selectionState: { anchor, focus } }),
	serializedState: (serializedState: SerializedEditorState | undefined) =>
		createEditorState({ ...state, serializedState }),
	touch: () => createEditorState({ ...state, lastModified: dayjs().valueOf() }),
})

export const EditorStateBuilder = {
	create: () => createEditorState(),
	fromDefault: () => {
		const defaultState = createDefaultEditorState()
		return createEditorState().from(defaultState)
	},
}

// ==============================
// Convenience Functions
// ==============================

/**
 * 快速创建文件标签
 */
export const createFileTab = (workspaceId: string, nodeId: string, title: string): EditorTab =>
	EditorTabBuilder.create()
		.workspaceId(workspaceId)
		.nodeId(nodeId)
		.title(title)
		.type("file")
		.build()

/**
 * 快速创建日记标签
 */
export const createDiaryTab = (workspaceId: string, nodeId: string, title: string): EditorTab =>
	EditorTabBuilder.create()
		.workspaceId(workspaceId)
		.nodeId(nodeId)
		.title(title)
		.type("diary")
		.build()

/**
 * 快速创建画布标签
 */
export const createCanvasTab = (workspaceId: string, nodeId: string, title: string): EditorTab =>
	EditorTabBuilder.create()
		.workspaceId(workspaceId)
		.nodeId(nodeId)
		.title(title)
		.type("drawing")
		.build()
