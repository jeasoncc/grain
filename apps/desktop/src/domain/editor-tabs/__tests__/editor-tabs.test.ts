/**
 * Editor Tabs Domain - Property-Based Tests
 *
 * Tests for:
 * - Builder pattern (method chaining, from(), validation, immutability)
 * - Pure utility functions (no mutation, consistent output)
 * - LRU cache eviction logic
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
	EditorTabBuilder,
	EditorStateBuilder,
	createFileTab,
	createDiaryTab,
	createCanvasTab,
} from "../editor-tabs.builder";
import {
	findTabByNodeId,
	getTabsByWorkspace,
	calculateNextActiveTabId,
	addTab,
	removeTab,
	updateTab,
	reorderTabs,
	evictLRUEditorStates,
	isValidTab,
	isValidTabIndex,
	createDefaultEditorState,
} from "../editor-tabs.utils";
import type { EditorTab, EditorInstanceState, TabType } from "../editor-tabs.interface";

// ==============================
// Arbitraries
// ==============================

const tabTypeArb = fc.constantFrom<TabType>("file", "diary", "canvas", "folder");

const editorTabArb: fc.Arbitrary<EditorTab> = fc.record({
	id: fc.uuid(),
	workspaceId: fc.uuid(),
	nodeId: fc.uuid(),
	title: fc.string({ minLength: 1, maxLength: 50 }),
	type: tabTypeArb,
	isDirty: fc.boolean(),
});

// ==============================
// Property 4: Builder Method Chaining
// ==============================

describe("Property 4: Builder Method Chaining", () => {
	it("EditorTabBuilder returns this for all setter methods", () => {
		fc.assert(
			fc.property(
				fc.uuid(),
				fc.uuid(),
				fc.string({ minLength: 1 }),
				tabTypeArb,
				fc.boolean(),
				(workspaceId: string, nodeId: string, title: string, type: TabType, isDirty: boolean) => {
					const builder = EditorTabBuilder.create();

					// Each method should return the builder instance
					expect(builder.workspaceId(workspaceId)).toBe(builder);
					expect(builder.nodeId(nodeId)).toBe(builder);
					expect(builder.title(title)).toBe(builder);
					expect(builder.type(type)).toBe(builder);
					expect(builder.dirty(isDirty)).toBe(builder);
				}
			),
			{ numRuns: 50 }
		);
	});

	it("EditorStateBuilder returns this for all setter methods", () => {
		fc.assert(
			fc.property(
				fc.nat(10000),
				fc.nat(10000),
				fc.boolean(),
				(scrollTop: number, scrollLeft: number, isDirty: boolean) => {
					const builder = EditorStateBuilder.create();

					expect(builder.scrollPosition(scrollTop, scrollLeft)).toBe(builder);
					expect(builder.dirty(isDirty)).toBe(builder);
					expect(builder.touch()).toBe(builder);
				}
			),
			{ numRuns: 50 }
		);
	});

	it("chained calls produce correct final state", () => {
		fc.assert(
			fc.property(
				fc.uuid(),
				fc.uuid(),
				fc.string({ minLength: 1, maxLength: 50 }),
				tabTypeArb,
				(workspaceId: string, nodeId: string, title: string, type: TabType) => {
					const tab = EditorTabBuilder.create()
						.workspaceId(workspaceId)
						.nodeId(nodeId)
						.title(title)
						.type(type)
						.dirty(true)
						.build();

					expect(tab.workspaceId).toBe(workspaceId);
					expect(tab.nodeId).toBe(nodeId);
					expect(tab.title).toBe(title);
					expect(tab.type).toBe(type);
					expect(tab.isDirty).toBe(true);
				}
			),
			{ numRuns: 50 }
		);
	});
});

// ==============================
// Property 5: Builder From Method Round Trip
// ==============================

describe("Property 5: Builder From Method Round Trip", () => {
	it("from() preserves all properties", () => {
		fc.assert(
			fc.property(editorTabArb, (originalTab: EditorTab) => {
				// Ensure nodeId matches id for valid tab
				const tab = { ...originalTab, id: originalTab.nodeId };

				const rebuilt = EditorTabBuilder.create().from(tab).build();

				expect(rebuilt.workspaceId).toBe(tab.workspaceId);
				expect(rebuilt.nodeId).toBe(tab.nodeId);
				expect(rebuilt.title).toBe(tab.title);
				expect(rebuilt.type).toBe(tab.type);
				expect(rebuilt.isDirty).toBe(tab.isDirty);
			}),
			{ numRuns: 50 }
		);
	});
});

// ==============================
// Property 6: Builder Validation
// ==============================

describe("Property 6: Builder Validation", () => {
	it("throws when workspaceId is missing", () => {
		expect(() => {
			EditorTabBuilder.create().nodeId("node-1").title("Test").build();
		}).toThrow("EditorTab requires workspaceId");
	});

	it("throws when nodeId is missing", () => {
		expect(() => {
			EditorTabBuilder.create().workspaceId("ws-1").title("Test").build();
		}).toThrow("EditorTab requires nodeId");
	});

	it("throws when title is missing", () => {
		expect(() => {
			EditorTabBuilder.create().workspaceId("ws-1").nodeId("node-1").build();
		}).toThrow("EditorTab requires title");
	});

	it("succeeds with all required fields", () => {
		fc.assert(
			fc.property(
				fc.uuid(),
				fc.uuid(),
				fc.string({ minLength: 1 }),
				(workspaceId: string, nodeId: string, title: string) => {
					const tab = EditorTabBuilder.create()
						.workspaceId(workspaceId)
						.nodeId(nodeId)
						.title(title)
						.build();

					expect(tab).toBeDefined();
					expect(tab.id).toBe(nodeId);
				}
			),
			{ numRuns: 50 }
		);
	});
});

// ==============================
// Property 7: Builder Produces Immutable Objects
// ==============================

describe("Property 7: Builder Produces Immutable Objects", () => {
	it("EditorTabBuilder.build() returns frozen object", () => {
		const tab = EditorTabBuilder.create()
			.workspaceId("ws-1")
			.nodeId("node-1")
			.title("Test")
			.build();

		expect(Object.isFrozen(tab)).toBe(true);
	});

	it("EditorStateBuilder.build() returns frozen object", () => {
		const state = EditorStateBuilder.create().build();

		expect(Object.isFrozen(state)).toBe(true);
	});

	it("multiple builds produce independent objects", () => {
		const builder = EditorTabBuilder.create()
			.workspaceId("ws-1")
			.nodeId("node-1")
			.title("Test");

		const tab1 = builder.build();
		builder.title("Modified");
		const tab2 = builder.build();

		expect(tab1.title).toBe("Test");
		expect(tab2.title).toBe("Modified");
	});
});

// ==============================
// Pure Functions: No Mutation
// ==============================

describe("Pure Functions: No Mutation", () => {
	it("addTab does not mutate original array", () => {
		fc.assert(
			fc.property(
				fc.array(editorTabArb, { minLength: 0, maxLength: 10 }),
				editorTabArb,
				(tabs: EditorTab[], newTab: EditorTab) => {
					const original = [...tabs];
					const result = addTab(tabs, newTab);

					expect(tabs).toEqual(original);
					expect(result).not.toBe(tabs);
					expect(result.length).toBe(tabs.length + 1);
				}
			),
			{ numRuns: 50 }
		);
	});

	it("removeTab does not mutate original array", () => {
		fc.assert(
			fc.property(
				fc.array(editorTabArb, { minLength: 1, maxLength: 10 }),
				(tabs: EditorTab[]) => {
					const original = [...tabs];
					const tabToRemove = tabs[0];
					const result = removeTab(tabs, tabToRemove.id);

					expect(tabs).toEqual(original);
					expect(result).not.toBe(tabs);
				}
			),
			{ numRuns: 50 }
		);
	});

	it("updateTab does not mutate original array or tabs", () => {
		fc.assert(
			fc.property(
				fc.array(editorTabArb, { minLength: 1, maxLength: 10 }),
				fc.string({ minLength: 1 }),
				(tabs: EditorTab[], newTitle: string) => {
					const original = tabs.map((t: EditorTab) => ({ ...t }));
					const tabToUpdate = tabs[0];
					const result = updateTab(tabs, tabToUpdate.id, { title: newTitle });

					expect(tabs).toEqual(original);
					expect(result).not.toBe(tabs);
				}
			),
			{ numRuns: 50 }
		);
	});

	it("reorderTabs does not mutate original array", () => {
		fc.assert(
			fc.property(
				fc.array(editorTabArb, { minLength: 2, maxLength: 10 }),
				(tabs: EditorTab[]) => {
					const original = [...tabs];
					const result = reorderTabs(tabs, 0, 1);

					expect(tabs).toEqual(original);
					expect(result).not.toBe(tabs);
				}
			),
			{ numRuns: 50 }
		);
	});
});

// ==============================
// Pure Functions: Consistent Output
// ==============================

describe("Pure Functions: Consistent Output", () => {
	it("findTabByNodeId returns same result for same input", () => {
		fc.assert(
			fc.property(
				fc.array(editorTabArb, { minLength: 1, maxLength: 10 }),
				(tabs: EditorTab[]) => {
					const nodeId = tabs[0].nodeId;
					const result1 = findTabByNodeId(tabs, nodeId);
					const result2 = findTabByNodeId(tabs, nodeId);

					expect(result1).toEqual(result2);
				}
			),
			{ numRuns: 50 }
		);
	});

	it("calculateNextActiveTabId is deterministic", () => {
		fc.assert(
			fc.property(
				fc.array(editorTabArb, { minLength: 2, maxLength: 10 }),
				(tabs: EditorTab[]) => {
					const closedId = tabs[0].id;
					const activeId = tabs[0].id;

					const result1 = calculateNextActiveTabId(tabs, closedId, activeId);
					const result2 = calculateNextActiveTabId(tabs, closedId, activeId);

					expect(result1).toBe(result2);
				}
			),
			{ numRuns: 50 }
		);
	});

	it("getTabsByWorkspace filters correctly", () => {
		fc.assert(
			fc.property(
				fc.array(editorTabArb, { minLength: 1, maxLength: 10 }),
				(tabs: EditorTab[]) => {
					const workspaceId = tabs[0].workspaceId;
					const result = getTabsByWorkspace(tabs, workspaceId);

					// All returned tabs should have the correct workspaceId
					for (const tab of result) {
						expect(tab.workspaceId).toBe(workspaceId);
					}
				}
			),
			{ numRuns: 50 }
		);
	});
});

// ==============================
// LRU Cache Eviction
// ==============================

describe("LRU Cache Eviction", () => {
	it("does not evict when under limit", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": { ...createDefaultEditorState(), lastModified: 1000 },
			"tab-2": { ...createDefaultEditorState(), lastModified: 2000 },
		};

		const result = evictLRUEditorStates(states, null, new Set(), 5);

		expect(Object.keys(result).length).toBe(2);
	});

	it("evicts oldest entries first", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": { ...createDefaultEditorState(), lastModified: 1000 },
			"tab-2": { ...createDefaultEditorState(), lastModified: 3000 },
			"tab-3": { ...createDefaultEditorState(), lastModified: 2000 },
		};

		const result = evictLRUEditorStates(states, null, new Set(), 2);

		expect(Object.keys(result).length).toBe(2);
		expect(result["tab-1"]).toBeUndefined(); // Oldest, should be evicted
		expect(result["tab-2"]).toBeDefined();
		expect(result["tab-3"]).toBeDefined();
	});

	it("does not evict active tab", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": { ...createDefaultEditorState(), lastModified: 1000 },
			"tab-2": { ...createDefaultEditorState(), lastModified: 2000 },
		};

		const result = evictLRUEditorStates(states, "tab-1", new Set(), 1);

		// tab-1 is active, so tab-2 should be evicted instead
		expect(result["tab-1"]).toBeDefined();
	});

	it("does not evict dirty states", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": { ...createDefaultEditorState(), lastModified: 1000, isDirty: true },
			"tab-2": { ...createDefaultEditorState(), lastModified: 2000, isDirty: false },
		};

		const result = evictLRUEditorStates(states, null, new Set(), 1);

		// tab-1 is dirty, so tab-2 should be evicted
		expect(result["tab-1"]).toBeDefined();
	});

	it("does not evict open tabs", () => {
		const states: Record<string, EditorInstanceState> = {
			"tab-1": { ...createDefaultEditorState(), lastModified: 1000 },
			"tab-2": { ...createDefaultEditorState(), lastModified: 2000 },
		};

		const openTabs = new Set(["tab-1"]);
		const result = evictLRUEditorStates(states, null, openTabs, 1);

		// tab-1 is open, so tab-2 should be evicted
		expect(result["tab-1"]).toBeDefined();
	});
});

// ==============================
// Validation Functions
// ==============================

describe("Validation Functions", () => {
	it("isValidTab returns true for valid tabs", () => {
		fc.assert(
			fc.property(editorTabArb, (tab: EditorTab) => {
				expect(isValidTab(tab)).toBe(true);
			}),
			{ numRuns: 50 }
		);
	});

	it("isValidTab returns false for invalid inputs", () => {
		expect(isValidTab(null)).toBe(false);
		expect(isValidTab(undefined)).toBe(false);
		expect(isValidTab({})).toBe(false);
		expect(isValidTab({ id: "test" })).toBe(false);
		expect(
			isValidTab({
				id: "test",
				workspaceId: "ws",
				nodeId: "node",
				title: "t",
				type: "invalid",
			})
		).toBe(false);
	});

	it("isValidTabIndex validates correctly", () => {
		fc.assert(
			fc.property(
				fc.array(editorTabArb, { minLength: 1, maxLength: 10 }),
				fc.integer(),
				(tabs: EditorTab[], index: number) => {
					const isValid = isValidTabIndex(tabs, index);
					const expected = index >= 0 && index < tabs.length;
					expect(isValid).toBe(expected);
				}
			),
			{ numRuns: 50 }
		);
	});
});

// ==============================
// Convenience Functions
// ==============================

describe("Convenience Functions", () => {
	it("createFileTab creates file type tab", () => {
		const tab = createFileTab("ws-1", "node-1", "Test File");

		expect(tab.type).toBe("file");
		expect(tab.workspaceId).toBe("ws-1");
		expect(tab.nodeId).toBe("node-1");
		expect(tab.title).toBe("Test File");
	});

	it("createDiaryTab creates diary type tab", () => {
		const tab = createDiaryTab("ws-1", "node-1", "Today's Diary");

		expect(tab.type).toBe("diary");
	});

	it("createCanvasTab creates canvas type tab", () => {
		const tab = createCanvasTab("ws-1", "node-1", "My Canvas");

		expect(tab.type).toBe("canvas");
	});
});
