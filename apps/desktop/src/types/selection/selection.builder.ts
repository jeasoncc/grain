/**
 * @file selection.builder.ts
 * @description Selection 状态 Builder
 *
 * 用于构建不可变的 Selection 状态对象
 */

import type { SelectionConfig, SelectionState } from "./selection.interface"
import { DEFAULT_SELECTION_CONFIG } from "./selection.interface"

// ==============================
// Internal Mutable Types
// ==============================

/** 内部可写的 SelectionState 类型 */
type MutableSelectionState = {
	selectedWorkspaceId: string | null
	selectedNodeId: string | null
}

/** 内部可写的 SelectionConfig 类型 */
type MutableSelectionConfig = {
	storageKey: string
	persistWorkspace: boolean
}

// ==============================
// Selection State Builder
// ==============================

/**
 * SelectionState Builder
 *
 * 用于构建不可变的选择状态对象
 *
 * @example
 * ```typescript
 * const state = new SelectionStateBuilder()
 *   .selectedWorkspaceId("workspace-1")
 *   .selectedNodeId("node-1")
 *   .build();
 * ```
 */
export class SelectionStateBuilder {
	private data: Partial<MutableSelectionState> = {}

	/**
	 * 设置选中的工作区 ID
	 */
	selectedWorkspaceId(id: string | null): this {
		this.data.selectedWorkspaceId = id
		return this
	}

	/**
	 * 设置选中的节点 ID
	 */
	selectedNodeId(id: string | null): this {
		this.data.selectedNodeId = id
		return this
	}

	/**
	 * 从现有状态复制
	 */
	from(state: SelectionState): this {
		this.data = { ...state }
		return this
	}

	/**
	 * 构建不可变的 SelectionState 对象
	 */
	build(): SelectionState {
		return Object.freeze({
			selectedNodeId: this.data.selectedNodeId ?? null,
			selectedWorkspaceId: this.data.selectedWorkspaceId ?? null,
		}) as SelectionState
	}

	/**
	 * 构建初始状态
	 */
	static initial(): SelectionState {
		return new SelectionStateBuilder().build()
	}
}

// ==============================
// Selection Config Builder
// ==============================

/**
 * SelectionConfig Builder
 *
 * 用于构建选择配置对象
 */
export class SelectionConfigBuilder {
	private data: Partial<MutableSelectionConfig> = {}

	/**
	 * 设置存储键名
	 */
	storageKey(key: string): this {
		this.data.storageKey = key
		return this
	}

	/**
	 * 设置是否持久化工作区选择
	 */
	persistWorkspace(persist: boolean): this {
		this.data.persistWorkspace = persist
		return this
	}

	/**
	 * 从现有配置复制
	 */
	from(config: SelectionConfig): this {
		this.data = { ...config }
		return this
	}

	/**
	 * 构建不可变的 SelectionConfig 对象
	 */
	build(): SelectionConfig {
		return Object.freeze({
			persistWorkspace: this.data.persistWorkspace ?? DEFAULT_SELECTION_CONFIG.persistWorkspace,
			storageKey: this.data.storageKey ?? DEFAULT_SELECTION_CONFIG.storageKey,
		}) as SelectionConfig
	}

	/**
	 * 构建默认配置
	 */
	static default(): SelectionConfig {
		return new SelectionConfigBuilder().build()
	}
}
