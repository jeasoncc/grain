/**
 * Editor Tabs - Module Entry Point
 * 
 * 统一导出所有公共 API
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	TabType,
	EditorTab,
	SelectionState,
	EditorInstanceState,
	EditorTabsState,
	OpenTabPayload,
	UpdateEditorStatePayload,
	ReorderTabsPayload,
	EditorTabsConfig,
} from "./editor-tabs.interface";

export { DEFAULT_CONFIG } from "./editor-tabs.interface";

// ==============================
// Builders
// ==============================

export {
	EditorTabBuilder,
	EditorStateBuilder,
	createFileTab,
	createDiaryTab,
	createCanvasTab,
} from "./editor-tabs.builder";

// ==============================
// Utility Functions
// ==============================

export {
	createDefaultEditorState,
	findTabByNodeId,
	findTabById,
	getTabsByWorkspace,
	calculateNextActiveTabId,
	addTab,
	removeTab,
	updateTab,
	reorderTabs,
	updateEditorState,
	removeEditorState,
	evictLRUEditorStates,
	isValidTab,
	isValidTabIndex,
} from "./editor-tabs.utils";

// ==============================
// Store & Hooks
// ==============================

export {
	useEditorTabsStore,
	useActiveTab,
	useTabCount,
	useHasDirtyTabs,
} from "./editor-tabs.store";
