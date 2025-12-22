/**
 * @file attachment.db.fn.test.ts
 * @description Attachment 数据库函数的单元测试
 *
 * 测试覆盖：
 * - 基础 CRUD 操作
 * - 按项目和类型查询
 * - 统计操作
 *
 * @requirements 3.1, 3.2, 3.3
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttachmentInterface } from "@/types/attachment/attachment.interface";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 AttachmentInterface 对象
 */
function createTestAttachment(
	overrides: Partial<AttachmentInterface> = {},
): AttachmentInterface {
	return {
		id: overrides.id ?? "550e8400-e29b-41d4-a716-446655440000",
		fileName: overrides.fileName ?? "test-file.png",
		filePath: overrides.filePath ?? "/uploads/test-file.png",
		type: overrides.type ?? "image",
		project: overrides.project ?? "project-1",
		size: overrides.size ?? 1024,
		mimeType: overrides.mimeType ?? "image/png",
		uploadedAt: overrides.uploadedAt ?? new Date().toISOString(),
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
			attachments: {
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
import {
	addAttachment,
	attachmentExists,
	countAttachments,
	countAttachmentsByProject,
	deleteAttachment,
	deleteAttachmentsByProject,
	getAllAttachments,
	getAttachmentById,
	getAttachmentByIdOrFail,
	getAttachmentsByProject,
	getAttachmentsByProjectAndType,
	getAttachmentsByType,
	getGlobalAttachments,
	getTotalSizeByProject,
	saveAttachment,
	updateAttachment,
} from "./attachment.db.fn";
import { database } from "./database";

// ============================================================================
// Unit Tests
// ============================================================================

describe("attachment.db.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// addAttachment
	// ==========================================================================

	describe("addAttachment", () => {
		it("should return Right with attachment on success", async () => {
			vi.mocked(database.attachments.add).mockResolvedValue("test-id");

			const result = await runTE(
				addAttachment("test-file.png", "/uploads/test-file.png", "image"),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.fileName).toBe("test-file.png");
				expect(result.right.filePath).toBe("/uploads/test-file.png");
				expect(result.right.type).toBe("image");
			}
			expect(logger.info).toHaveBeenCalled();
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on database failure", async () => {
			vi.mocked(database.attachments.add).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(
				addAttachment("test-file.png", "/uploads/test-file.png", "image"),
			);

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
			expect(logger.error).toHaveBeenCalled();
		});

		it("should apply optional parameters", async () => {
			vi.mocked(database.attachments.add).mockResolvedValue("test-id");

			const result = await runTE(
				addAttachment("test-file.png", "/uploads/test-file.png", "image", {
					project: "project-123",
					size: 2048,
					mimeType: "image/jpeg",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.project).toBe("project-123");
				expect(result.right.size).toBe(2048);
				expect(result.right.mimeType).toBe("image/jpeg");
			}
		});
	});

	// ==========================================================================
	// updateAttachment
	// ==========================================================================

	describe("updateAttachment", () => {
		it("should return Right with count on success", async () => {
			vi.mocked(database.attachments.update).mockResolvedValue(1);

			const result = await runTE(
				updateAttachment("attachment-1", { fileName: "new-name.png" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(1);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Right with 0 when attachment not found", async () => {
			vi.mocked(database.attachments.update).mockResolvedValue(0);

			const result = await runTE(
				updateAttachment("non-existent", { fileName: "new-name.png" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(0);
			}
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.attachments.update).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(
				updateAttachment("attachment-1", { fileName: "new-name.png" }),
			);

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// deleteAttachment
	// ==========================================================================

	describe("deleteAttachment", () => {
		it("should return Right on success", async () => {
			vi.mocked(database.attachments.delete).mockResolvedValue(undefined);

			const result = await runTE(deleteAttachment("attachment-1"));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.attachments.delete).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(deleteAttachment("attachment-1"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// getAttachmentById
	// ==========================================================================

	describe("getAttachmentById", () => {
		it("should return Right with attachment when found", async () => {
			const testAttachment = createTestAttachment({ id: "attachment-1" });
			vi.mocked(database.attachments.get).mockResolvedValue(testAttachment);

			const result = await runTE(getAttachmentById("attachment-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testAttachment);
			}
		});

		it("should return Right with undefined when not found", async () => {
			vi.mocked(database.attachments.get).mockResolvedValue(undefined);

			const result = await runTE(getAttachmentById("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeUndefined();
			}
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.attachments.get).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(getAttachmentById("attachment-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// getAttachmentByIdOrFail
	// ==========================================================================

	describe("getAttachmentByIdOrFail", () => {
		it("should return Right with attachment when found", async () => {
			const testAttachment = createTestAttachment({ id: "attachment-1" });
			vi.mocked(database.attachments.get).mockResolvedValue(testAttachment);

			const result = await runTE(getAttachmentByIdOrFail("attachment-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testAttachment);
			}
		});

		it("should return Left with NOT_FOUND when not found", async () => {
			vi.mocked(database.attachments.get).mockResolvedValue(undefined);

			const result = await runTE(getAttachmentByIdOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
			}
		});
	});

	// ==========================================================================
	// getAllAttachments
	// ==========================================================================

	describe("getAllAttachments", () => {
		it("should return all attachments sorted by uploadedAt", async () => {
			const testAttachments = [
				createTestAttachment({
					id: "attachment-1",
					uploadedAt: "2024-01-01T00:00:00.000Z",
				}),
				createTestAttachment({
					id: "attachment-2",
					uploadedAt: "2024-01-02T00:00:00.000Z",
				}),
			];
			vi.mocked(database.attachments.toArray).mockResolvedValue(
				testAttachments,
			);

			const result = await runTE(getAllAttachments());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				// 最近上传的在前
				expect(result.right[0].id).toBe("attachment-2");
			}
		});
	});

	// ==========================================================================
	// getAttachmentsByProject
	// ==========================================================================

	describe("getAttachmentsByProject", () => {
		it("should return attachments for project", async () => {
			const testAttachments = [
				createTestAttachment({ project: "project-1" }),
				createTestAttachment({ project: "project-1" }),
			];
			vi.mocked(database.attachments.where).mockReturnValue(
				createWhereChain(testAttachments) as unknown as ReturnType<
					typeof database.attachments.where
				>,
			);

			const result = await runTE(getAttachmentsByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	// ==========================================================================
	// getAttachmentsByType
	// ==========================================================================

	describe("getAttachmentsByType", () => {
		it("should return attachments of specified type", async () => {
			const testAttachments = [
				createTestAttachment({ type: "image" }),
				createTestAttachment({ type: "audio" }),
				createTestAttachment({ type: "image" }),
			];
			vi.mocked(database.attachments.toArray).mockResolvedValue(
				testAttachments,
			);

			const result = await runTE(getAttachmentsByType("image"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right.every((a) => a.type === "image")).toBe(true);
			}
		});
	});

	// ==========================================================================
	// getAttachmentsByProjectAndType
	// ==========================================================================

	describe("getAttachmentsByProjectAndType", () => {
		it("should return attachments for project and type", async () => {
			const testAttachments = [
				createTestAttachment({ project: "project-1", type: "image" }),
				createTestAttachment({ project: "project-1", type: "audio" }),
				createTestAttachment({ project: "project-1", type: "image" }),
			];
			vi.mocked(database.attachments.where).mockReturnValue(
				createWhereChain(testAttachments) as unknown as ReturnType<
					typeof database.attachments.where
				>,
			);

			const result = await runTE(
				getAttachmentsByProjectAndType("project-1", "image"),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	// ==========================================================================
	// getGlobalAttachments
	// ==========================================================================

	describe("getGlobalAttachments", () => {
		it("should return attachments without project", async () => {
			const testAttachments = [
				createTestAttachment({ project: "project-1" }),
				createTestAttachment({ project: undefined }),
				createTestAttachment({ project: "" }),
			];
			vi.mocked(database.attachments.toArray).mockResolvedValue(
				testAttachments,
			);

			const result = await runTE(getGlobalAttachments());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
			}
		});
	});

	// ==========================================================================
	// attachmentExists
	// ==========================================================================

	describe("attachmentExists", () => {
		it("should return true when attachment exists", async () => {
			vi.mocked(database.attachments.where).mockReturnValue(
				createWhereChain([], 1) as unknown as ReturnType<
					typeof database.attachments.where
				>,
			);

			const result = await runTE(attachmentExists("attachment-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when attachment does not exist", async () => {
			vi.mocked(database.attachments.where).mockReturnValue(
				createWhereChain([], 0) as unknown as ReturnType<
					typeof database.attachments.where
				>,
			);

			const result = await runTE(attachmentExists("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	// ==========================================================================
	// countAttachments
	// ==========================================================================

	describe("countAttachments", () => {
		it("should return total attachment count", async () => {
			vi.mocked(database.attachments.count).mockResolvedValue(10);

			const result = await runTE(countAttachments());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(10);
			}
		});
	});

	// ==========================================================================
	// countAttachmentsByProject
	// ==========================================================================

	describe("countAttachmentsByProject", () => {
		it("should return attachment count for project", async () => {
			vi.mocked(database.attachments.where).mockReturnValue(
				createWhereChain([], 5) as unknown as ReturnType<
					typeof database.attachments.where
				>,
			);

			const result = await runTE(countAttachmentsByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(5);
			}
		});
	});

	// ==========================================================================
	// deleteAttachmentsByProject
	// ==========================================================================

	describe("deleteAttachmentsByProject", () => {
		it("should delete all attachments for project", async () => {
			vi.mocked(database.attachments.where).mockReturnValue(
				createWhereChain([], 3) as unknown as ReturnType<
					typeof database.attachments.where
				>,
			);

			const result = await runTE(deleteAttachmentsByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(3);
			}
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// getTotalSizeByProject
	// ==========================================================================

	describe("getTotalSizeByProject", () => {
		it("should return total size of attachments", async () => {
			const testAttachments = [
				createTestAttachment({ size: 1000 }),
				createTestAttachment({ size: 2000 }),
				createTestAttachment({ size: 3000 }),
			];
			vi.mocked(database.attachments.where).mockReturnValue(
				createWhereChain(testAttachments) as unknown as ReturnType<
					typeof database.attachments.where
				>,
			);

			const result = await runTE(getTotalSizeByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(6000);
			}
		});

		it("should handle attachments without size", async () => {
			const testAttachments = [
				createTestAttachment({ size: 1000 }),
				createTestAttachment({ size: undefined }),
			];
			vi.mocked(database.attachments.where).mockReturnValue(
				createWhereChain(testAttachments) as unknown as ReturnType<
					typeof database.attachments.where
				>,
			);

			const result = await runTE(getTotalSizeByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(1000);
			}
		});
	});

	// ==========================================================================
	// saveAttachment
	// ==========================================================================

	describe("saveAttachment", () => {
		it("should return Right with saved attachment", async () => {
			const testAttachment = createTestAttachment({ id: "attachment-1" });
			vi.mocked(database.attachments.put).mockResolvedValue("attachment-1");

			const result = await runTE(saveAttachment(testAttachment));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testAttachment);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			const testAttachment = createTestAttachment({ id: "attachment-1" });
			vi.mocked(database.attachments.put).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(saveAttachment(testAttachment));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});
});
