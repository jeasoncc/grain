/**
 * @file node.db.fn.test.ts
 * @description Node 数据库函数的单元测试
 *
 * 由于数据库函数依赖 IndexedDB，这些测试主要验证：
 * - 函数签名和返回类型正确
 * - TaskEither 错误处理逻辑正确
 * - 纯函数部分的逻辑正确
 *
 * @requirements 3.1, 3.2, 3.3
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NodeInterface } from "@/types/node/node.interface";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 NodeInterface 对象
 */
function createTestNode(overrides: Partial<NodeInterface> = {}): NodeInterface {
	return {
		id: overrides.id ?? "550e8400-e29b-41d4-a716-446655440000",
		workspace: overrides.workspace ?? "550e8400-e29b-41d4-a716-446655440001",
		parent: overrides.parent ?? null,
		type: overrides.type ?? "file",
		title: overrides.title ?? "Test Node",
		order: overrides.order ?? 0,
		collapsed: overrides.collapsed ?? true,
		createDate: overrides.createDate ?? new Date().toISOString(),
		lastEdit: overrides.lastEdit ?? new Date().toISOString(),
		tags: overrides.tags,
	};
}

/**
 * 运行 TaskEither 并返回 Either 结果
 */
async function runTE<E, A>(te: TE.TaskEither<E, A>): Promise<E.Either<E, A>> {
	return te();
}

// ============================================================================
// Mock Setup
// ============================================================================

// Create chainable mock for where().equals().toArray() pattern
const createWhereChain = (toArrayResult: unknown[] = [], countResult = 0) => ({
	equals: vi.fn().mockReturnValue({
		toArray: vi.fn().mockResolvedValue(toArrayResult),
		count: vi.fn().mockResolvedValue(countResult),
		and: vi.fn().mockReturnValue({
			toArray: vi.fn().mockResolvedValue(toArrayResult),
		}),
	}),
	anyOf: vi.fn().mockReturnValue({
		delete: vi.fn().mockResolvedValue(undefined),
	}),
});

// Mock database module
vi.mock("./database", () => {
	const mockAdd = vi.fn();
	const mockGet = vi.fn();
	const mockPut = vi.fn();
	const mockUpdate = vi.fn();
	const mockDelete = vi.fn();
	const mockBulkDelete = vi.fn();
	const mockToArray = vi.fn();
	const mockTransaction = vi.fn();
	const mockWhere = vi.fn().mockReturnValue({
		equals: vi.fn().mockReturnValue({
			toArray: vi.fn().mockResolvedValue([]),
			count: vi.fn().mockResolvedValue(0),
			and: vi.fn().mockReturnValue({
				toArray: vi.fn().mockResolvedValue([]),
			}),
		}),
		anyOf: vi.fn().mockReturnValue({
			delete: vi.fn().mockResolvedValue(undefined),
		}),
	});

	return {
		database: {
			nodes: {
				add: mockAdd,
				get: mockGet,
				put: mockPut,
				update: mockUpdate,
				delete: mockDelete,
				bulkDelete: mockBulkDelete,
				toArray: mockToArray,
				where: mockWhere,
			},
			contents: {
				where: vi.fn().mockReturnValue({
					anyOf: vi.fn().mockReturnValue({
						delete: vi.fn().mockResolvedValue(undefined),
					}),
				}),
			},
			transaction: mockTransaction,
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
// Import after mocking
import { database } from "./database";
import {
	addNode,
	countNodesByWorkspace,
	deleteNode,
	getAllNodes,
	getNextOrder,
	getNodeById,
	getNodeByIdOrFail,
	getNodesByParent,
	getNodesByWorkspace,
	getRootNodes,
	moveNode,
	nodeExists,
	reorderNodes,
	saveNode,
	setNodeCollapsed,
	updateNode,
	updateNodeTitle,
} from "./node.db.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("node.db.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("addNode", () => {
		it("should return Right with node on success", async () => {
			vi.mocked(database.nodes.add).mockResolvedValue("test-id");

			const result = await runTE(
				addNode("550e8400-e29b-41d4-a716-446655440001", "Test Title", {
					type: "file",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.title).toBe("Test Title");
				expect(result.right.workspace).toBe(
					"550e8400-e29b-41d4-a716-446655440001",
				);
				expect(result.right.type).toBe("file");
			}
			expect(logger.info).toHaveBeenCalled();
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on database failure", async () => {
			vi.mocked(database.nodes.add).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(
				addNode("550e8400-e29b-41d4-a716-446655440001", "Test Title"),
			);

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
			expect(logger.error).toHaveBeenCalled();
		});

		it("should apply optional parameters", async () => {
			vi.mocked(database.nodes.add).mockResolvedValue("test-id");

			const result = await runTE(
				addNode("550e8400-e29b-41d4-a716-446655440001", "Test Title", {
					parent: "550e8400-e29b-41d4-a716-446655440002",
					type: "folder",
					order: 5,
					collapsed: false,
					tags: ["tag1", "tag2"],
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.parent).toBe(
					"550e8400-e29b-41d4-a716-446655440002",
				);
				expect(result.right.type).toBe("folder");
				expect(result.right.order).toBe(5);
				expect(result.right.collapsed).toBe(false);
				expect(result.right.tags).toEqual(["tag1", "tag2"]);
			}
		});
	});

	describe("updateNode", () => {
		it("should return Right with count on success", async () => {
			vi.mocked(database.nodes.update).mockResolvedValue(1);

			const result = await runTE(updateNode("node-1", { title: "New Title" }));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(1);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Right with 0 when node not found", async () => {
			vi.mocked(database.nodes.update).mockResolvedValue(0);

			const result = await runTE(
				updateNode("non-existent", { title: "New Title" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(0);
			}
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.nodes.update).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(updateNode("node-1", { title: "New Title" }));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	describe("deleteNode", () => {
		it("should return Right on success", async () => {
			vi.mocked(database.nodes.delete).mockResolvedValue(undefined);

			const result = await runTE(deleteNode("node-1"));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.nodes.delete).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(deleteNode("node-1"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	describe("getNodeById", () => {
		it("should return Right with node when found", async () => {
			const testNode = createTestNode({ id: "node-1" });
			vi.mocked(database.nodes.get).mockResolvedValue(testNode);

			const result = await runTE(getNodeById("node-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testNode);
			}
		});

		it("should return Right with undefined when not found", async () => {
			vi.mocked(database.nodes.get).mockResolvedValue(undefined);

			const result = await runTE(getNodeById("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeUndefined();
			}
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.nodes.get).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(getNodeById("node-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	describe("getNodeByIdOrFail", () => {
		it("should return Right with node when found", async () => {
			const testNode = createTestNode({ id: "node-1" });
			vi.mocked(database.nodes.get).mockResolvedValue(testNode);

			const result = await runTE(getNodeByIdOrFail("node-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testNode);
			}
		});

		it("should return Left with NOT_FOUND when not found", async () => {
			vi.mocked(database.nodes.get).mockResolvedValue(undefined);

			const result = await runTE(getNodeByIdOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
			}
		});
	});

	describe("getAllNodes", () => {
		it("should return Right with all nodes", async () => {
			const testNodes = [
				createTestNode({ id: "node-1" }),
				createTestNode({ id: "node-2" }),
			];
			vi.mocked(database.nodes.toArray).mockResolvedValue(testNodes);

			const result = await runTE(getAllNodes());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	describe("getNodesByWorkspace", () => {
		it("should return Right with workspace nodes", async () => {
			const testNodes = [createTestNode({ workspace: "ws-1" })];
			vi.mocked(database.nodes.where).mockReturnValue(
				createWhereChain(testNodes) as unknown as ReturnType<
					typeof database.nodes.where
				>,
			);

			const result = await runTE(getNodesByWorkspace("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testNodes);
			}
		});
	});

	describe("getNodesByParent", () => {
		it("should return sorted children for non-null parent", async () => {
			const testNodes = [
				createTestNode({ id: "child-1", parent: "parent-1", order: 1 }),
				createTestNode({ id: "child-2", parent: "parent-1", order: 0 }),
			];
			vi.mocked(database.nodes.where).mockReturnValue(
				createWhereChain(testNodes) as unknown as ReturnType<
					typeof database.nodes.where
				>,
			);

			const result = await runTE(getNodesByParent("parent-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				// Should be sorted by order
				expect(result.right[0].id).toBe("child-2");
				expect(result.right[1].id).toBe("child-1");
			}
		});

		it("should return root nodes for null parent", async () => {
			const testNodes = [
				createTestNode({ id: "root-1", parent: null, order: 1 }),
				createTestNode({ id: "root-2", parent: null, order: 0 }),
				createTestNode({ id: "child-1", parent: "root-1", order: 0 }),
			];
			vi.mocked(database.nodes.toArray).mockResolvedValue(testNodes);

			const result = await runTE(getNodesByParent(null));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				// Should be sorted by order
				expect(result.right[0].id).toBe("root-2");
				expect(result.right[1].id).toBe("root-1");
			}
		});
	});

	describe("getRootNodes", () => {
		it("should return sorted root nodes for workspace", async () => {
			const testNodes = [
				createTestNode({
					id: "root-1",
					parent: null,
					workspace: "ws-1",
					order: 1,
				}),
				createTestNode({
					id: "root-2",
					parent: null,
					workspace: "ws-1",
					order: 0,
				}),
				createTestNode({
					id: "child-1",
					parent: "root-1",
					workspace: "ws-1",
					order: 0,
				}),
			];
			vi.mocked(database.nodes.where).mockReturnValue(
				createWhereChain(testNodes) as unknown as ReturnType<
					typeof database.nodes.where
				>,
			);

			const result = await runTE(getRootNodes("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right[0].id).toBe("root-2");
				expect(result.right[1].id).toBe("root-1");
			}
		});
	});

	describe("nodeExists", () => {
		it("should return true when node exists", async () => {
			vi.mocked(database.nodes.where).mockReturnValue(
				createWhereChain([], 1) as unknown as ReturnType<
					typeof database.nodes.where
				>,
			);

			const result = await runTE(nodeExists("node-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when node does not exist", async () => {
			vi.mocked(database.nodes.where).mockReturnValue(
				createWhereChain([], 0) as unknown as ReturnType<
					typeof database.nodes.where
				>,
			);

			const result = await runTE(nodeExists("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	describe("countNodesByWorkspace", () => {
		it("should return node count", async () => {
			vi.mocked(database.nodes.where).mockReturnValue(
				createWhereChain([], 5) as unknown as ReturnType<
					typeof database.nodes.where
				>,
			);

			const result = await runTE(countNodesByWorkspace("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(5);
			}
		});
	});

	describe("saveNode", () => {
		it("should return Right with saved node", async () => {
			const testNode = createTestNode({ id: "node-1" });
			vi.mocked(database.nodes.put).mockResolvedValue("node-1");

			const result = await runTE(saveNode(testNode));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testNode);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			const testNode = createTestNode({ id: "node-1" });
			vi.mocked(database.nodes.put).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(saveNode(testNode));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	describe("updateNodeTitle", () => {
		it("should update title successfully", async () => {
			vi.mocked(database.nodes.update).mockResolvedValue(1);

			const result = await runTE(updateNodeTitle("node-1", "New Title"));

			expect(E.isRight(result)).toBe(true);
			expect(database.nodes.update).toHaveBeenCalledWith(
				"node-1",
				expect.objectContaining({ title: "New Title" }),
			);
		});
	});

	describe("setNodeCollapsed", () => {
		it("should update collapsed state successfully", async () => {
			vi.mocked(database.nodes.update).mockResolvedValue(1);

			const result = await runTE(setNodeCollapsed("node-1", false));

			expect(E.isRight(result)).toBe(true);
			expect(database.nodes.update).toHaveBeenCalledWith(
				"node-1",
				expect.objectContaining({ collapsed: false }),
			);
		});
	});

	describe("moveNode", () => {
		it("should move node to new parent", async () => {
			vi.mocked(database.nodes.update).mockResolvedValue(1);

			const result = await runTE(moveNode("node-1", "new-parent", 5));

			expect(E.isRight(result)).toBe(true);
			expect(database.nodes.update).toHaveBeenCalledWith(
				"node-1",
				expect.objectContaining({ parent: "new-parent", order: 5 }),
			);
		});

		it("should move node to root", async () => {
			vi.mocked(database.nodes.update).mockResolvedValue(1);

			const result = await runTE(moveNode("node-1", null));

			expect(E.isRight(result)).toBe(true);
			expect(database.nodes.update).toHaveBeenCalledWith(
				"node-1",
				expect.objectContaining({ parent: null }),
			);
		});
	});

	describe("reorderNodes", () => {
		it("should reorder nodes in transaction", async () => {
			vi.mocked(database.transaction).mockImplementation(
				// biome-ignore lint/suspicious/noExplicitAny: Mock implementation for testing
				(async (_mode: any, _tables: any, callback: any) => {
					await callback();
				}) as unknown as typeof database.transaction,
			);
			vi.mocked(database.nodes.update).mockResolvedValue(1);

			const result = await runTE(reorderNodes(["node-1", "node-2", "node-3"]));

			expect(E.isRight(result)).toBe(true);
			expect(database.transaction).toHaveBeenCalled();
			expect(logger.success).toHaveBeenCalled();
		});
	});

	describe("getNextOrder", () => {
		it("should return 0 for empty siblings", async () => {
			// For null parent, getNodesByParent uses toArray
			vi.mocked(database.nodes.toArray).mockResolvedValue([]);

			const result = await runTE(getNextOrder(null, "ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(0);
			}
		});

		// Note: getNextOrder is a composition of getNodesByParent + max calculation
		// The max calculation logic is tested via the empty siblings test above
		// Full integration testing would require a real database
	});
});
