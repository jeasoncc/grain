/**
 * @file drawing.db.fn.test.ts
 * @description Drawing 数据库函数的单元测试
 *
 * 测试覆盖：
 * - 基础 CRUD 操作
 * - 按项目查询
 * - 搜索和复制操作
 *
 * @requirements 3.1, 3.2, 3.3
 */

import dayjs from "dayjs";
import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DrawingInterface } from "@/types/drawing/drawing.interface";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 DrawingInterface 对象
 */
function createTestDrawing(
	overrides: Partial<DrawingInterface> = {},
): DrawingInterface {
	return {
		id: overrides.id ?? "550e8400-e29b-41d4-a716-446655440000",
		project: overrides.project ?? "550e8400-e29b-41d4-a716-446655440001",
		name: overrides.name ?? "Test Drawing",
		content: overrides.content ?? "{}",
		width: overrides.width ?? 800,
		height: overrides.height ?? 600,
		createDate: overrides.createDate ?? dayjs().toISOString(),
		updatedAt: overrides.updatedAt ?? dayjs().toISOString(),
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
		delete: vi.fn().mockResolvedValue(countResult),
	}),
});

vi.mock("./database", () => {
	const mockAdd = vi.fn();
	const mockGet = vi.fn();
	const mockPut = vi.fn();
	const mockUpdate = vi.fn();
	const mockDelete = vi.fn();
	const mockToArray = vi.fn();
	const mockCount = vi.fn();
	const mockWhere = vi.fn().mockReturnValue({
		equals: vi.fn().mockReturnValue({
			toArray: vi.fn().mockResolvedValue([]),
			count: vi.fn().mockResolvedValue(0),
			delete: vi.fn().mockResolvedValue(0),
		}),
	});

	return {
		database: {
			drawings: {
				add: mockAdd,
				get: mockGet,
				put: mockPut,
				update: mockUpdate,
				delete: mockDelete,
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
import { database } from "./database";
import {
	addDrawing,
	countAllDrawings,
	countDrawingsByProject,
	deleteDrawing,
	deleteDrawingsByProject,
	drawingExists,
	drawingExistsByName,
	duplicateDrawing,
	getAllDrawings,
	getDrawingById,
	getDrawingByIdOrFail,
	getDrawingsByProject,
	getRecentDrawings,
	saveDrawing,
	searchDrawings,
	updateDrawing,
	updateDrawingContent,
	updateDrawingName,
} from "./drawing.db.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("drawing.db.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// addDrawing
	// ==========================================================================

	describe("addDrawing", () => {
		it("should return Right with drawing on success", async () => {
			vi.mocked(database.drawings.add).mockResolvedValue("test-id");

			const result = await runTE(addDrawing("project-1", "My Drawing"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.project).toBe("project-1");
				expect(result.right.name).toBe("My Drawing");
			}
			expect(logger.info).toHaveBeenCalled();
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on database failure", async () => {
			vi.mocked(database.drawings.add).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(addDrawing("project-1", "My Drawing"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
			expect(logger.error).toHaveBeenCalled();
		});

		it("should apply optional parameters", async () => {
			vi.mocked(database.drawings.add).mockResolvedValue("test-id");

			const result = await runTE(
				addDrawing("project-1", "My Drawing", {
					content: '{"elements":[]}',
					width: 1920,
					height: 1080,
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.content).toBe('{"elements":[]}');
				expect(result.right.width).toBe(1920);
				expect(result.right.height).toBe(1080);
			}
		});
	});

	// ==========================================================================
	// updateDrawing
	// ==========================================================================

	describe("updateDrawing", () => {
		it("should return Right with count on success", async () => {
			vi.mocked(database.drawings.update).mockResolvedValue(1);

			const result = await runTE(
				updateDrawing("drawing-1", { name: "New Name" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(1);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Right with 0 when drawing not found", async () => {
			vi.mocked(database.drawings.update).mockResolvedValue(0);

			const result = await runTE(
				updateDrawing("non-existent", { name: "New Name" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(0);
			}
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.drawings.update).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(
				updateDrawing("drawing-1", { name: "New Name" }),
			);

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// deleteDrawing
	// ==========================================================================

	describe("deleteDrawing", () => {
		it("should return Right on success", async () => {
			vi.mocked(database.drawings.delete).mockResolvedValue(undefined);

			const result = await runTE(deleteDrawing("drawing-1"));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.drawings.delete).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(deleteDrawing("drawing-1"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// deleteDrawingsByProject
	// ==========================================================================

	describe("deleteDrawingsByProject", () => {
		it("should delete all drawings for project", async () => {
			vi.mocked(database.drawings.where).mockReturnValue(
				createWhereChain([], 3) as unknown as ReturnType<
					typeof database.drawings.where
				>,
			);

			const result = await runTE(deleteDrawingsByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(3);
			}
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// getDrawingById
	// ==========================================================================

	describe("getDrawingById", () => {
		it("should return Right with drawing when found", async () => {
			const testDrawing = createTestDrawing({ id: "drawing-1" });
			vi.mocked(database.drawings.get).mockResolvedValue(testDrawing);

			const result = await runTE(getDrawingById("drawing-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testDrawing);
			}
		});

		it("should return Right with undefined when not found", async () => {
			vi.mocked(database.drawings.get).mockResolvedValue(undefined);

			const result = await runTE(getDrawingById("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeUndefined();
			}
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.drawings.get).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(getDrawingById("drawing-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// getDrawingByIdOrFail
	// ==========================================================================

	describe("getDrawingByIdOrFail", () => {
		it("should return Right with drawing when found", async () => {
			const testDrawing = createTestDrawing({ id: "drawing-1" });
			vi.mocked(database.drawings.get).mockResolvedValue(testDrawing);

			const result = await runTE(getDrawingByIdOrFail("drawing-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testDrawing);
			}
		});

		it("should return Left with NOT_FOUND when not found", async () => {
			vi.mocked(database.drawings.get).mockResolvedValue(undefined);

			const result = await runTE(getDrawingByIdOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
			}
		});
	});

	// ==========================================================================
	// getAllDrawings
	// ==========================================================================

	describe("getAllDrawings", () => {
		it("should return all drawings", async () => {
			const testDrawings = [
				createTestDrawing({ id: "drawing-1" }),
				createTestDrawing({ id: "drawing-2" }),
			];
			vi.mocked(database.drawings.toArray).mockResolvedValue(testDrawings);

			const result = await runTE(getAllDrawings());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	// ==========================================================================
	// getDrawingsByProject
	// ==========================================================================

	describe("getDrawingsByProject", () => {
		it("should return drawings sorted by name", async () => {
			const testDrawings = [
				createTestDrawing({ id: "drawing-1", name: "Zebra" }),
				createTestDrawing({ id: "drawing-2", name: "Apple" }),
			];
			vi.mocked(database.drawings.where).mockReturnValue(
				createWhereChain(testDrawings) as unknown as ReturnType<
					typeof database.drawings.where
				>,
			);

			const result = await runTE(getDrawingsByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right[0].name).toBe("Apple");
				expect(result.right[1].name).toBe("Zebra");
			}
		});
	});

	// ==========================================================================
	// searchDrawings
	// ==========================================================================

	describe("searchDrawings", () => {
		it("should return matching drawings", async () => {
			const testDrawings = [
				createTestDrawing({ id: "drawing-1", name: "Character Design" }),
				createTestDrawing({ id: "drawing-2", name: "Map Layout" }),
				createTestDrawing({ id: "drawing-3", name: "Character Sketch" }),
			];
			vi.mocked(database.drawings.where).mockReturnValue(
				createWhereChain(testDrawings) as unknown as ReturnType<
					typeof database.drawings.where
				>,
			);

			const result = await runTE(searchDrawings("project-1", "character"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	// ==========================================================================
	// getRecentDrawings
	// ==========================================================================

	describe("getRecentDrawings", () => {
		it("should return recent drawings sorted by updatedAt", async () => {
			const testDrawings = [
				createTestDrawing({
					id: "drawing-1",
					updatedAt: "2024-01-01T00:00:00.000Z",
				}),
				createTestDrawing({
					id: "drawing-2",
					updatedAt: "2024-01-03T00:00:00.000Z",
				}),
				createTestDrawing({
					id: "drawing-3",
					updatedAt: "2024-01-02T00:00:00.000Z",
				}),
			];
			vi.mocked(database.drawings.where).mockReturnValue(
				createWhereChain(testDrawings) as unknown as ReturnType<
					typeof database.drawings.where
				>,
			);

			const result = await runTE(getRecentDrawings("project-1", 2));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right[0].id).toBe("drawing-2");
				expect(result.right[1].id).toBe("drawing-3");
			}
		});
	});

	// ==========================================================================
	// drawingExists
	// ==========================================================================

	describe("drawingExists", () => {
		it("should return true when drawing exists", async () => {
			vi.mocked(database.drawings.where).mockReturnValue(
				createWhereChain([], 1) as unknown as ReturnType<
					typeof database.drawings.where
				>,
			);

			const result = await runTE(drawingExists("drawing-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when drawing does not exist", async () => {
			vi.mocked(database.drawings.where).mockReturnValue(
				createWhereChain([], 0) as unknown as ReturnType<
					typeof database.drawings.where
				>,
			);

			const result = await runTE(drawingExists("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	// ==========================================================================
	// drawingExistsByName
	// ==========================================================================

	describe("drawingExistsByName", () => {
		it("should return true when drawing with name exists", async () => {
			const testDrawings = [createTestDrawing({ name: "My Drawing" })];
			vi.mocked(database.drawings.where).mockReturnValue(
				createWhereChain(testDrawings) as unknown as ReturnType<
					typeof database.drawings.where
				>,
			);

			const result = await runTE(
				drawingExistsByName("project-1", "my drawing"),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when drawing with name does not exist", async () => {
			vi.mocked(database.drawings.where).mockReturnValue(
				createWhereChain([]) as unknown as ReturnType<
					typeof database.drawings.where
				>,
			);

			const result = await runTE(
				drawingExistsByName("project-1", "non-existent"),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	// ==========================================================================
	// countDrawingsByProject
	// ==========================================================================

	describe("countDrawingsByProject", () => {
		it("should return drawing count for project", async () => {
			vi.mocked(database.drawings.where).mockReturnValue(
				createWhereChain([], 5) as unknown as ReturnType<
					typeof database.drawings.where
				>,
			);

			const result = await runTE(countDrawingsByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(5);
			}
		});
	});

	// ==========================================================================
	// countAllDrawings
	// ==========================================================================

	describe("countAllDrawings", () => {
		it("should return total drawing count", async () => {
			vi.mocked(database.drawings.count).mockResolvedValue(10);

			const result = await runTE(countAllDrawings());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(10);
			}
		});
	});

	// ==========================================================================
	// updateDrawingName
	// ==========================================================================

	describe("updateDrawingName", () => {
		it("should update drawing name", async () => {
			vi.mocked(database.drawings.update).mockResolvedValue(1);

			const result = await runTE(updateDrawingName("drawing-1", "New Name"));

			expect(E.isRight(result)).toBe(true);
			expect(database.drawings.update).toHaveBeenCalledWith(
				"drawing-1",
				expect.objectContaining({ name: "New Name" }),
			);
		});
	});

	// ==========================================================================
	// updateDrawingContent
	// ==========================================================================

	describe("updateDrawingContent", () => {
		it("should update drawing content", async () => {
			vi.mocked(database.drawings.update).mockResolvedValue(1);

			const result = await runTE(
				updateDrawingContent("drawing-1", '{"elements":[]}'),
			);

			expect(E.isRight(result)).toBe(true);
			expect(database.drawings.update).toHaveBeenCalledWith(
				"drawing-1",
				expect.objectContaining({ content: '{"elements":[]}' }),
			);
		});
	});

	// ==========================================================================
	// saveDrawing
	// ==========================================================================

	describe("saveDrawing", () => {
		it("should return Right with saved drawing", async () => {
			const testDrawing = createTestDrawing({ id: "drawing-1" });
			vi.mocked(database.drawings.put).mockResolvedValue("drawing-1");

			const result = await runTE(saveDrawing(testDrawing));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testDrawing);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			const testDrawing = createTestDrawing({ id: "drawing-1" });
			vi.mocked(database.drawings.put).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(saveDrawing(testDrawing));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// duplicateDrawing
	// ==========================================================================

	describe("duplicateDrawing", () => {
		it("should duplicate drawing with new name", async () => {
			const originalDrawing = createTestDrawing({
				id: "drawing-1",
				name: "Original",
			});
			vi.mocked(database.drawings.get).mockResolvedValue(originalDrawing);
			vi.mocked(database.drawings.add).mockResolvedValue("new-id");

			const result = await runTE(duplicateDrawing("drawing-1", "Copy"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.name).toBe("Copy");
				expect(result.right.id).not.toBe("drawing-1");
			}
		});

		it("should use default copy name when not provided", async () => {
			const originalDrawing = createTestDrawing({
				id: "drawing-1",
				name: "Original",
			});
			vi.mocked(database.drawings.get).mockResolvedValue(originalDrawing);
			vi.mocked(database.drawings.add).mockResolvedValue("new-id");

			const result = await runTE(duplicateDrawing("drawing-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.name).toBe("Original (副本)");
			}
		});

		it("should return Left when original not found", async () => {
			vi.mocked(database.drawings.get).mockResolvedValue(undefined);

			const result = await runTE(duplicateDrawing("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
			}
		});
	});
});
