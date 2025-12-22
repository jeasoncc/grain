/**
 * Editor Tabs - Module Entry Point
 *
 * 统一导出所有公共 API
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	EditorInstanceState,
	EditorTab,
	EditorTabsConfig,
	EditorTabsState,
	OpenTabPayload,
	ReorderTabsPayload,
	SelectionState,
	TabType,
	UpdateEditorStatePayload,
} from "./editor-tabs.interface";

export { DEFAULT_CONFIG } from "./editor-tabs.interface";

// ==============================
// Builders
// ==============================

export {
	createCanvasTab,
	createDiaryTab,
	createFileTab,
	EditorStateBuilder,
	EditorTabBuilder,
} from "./editor-tabs.builder";

// ==============================
// Utility Functions
// ==============================

export {
	addTab,
	calculateNextActiveTabId,
	createDefaultEditorState,
	evictLRUEditorStates,
	findTabById,
	findTabByNodeId,
	getTabsByWorkspace,
	isValidTab,
	isValidTabIndex,
	removeEditorState,
	removeTab,
	reorderTabs,
	updateEditorState,
	updateTab,
} from "./editor-tabs.utils";

// ==============================
// Store & Hooks
// ==============================

export {
	useActiveTab,
	useEditorTabsStore,
	useHasDirtyTabs,
	useTabCount,
} from "./editor-tabs.store";
