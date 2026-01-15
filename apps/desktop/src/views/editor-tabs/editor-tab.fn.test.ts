/**
 * @file fn/editor-tab/editor-tab.fn.test.ts
 * @description Editor Tab 纯函数测试
 */

import { describe, expect, it } from "vitest"
import type { EditorInstanceState, EditorTab } from "@/types/editor-tab"
import {
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
} from "./editor-tab.fn"

// 测试数据
const createTestTab = (overrides: Partial<EditorTab> = {}): EditorTab => ({
	id: "tab-1",
	nodeId: "node-1",
	title: "Test Tab",
	type: "file",
	workspaceId: "ws-1",
	...overrides,
})

describe("createDefaultEditorState", () => {
	it("should create default state with correct properties", () => {
		const state = createDefaultEditorState()
		expect(state.serializedState).toBeUndefined()
		expect(state.selectionState).toBeUndefined()
		expect(state.scrollTop).toBe(0)
		expect(state.scrollLeft).toBe(0)
		expect(state.isDirty).toBe(false)
		expect(state.lastModified).toBeDefined()
	})
})

describe("findTabByNodeId", () => {
	it("should find tab by nodeId", () => {
		const tabs = [
			createTestTab({ id: "1", nodeId: "node-1" }),
			createTestTab({ id: "2", nodeId: "node-2" }),
		]
		const found = findTabByNodeId(tabs, "node-2")
		expect(found?.id).toBe("2")
	})

	it("should return undefined when not found", () => {
		const tabs = [createTestTab({ nodeId: "node-1" })]
		const found = findTabByNodeId(tabs, "node-999")
		expect(found).toBeUndefined()
	})
})

describe("findTabById", () => {
	it("should find tab by id", () => {
		const tabs = [createTestTab({ id: "tab-1" }), createTestTab({ id: "tab-2" })]
		const found = findTabById(tabs, "tab-2")
		expect(found?.id).toBe("tab-2")
	})

	it("should return undefined when not found", () => {
		const tabs = [createTestTab({ id: "tab-1" })]
		const found = findTabById(tabs, "tab-999")
		expect(found).toBeUndefined()
	})
})

describe("getTabsByWorkspace", () => {
	it("should filter tabs by workspace", () => {
		const tabs = [
			createTestTab({ id: "1", workspaceId: "ws-1" }),
			createTestTab({ id: "2", workspaceId: "ws-2" }),
			createTestTab({ id: "3", workspaceId: "ws-1" }),
		]
		const filtered = getTabsByWorkspace(tabs, "ws-1")
		expect(filtered.length).toBe(2)
		expect(filtered.every((t) => t.workspaceId === "ws-1")).toBe(true)
	})

	it("should return empty array when no match", () => {
		const tabs = [createTestTab({ workspaceId: "ws-1" })]
		const filtered = getTabsByWorkspace(tabs, "ws-999")
		expect(filtered.length).toBe(0)
	})
})

describe("calculateNextActiveTabId", () => {
	it("should keep current active when closing different tab", () => {
		const tabs = [
			createTestTab({ id: "1" }),
			createTestTab({ id: "2" }),
			createTestTab({ id: "3" }),
		]
		const next = calculateNextActiveTabId(tabs, "1", "2")
		expect(next).toBe("2")
	})

	it("should select right tab when closing active", () => {
		const tabs = [
			createTestTab({ id: "1" }),
			createTestTab({ id: "2" }),
			createTestTab({ id: "3" }),
		]
		const next = calculateNextActiveTabId(tabs, "2", "2")
		expect(next).toBe("3")
	})

	it("should select left tab when closing last active", () => {
		const tabs = [
			createTestTab({ id: "1" }),
			createTestTab({ id: "2" }),
			createTestTab({ id: "3" }),
		]
		const next = calculateNextActiveTabId(tabs, "3", "3")
		expect(next).toBe("2")
	})

	it("should return null when closing only tab", () => {
		const tabs = [createTestTab({ id: "1" })]
		const next = calculateNextActiveTabId(tabs, "1", "1")
		expect(next).toBeNull()
	})
})

describe("addTab", () => {
	it("should add tab immutably", () => {
		const tabs = [createTestTab({ id: "1" })]
		const newTab = createTestTab({ id: "2" })
		const result = addTab(tabs, newTab)
		expect(result.length).toBe(2)
		expect(result[1].id).toBe("2")
		// 原数组不变
		expect(tabs.length).toBe(1)
	})
})

describe("removeTab", () => {
	it("should remove tab immutably", () => {
		const tabs = [createTestTab({ id: "1" }), createTestTab({ id: "2" })]
		const result = removeTab(tabs, "1")
		expect(result.length).toBe(1)
		expect(result[0].id).toBe("2")
		// 原数组不变
		expect(tabs.length).toBe(2)
	})
})

describe("updateTab", () => {
	it("should update tab immutably", () => {
		const tabs = [createTestTab({ id: "1", title: "Old Title" }), createTestTab({ id: "2" })]
		const result = updateTab(tabs, "1", { title: "New Title" })
		expect(result[0].title).toBe("New Title")
		// 原数组不变
		expect(tabs[0].title).toBe("Old Title")
	})
})

describe("reorderTabs", () => {
	it("should reorder tabs immutably", () => {
		const tabs = [
			createTestTab({ id: "1" }),
			createTestTab({ id: "2" }),
			createTestTab({ id: "3" }),
		]
		const result = reorderTabs(tabs, 0, 2)
		expect(result[0].id).toBe("2")
		expect(result[1].id).toBe("3")
		expect(result[2].id).toBe("1")
		// 原数组不变
		expect(tabs[0].id).toBe("1")
	})
})

describe("updateEditorState", () => {
	it("should update state immutably", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": createDefaultEditorState(),
		}
		const result = updateEditorState(states, "tab-1", { scrollTop: 100 })
		expect(result["tab-1"].scrollTop).toBe(100)
		// 原对象不变
		expect(states["tab-1"].scrollTop).toBe(0)
	})

	it("should create state if not exists", () => {
		const states: Record<string, EditorInstanceState> = {}
		const result = updateEditorState(states, "tab-1", { scrollTop: 100 })
		expect(result["tab-1"]).toBeDefined()
		expect(result["tab-1"].scrollTop).toBe(100)
	})
})

describe("removeEditorState", () => {
	it("should remove state immutably", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": createDefaultEditorState(),
			"tab-2": createDefaultEditorState(),
		}
		const result = removeEditorState(states, "tab-1")
		expect(result["tab-1"]).toBeUndefined()
		expect(result["tab-2"]).toBeDefined()
		// 原对象不变
		expect(states["tab-1"]).toBeDefined()
	})
})

describe("evictLRUEditorStates", () => {
	it("should not evict when under limit", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": { ...createDefaultEditorState(), lastModified: 1000 },
			"tab-2": { ...createDefaultEditorState(), lastModified: 2000 },
		}
		const result = evictLRUEditorStates(states, null, new Set(), 5)
		expect(Object.keys(result).length).toBe(2)
	})

	it("should evict oldest when over limit", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": { ...createDefaultEditorState(), lastModified: 1000 },
			"tab-2": { ...createDefaultEditorState(), lastModified: 2000 },
			"tab-3": { ...createDefaultEditorState(), lastModified: 3000 },
		}
		const result = evictLRUEditorStates(states, null, new Set(), 2)
		expect(Object.keys(result).length).toBe(2)
		expect(result["tab-1"]).toBeUndefined()
	})

	it("should not evict active tab", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": { ...createDefaultEditorState(), lastModified: 1000 },
			"tab-2": { ...createDefaultEditorState(), lastModified: 2000 },
			"tab-3": { ...createDefaultEditorState(), lastModified: 3000 },
		}
		const result = evictLRUEditorStates(states, "tab-1", new Set(), 2)
		expect(result["tab-1"]).toBeDefined()
	})

	it("should not evict dirty states", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": {
				...createDefaultEditorState(),
				isDirty: true,
				lastModified: 1000,
			},
			"tab-2": { ...createDefaultEditorState(), lastModified: 2000 },
			"tab-3": { ...createDefaultEditorState(), lastModified: 3000 },
		}
		const result = evictLRUEditorStates(states, null, new Set(), 2)
		expect(result["tab-1"]).toBeDefined()
	})
})

describe("isValidTab", () => {
	it("should return true for valid tab", () => {
		const tab = createTestTab()
		expect(isValidTab(tab)).toBe(true)
	})

	it("should return false for null", () => {
		expect(isValidTab(null)).toBe(false)
	})

	it("should return false for missing properties", () => {
		expect(isValidTab({ id: "1" })).toBe(false)
	})

	it("should return false for invalid type", () => {
		const tab = { ...createTestTab(), type: "invalid" }
		expect(isValidTab(tab)).toBe(false)
	})
})

describe("isValidTabIndex", () => {
	it("should return true for valid index", () => {
		const tabs = [createTestTab(), createTestTab()]
		expect(isValidTabIndex(tabs, 0)).toBe(true)
		expect(isValidTabIndex(tabs, 1)).toBe(true)
	})

	it("should return false for negative index", () => {
		const tabs = [createTestTab()]
		expect(isValidTabIndex(tabs, -1)).toBe(false)
	})

	it("should return false for out of bounds index", () => {
		const tabs = [createTestTab()]
		expect(isValidTabIndex(tabs, 1)).toBe(false)
	})
})
