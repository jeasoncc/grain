/**
 * @file content.db.fn.test.ts
 * @description Content 数据库函数的单元测试
 *
 * 测试覆盖：
 * - 基础 CRUD 操作
 * - 按节点 ID 查询和更新
 * - 批量操作
 *
 * @requirements 3.1, 3.2, 3.3
 */

import dayjs from "dayjs";
import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentInterface } from "@/types/content/content.interface";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 ContentInterface 对象
 */
function createTestContent(
	overrides: Partial<ContentInterface> = {},
): ContentInterface {
	return {
		id: overrides.id ?? "550e8400-e29b-41d4-a716-446655440000",
		nodeId: overrides.nodeId ?? "550e8400-e29b-41d4-a716-446655440001",
		content: overrides.content ?? '{"root":{"children":[]}}',
		contentType: overrides.contentType ?? "lexical",
		lastEdit: overrides.lastEdit ?? dayjs().toISOString(),
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
	firstResult: unknown = undefined,
	toArrayResult: unknown[] = [],
	countResult = 0,
) => ({
	equals: vi.fn().mockReturnValue({
		first: vi.fn().mockResolvedValue(firstResult),
		toArray: vi.fn().mockResolvedValue(toArrayResult),
		count: vi.fn().mockResolvedValue(countResult),
		delete: vi.fn().mockResolvedValue(countResult),
	}),
	anyOf: vi.fn().mockReturnValue({
		toArray: vi.fn().mockResolvedValue(toArrayResult),
		delete: vi.fn().mockResolvedValue(countResult),
	}),
});

vi.mock("./database", () => {
	const mockAdd = vi.fn();
	const mockGet = vi.fn();
	const mockPut = vi.fn();
	const mockUpdate = vi.fn();
	const mockDelete = vi.fn();
	const mockBulkPut = vi.fn();
	const mockBulkDelete = vi.fn();
	const mockToArray = vi.fn();
	const mockCount = vi.fn();
	const mockWhere = vi.fn().mockReturnValue({
		equals: vi.fn().mockReturnValue({
			first: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
			count: vi.fn().mockResolvedValue(0),
			delete: vi.fn().mockResolvedValue(0),
		}),
		anyOf: vi.fn().mockReturnValue({
			toArray: vi.fn().mockResolvedValue([]),
			delete: vi.fn().mockResolvedValue(0),
		}),
	});

	return {
		database: {
			contents: {
				add: mockAdd,
				get: mockGet,
				put: mockPut,
				update: mockUpdate,
				delete: mockDelete,
				bulkPut: mockBulkPut,
				bulkDelete: mockBulkDelete,
				toArray: mockToArray,
				count: mockCount,
				where: mockWhere,
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
import {
	addContent,
	contentExistsForNode,
	countContents,
	deleteContent,
	deleteContentByNodeId,
	deleteContents,
	getAllContents,
	getContentById,
	getContentByIdOrFail,
	getContentByNodeId,
	getContentByNodeIdOrFail,
	getContentsByNodeIds,
	saveContent,
	saveContents,
	updateContent,
} from "./content.db.fn";
import { database } from "./database";

// ============================================================================
// Unit Tests
// ============================================================================

describe("content.db.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// addContent
	// ==========================================================================

	describe("addContent", () => {
		it("should return Right with content on success", async () => {
			vi.mocked(database.contents.add).mockResolvedValue("test-id");

			const result = await runTE(addContent("node-1", '{"root":{}}'));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.nodeId).toBe("node-1");
				expect(result.right.content).toBe('{"root":{}}');
				expect(result.right.contentType).toBe("lexical");
			}
			expect(logger.info).toHaveBeenCalled();
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on database failure", async () => {
			vi.mocked(database.contents.add).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(addContent("node-1", ""));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
			expect(logger.error).toHaveBeenCalled();
		});

		it("should use default empty content", async () => {
			vi.mocked(database.contents.add).mockResolvedValue("test-id");

			const result = await runTE(addContent("node-1", ""));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.content).toBe("");
			}
		});

		it("should accept custom content type", async () => {
			vi.mocked(database.contents.add).mockResolvedValue("test-id");

			const result = await runTE(addContent("node-1", "plain text", "text"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.contentType).toBe("text");
			}
		});
	});

	// ==========================================================================
	// updateContent
	// ==========================================================================

	describe("updateContent", () => {
		it("should return Right with count on success", async () => {
			vi.mocked(database.contents.update).mockResolvedValue(1);

			const result = await runTE(
				updateContent("content-1", { content: "new content" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(1);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Right with 0 when content not found", async () => {
			vi.mocked(database.contents.update).mockResolvedValue(0);

			const result = await runTE(
				updateContent("non-existent", { content: "new content" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(0);
			}
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.contents.update).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(
				updateContent("content-1", { content: "new content" }),
			);

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// deleteContent
	// ==========================================================================

	describe("deleteContent", () => {
		it("should return Right on success", async () => {
			vi.mocked(database.contents.delete).mockResolvedValue(undefined);

			const result = await runTE(deleteContent("content-1"));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.contents.delete).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(deleteContent("content-1"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// deleteContentByNodeId
	// ==========================================================================

	describe("deleteContentByNodeId", () => {
		it("should delete content by node ID", async () => {
			vi.mocked(database.contents.where).mockReturnValue(
				createWhereChain(undefined, [], 1) as unknown as ReturnType<
					typeof database.contents.where
				>,
			);

			const result = await runTE(deleteContentByNodeId("node-1"));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// getContentById
	// ==========================================================================

	describe("getContentById", () => {
		it("should return Right with content when found", async () => {
			const testContent = createTestContent({ id: "content-1" });
			vi.mocked(database.contents.get).mockResolvedValue(testContent);

			const result = await runTE(getContentById("content-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testContent);
			}
		});

		it("should return Right with undefined when not found", async () => {
			vi.mocked(database.contents.get).mockResolvedValue(undefined);

			const result = await runTE(getContentById("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeUndefined();
			}
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.contents.get).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(getContentById("content-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// getContentByIdOrFail
	// ==========================================================================

	describe("getContentByIdOrFail", () => {
		it("should return Right with content when found", async () => {
			const testContent = createTestContent({ id: "content-1" });
			vi.mocked(database.contents.get).mockResolvedValue(testContent);

			const result = await runTE(getContentByIdOrFail("content-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testContent);
			}
		});

		it("should return Left with NOT_FOUND when not found", async () => {
			vi.mocked(database.contents.get).mockResolvedValue(undefined);

			const result = await runTE(getContentByIdOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
			}
		});
	});

	// ==========================================================================
	// getContentByNodeId
	// ==========================================================================

	describe("getContentByNodeId", () => {
		it("should return Right with content when found", async () => {
			const testContent = createTestContent({ nodeId: "node-1" });
			vi.mocked(database.contents.where).mockReturnValue(
				createWhereChain(testContent) as unknown as ReturnType<
					typeof database.contents.where
				>,
			);

			const result = await runTE(getContentByNodeId("node-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right?.nodeId).toBe("node-1");
			}
		});

		it("should return Right with undefined when not found", async () => {
			vi.mocked(database.contents.where).mockReturnValue(
				createWhereChain(undefined) as unknown as ReturnType<
					typeof database.contents.where
				>,
			);

			const result = await runTE(getContentByNodeId("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeUndefined();
			}
		});
	});

	// ==========================================================================
	// getContentByNodeIdOrFail
	// ==========================================================================

	describe("getContentByNodeIdOrFail", () => {
		it("should return Left with NOT_FOUND when not found", async () => {
			vi.mocked(database.contents.where).mockReturnValue(
				createWhereChain(undefined) as unknown as ReturnType<
					typeof database.contents.where
				>,
			);

			const result = await runTE(getContentByNodeIdOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
			}
		});
	});

	// ==========================================================================
	// getContentsByNodeIds
	// ==========================================================================

	describe("getContentsByNodeIds", () => {
		it("should return contents for multiple node IDs", async () => {
			const testContents = [
				createTestContent({ nodeId: "node-1" }),
				createTestContent({ nodeId: "node-2" }),
			];
			vi.mocked(database.contents.where).mockReturnValue(
				createWhereChain(undefined, testContents) as unknown as ReturnType<
					typeof database.contents.where
				>,
			);

			const result = await runTE(getContentsByNodeIds(["node-1", "node-2"]));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	// ==========================================================================
	// getAllContents
	// ==========================================================================

	describe("getAllContents", () => {
		it("should return all contents", async () => {
			const testContents = [
				createTestContent({ id: "content-1" }),
				createTestContent({ id: "content-2" }),
			];
			vi.mocked(database.contents.toArray).mockResolvedValue(testContents);

			const result = await runTE(getAllContents());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	// ==========================================================================
	// contentExistsForNode
	// ==========================================================================

	describe("contentExistsForNode", () => {
		it("should return true when content exists", async () => {
			vi.mocked(database.contents.where).mockReturnValue(
				createWhereChain(undefined, [], 1) as unknown as ReturnType<
					typeof database.contents.where
				>,
			);

			const result = await runTE(contentExistsForNode("node-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when content does not exist", async () => {
			vi.mocked(database.contents.where).mockReturnValue(
				createWhereChain(undefined, [], 0) as unknown as ReturnType<
					typeof database.contents.where
				>,
			);

			const result = await runTE(contentExistsForNode("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	// ==========================================================================
	// saveContent
	// ==========================================================================

	describe("saveContent", () => {
		it("should return Right with saved content", async () => {
			const testContent = createTestContent({ id: "content-1" });
			vi.mocked(database.contents.put).mockResolvedValue("content-1");

			const result = await runTE(saveContent(testContent));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testContent);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			const testContent = createTestContent({ id: "content-1" });
			vi.mocked(database.contents.put).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(saveContent(testContent));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// saveContents
	// ==========================================================================

	describe("saveContents", () => {
		it("should save multiple contents", async () => {
			const testContents = [
				createTestContent({ id: "content-1" }),
				createTestContent({ id: "content-2" }),
			];
			vi.mocked(database.contents.bulkPut).mockResolvedValue("" as never);

			const result = await runTE(saveContents(testContents));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// deleteContents
	// ==========================================================================

	describe("deleteContents", () => {
		it("should delete multiple contents", async () => {
			vi.mocked(database.contents.bulkDelete).mockResolvedValue(undefined);

			const result = await runTE(
				deleteContents(["content-1", "content-2", "content-3"]),
			);

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// countContents
	// ==========================================================================

	describe("countContents", () => {
		it("should return content count", async () => {
			vi.mocked(database.contents.count).mockResolvedValue(10);

			const result = await runTE(countContents());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(10);
			}
		});
	});
});
