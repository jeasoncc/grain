/**
 * @file tag.db.fn.test.ts
 * @description Tag 数据库函数的单元测试
 *
 * 测试覆盖：
 * - 基础 CRUD 操作
 * - 缓存同步操作
 * - 标签搜索和图形数据
 *
 * @requirements 3.1, 3.2, 3.3
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TagInterface } from "@/types/tag/tag.interface";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 TagInterface 对象
 */
function createTestTag(overrides: Partial<TagInterface> = {}): TagInterface {
	return {
		id: overrides.id ?? "workspace-1:test-tag",
		name: overrides.name ?? "test-tag",
		workspace: overrides.workspace ?? "workspace-1",
		count: overrides.count ?? 1,
		createDate: overrides.createDate ?? new Date().toISOString(),
		lastUsed: overrides.lastUsed ?? new Date().toISOString(),
	};
}

/**
 * 运行 TaskEither 并返回 Either 结果
 */
async function runTE<Err, A>(
	te: TE.TaskEither<Err, A>,
): Promise<E.Either<Err, A>> {
	return te();
}

// ============================================================================
// Mock Setup
// ============================================================================

const createWhereChain = (
	toArrayResult: unknown[] = [],
	countResult = 0,
	_filterFn?: (item: unknown) => boolean,
) => ({
	equals: vi.fn().mockReturnValue({
		toArray: vi.fn().mockResolvedValue(toArrayResult),
		count: vi.fn().mockResolvedValue(countResult),
		delete: vi.fn().mockResolvedValue(countResult),
		filter: vi.fn().mockImplementation((fn: (item: unknown) => boolean) => ({
			toArray: vi.fn().mockResolvedValue(toArrayResult.filter(fn)),
		})),
		and: vi.fn().mockImplementation((fn: (item: unknown) => boolean) => ({
			toArray: vi.fn().mockResolvedValue(toArrayResult.filter(fn)),
			count: vi.fn().mockResolvedValue(toArrayResult.filter(fn).length),
		})),
	}),
});

vi.mock("./database", () => {
	const mockAdd = vi.fn();
	const mockGet = vi.fn();
	const mockPut = vi.fn();
	const mockUpdate = vi.fn();
	const mockDelete = vi.fn();
	const mockBulkAdd = vi.fn();
	const mockToArray = vi.fn();
	const mockWhere = vi.fn().mockReturnValue({
		equals: vi.fn().mockReturnValue({
			toArray: vi.fn().mockResolvedValue([]),
			count: vi.fn().mockResolvedValue(0),
			delete: vi.fn().mockResolvedValue(0),
			filter: vi.fn().mockReturnValue({
				toArray: vi.fn().mockResolvedValue([]),
			}),
			and: vi.fn().mockReturnValue({
				toArray: vi.fn().mockResolvedValue([]),
				count: vi.fn().mockResolvedValue(0),
			}),
		}),
	});

	return {
		database: {
			tags: {
				add: mockAdd,
				get: mockGet,
				put: mockPut,
				update: mockUpdate,
				delete: mockDelete,
				bulkAdd: mockBulkAdd,
				toArray: mockToArray,
				where: mockWhere,
			},
			nodes: {
				where: vi.fn().mockReturnValue({
					equals: vi.fn().mockReturnValue({
						toArray: vi.fn().mockResolvedValue([]),
						and: vi.fn().mockReturnValue({
							toArray: vi.fn().mockResolvedValue([]),
							count: vi.fn().mockResolvedValue(0),
						}),
					}),
				}),
			},
		},
	};
});

vi.mock("@/log", () => ({
	default: {
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

import logger from "@/log";
import { database } from "./database";
import {
	countTagsByWorkspace,
	deleteTag,
	deleteTagsByWorkspace,
	getNodesByTag,
	getTagById,
	getTagByIdOrFail,
	getTagGraphData,
	getTagsByWorkspace,
	rebuildTagCache,
	saveTag,
	searchTags,
	tagExists,
	upsertTag,
} from "./tag.db.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("tag.db.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// getTagById
	// ==========================================================================

	describe("getTagById", () => {
		it("should return Right with tag when found", async () => {
			const testTag = createTestTag({ id: "workspace-1:test" });
			vi.mocked(database.tags.get).mockResolvedValue(testTag);

			const result = await runTE(getTagById("workspace-1:test"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testTag);
			}
		});

		it("should return Right with undefined when not found", async () => {
			vi.mocked(database.tags.get).mockResolvedValue(undefined);

			const result = await runTE(getTagById("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeUndefined();
			}
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.tags.get).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(getTagById("workspace-1:test"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// getTagByIdOrFail
	// ==========================================================================

	describe("getTagByIdOrFail", () => {
		it("should return Right with tag when found", async () => {
			const testTag = createTestTag({ id: "workspace-1:test" });
			vi.mocked(database.tags.get).mockResolvedValue(testTag);

			const result = await runTE(getTagByIdOrFail("workspace-1:test"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testTag);
			}
		});

		it("should return Left with NOT_FOUND when not found", async () => {
			vi.mocked(database.tags.get).mockResolvedValue(undefined);

			const result = await runTE(getTagByIdOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
			}
		});
	});

	// ==========================================================================
	// getTagsByWorkspace
	// ==========================================================================

	describe("getTagsByWorkspace", () => {
		it("should return tags for workspace", async () => {
			const testTags = [
				createTestTag({ name: "tag1", workspace: "workspace-1" }),
				createTestTag({ name: "tag2", workspace: "workspace-1" }),
			];
			vi.mocked(database.tags.where).mockReturnValue(
				createWhereChain(testTags) as unknown as ReturnType<
					typeof database.tags.where
				>,
			);

			const result = await runTE(getTagsByWorkspace("workspace-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	// ==========================================================================
	// upsertTag
	// ==========================================================================

	describe("upsertTag", () => {
		it("should upsert tag successfully", async () => {
			const testTag = createTestTag();
			vi.mocked(database.tags.put).mockResolvedValue("tag-id");

			const result = await runTE(upsertTag(testTag));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			const testTag = createTestTag();
			vi.mocked(database.tags.put).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(upsertTag(testTag));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// deleteTag
	// ==========================================================================

	describe("deleteTag", () => {
		it("should return Right on success", async () => {
			vi.mocked(database.tags.delete).mockResolvedValue(undefined);

			const result = await runTE(deleteTag("workspace-1:test"));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.tags.delete).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(deleteTag("workspace-1:test"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// deleteTagsByWorkspace
	// ==========================================================================

	describe("deleteTagsByWorkspace", () => {
		it("should delete all tags for workspace", async () => {
			vi.mocked(database.tags.where).mockReturnValue(
				createWhereChain([], 5) as unknown as ReturnType<
					typeof database.tags.where
				>,
			);

			const result = await runTE(deleteTagsByWorkspace("workspace-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(5);
			}
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// searchTags
	// ==========================================================================

	describe("searchTags", () => {
		it("should return matching tags", async () => {
			const testTags = [
				createTestTag({ name: "javascript" }),
				createTestTag({ name: "typescript" }),
				createTestTag({ name: "python" }),
			];
			vi.mocked(database.tags.where).mockReturnValue(
				createWhereChain(testTags) as unknown as ReturnType<
					typeof database.tags.where
				>,
			);

			const result = await runTE(searchTags("workspace-1", "script"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});

		it("should be case insensitive", async () => {
			const testTags = [createTestTag({ name: "JavaScript" })];
			vi.mocked(database.tags.where).mockReturnValue(
				createWhereChain(testTags) as unknown as ReturnType<
					typeof database.tags.where
				>,
			);

			const result = await runTE(searchTags("workspace-1", "JAVA"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(1);
			}
		});
	});

	// ==========================================================================
	// getNodesByTag
	// ==========================================================================

	describe("getNodesByTag", () => {
		it("should return nodes with specified tag", async () => {
			const testNodes = [
				{ id: "node-1", tags: ["test"], workspace: "workspace-1" },
				{ id: "node-2", tags: ["test"], workspace: "workspace-1" },
			];
			vi.mocked(database.nodes.where).mockReturnValue(
				createWhereChain(testNodes) as unknown as ReturnType<
					typeof database.nodes.where
				>,
			);

			const result = await runTE(getNodesByTag("workspace-1", "test"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	// ==========================================================================
	// getTagGraphData
	// ==========================================================================

	describe("getTagGraphData", () => {
		it("should return graph data structure", async () => {
			const testTags = [
				createTestTag({ id: "ws:tag1", name: "tag1", count: 5 }),
				createTestTag({ id: "ws:tag2", name: "tag2", count: 3 }),
			];
			const testNodes = [
				{ id: "node-1", tags: ["tag1", "tag2"], workspace: "workspace-1" },
			];

			vi.mocked(database.tags.where).mockReturnValue(
				createWhereChain(testTags) as unknown as ReturnType<
					typeof database.tags.where
				>,
			);
			vi.mocked(database.nodes.where).mockReturnValue(
				createWhereChain(testNodes) as unknown as ReturnType<
					typeof database.nodes.where
				>,
			);

			const result = await runTE(getTagGraphData("workspace-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.nodes).toHaveLength(2);
				expect(result.right.edges).toBeDefined();
			}
		});
	});

	// ==========================================================================
	// tagExists
	// ==========================================================================

	describe("tagExists", () => {
		it("should return true when tag exists", async () => {
			vi.mocked(database.tags.where).mockReturnValue(
				createWhereChain([], 1) as unknown as ReturnType<
					typeof database.tags.where
				>,
			);

			const result = await runTE(tagExists("workspace-1:test"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when tag does not exist", async () => {
			vi.mocked(database.tags.where).mockReturnValue(
				createWhereChain([], 0) as unknown as ReturnType<
					typeof database.tags.where
				>,
			);

			const result = await runTE(tagExists("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	// ==========================================================================
	// countTagsByWorkspace
	// ==========================================================================

	describe("countTagsByWorkspace", () => {
		it("should return tag count for workspace", async () => {
			vi.mocked(database.tags.where).mockReturnValue(
				createWhereChain([], 10) as unknown as ReturnType<
					typeof database.tags.where
				>,
			);

			const result = await runTE(countTagsByWorkspace("workspace-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(10);
			}
		});
	});

	// ==========================================================================
	// saveTag
	// ==========================================================================

	describe("saveTag", () => {
		it("should return Right with saved tag", async () => {
			const testTag = createTestTag();
			vi.mocked(database.tags.put).mockResolvedValue("tag-id");

			const result = await runTE(saveTag(testTag));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testTag);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			const testTag = createTestTag();
			vi.mocked(database.tags.put).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(saveTag(testTag));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// rebuildTagCache
	// ==========================================================================

	describe("rebuildTagCache", () => {
		it("should rebuild tag cache from nodes", async () => {
			const testNodes = [
				{ id: "node-1", tags: ["tag1", "tag2"], workspace: "workspace-1" },
				{ id: "node-2", tags: ["tag1"], workspace: "workspace-1" },
			];

			vi.mocked(database.nodes.where).mockReturnValue(
				createWhereChain(testNodes) as unknown as ReturnType<
					typeof database.nodes.where
				>,
			);
			vi.mocked(database.tags.where).mockReturnValue(
				createWhereChain([]) as unknown as ReturnType<
					typeof database.tags.where
				>,
			);
			vi.mocked(database.tags.bulkAdd).mockResolvedValue(
				[] as unknown as string,
			);

			const result = await runTE(rebuildTagCache("workspace-1"));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});
	});
});
