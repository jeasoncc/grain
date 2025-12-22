/**
 * @file save.document.fn.test.ts
 * @description 文档保存纯函数测试
 *
 * 只测试纯函数，不测试涉及 DB 的函数
 */

import type { SerializedEditorState } from "lexical";
import { describe, expect, it } from "vitest";
import {
	createErrorResult,
	createNoChangeResult,
	createSuccessResult,
	hasContentChanged,
	serializeContent,
} from "./save.document.fn";

// ============================================================================
// 测试数据
// ============================================================================

const createMockEditorState = (text: string): SerializedEditorState =>
	({
		root: {
			children: [
				{
					children: [{ text, type: "text" }],
					type: "paragraph",
				},
			],
			type: "root",
		},
	}) as unknown as SerializedEditorState;

// ============================================================================
// serializeContent 测试
// ============================================================================

describe("serializeContent", () => {
	it("should serialize editor state to JSON string", () => {
		const content = createMockEditorState("Hello World");
		const result = serializeContent(content);

		expect(typeof result).toBe("string");
		expect(result).toContain("Hello World");
	});

	it("should produce valid JSON", () => {
		const content = createMockEditorState("Test content");
		const result = serializeContent(content);

		expect(() => JSON.parse(result)).not.toThrow();
	});

	it("should handle empty content", () => {
		const content = createMockEditorState("");
		const result = serializeContent(content);

		expect(typeof result).toBe("string");
		expect(JSON.parse(result)).toBeDefined();
	});

	it("should handle special characters", () => {
		const content = createMockEditorState('Hello "World" with\nnewlines');
		const result = serializeContent(content);

		expect(typeof result).toBe("string");
		const parsed = JSON.parse(result);
		expect(parsed).toBeDefined();
	});
});

// ============================================================================
// hasContentChanged 测试
// ============================================================================

describe("hasContentChanged", () => {
	it("should return true when content is different", () => {
		const newContent = '{"root": {"text": "new"}}';
		const previousContent = '{"root": {"text": "old"}}';

		expect(hasContentChanged(newContent, previousContent)).toBe(true);
	});

	it("should return false when content is the same", () => {
		const content = '{"root": {"text": "same"}}';

		expect(hasContentChanged(content, content)).toBe(false);
	});

	it("should return true when previousContent is undefined", () => {
		const newContent = '{"root": {"text": "new"}}';

		expect(hasContentChanged(newContent, undefined)).toBe(true);
	});

	it("should handle empty strings", () => {
		expect(hasContentChanged("", "")).toBe(false);
		expect(hasContentChanged("content", "")).toBe(true);
		expect(hasContentChanged("", "content")).toBe(true);
	});
});

// ============================================================================
// createSuccessResult 测试
// ============================================================================

describe("createSuccessResult", () => {
	it("should create a success result with correct properties", () => {
		const documentId = "doc-123";
		const tags = ["tag1", "tag2"];

		const result = createSuccessResult(documentId, tags);

		expect(result.success).toBe(true);
		expect(result.documentId).toBe(documentId);
		expect(result.tags).toEqual(tags);
		expect(result.timestamp).toBeInstanceOf(Date);
		expect(result.error).toBeUndefined();
	});

	it("should handle empty tags array", () => {
		const result = createSuccessResult("doc-123", []);

		expect(result.success).toBe(true);
		expect(result.tags).toEqual([]);
	});

	it("should create timestamp close to current time", () => {
		const before = new Date();
		const result = createSuccessResult("doc-123", []);
		const after = new Date();

		expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
	});
});

// ============================================================================
// createErrorResult 测试
// ============================================================================

describe("createErrorResult", () => {
	it("should create an error result with correct properties", () => {
		const documentId = "doc-123";
		const error = "Save failed";

		const result = createErrorResult(documentId, error);

		expect(result.success).toBe(false);
		expect(result.documentId).toBe(documentId);
		expect(result.error).toBe(error);
		expect(result.timestamp).toBeInstanceOf(Date);
		expect(result.tags).toBeUndefined();
	});

	it("should handle empty error message", () => {
		const result = createErrorResult("doc-123", "");

		expect(result.success).toBe(false);
		expect(result.error).toBe("");
	});
});

// ============================================================================
// createNoChangeResult 测试
// ============================================================================

describe("createNoChangeResult", () => {
	it("should create a no-change result with correct properties", () => {
		const documentId = "doc-123";

		const result = createNoChangeResult(documentId);

		expect(result.success).toBe(true);
		expect(result.documentId).toBe(documentId);
		expect(result.timestamp).toBeInstanceOf(Date);
		expect(result.tags).toBeUndefined();
		expect(result.error).toBeUndefined();
	});
});

// ============================================================================
// Property-based Testing (使用简单的随机测试)
// ============================================================================

describe("Property-based tests", () => {
	it("serializeContent should always produce valid JSON for any input", () => {
		const testCases = [
			"",
			"simple text",
			"text with 中文",
			"text with émojis 🎉",
			'text with "quotes"',
			"text\nwith\nnewlines",
			"a".repeat(10000), // 长文本
		];

		for (const text of testCases) {
			const content = createMockEditorState(text);
			const result = serializeContent(content);
			expect(() => JSON.parse(result)).not.toThrow();
		}
	});

	it("hasContentChanged should be reflexive (same content = no change)", () => {
		const testContents = [
			"{}",
			'{"key": "value"}',
			'{"nested": {"deep": "value"}}',
			"",
		];

		for (const content of testContents) {
			expect(hasContentChanged(content, content)).toBe(false);
		}
	});

	it("createSuccessResult should always have success=true", () => {
		const testCases = [
			{ id: "1", tags: [] },
			{ id: "abc-123", tags: ["tag1"] },
			{ id: "uuid-format", tags: ["a", "b", "c"] },
		];

		for (const { id, tags } of testCases) {
			const result = createSuccessResult(id, tags);
			expect(result.success).toBe(true);
			expect(result.documentId).toBe(id);
			expect(result.tags).toEqual(tags);
		}
	});

	it("createErrorResult should always have success=false", () => {
		const testCases = [
			{ id: "1", error: "error" },
			{ id: "abc", error: "" },
			{ id: "xyz", error: "Long error message with details" },
		];

		for (const { id, error } of testCases) {
			const result = createErrorResult(id, error);
			expect(result.success).toBe(false);
			expect(result.documentId).toBe(id);
			expect(result.error).toBe(error);
		}
	});
});
