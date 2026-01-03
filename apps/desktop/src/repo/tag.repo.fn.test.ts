/**
 * @file tag.repo.fn.test.ts
 * @description Tag Repository 单元测试
 *
 * 测试覆盖：
 * - getTagsByWorkspace: 获取工作区所有标签
 * - getTag: 获取单个标签
 * - getTagByName: 按名称获取标签
 * - getTopTags: 获取热门标签
 * - searchTags: 搜索标签
 * - getNodesByTag: 获取包含指定标签的节点
 * - getTagGraphData: 获取标签图形数据
 * - createTag: 创建标签
 * - updateTag: 更新标签
 * - getOrCreateTag: 获取或创建标签
 * - incrementTagCount: 增加标签计数
 * - decrementTagCount: 减少标签计数
 * - deleteTag: 删除标签
 * - deleteTagsByWorkspace: 删除工作区所有标签
 * - syncTagCache: 同步标签缓存
 * - rebuildTagCache: 重建标签缓存
 * - recalculateTagCounts: 重新计算标签计数
 *
 * @requirements 5.5
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TagGraphData, TagResponse } from "@/types/rust-api";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 运行 TaskEither 并返回 Either 结果
 */
async function runTE<Err, A>(
	te: TE.TaskEither<Err, A>,
): Promise<E.Either<Err, A>> {
	return te();
}

/**
 * 创建测试用的标签响应
 */
function createTestTagResponse(
	overrides: Partial<TagResponse> = {},
): TagResponse {
	const now = Date.now();
	return {
		id: "ws-1:rust",
		name: "rust",
		workspaceId: "ws-1",
		count: 5,
		lastUsed: now,
		createdAt: now - 86400000, // 1 day ago
		...overrides,
	};
}

/**
 * 创建测试用的标签图形数据
 */
function createTestTagGraphData(): TagGraphData {
	return {
		nodes: [
			{ id: "ws-1:rust", name: "rust", count: 5 },
			{ id: "ws-1:programming", name: "programming", count: 10 },
		],
		edges: [
			{ source: "ws-1:programming", target: "ws-1:rust", weight: 3 },
		],
	};
}

// ============================================================================
// Mock Setup
// ============================================================================

const { mockApi } = vi.hoisted(() => {
	return {
		mockApi: {
			getTagsByWorkspace: vi.fn(),
			getTag: vi.fn(),
			getTagByName: vi.fn(),
			getTopTags: vi.fn(),
			searchTags: vi.fn(),
			getNodesByTag: vi.fn(),
			getTagGraphData: vi.fn(),
			createTag: vi.fn(),
			updateTag: vi.fn(),
			getOrCreateTag: vi.fn(),
			incrementTagCount: vi.fn(),
			decrementTagCount: vi.fn(),
			deleteTag: vi.fn(),
			deleteTagsByWorkspace: vi.fn(),
			syncTagCache: vi.fn(),
			rebuildTagCache: vi.fn(),
			recalculateTagCounts: vi.fn(),
		},
	};
});

// Mock api-client
vi.mock("@/db/api-client.fn", () => mockApi);

// Import after mocking
import {
	createTag,
	decrementTagCount,
	deleteTag,
	deleteTagsByWorkspace,
	getNodesByTag,
	getOrCreateTag,
	getTag,
	getTagByName,
	getTagGraphData,
	getTagOrFail,
	getTagsByWorkspace,
	getTopTags,
	incrementTagCount,
	rebuildTagCache,
	recalculateTagCounts,
	searchTags,
	syncTagCache,
	updateTag,
} from "./tag.repo.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("tag.repo.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// getTagsByWorkspace
	// ==========================================================================

	describe("getTagsByWorkspace", () => {
		it("should return Right with empty array when no tags exist", async () => {
			mockApi.getTagsByWorkspace.mockReturnValue(() =>
				Promise.resolve(E.right([])),
			);

			const result = await runTE(getTagsByWorkspace("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("should return Right with decoded tags on success", async () => {
			const testTags = [
				createTestTagResponse({ id: "ws-1:rust", name: "rust" }),
				createTestTagResponse({ id: "ws-1:typescript", name: "typescript" }),
			];
			mockApi.getTagsByWorkspace.mockReturnValue(() =>
				Promise.resolve(E.right(testTags)),
			);

			const result = await runTE(getTagsByWorkspace("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right[0].id).toBe("ws-1:rust");
				expect(result.right[0].name).toBe("rust");
				expect(result.right[1].id).toBe("ws-1:typescript");
			}
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to get tags" };
			mockApi.getTagsByWorkspace.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(getTagsByWorkspace("ws-1"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("Failed to get tags");
			}
		});
	});

	// ==========================================================================
	// getTag
	// ==========================================================================

	describe("getTag", () => {
		it("should return Right with null when tag not found", async () => {
			mockApi.getTag.mockReturnValue(() => Promise.resolve(E.right(null)));

			const result = await runTE(getTag("ws-1:nonexistent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});

		it("should return Right with decoded tag on success", async () => {
			const testTag = createTestTagResponse();
			mockApi.getTag.mockReturnValue(() => Promise.resolve(E.right(testTag)));

			const result = await runTE(getTag("ws-1:rust"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).not.toBeNull();
				expect(result.right?.id).toBe("ws-1:rust");
				expect(result.right?.name).toBe("rust");
			}
			expect(mockApi.getTag).toHaveBeenCalledWith("ws-1:rust");
		});
	});

	// ==========================================================================
	// getTagOrFail
	// ==========================================================================

	describe("getTagOrFail", () => {
		it("should return Right with tag when found", async () => {
			const testTag = createTestTagResponse();
			mockApi.getTag.mockReturnValue(() => Promise.resolve(E.right(testTag)));

			const result = await runTE(getTagOrFail("ws-1:rust"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.id).toBe("ws-1:rust");
			}
		});

		it("should return Left with NOT_FOUND error when tag not found", async () => {
			mockApi.getTag.mockReturnValue(() => Promise.resolve(E.right(null)));

			const result = await runTE(getTagOrFail("ws-1:nonexistent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
				expect(result.left.message).toContain("标签不存在");
			}
		});
	});

	// ==========================================================================
	// getTagByName
	// ==========================================================================

	describe("getTagByName", () => {
		it("should return Right with null when tag not found", async () => {
			mockApi.getTagByName.mockReturnValue(() =>
				Promise.resolve(E.right(null)),
			);

			const result = await runTE(getTagByName("ws-1", "nonexistent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});

		it("should return Right with decoded tag on success", async () => {
			const testTag = createTestTagResponse({ name: "rust" });
			mockApi.getTagByName.mockReturnValue(() =>
				Promise.resolve(E.right(testTag)),
			);

			const result = await runTE(getTagByName("ws-1", "rust"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right?.name).toBe("rust");
			}
			expect(mockApi.getTagByName).toHaveBeenCalledWith("ws-1", "rust");
		});
	});

	// ==========================================================================
	// getTopTags
	// ==========================================================================

	describe("getTopTags", () => {
		it("should return Right with top tags on success", async () => {
			const testTags = [
				createTestTagResponse({ name: "rust", count: 10 }),
				createTestTagResponse({ name: "typescript", count: 5 }),
			];
			mockApi.getTopTags.mockReturnValue(() =>
				Promise.resolve(E.right(testTags)),
			);

			const result = await runTE(getTopTags("ws-1", 10));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right[0].count).toBe(10);
			}
			expect(mockApi.getTopTags).toHaveBeenCalledWith("ws-1", 10);
		});
	});

	// ==========================================================================
	// searchTags
	// ==========================================================================

	describe("searchTags", () => {
		it("should return Right with matching tags on success", async () => {
			const testTags = [
				createTestTagResponse({ name: "rust" }),
				createTestTagResponse({ name: "rust-lang" }),
			];
			mockApi.searchTags.mockReturnValue(() =>
				Promise.resolve(E.right(testTags)),
			);

			const result = await runTE(searchTags("ws-1", "rust"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
			expect(mockApi.searchTags).toHaveBeenCalledWith("ws-1", "rust");
		});
	});

	// ==========================================================================
	// getNodesByTag
	// ==========================================================================

	describe("getNodesByTag", () => {
		it("should return Right with node IDs on success", async () => {
			const nodeIds = ["node-1", "node-2", "node-3"];
			mockApi.getNodesByTag.mockReturnValue(() =>
				Promise.resolve(E.right(nodeIds)),
			);

			const result = await runTE(getNodesByTag("ws-1", "rust"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(nodeIds);
			}
			expect(mockApi.getNodesByTag).toHaveBeenCalledWith("ws-1", "rust");
		});
	});

	// ==========================================================================
	// getTagGraphData
	// ==========================================================================

	describe("getTagGraphData", () => {
		it("should return Right with graph data on success", async () => {
			const graphData = createTestTagGraphData();
			mockApi.getTagGraphData.mockReturnValue(() =>
				Promise.resolve(E.right(graphData)),
			);

			const result = await runTE(getTagGraphData("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.nodes).toHaveLength(2);
				expect(result.right.edges).toHaveLength(1);
			}
			expect(mockApi.getTagGraphData).toHaveBeenCalledWith("ws-1");
		});
	});

	// ==========================================================================
	// createTag
	// ==========================================================================

	describe("createTag", () => {
		it("should return Right with created tag on success", async () => {
			const testTag = createTestTagResponse({ name: "newtag" });
			mockApi.createTag.mockReturnValue(() =>
				Promise.resolve(E.right(testTag)),
			);

			const result = await runTE(
				createTag({
					name: "newtag",
					workspace: "ws-1",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.name).toBe("newtag");
			}
			expect(mockApi.createTag).toHaveBeenCalledTimes(1);
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to create tag" };
			mockApi.createTag.mockReturnValue(() => Promise.resolve(E.left(error)));

			const result = await runTE(
				createTag({
					name: "newtag",
					workspace: "ws-1",
				}),
			);

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// updateTag
	// ==========================================================================

	describe("updateTag", () => {
		it("should return Right with updated tag on success", async () => {
			const testTag = createTestTagResponse({ name: "updated-name" });
			mockApi.updateTag.mockReturnValue(() =>
				Promise.resolve(E.right(testTag)),
			);

			const result = await runTE(
				updateTag("ws-1:rust", {
					name: "updated-name",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.name).toBe("updated-name");
			}
			expect(mockApi.updateTag).toHaveBeenCalledTimes(1);
		});
	});

	// ==========================================================================
	// getOrCreateTag
	// ==========================================================================

	describe("getOrCreateTag", () => {
		it("should return Right with tag on success", async () => {
			const testTag = createTestTagResponse({ name: "rust", count: 2 });
			mockApi.getOrCreateTag.mockReturnValue(() =>
				Promise.resolve(E.right(testTag)),
			);

			const result = await runTE(getOrCreateTag("ws-1", "rust"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.name).toBe("rust");
			}
			expect(mockApi.getOrCreateTag).toHaveBeenCalledWith("ws-1", "rust");
		});
	});

	// ==========================================================================
	// incrementTagCount
	// ==========================================================================

	describe("incrementTagCount", () => {
		it("should return Right with updated tag on success", async () => {
			const testTag = createTestTagResponse({ count: 6 });
			mockApi.incrementTagCount.mockReturnValue(() =>
				Promise.resolve(E.right(testTag)),
			);

			const result = await runTE(incrementTagCount("ws-1:rust"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.count).toBe(6);
			}
			expect(mockApi.incrementTagCount).toHaveBeenCalledWith("ws-1:rust");
		});
	});

	// ==========================================================================
	// decrementTagCount
	// ==========================================================================

	describe("decrementTagCount", () => {
		it("should return Right with updated tag on success", async () => {
			const testTag = createTestTagResponse({ count: 4 });
			mockApi.decrementTagCount.mockReturnValue(() =>
				Promise.resolve(E.right(testTag)),
			);

			const result = await runTE(decrementTagCount("ws-1:rust"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.count).toBe(4);
			}
			expect(mockApi.decrementTagCount).toHaveBeenCalledWith("ws-1:rust");
		});
	});

	// ==========================================================================
	// deleteTag
	// ==========================================================================

	describe("deleteTag", () => {
		it("should return Right on successful deletion", async () => {
			mockApi.deleteTag.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const result = await runTE(deleteTag("ws-1:rust"));

			expect(E.isRight(result)).toBe(true);
			expect(mockApi.deleteTag).toHaveBeenCalledWith("ws-1:rust");
		});
	});

	// ==========================================================================
	// deleteTagsByWorkspace
	// ==========================================================================

	describe("deleteTagsByWorkspace", () => {
		it("should return Right with deleted count on success", async () => {
			mockApi.deleteTagsByWorkspace.mockReturnValue(() =>
				Promise.resolve(E.right(5)),
			);

			const result = await runTE(deleteTagsByWorkspace("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(5);
			}
			expect(mockApi.deleteTagsByWorkspace).toHaveBeenCalledWith("ws-1");
		});
	});

	// ==========================================================================
	// syncTagCache
	// ==========================================================================

	describe("syncTagCache", () => {
		it("should return Right on successful sync", async () => {
			mockApi.syncTagCache.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const result = await runTE(syncTagCache("ws-1"));

			expect(E.isRight(result)).toBe(true);
			expect(mockApi.syncTagCache).toHaveBeenCalledWith("ws-1");
		});
	});

	// ==========================================================================
	// rebuildTagCache
	// ==========================================================================

	describe("rebuildTagCache", () => {
		it("should return Right on successful rebuild", async () => {
			mockApi.rebuildTagCache.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const result = await runTE(rebuildTagCache("ws-1"));

			expect(E.isRight(result)).toBe(true);
			expect(mockApi.rebuildTagCache).toHaveBeenCalledWith("ws-1");
		});
	});

	// ==========================================================================
	// recalculateTagCounts
	// ==========================================================================

	describe("recalculateTagCounts", () => {
		it("should return Right on successful recalculation", async () => {
			mockApi.recalculateTagCounts.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const result = await runTE(recalculateTagCounts("ws-1"));

			expect(E.isRight(result)).toBe(true);
			expect(mockApi.recalculateTagCounts).toHaveBeenCalledWith("ws-1");
		});
	});
});
