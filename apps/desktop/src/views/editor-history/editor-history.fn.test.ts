/**
 * @file fn/editor-history/editor-history.fn.test.ts
 * @description Editor History 纯函数测试
 */

import { describe, expect, it } from "vitest";
import {
	clearNodeFromStack,
	createEmptyStack,
	createHistoryEntry,
	deserializeStack,
	getNodeHistoryCount,
	hasHistory,
	popFromStack,
	pushToStack,
	serializeStack,
} from "./editor-history.fn";

describe("createHistoryEntry", () => {
	it("should create entry with correct properties", () => {
		const entry = createHistoryEntry("node-1", { content: "test" }, 100);
		expect(entry.nodeId).toBe("node-1");
		expect(entry.content).toEqual({ content: "test" });
		expect(entry.wordCount).toBe(100);
		expect(entry.timestamp).toBeDefined();
	});
});

describe("pushToStack", () => {
	it("should add entry to empty stack", () => {
		const stack = createEmptyStack();
		const entry = createHistoryEntry("node-1", {}, 0);
		const newStack = pushToStack(stack, "node-1", entry);
		expect(getNodeHistoryCount(newStack, "node-1")).toBe(1);
	});

	it("should add entry to existing node history", () => {
		let stack = createEmptyStack();
		const entry1 = createHistoryEntry("node-1", {}, 0);
		const entry2 = createHistoryEntry("node-1", {}, 10);
		stack = pushToStack(stack, "node-1", entry1);
		stack = pushToStack(stack, "node-1", entry2);
		expect(getNodeHistoryCount(stack, "node-1")).toBe(2);
	});
});

describe("popFromStack", () => {
	it("should pop last entry from stack", () => {
		let stack = createEmptyStack();
		const entry1 = createHistoryEntry("node-1", { v: 1 }, 0);
		const entry2 = createHistoryEntry("node-1", { v: 2 }, 10);
		stack = pushToStack(stack, "node-1", entry1);
		stack = pushToStack(stack, "node-1", entry2);

		const [newStack, popped] = popFromStack(stack, "node-1");
		expect(popped?.content).toEqual({ v: 2 });
		expect(getNodeHistoryCount(newStack, "node-1")).toBe(1);
	});

	it("should return null for empty history", () => {
		const stack = createEmptyStack();
		const [newStack, popped] = popFromStack(stack, "node-1");
		expect(popped).toBeNull();
		expect(newStack).toBe(stack);
	});
});

describe("clearNodeFromStack", () => {
	it("should clear node history", () => {
		let stack = createEmptyStack();
		const entry = createHistoryEntry("node-1", {}, 0);
		stack = pushToStack(stack, "node-1", entry);
		stack = clearNodeFromStack(stack, "node-1");
		expect(hasHistory(stack, "node-1")).toBe(false);
	});

	it("should not affect other nodes", () => {
		let stack = createEmptyStack();
		stack = pushToStack(stack, "node-1", createHistoryEntry("node-1", {}, 0));
		stack = pushToStack(stack, "node-2", createHistoryEntry("node-2", {}, 0));
		stack = clearNodeFromStack(stack, "node-1");
		expect(hasHistory(stack, "node-1")).toBe(false);
		expect(hasHistory(stack, "node-2")).toBe(true);
	});
});

describe("createEmptyStack", () => {
	it("should create empty Map", () => {
		const stack = createEmptyStack();
		expect(stack.size).toBe(0);
	});
});

describe("getNodeHistoryCount", () => {
	it("should return 0 for non-existent node", () => {
		const stack = createEmptyStack();
		expect(getNodeHistoryCount(stack, "node-1")).toBe(0);
	});

	it("should return correct count", () => {
		let stack = createEmptyStack();
		stack = pushToStack(stack, "node-1", createHistoryEntry("node-1", {}, 0));
		stack = pushToStack(stack, "node-1", createHistoryEntry("node-1", {}, 0));
		expect(getNodeHistoryCount(stack, "node-1")).toBe(2);
	});
});

describe("hasHistory", () => {
	it("should return false for empty stack", () => {
		const stack = createEmptyStack();
		expect(hasHistory(stack, "node-1")).toBe(false);
	});

	it("should return true when has entries", () => {
		let stack = createEmptyStack();
		stack = pushToStack(stack, "node-1", createHistoryEntry("node-1", {}, 0));
		expect(hasHistory(stack, "node-1")).toBe(true);
	});
});

describe("serializeStack / deserializeStack", () => {
	it("should serialize and deserialize correctly", () => {
		let stack = createEmptyStack();
		const entry = createHistoryEntry("node-1", { test: true }, 100);
		stack = pushToStack(stack, "node-1", entry);

		const serialized = serializeStack(stack);
		const deserialized = deserializeStack(serialized);

		expect(getNodeHistoryCount(deserialized, "node-1")).toBe(1);
	});

	it("should handle undefined data", () => {
		const stack = deserializeStack(undefined);
		expect(stack.size).toBe(0);
	});
});
