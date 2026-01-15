/**
 * Editor Tabs - Builder Pattern Implementation
 *
 * 使用函数式 Builder 模式构建复杂对象，支持链式调用
 */

import dayjs from "dayjs";
import type { SerializedEditorState } from "lexical";
import type {
	EditorInstanceState,
	EditorSelectionState,
	EditorTab,
	TabType,
} from "./editor-tab.interface";

// ==============================
// Default Editor State Factory
// ==============================

/**
 * 创建默认的编辑器实例状态
 */
export const createDefaultEditorState = (): EditorInstanceState => ({
	serializedState: undefined,
	selectionState: undefined,
	scrollTop: 0,
	scrollLeft: 0,
	isDirty: false,
	lastModified: dayjs().valueOf(),
});

// ==============================
// EditorTab Builder State
// ==============================

interface EditorTabBuilderState {
	readonly workspaceId: string;
	readonly nodeId: string;
	readonly title: string;
	readonly type: TabType;
	readonly isDirty: boolean;
}

const createInitialTabBuilderState = (): EditorTabBuilderState => ({
	workspaceId: "",
	nodeId: "",
	title: "",
	type: "file",
	isDirty: false,
});

// ==============================
// EditorTab Builder Functions
// ==============================

export interface EditorTabBuilder {
	readonly workspaceId: (id: string) => EditorTabBuilder;
	readonly nodeId: (id: string) => EditorTabBuilder;
	readonly title: (title: string) => EditorTabBuilder;
	readonly type: (type: TabType) => EditorTabBuilder;
	readonly dirty: (isDirty?: boolean) => EditorTabBuilder;
	readonly from: (tab: Partial<EditorTab>) => EditorTabBuilder;
	readonly build: () => EditorTab;
}

const createEditorTabBuilder = (state: EditorTabBuilderState = createInitialTabBuilderState()): EditorTabBuilder => ({
	workspaceId: (id: string) => createEditorTabBuilder({ ...state, workspaceId: id }),
	nodeId: (id: string) => createEditorTabBuilder({ ...state, nodeId: id }),
	title: (title: string) => createEditorTabBuilder({ ...state, title }),
	type: (type: TabType) => createEditorTabBuilder({ ...state, type }),
	dirty: (isDirty: boolean = true) => createEditorTabBuilder({ ...state, isDirty }),
	from: (tab: Partial<EditorTab>) => createEditorTabBuilder({
		...state,
		...(tab.workspaceId && { workspaceId: tab.workspaceId }),
		...(tab.nodeId && { nodeId: tab.nodeId }),
		...(tab.title && { title: tab.title }),
		...(tab.type && { type: tab.type }),
		...(tab.isDirty !== undefined && { isDirty: tab.isDirty }),
	}),
	build: (): EditorTab => {
		if (!state.workspaceId) {
			throw new Error("EditorTab requires workspaceId");
		}
		if (!state.nodeId) {
			throw new Error("EditorTab requires nodeId");
		}
		if (!state.title) {
			throw new Error("EditorTab requires title");
		}

		return Object.freeze({
			id: state.nodeId, // 使用 nodeId 作为 id
			workspaceId: state.workspaceId,
			nodeId: state.nodeId,
			title: state.title,
			type: state.type,
			isDirty: state.isDirty,
		});
	},
});

export const EditorTabBuilderFactory = {
	create: () => createEditorTabBuilder(),
};

// ==============================
// EditorInstanceState Builder State
// ==============================

interface EditorStateBuilderState {
	readonly serializedState: SerializedEditorState | undefined;
	readonly selectionState: EditorSelectionState | undefined;
	readonly scrollTop: number;
	readonly scrollLeft: number;
	readonly isDirty: boolean;
	readonly lastModified: number;
}

const createInitialEditorStateBuilderState = (): EditorStateBuilderState => ({
	serializedState: undefined,
	selectionState: undefined,
	scrollTop: 0,
	scrollLeft: 0,
	isDirty: false,
	lastModified: dayjs().valueOf(),
});

// ==============================
// EditorInstanceState Builder Functions
// ==============================

export interface EditorStateBuilder {
	readonly serializedState: (state: SerializedEditorState | undefined) => EditorStateBuilder;
	readonly selection: (
		anchor: { readonly key: string; readonly offset: number },
		focus: { readonly key: string; readonly offset: number },
	) => EditorStateBuilder;
	readonly scrollPosition: (top: number, left?: number) => EditorStateBuilder;
	readonly dirty: (isDirty?: boolean) => EditorStateBuilder;
	readonly from: (state: Partial<EditorInstanceState>) => EditorStateBuilder;
	readonly touch: () => EditorStateBuilder;
	readonly build: () => EditorInstanceState;
}

const createEditorStateBuilder = (state: EditorStateBuilderState = createInitialEditorStateBuilderState()): EditorStateBuilder => ({
	serializedState: (serializedState: SerializedEditorState | undefined) => 
		createEditorStateBuilder({ ...state, serializedState }),
	selection: (
		anchor: { readonly key: string; readonly offset: number },
		focus: { readonly key: string; readonly offset: number },
	) => createEditorStateBuilder({ ...state, selectionState: { anchor, focus } }),
	scrollPosition: (top: number, left: number = 0) => 
		createEditorStateBuilder({ ...state, scrollTop: top, scrollLeft: left }),
	dirty: (isDirty: boolean = true) => 
		createEditorStateBuilder({ ...state, isDirty }),
	from: (partialState: Partial<EditorInstanceState>) => createEditorStateBuilder({
		...state,
		...(partialState.serializedState !== undefined && { serializedState: partialState.serializedState }),
		...(partialState.selectionState && { selectionState: partialState.selectionState }),
		...(partialState.scrollTop !== undefined && { scrollTop: partialState.scrollTop }),
		...(partialState.scrollLeft !== undefined && { scrollLeft: partialState.scrollLeft }),
		...(partialState.isDirty !== undefined && { isDirty: partialState.isDirty }),
		...(partialState.lastModified !== undefined && { lastModified: partialState.lastModified }),
	}),
	touch: () => createEditorStateBuilder({ ...state, lastModified: dayjs().valueOf() }),
	build: (): EditorInstanceState => Object.freeze({
		serializedState: state.serializedState,
		selectionState: state.selectionState,
		scrollTop: state.scrollTop,
		scrollLeft: state.scrollLeft,
		isDirty: state.isDirty,
		lastModified: state.lastModified,
	}),
});

export const EditorStateBuilderFactory = {
	create: () => createEditorStateBuilder(),
	fromDefault: () => {
		const defaultState = createDefaultEditorState();
		return createEditorStateBuilder().from(defaultState);
	},
};

// ==============================
// Convenience Functions
// ==============================

/**
 * 快速创建文件标签
 */
export const createFileTab = (
	workspaceId: string,
	nodeId: string,
	title: string,
): EditorTab =>
	EditorTabBuilderFactory.create()
		.workspaceId(workspaceId)
		.nodeId(nodeId)
		.title(title)
		.type("file")
		.build();

/**
 * 快速创建日记标签
 */
export const createDiaryTab = (
	workspaceId: string,
	nodeId: string,
	title: string,
): EditorTab =>
	EditorTabBuilderFactory.create()
		.workspaceId(workspaceId)
		.nodeId(nodeId)
		.title(title)
		.type("diary")
		.build();

/**
 * 快速创建画布标签
 */
export const createCanvasTab = (
	workspaceId: string,
	nodeId: string,
	title: string,
): EditorTab =>
	EditorTabBuilderFactory.create()
		.workspaceId(workspaceId)
		.nodeId(nodeId)
		.title(title)
		.type("drawing")
		.build();
