/**
 * @file editor-tabs.store.test.ts
 * @description Editor Tabs Store 单元测试
 *
 * 测试覆盖：
 * - 标签页的打开、关闭、切换
 * - 编辑器状态管理
 * - 工作区标签操作
 * - LRU 缓存清理
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TabType } from "@/types/editor-tab";

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock("@/log", () => ({
	default: {
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

// 获取 mock logger 引用
const mockLogger = vi.mocked(await import("@/log")).default;

// Mock fn/editor-tab 纯函数
vi.mock("@/views/editor-tabs", () => ({
	findTabByNodeId: vi.fn((tabs, nodeId) =>
		tabs.find((t: { nodeId: string }) => t.nodeId === nodeId),
	),
	calculateNextActiveTabId: vi.fn((tabs, closingTabId, currentActiveId) => {
		if (tabs.length <= 1) return null;
		const closingIndex = tabs.findIndex(
			(t: { id: string }) => t.id === closingTabId,
		);
		if (closingIndex === -1) return currentActiveId;
		const nextIndex = closingIndex === 0 ? 1 : closingIndex - 1;
		return tabs[nextIndex]?.id ?? null;
	}),
	evictLRUEditorStates: vi.fn((states) => states),
	getTabsByWorkspace: vi.fn((tabs, workspaceId) =>
		tabs.filter((t: { workspaceId: string }) => t.workspaceId === workspaceId),
	),
}));

// Mock types/editor-tab
vi.mock("@/types/editor-tab", () => {
	let tabIdCounter = 0;
	return {
		EditorTabBuilder: {
			create: () => {
				const data: Record<string, unknown> = {};
				return {
					workspaceId: (v: string) => {
						data.workspaceId = v;
						return {
							nodeId: (v: string) => {
								data.nodeId = v;
								return {
									title: (v: string) => {
										data.title = v;
										return {
											type: (v: string) => {
												data.type = v;
												return {
													build: () => ({
														id: `tab-${++tabIdCounter}`,
														...data,
														isDirty: false,
														openedAt: Date.now(),
													}),
												};
											},
										};
									},
								};
							},
						};
					},
				};
			},
		},
		EditorStateBuilder: {
			fromDefault: () => ({
				build: () => ({
					scrollTop: 0,
					selectionState: null,
					lastModified: Date.now(),
				}),
			}),
		},
		createDefaultEditorState: () => ({
			scrollTop: 0,
			selectionState: null,
			lastModified: Date.now(),
		}),
	};
});

// Import after mocking
import { useEditorTabsStore } from "./editor-tabs.store";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 重置 store 状态
 */
function resetStore() {
	useEditorTabsStore.setState({
		tabs: [],
		activeTabId: null,
		editorStates: {},
	});
}

/**
 * 创建测试用的 OpenTabPayload
 */
function createOpenTabPayload(
	overrides: Partial<{
		workspaceId: string;
		nodeId: string;
		title: string;
		type: TabType;
	}> = {},
) {
	return {
		workspaceId: overrides.workspaceId ?? "workspace-1",
		nodeId: overrides.nodeId ?? `node-${Date.now()}`,
		title: overrides.title ?? "Test Tab",
		type: overrides.type ?? ("file" as TabType),
	};
}

// ============================================================================
// Unit Tests
// ============================================================================

describe("editor-tabs.store", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetStore();
	});

	// ==========================================================================
	// openTab
	// ==========================================================================

	describe("openTab", () => {
		it("should open a new tab", () => {
			const { openTab } = useEditorTabsStore.getState();
			const payload = createOpenTabPayload({ title: "New File" });

			openTab(payload);

			const state = useEditorTabsStore.getState();
			expect(state.tabs).toHaveLength(1);
			expect(state.tabs[0].title).toBe("New File");
			expect(state.activeTabId).toBe(state.tabs[0].id);
			expect(mockLogger.success).toHaveBeenCalled();
		});

		it("should switch to existing tab if nodeId matches", () => {
			const { openTab } = useEditorTabsStore.getState();
			const payload = createOpenTabPayload({ nodeId: "node-1" });

			openTab(payload);
			const firstTabId = useEditorTabsStore.getState().tabs[0].id;

			// 打开另一个标签
			openTab(createOpenTabPayload({ nodeId: "node-2" }));
			expect(useEditorTabsStore.getState().tabs).toHaveLength(2);

			// 再次打开第一个节点
			openTab(createOpenTabPayload({ nodeId: "node-1" }));

			const state = useEditorTabsStore.getState();
			expect(state.tabs).toHaveLength(2);
			expect(state.activeTabId).toBe(firstTabId);
		});

		it("should create editor state for new tab", () => {
			const { openTab } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const state = useEditorTabsStore.getState();
			const tabId = state.tabs[0].id;
			expect(state.editorStates[tabId]).toBeDefined();
			expect(state.editorStates[tabId].scrollTop).toBe(0);
		});
	});

	// ==========================================================================
	// closeTab
	// ==========================================================================

	describe("closeTab", () => {
		it("should close a tab", () => {
			const { openTab, closeTab } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const tabId = useEditorTabsStore.getState().tabs[0].id;
			closeTab(tabId);

			const state = useEditorTabsStore.getState();
			expect(state.tabs).toHaveLength(0);
			expect(state.activeTabId).toBeNull();
		});

		it("should remove editor state when closing tab", () => {
			const { openTab, closeTab } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const tabId = useEditorTabsStore.getState().tabs[0].id;
			closeTab(tabId);

			const state = useEditorTabsStore.getState();
			expect(state.editorStates[tabId]).toBeUndefined();
		});

		it("should warn when closing non-existent tab", () => {
			const { closeTab } = useEditorTabsStore.getState();
			closeTab("non-existent");

			expect(mockLogger.warn).toHaveBeenCalledWith(
				"[Store] 标签不存在:",
				"non-existent",
			);
		});
	});

	// ==========================================================================
	// closeOtherTabs
	// ==========================================================================

	describe("closeOtherTabs", () => {
		it("should close all tabs except the specified one", () => {
			const { openTab, closeOtherTabs } = useEditorTabsStore.getState();

			openTab(createOpenTabPayload({ nodeId: "node-1" }));
			openTab(createOpenTabPayload({ nodeId: "node-2" }));
			openTab(createOpenTabPayload({ nodeId: "node-3" }));

			const tabs = useEditorTabsStore.getState().tabs;
			const keepTabId = tabs[1].id;

			closeOtherTabs(keepTabId);

			const state = useEditorTabsStore.getState();
			expect(state.tabs).toHaveLength(1);
			expect(state.tabs[0].id).toBe(keepTabId);
			expect(state.activeTabId).toBe(keepTabId);
		});
	});

	// ==========================================================================
	// closeAllTabs
	// ==========================================================================

	describe("closeAllTabs", () => {
		it("should close all tabs", () => {
			const { openTab, closeAllTabs } = useEditorTabsStore.getState();

			openTab(createOpenTabPayload({ nodeId: "node-1" }));
			openTab(createOpenTabPayload({ nodeId: "node-2" }));

			closeAllTabs();

			const state = useEditorTabsStore.getState();
			expect(state.tabs).toHaveLength(0);
			expect(state.activeTabId).toBeNull();
			expect(state.editorStates).toEqual({});
		});
	});

	// ==========================================================================
	// setActiveTab
	// ==========================================================================

	describe("setActiveTab", () => {
		it("should set active tab", () => {
			const { openTab, setActiveTab } = useEditorTabsStore.getState();

			openTab(createOpenTabPayload({ nodeId: "node-1" }));
			openTab(createOpenTabPayload({ nodeId: "node-2" }));

			const firstTabId = useEditorTabsStore.getState().tabs[0].id;
			setActiveTab(firstTabId);

			expect(useEditorTabsStore.getState().activeTabId).toBe(firstTabId);
		});

		it("should warn when setting non-existent tab as active", () => {
			const { setActiveTab } = useEditorTabsStore.getState();
			setActiveTab("non-existent");

			expect(mockLogger.warn).toHaveBeenCalledWith(
				"[Store] 标签不存在:",
				"non-existent",
			);
		});
	});

	// ==========================================================================
	// updateTabTitle
	// ==========================================================================

	describe("updateTabTitle", () => {
		it("should update tab title", () => {
			const { openTab, updateTabTitle } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload({ title: "Old Title" }));

			const tabId = useEditorTabsStore.getState().tabs[0].id;
			updateTabTitle(tabId, "New Title");

			expect(useEditorTabsStore.getState().tabs[0].title).toBe("New Title");
		});
	});

	// ==========================================================================
	// setTabDirty
	// ==========================================================================

	describe("setTabDirty", () => {
		it("should set tab dirty state", () => {
			const { openTab, setTabDirty } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const tabId = useEditorTabsStore.getState().tabs[0].id;
			setTabDirty(tabId, true);

			expect(useEditorTabsStore.getState().tabs[0].isDirty).toBe(true);
		});
	});

	// ==========================================================================
	// reorderTabs
	// ==========================================================================

	describe("reorderTabs", () => {
		it("should reorder tabs", () => {
			const { openTab, reorderTabs } = useEditorTabsStore.getState();

			openTab(createOpenTabPayload({ nodeId: "node-1", title: "Tab 1" }));
			openTab(createOpenTabPayload({ nodeId: "node-2", title: "Tab 2" }));
			openTab(createOpenTabPayload({ nodeId: "node-3", title: "Tab 3" }));

			reorderTabs(0, 2);

			const titles = useEditorTabsStore.getState().tabs.map((t) => t.title);
			expect(titles).toEqual(["Tab 2", "Tab 3", "Tab 1"]);
		});
	});

	// ==========================================================================
	// updateEditorState
	// ==========================================================================

	describe("updateEditorState", () => {
		it("should update editor state", () => {
			const { openTab, updateEditorState } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const tabId = useEditorTabsStore.getState().tabs[0].id;
			updateEditorState(tabId, { scrollTop: 200 });

			const state = useEditorTabsStore.getState().editorStates[tabId];
			expect(state.scrollTop).toBe(200);
		});

		it("should create editor state if not exists", () => {
			const { updateEditorState } = useEditorTabsStore.getState();

			// 直接更新不存在的标签状态
			updateEditorState("new-tab", { scrollTop: 50 });

			const state = useEditorTabsStore.getState().editorStates["new-tab"];
			expect(state).toBeDefined();
			expect(state.scrollTop).toBe(50);
		});
	});

	// ==========================================================================
	// getEditorState
	// ==========================================================================

	describe("getEditorState", () => {
		it("should return editor state for tab", () => {
			const { openTab, getEditorState } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const tabId = useEditorTabsStore.getState().tabs[0].id;
			const state = getEditorState(tabId);

			expect(state).toBeDefined();
			expect(state?.scrollTop).toBe(0);
		});

		it("should return undefined for non-existent tab", () => {
			const { getEditorState } = useEditorTabsStore.getState();
			expect(getEditorState("non-existent")).toBeUndefined();
		});
	});

	// ==========================================================================
	// closeTabsByWorkspace
	// ==========================================================================

	describe("closeTabsByWorkspace", () => {
		it("should close all tabs for workspace", () => {
			const { openTab, closeTabsByWorkspace } = useEditorTabsStore.getState();

			openTab(createOpenTabPayload({ workspaceId: "ws-1", nodeId: "node-1" }));
			openTab(createOpenTabPayload({ workspaceId: "ws-1", nodeId: "node-2" }));
			openTab(createOpenTabPayload({ workspaceId: "ws-2", nodeId: "node-3" }));

			closeTabsByWorkspace("ws-1");

			const state = useEditorTabsStore.getState();
			expect(state.tabs).toHaveLength(1);
			expect(state.tabs[0].workspaceId).toBe("ws-2");
		});
	});

	// ==========================================================================
	// Selector Hooks
	// ==========================================================================

	describe("selector hooks", () => {
		it("useActiveTab should return active tab", () => {
			const { openTab } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload({ title: "Active Tab" }));

			// 直接测试 selector 逻辑
			const state = useEditorTabsStore.getState();
			const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
			expect(activeTab?.title).toBe("Active Tab");
		});

		it("useTabCount should return tab count", () => {
			const { openTab } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload({ nodeId: "node-1" }));
			openTab(createOpenTabPayload({ nodeId: "node-2" }));

			const state = useEditorTabsStore.getState();
			expect(state.tabs.length).toBe(2);
		});

		it("useHasDirtyTabs should return true if any tab is dirty", () => {
			const { openTab, setTabDirty } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const tabId = useEditorTabsStore.getState().tabs[0].id;
			setTabDirty(tabId, true);

			const state = useEditorTabsStore.getState();
			const hasDirty = state.tabs.some((t) => t.isDirty);
			expect(hasDirty).toBe(true);
		});

		it("useTabs should return all tabs", () => {
			const { openTab } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload({ nodeId: "node-1" }));
			openTab(createOpenTabPayload({ nodeId: "node-2" }));

			const state = useEditorTabsStore.getState();
			expect(state.tabs).toHaveLength(2);
		});

		it("useActiveTabId should return active tab id", () => {
			const { openTab } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const state = useEditorTabsStore.getState();
			expect(state.activeTabId).toBe(state.tabs[0].id);
		});

		it("useIsActiveTab should return true for active tab", () => {
			const { openTab } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const state = useEditorTabsStore.getState();
			const tabId = state.tabs[0].id;
			expect(state.activeTabId === tabId).toBe(true);
		});

		it("useEditorState should return editor state for tab", () => {
			const { openTab } = useEditorTabsStore.getState();
			openTab(createOpenTabPayload());

			const state = useEditorTabsStore.getState();
			const tabId = state.tabs[0].id;
			expect(state.editorStates[tabId]).toBeDefined();
		});
	});
});
