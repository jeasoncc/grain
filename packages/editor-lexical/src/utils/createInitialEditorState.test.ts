/**
 * @file utils/createInitialEditorState.test.ts
 * @description 测试初始编辑器状态创建函数
 */

import { describe, expect, it } from "vitest";
import { createInitialDocumentState } from "./createInitialEditorState";

describe("createInitialDocumentState", () => {
	it("should create valid JSON string", () => {
		const result = createInitialDocumentState("Test Title");
		expect(() => JSON.parse(result)).not.toThrow();
	});

	it("should include title in heading node", () => {
		const result = createInitialDocumentState("My Document");
		const state = JSON.parse(result);

		const heading = state.root.children[0];
		expect(heading.type).toBe("heading");
		expect(heading.children[0].text).toBe("My Document");
	});

	it("should have h2 tag for heading", () => {
		const result = createInitialDocumentState("Test");
		const state = JSON.parse(result);

		const heading = state.root.children[0];
		expect(heading.tag).toBe("h2");
	});

	it("should include empty paragraph after heading", () => {
		const result = createInitialDocumentState("Test");
		const state = JSON.parse(result);

		expect(state.root.children).toHaveLength(2);
		const paragraph = state.root.children[1];
		expect(paragraph.type).toBe("paragraph");
		expect(paragraph.children[0].text).toBe("");
	});

	it("should handle empty title", () => {
		const result = createInitialDocumentState("");
		const state = JSON.parse(result);

		const heading = state.root.children[0];
		expect(heading.children[0].text).toBe("");
	});

	it("should handle special characters in title", () => {
		const title = "Test <>&\"' 中文";
		const result = createInitialDocumentState(title);
		const state = JSON.parse(result);

		const heading = state.root.children[0];
		expect(heading.children[0].text).toBe(title);
	});
});
