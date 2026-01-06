/**
 * @file fn/tag/tag.extract.fn.test.ts
 * @description 标签提取和处理纯函数的单元测试
 */

import { describe, expect, it } from "vitest";
import type { TagInterface } from "@/types/tag";
import {
	extractTagsFromContent,
	filterTagsByMinCount,
	filterTagsByPrefix,
	filterTagsByWorkspace,
	findTag,
	getTopTags,
	getTotalTagUsage,
	getUniqueTagNames,
	MAX_TAG_NAME_LENGTH,
	normalizeTagName,
	sortTagsAlphabetically,
	sortTagsByCount,
	validateTagName,
} from "./tag.extract.fn";

// ============================================================================
// Test Data
// ============================================================================

const createTag = (
	name: string,
	count: number,
	workspace = "ws-1",
): TagInterface => ({
	id: `tag-${name}`,
	name,
	count,
	workspace,
	createDate: new Date().toISOString(),
	lastUsed: new Date().toISOString(),
});

const sampleTags: TagInterface[] = [
	createTag("diary", 10, "ws-1"),
	createTag("todo", 5, "ws-1"),
	createTag("notes", 15, "ws-1"),
	createTag("work", 3, "ws-2"),
	createTag("daily", 8, "ws-1"),
];

// ============================================================================
// Normalization Functions Tests
// ============================================================================

describe("normalizeTagName", () => {
	it("should convert to lowercase", () => {
		expect(normalizeTagName("DIARY")).toBe("diary");
		expect(normalizeTagName("ToDo")).toBe("todo");
	});

	it("should trim whitespace", () => {
		expect(normalizeTagName("  diary  ")).toBe("diary");
		expect(normalizeTagName("\ttodo\n")).toBe("todo");
	});

	it("should remove invalid characters", () => {
		expect(normalizeTagName("#diary")).toBe("diary");
		expect(normalizeTagName("[tag]")).toBe("tag");
		expect(normalizeTagName("@mention")).toBe("mention");
		expect(normalizeTagName("#[tag]@")).toBe("tag");
	});

	it("should handle combined cases", () => {
		expect(normalizeTagName("  #[DIARY]  ")).toBe("diary");
	});

	it("should handle empty string", () => {
		expect(normalizeTagName("")).toBe("");
	});

	it("should handle Chinese characters", () => {
		expect(normalizeTagName("日记")).toBe("日记");
		expect(normalizeTagName("  #[日记]  ")).toBe("日记");
	});
});

describe("validateTagName", () => {
	it("should return null for valid tag names", () => {
		expect(validateTagName("diary")).toBeNull();
		expect(validateTagName("a")).toBeNull();
		expect(validateTagName("a".repeat(MAX_TAG_NAME_LENGTH))).toBeNull();
	});

	it("should return error for empty tag name", () => {
		expect(validateTagName("")).toBe("标签名称太短");
		expect(validateTagName("   ")).toBe("标签名称太短");
	});

	it("should return error for tag name with only invalid chars", () => {
		expect(validateTagName("#[]@")).toBe("标签名称太短");
	});

	it("should return error for too long tag name", () => {
		const longName = "a".repeat(MAX_TAG_NAME_LENGTH + 1);
		expect(validateTagName(longName)).toBe("标签名称太长");
	});
});

// ============================================================================
// Filtering Functions Tests
// ============================================================================

describe("filterTagsByPrefix", () => {
	it("should filter tags by prefix (case insensitive)", () => {
		const result = filterTagsByPrefix(sampleTags, "d");
		expect(result).toHaveLength(2);
		expect(result.map((t) => t.name)).toContain("diary");
		expect(result.map((t) => t.name)).toContain("daily");
	});

	it("should handle uppercase prefix", () => {
		const result = filterTagsByPrefix(sampleTags, "D");
		expect(result).toHaveLength(2);
	});

	it("should return empty array for no matches", () => {
		const result = filterTagsByPrefix(sampleTags, "xyz");
		expect(result).toHaveLength(0);
	});

	it("should return all tags for empty prefix", () => {
		const result = filterTagsByPrefix(sampleTags, "");
		expect(result).toHaveLength(sampleTags.length);
	});
});

describe("filterTagsByMinCount", () => {
	it("should filter tags by minimum count", () => {
		const result = filterTagsByMinCount(sampleTags, 10);
		expect(result).toHaveLength(2);
		expect(result.map((t) => t.name)).toContain("diary");
		expect(result.map((t) => t.name)).toContain("notes");
	});

	it("should include tags with exact count", () => {
		const result = filterTagsByMinCount(sampleTags, 5);
		expect(result.map((t) => t.name)).toContain("todo");
	});

	it("should return all tags for minCount 0", () => {
		const result = filterTagsByMinCount(sampleTags, 0);
		expect(result).toHaveLength(sampleTags.length);
	});

	it("should return empty array for high minCount", () => {
		const result = filterTagsByMinCount(sampleTags, 100);
		expect(result).toHaveLength(0);
	});
});

describe("filterTagsByWorkspace", () => {
	it("should filter tags by workspace", () => {
		const result = filterTagsByWorkspace(sampleTags, "ws-1");
		expect(result).toHaveLength(4);
		expect(result.every((t) => t.workspace === "ws-1")).toBe(true);
	});

	it("should return empty array for non-existent workspace", () => {
		const result = filterTagsByWorkspace(sampleTags, "ws-999");
		expect(result).toHaveLength(0);
	});
});

// ============================================================================
// Sorting Functions Tests
// ============================================================================

describe("sortTagsByCount", () => {
	it("should sort tags by count in descending order", () => {
		const result = sortTagsByCount(sampleTags);
		expect(result[0].name).toBe("notes"); // 15
		expect(result[1].name).toBe("diary"); // 10
		expect(result[2].name).toBe("daily"); // 8
	});

	it("should not modify original array", () => {
		const original = [...sampleTags];
		sortTagsByCount(sampleTags);
		expect(sampleTags).toEqual(original);
	});

	it("should handle empty array", () => {
		const result = sortTagsByCount([]);
		expect(result).toHaveLength(0);
	});
});

describe("sortTagsAlphabetically", () => {
	it("should sort tags alphabetically", () => {
		const result = sortTagsAlphabetically(sampleTags);
		expect(result[0].name).toBe("daily");
		expect(result[1].name).toBe("diary");
		expect(result[2].name).toBe("notes");
	});

	it("should not modify original array", () => {
		const original = [...sampleTags];
		sortTagsAlphabetically(sampleTags);
		expect(sampleTags).toEqual(original);
	});
});

// ============================================================================
// Extraction Functions Tests
// ============================================================================

describe("extractTagsFromContent", () => {
	it("should extract tags from content", () => {
		const content = "This is a #[diary] entry with #[todo] items";
		const result = extractTagsFromContent(content);
		expect(result).toHaveLength(2);
		expect(result).toContain("diary");
		expect(result).toContain("todo");
	});

	it("should normalize extracted tags", () => {
		const content = "Tags: #[DIARY] and #[  Todo  ]";
		const result = extractTagsFromContent(content);
		expect(result).toContain("diary");
		expect(result).toContain("todo");
	});

	it("should deduplicate tags", () => {
		const content = "#[diary] #[diary] #[DIARY]";
		const result = extractTagsFromContent(content);
		expect(result).toHaveLength(1);
		expect(result).toContain("diary");
	});

	it("should handle content without tags", () => {
		const content = "No tags here";
		const result = extractTagsFromContent(content);
		expect(result).toHaveLength(0);
	});

	it("should handle empty content", () => {
		const result = extractTagsFromContent("");
		expect(result).toHaveLength(0);
	});

	it("should handle Chinese tags", () => {
		const content = "这是一个 #[日记] 条目";
		const result = extractTagsFromContent(content);
		expect(result).toContain("日记");
	});

	it("should skip empty tag names", () => {
		const content = "#[] #[  ] #[valid]";
		const result = extractTagsFromContent(content);
		expect(result).toHaveLength(1);
		expect(result).toContain("valid");
	});
});

describe("getUniqueTagNames", () => {
	it("should return unique tag names", () => {
		const tags = [
			createTag("diary", 1),
			createTag("diary", 2),
			createTag("todo", 1),
		];
		const result = getUniqueTagNames(tags);
		expect(result).toHaveLength(2);
		expect(result).toContain("diary");
		expect(result).toContain("todo");
	});

	it("should handle empty array", () => {
		const result = getUniqueTagNames([]);
		expect(result).toHaveLength(0);
	});
});

// ============================================================================
// Statistics Functions Tests
// ============================================================================

describe("getTotalTagUsage", () => {
	it("should calculate total usage count", () => {
		const result = getTotalTagUsage(sampleTags);
		expect(result).toBe(10 + 5 + 15 + 3 + 8); // 41
	});

	it("should return 0 for empty array", () => {
		const result = getTotalTagUsage([]);
		expect(result).toBe(0);
	});
});

describe("getTopTags", () => {
	it("should return top N tags by count", () => {
		const result = getTopTags(sampleTags, 3);
		expect(result).toHaveLength(3);
		expect(result[0].name).toBe("notes"); // 15
		expect(result[1].name).toBe("diary"); // 10
		expect(result[2].name).toBe("daily"); // 8
	});

	it("should return all tags if n > array length", () => {
		const result = getTopTags(sampleTags, 100);
		expect(result).toHaveLength(sampleTags.length);
	});

	it("should return empty array for n = 0", () => {
		const result = getTopTags(sampleTags, 0);
		expect(result).toHaveLength(0);
	});
});

describe("findTag", () => {
	it("should find tag by name and workspace", () => {
		const result = findTag(sampleTags, "diary", "ws-1");
		expect(result).toBeDefined();
		expect(result?.name).toBe("diary");
		expect(result?.workspace).toBe("ws-1");
	});

	it("should be case insensitive", () => {
		const result = findTag(sampleTags, "DIARY", "ws-1");
		expect(result).toBeDefined();
		expect(result?.name).toBe("diary");
	});

	it("should return undefined for non-existent tag", () => {
		const result = findTag(sampleTags, "nonexistent", "ws-1");
		expect(result).toBeUndefined();
	});

	it("should return undefined for wrong workspace", () => {
		const result = findTag(sampleTags, "diary", "ws-2");
		expect(result).toBeUndefined();
	});
});
