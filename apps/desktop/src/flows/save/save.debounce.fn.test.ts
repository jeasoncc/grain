/**
 * @file fn/save/save.debounce.fn.test.ts
 * @description Save 纯函数测试
 */

import type { SerializedEditorState } from "lexical"
import { describe, expect, it } from "vitest"
import { extractTagsFromContent, parseTagString } from "./save.debounce.fn"

describe("parseTagString", () => {
	it("should parse comma-separated tags", () => {
		const result = parseTagString("tag1, tag2, tag3")
		expect(result).toEqual(["tag1", "tag2", "tag3"])
	})

	it("should trim whitespace", () => {
		const result = parseTagString("  tag1  ,  tag2  ")
		expect(result).toEqual(["tag1", "tag2"])
	})

	it("should filter empty strings", () => {
		const result = parseTagString("tag1,,tag2,")
		expect(result).toEqual(["tag1", "tag2"])
	})

	it("should return empty array for empty string", () => {
		const result = parseTagString("")
		expect(result).toEqual([])
	})

	it("should handle single tag", () => {
		const result = parseTagString("single")
		expect(result).toEqual(["single"])
	})
})

describe("extractTagsFromContent", () => {
	it("should extract tags from front-matter node", () => {
		const content: SerializedEditorState = {
			root: {
				children: [
					{
						key: "TAGS",
						type: "front-matter",
						value: "tag1, tag2",
					},
				],
			},
		} as unknown as SerializedEditorState

		const result = extractTagsFromContent(content)
		expect(result).toEqual(["tag1", "tag2"])
	})

	it("should handle lowercase tags key", () => {
		const content: SerializedEditorState = {
			root: {
				children: [
					{
						key: "tags",
						type: "front-matter",
						value: "tag1, tag2",
					},
				],
			},
		} as unknown as SerializedEditorState

		const result = extractTagsFromContent(content)
		expect(result).toEqual(["tag1", "tag2"])
	})

	it("should extract tags from nested children", () => {
		const content: SerializedEditorState = {
			root: {
				children: [
					{
						children: [
							{
								key: "TAGS",
								type: "front-matter",
								value: "nested-tag",
							},
						],
						type: "paragraph",
					},
				],
			},
		} as unknown as SerializedEditorState

		const result = extractTagsFromContent(content)
		expect(result).toEqual(["nested-tag"])
	})

	it("should deduplicate tags", () => {
		const content: SerializedEditorState = {
			root: {
				children: [
					{
						key: "TAGS",
						type: "front-matter",
						value: "tag1, tag2",
					},
					{
						key: "TAGS",
						type: "front-matter",
						value: "tag2, tag3",
					},
				],
			},
		} as unknown as SerializedEditorState

		const result = extractTagsFromContent(content)
		expect(result).toEqual(["tag1", "tag2", "tag3"])
	})

	it("should return empty array for content without tags", () => {
		const content: SerializedEditorState = {
			root: {
				children: [
					{
						children: [],
						type: "paragraph",
					},
				],
			},
		} as unknown as SerializedEditorState

		const result = extractTagsFromContent(content)
		expect(result).toEqual([])
	})

	it("should return empty array for content without root", () => {
		const content = {} as SerializedEditorState
		const result = extractTagsFromContent(content)
		expect(result).toEqual([])
	})

	it("should ignore non-TAGS front-matter", () => {
		const content: SerializedEditorState = {
			root: {
				children: [
					{
						key: "TITLE",
						type: "front-matter",
						value: "My Title",
					},
					{
						key: "TAGS",
						type: "front-matter",
						value: "actual-tag",
					},
				],
			},
		} as unknown as SerializedEditorState

		const result = extractTagsFromContent(content)
		expect(result).toEqual(["actual-tag"])
	})
})
