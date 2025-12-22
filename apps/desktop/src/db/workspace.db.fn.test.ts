/**
 * @file workspace.db.fn.test.ts
 * @description Workspace 数据库函数的单元测试
 *
 * 测试覆盖：
 * - 基础 CRUD 操作
 * - 查询操作
 * - 辅助操作
 * - 级联删除
 *
 * @requirements 3.1, 3.2, 3.3
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceInterface } from "@/types/workspace/workspace.interface";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 WorkspaceInterface 对象
 */
function createTestWorkspace(
	overrides: Partial<WorkspaceInterface> = {},
): WorkspaceInterface {
	return {
		id: overrides.id ?? "550e8400-e29b-41d4-a716-446655440000",
		title: overrides.title ?? "Test Workspace",
		author: overrides.author ?? "Test Author",
		description: overrides.description ?? "Test Description",
		publisher: overrides.publisher ?? "",
		language: overrides.language ?? "zh-CN",
		createDate: overrides.createDate ?? new Date().toISOString(),
		lastOpen: overrides.lastOpen ?? new Date().toISOString(),
		members: overrides.members ?? [],
		owner: overrides.owner ?? "user-1",
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

const createWhereChain = (toArrayResult: unknown[] = [], countResult = 0) => ({
	equals: vi.fn().mockReturnValue({
		toArray: vi.fn().mockResolvedValue(toArrayResult),
		count: vi.fn().mockResolvedValue(countResult),
	}),
});

vi.mock("./database", () => {
	const mockAdd = vi.fn();
	const mockGet = vi.fn();
	const mockPut = vi.fn();
	const mockUpdate = vi.fn();
	const mockDelete = vi.fn();
	const mockToArray = vi.fn();
	const mockTransaction = vi.fn();
	const mockWhere = vi.fn().mockReturnValue({
		equals: vi.fn().mockReturnValue({
			toArray: vi.fn().mockResolvedValue([]),
			count: vi.fn().mockResolvedValue(0),
			delete: vi.fn().mockResolvedValue(0),
		}),
	});

	return {
		database: {
			workspaces: {
				add: mockAdd,
				get: mockGet,
				put: mockPut,
				update: mockUpdate,
				delete: mockDelete,
				toArray: mockToArray,
				where: mockWhere,
				count: vi.fn(),
			},
			nodes: {
				where: vi.fn().mockReturnValue({
					equals: vi.fn().mockReturnValue({
						toArray: vi.fn().mockResolvedValue([]),
						delete: vi.fn().mockResolvedValue(0),
					}),
				}),
			},
			contents: {
				where: vi.fn().mockReturnValue({
					anyOf: vi.fn().mockReturnValue({
						delete: vi.fn().mockResolvedValue(0),
					}),
				}),
			},
			drawings: {
				where: vi.fn().mockReturnValue({
					equals: vi.fn().mockReturnValue({
						delete: vi.fn().mockResolvedValue(0),
					}),
				}),
			},
			attachments: {
				where: vi.fn().mockReturnValue({
					equals: vi.fn().mockReturnValue({
						delete: vi.fn().mockResolvedValue(0),
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
import { database } from "./database";
import {
	addWorkspace,
	countWorkspaces,
	deleteWorkspace,
	getAllWorkspaces,
	getWorkspaceById,
	getWorkspaceByIdOrFail,
	saveWorkspace,
	searchWorkspacesByTitle,
	touchWorkspace,
	updateWorkspace,
	updateWorkspaceTitle,
	workspaceExists,
} from "./workspace.db.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("workspace.db.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// addWorkspace
	// ==========================================================================

	describe("addWorkspace", () => {
		it("should return Right with workspace on success", async () => {
			vi.mocked(database.workspaces.add).mockResolvedValue("test-id");

			const result = await runTE(addWorkspace("Test Workspace"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.title).toBe("Test Workspace");
			}
			expect(logger.info).toHaveBeenCalled();
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on database failure", async () => {
			vi.mocked(database.workspaces.add).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(addWorkspace("Test Workspace"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
			expect(logger.error).toHaveBeenCalled();
		});

		it("should apply optional parameters", async () => {
			vi.mocked(database.workspaces.add).mockResolvedValue("test-id");

			const result = await runTE(
				addWorkspace("Test Workspace", {
					author: "Test Author",
					description: "Test Description",
					language: "en",
					owner: "user-123",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.author).toBe("Test Author");
				expect(result.right.description).toBe("Test Description");
				expect(result.right.language).toBe("en");
				expect(result.right.owner).toBe("user-123");
			}
		});
	});

	// ==========================================================================
	// updateWorkspace
	// ==========================================================================

	describe("updateWorkspace", () => {
		it("should return Right with count on success", async () => {
			vi.mocked(database.workspaces.update).mockResolvedValue(1);

			const result = await runTE(
				updateWorkspace("ws-1", { title: "New Title" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(1);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Right with 0 when workspace not found", async () => {
			vi.mocked(database.workspaces.update).mockResolvedValue(0);

			const result = await runTE(
				updateWorkspace("non-existent", { title: "New Title" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(0);
			}
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.workspaces.update).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(
				updateWorkspace("ws-1", { title: "New Title" }),
			);

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// deleteWorkspace
	// ==========================================================================

	describe("deleteWorkspace", () => {
		it("should return Right on success", async () => {
			vi.mocked(database.workspaces.delete).mockResolvedValue(undefined);

			const result = await runTE(deleteWorkspace("ws-1"));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.workspaces.delete).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(deleteWorkspace("ws-1"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// getWorkspaceById
	// ==========================================================================

	describe("getWorkspaceById", () => {
		it("should return Right with workspace when found", async () => {
			const testWorkspace = createTestWorkspace({ id: "ws-1" });
			vi.mocked(database.workspaces.get).mockResolvedValue(testWorkspace);

			const result = await runTE(getWorkspaceById("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testWorkspace);
			}
		});

		it("should return Right with undefined when not found", async () => {
			vi.mocked(database.workspaces.get).mockResolvedValue(undefined);

			const result = await runTE(getWorkspaceById("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeUndefined();
			}
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.workspaces.get).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(getWorkspaceById("ws-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// getWorkspaceByIdOrFail
	// ==========================================================================

	describe("getWorkspaceByIdOrFail", () => {
		it("should return Right with workspace when found", async () => {
			const testWorkspace = createTestWorkspace({ id: "ws-1" });
			vi.mocked(database.workspaces.get).mockResolvedValue(testWorkspace);

			const result = await runTE(getWorkspaceByIdOrFail("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testWorkspace);
			}
		});

		it("should return Left with NOT_FOUND when not found", async () => {
			vi.mocked(database.workspaces.get).mockResolvedValue(undefined);

			const result = await runTE(getWorkspaceByIdOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
			}
		});
	});

	// ==========================================================================
	// getAllWorkspaces
	// ==========================================================================

	describe("getAllWorkspaces", () => {
		it("should return Right with all workspaces sorted by lastOpen", async () => {
			const testWorkspaces = [
				createTestWorkspace({
					id: "ws-1",
					lastOpen: "2024-01-01T00:00:00.000Z",
				}),
				createTestWorkspace({
					id: "ws-2",
					lastOpen: "2024-01-02T00:00:00.000Z",
				}),
			];
			vi.mocked(database.workspaces.toArray).mockResolvedValue(testWorkspaces);

			const result = await runTE(getAllWorkspaces());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				// 最近打开的在前
				expect(result.right[0].id).toBe("ws-2");
				expect(result.right[1].id).toBe("ws-1");
			}
		});
	});

	// ==========================================================================
	// searchWorkspacesByTitle
	// ==========================================================================

	describe("searchWorkspacesByTitle", () => {
		it("should return matching workspaces", async () => {
			const testWorkspaces = [
				createTestWorkspace({ id: "ws-1", title: "My Novel" }),
				createTestWorkspace({ id: "ws-2", title: "Another Project" }),
				createTestWorkspace({ id: "ws-3", title: "Novel Draft" }),
			];
			vi.mocked(database.workspaces.toArray).mockResolvedValue(testWorkspaces);

			const result = await runTE(searchWorkspacesByTitle("novel"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right.map((w) => w.id)).toContain("ws-1");
				expect(result.right.map((w) => w.id)).toContain("ws-3");
			}
		});

		it("should return empty array when no matches", async () => {
			const testWorkspaces = [
				createTestWorkspace({ id: "ws-1", title: "My Novel" }),
			];
			vi.mocked(database.workspaces.toArray).mockResolvedValue(testWorkspaces);

			const result = await runTE(searchWorkspacesByTitle("xyz"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(0);
			}
		});
	});

	// ==========================================================================
	// workspaceExists
	// ==========================================================================

	describe("workspaceExists", () => {
		it("should return true when workspace exists", async () => {
			vi.mocked(database.workspaces.where).mockReturnValue(
				createWhereChain([], 1) as unknown as ReturnType<
					typeof database.workspaces.where
				>,
			);

			const result = await runTE(workspaceExists("ws-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when workspace does not exist", async () => {
			vi.mocked(database.workspaces.where).mockReturnValue(
				createWhereChain([], 0) as unknown as ReturnType<
					typeof database.workspaces.where
				>,
			);

			const result = await runTE(workspaceExists("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	// ==========================================================================
	// countWorkspaces
	// ==========================================================================

	describe("countWorkspaces", () => {
		it("should return workspace count", async () => {
			vi.mocked(database.workspaces.count).mockResolvedValue(5);

			const result = await runTE(countWorkspaces());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(5);
			}
		});
	});

	// ==========================================================================
	// saveWorkspace
	// ==========================================================================

	describe("saveWorkspace", () => {
		it("should return Right with saved workspace", async () => {
			const testWorkspace = createTestWorkspace({ id: "ws-1" });
			vi.mocked(database.workspaces.put).mockResolvedValue("ws-1");

			const result = await runTE(saveWorkspace(testWorkspace));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testWorkspace);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			const testWorkspace = createTestWorkspace({ id: "ws-1" });
			vi.mocked(database.workspaces.put).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(saveWorkspace(testWorkspace));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// updateWorkspaceTitle
	// ==========================================================================

	describe("updateWorkspaceTitle", () => {
		it("should update title successfully", async () => {
			vi.mocked(database.workspaces.update).mockResolvedValue(1);

			const result = await runTE(updateWorkspaceTitle("ws-1", "New Title"));

			expect(E.isRight(result)).toBe(true);
			expect(database.workspaces.update).toHaveBeenCalledWith(
				"ws-1",
				expect.objectContaining({ title: "New Title" }),
			);
		});
	});

	// ==========================================================================
	// touchWorkspace
	// ==========================================================================

	describe("touchWorkspace", () => {
		it("should update lastOpen timestamp", async () => {
			vi.mocked(database.workspaces.update).mockResolvedValue(1);

			const result = await runTE(touchWorkspace("ws-1"));

			expect(E.isRight(result)).toBe(true);
			expect(database.workspaces.update).toHaveBeenCalledWith(
				"ws-1",
				expect.objectContaining({ lastOpen: expect.any(String) }),
			);
		});
	});
});
