/**
 * Editor Tabs - Builder Pattern Implementation
 *
 * 使用 Builder 模式构建复杂对象，支持链式调用
 */

import type { SerializedEditorState } from "lexical";
import type {
	EditorInstanceState,
	EditorTab,
	SelectionState,
	TabType,
} from "./editor-tabs.interface";
import { createDefaultEditorState } from "./editor-tabs.utils";

// ==============================
// EditorTab Builder
// ==============================

export class EditorTabBuilder {
	private _workspaceId: string = "";
	private _nodeId: string = "";
	private _title: string = "";
	private _type: TabType = "file";
	private _isDirty: boolean = false;

	private constructor() {}

	static create(): EditorTabBuilder {
		return new EditorTabBuilder();
	}

	workspaceId(id: string): this {
		this._workspaceId = id;
		return this;
	}

	nodeId(id: string): this {
		this._nodeId = id;
		return this;
	}

	title(title: string): this {
		this._title = title;
		return this;
	}

	type(type: TabType): this {
		this._type = type;
		return this;
	}

	dirty(isDirty: boolean = true): this {
		this._isDirty = isDirty;
		return this;
	}

	/**
	 * 从现有标签复制
	 */
	from(tab: Partial<EditorTab>): this {
		if (tab.workspaceId) this._workspaceId = tab.workspaceId;
		if (tab.nodeId) this._nodeId = tab.nodeId;
		if (tab.title) this._title = tab.title;
		if (tab.type) this._type = tab.type;
		if (tab.isDirty !== undefined) this._isDirty = tab.isDirty;
		return this;
	}

	build(): EditorTab {
		if (!this._workspaceId) {
			throw new Error("EditorTab requires workspaceId");
		}
		if (!this._nodeId) {
			throw new Error("EditorTab requires nodeId");
		}
		if (!this._title) {
			throw new Error("EditorTab requires title");
		}

		return Object.freeze({
			id: this._nodeId, // 使用 nodeId 作为 id
			workspaceId: this._workspaceId,
			nodeId: this._nodeId,
			title: this._title,
			type: this._type,
			isDirty: this._isDirty,
		});
	}
}

// ==============================
// EditorInstanceState Builder
// ==============================

export class EditorStateBuilder {
	private _serializedState: SerializedEditorState | undefined = undefined;
	private _selectionState: SelectionState | undefined = undefined;
	private _scrollTop: number = 0;
	private _scrollLeft: number = 0;
	private _isDirty: boolean = false;
	private _lastModified: number = Date.now();

	private constructor() {}

	static create(): EditorStateBuilder {
		return new EditorStateBuilder();
	}

	/**
	 * 从默认状态开始
	 */
	static fromDefault(): EditorStateBuilder {
		const builder = new EditorStateBuilder();
		const defaultState = createDefaultEditorState();
		return builder.from(defaultState);
	}

	serializedState(state: SerializedEditorState | undefined): this {
		this._serializedState = state;
		return this;
	}

	selection(
		anchor: { key: string; offset: number },
		focus: { key: string; offset: number },
	): this {
		this._selectionState = { anchor, focus };
		return this;
	}

	scrollPosition(top: number, left: number = 0): this {
		this._scrollTop = top;
		this._scrollLeft = left;
		return this;
	}

	dirty(isDirty: boolean = true): this {
		this._isDirty = isDirty;
		return this;
	}

	/**
	 * 从现有状态复制
	 */
	from(state: Partial<EditorInstanceState>): this {
		if (state.serializedState !== undefined)
			this._serializedState = state.serializedState;
		if (state.selectionState) this._selectionState = state.selectionState;
		if (state.scrollTop !== undefined) this._scrollTop = state.scrollTop;
		if (state.scrollLeft !== undefined) this._scrollLeft = state.scrollLeft;
		if (state.isDirty !== undefined) this._isDirty = state.isDirty;
		if (state.lastModified !== undefined)
			this._lastModified = state.lastModified;
		return this;
	}

	/**
	 * 更新 lastModified 为当前时间
	 */
	touch(): this {
		this._lastModified = Date.now();
		return this;
	}

	build(): EditorInstanceState {
		return Object.freeze({
			serializedState: this._serializedState,
			selectionState: this._selectionState,
			scrollTop: this._scrollTop,
			scrollLeft: this._scrollLeft,
			isDirty: this._isDirty,
			lastModified: this._lastModified,
		});
	}
}

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
	EditorTabBuilder.create()
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
	EditorTabBuilder.create()
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
	EditorTabBuilder.create()
		.workspaceId(workspaceId)
		.nodeId(nodeId)
		.title(title)
		.type("canvas")
		.build();
