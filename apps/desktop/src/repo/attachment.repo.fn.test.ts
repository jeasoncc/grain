/**
 * @file attachment.repo.fn.test.ts
 * @description Attachment Repository 单元测试
 *
 * 测试覆盖：
 * - getAttachments: 获取所有附件
 * - getAttachmentsByProject: 获取项目下的所有附件
 * - getAttachment: 获取单个附件
 * - getAttachmentsByType: 按类型获取项目附件
 * - getImagesByProject: 获取项目下的所有图片附件
 * - getAudioFilesByProject: 获取项目下的所有音频附件
 * - getAttachmentByPath: 按文件路径获取附件
 * - createAttachment: 创建附件
 * - updateAttachment: 更新附件
 * - deleteAttachment: 删除附件
 * - deleteAttachmentsByProject: 删除项目下的所有附件
 *
 * @requirements 6.4
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttachmentResponse } from "@/types/rust-api";

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
 * 创建测试用的附件响应
 */
function createTestAttachmentResponse(
	overrides: Partial<AttachmentResponse> = {},
): AttachmentResponse {
	const now = Date.now();
	return {
		id: "attachment-test-1",
		projectId: "project-1",
		attachmentType: "image",
		fileName: "test-image.png",
		filePath: "/uploads/test-image.png",
		uploadedAt: now,
		size: 1024,
		mimeType: "image/png",
		...overrides,
	};
}

// ============================================================================
// Mock Setup
// ============================================================================

const { mockApi } = vi.hoisted(() => {
	return {
		mockApi: {
			getAttachments: vi.fn(),
			getAttachmentsByProject: vi.fn(),
			getAttachment: vi.fn(),
			getAttachmentsByType: vi.fn(),
			getImagesByProject: vi.fn(),
			getAudioFilesByProject: vi.fn(),
			getAttachmentByPath: vi.fn(),
			createAttachment: vi.fn(),
			updateAttachment: vi.fn(),
			deleteAttachment: vi.fn(),
			deleteAttachmentsByProject: vi.fn(),
		},
	};
});

// Mock api-client
vi.mock("@/db/api-client.fn", () => mockApi);

// Import after mocking
import {
	createAttachment,
	deleteAttachment,
	deleteAttachmentsByProject,
	getAttachment,
	getAttachmentByPath,
	getAttachmentOrFail,
	getAttachments,
	getAttachmentsByProject,
	getAttachmentsByType,
	getAudioFilesByProject,
	getImagesByProject,
	updateAttachment,
} from "./attachment.repo.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("attachment.repo.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// getAttachments
	// ==========================================================================

	describe("getAttachments", () => {
		it("should return Right with empty array when no attachments exist", async () => {
			mockApi.getAttachments.mockReturnValue(() =>
				Promise.resolve(E.right([])),
			);

			const result = await runTE(getAttachments());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("should return Right with decoded attachments on success", async () => {
			const testAttachments = [
				createTestAttachmentResponse({ id: "att-1", fileName: "image1.png" }),
				createTestAttachmentResponse({ id: "att-2", fileName: "image2.png" }),
			];
			mockApi.getAttachments.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachments)),
			);

			const result = await runTE(getAttachments());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right[0].id).toBe("att-1");
				expect(result.right[0].fileName).toBe("image1.png");
				expect(result.right[1].id).toBe("att-2");
			}
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to get attachments" };
			mockApi.getAttachments.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(getAttachments());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("Failed to get attachments");
			}
		});
	});

	// ==========================================================================
	// getAttachmentsByProject
	// ==========================================================================

	describe("getAttachmentsByProject", () => {
		it("should return Right with empty array when no attachments for project", async () => {
			mockApi.getAttachmentsByProject.mockReturnValue(() =>
				Promise.resolve(E.right([])),
			);

			const result = await runTE(getAttachmentsByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual([]);
			}
			expect(mockApi.getAttachmentsByProject).toHaveBeenCalledWith("project-1");
		});

		it("should return Right with decoded attachments on success", async () => {
			const testAttachments = [
				createTestAttachmentResponse({ id: "att-1", projectId: "project-1" }),
			];
			mockApi.getAttachmentsByProject.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachments)),
			);

			const result = await runTE(getAttachmentsByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(1);
				expect(result.right[0].project).toBe("project-1");
			}
		});
	});

	// ==========================================================================
	// getAttachment
	// ==========================================================================

	describe("getAttachment", () => {
		it("should return Right with null when attachment not found", async () => {
			mockApi.getAttachment.mockReturnValue(() =>
				Promise.resolve(E.right(null)),
			);

			const result = await runTE(getAttachment("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});

		it("should return Right with decoded attachment on success", async () => {
			const testAttachment = createTestAttachmentResponse();
			mockApi.getAttachment.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachment)),
			);

			const result = await runTE(getAttachment("attachment-test-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).not.toBeNull();
				expect(result.right?.id).toBe("attachment-test-1");
				expect(result.right?.fileName).toBe("test-image.png");
			}
			expect(mockApi.getAttachment).toHaveBeenCalledWith("attachment-test-1");
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to get attachment" };
			mockApi.getAttachment.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(getAttachment("attachment-test-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// getAttachmentOrFail
	// ==========================================================================

	describe("getAttachmentOrFail", () => {
		it("should return Right with attachment when found", async () => {
			const testAttachment = createTestAttachmentResponse();
			mockApi.getAttachment.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachment)),
			);

			const result = await runTE(getAttachmentOrFail("attachment-test-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.id).toBe("attachment-test-1");
			}
		});

		it("should return Left with NOT_FOUND error when attachment not found", async () => {
			mockApi.getAttachment.mockReturnValue(() =>
				Promise.resolve(E.right(null)),
			);

			const result = await runTE(getAttachmentOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
				expect(result.left.message).toContain("附件不存在");
			}
		});
	});

	// ==========================================================================
	// getAttachmentsByType
	// ==========================================================================

	describe("getAttachmentsByType", () => {
		it("should return Right with attachments of specified type", async () => {
			const testAttachments = [
				createTestAttachmentResponse({ id: "att-1", attachmentType: "image" }),
			];
			mockApi.getAttachmentsByType.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachments)),
			);

			const result = await runTE(getAttachmentsByType("project-1", "image"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(1);
				expect(result.right[0].type).toBe("image");
			}
			expect(mockApi.getAttachmentsByType).toHaveBeenCalledWith(
				"project-1",
				"image",
			);
		});
	});

	// ==========================================================================
	// getImagesByProject
	// ==========================================================================

	describe("getImagesByProject", () => {
		it("should return Right with image attachments", async () => {
			const testAttachments = [
				createTestAttachmentResponse({ id: "att-1", attachmentType: "image" }),
			];
			mockApi.getImagesByProject.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachments)),
			);

			const result = await runTE(getImagesByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(1);
				expect(result.right[0].type).toBe("image");
			}
			expect(mockApi.getImagesByProject).toHaveBeenCalledWith("project-1");
		});
	});

	// ==========================================================================
	// getAudioFilesByProject
	// ==========================================================================

	describe("getAudioFilesByProject", () => {
		it("should return Right with audio attachments", async () => {
			const testAttachments = [
				createTestAttachmentResponse({
					id: "att-1",
					attachmentType: "audio",
					fileName: "audio.mp3",
					mimeType: "audio/mpeg",
				}),
			];
			mockApi.getAudioFilesByProject.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachments)),
			);

			const result = await runTE(getAudioFilesByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(1);
				expect(result.right[0].type).toBe("audio");
			}
			expect(mockApi.getAudioFilesByProject).toHaveBeenCalledWith("project-1");
		});
	});

	// ==========================================================================
	// getAttachmentByPath
	// ==========================================================================

	describe("getAttachmentByPath", () => {
		it("should return Right with null when attachment not found by path", async () => {
			mockApi.getAttachmentByPath.mockReturnValue(() =>
				Promise.resolve(E.right(null)),
			);

			const result = await runTE(getAttachmentByPath("/nonexistent/path.png"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});

		it("should return Right with decoded attachment on success", async () => {
			const testAttachment = createTestAttachmentResponse({
				filePath: "/uploads/found.png",
			});
			mockApi.getAttachmentByPath.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachment)),
			);

			const result = await runTE(getAttachmentByPath("/uploads/found.png"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right?.filePath).toBe("/uploads/found.png");
			}
			expect(mockApi.getAttachmentByPath).toHaveBeenCalledWith(
				"/uploads/found.png",
			);
		});
	});

	// ==========================================================================
	// createAttachment
	// ==========================================================================

	describe("createAttachment", () => {
		it("should return Right with created attachment on success", async () => {
			const testAttachment = createTestAttachmentResponse({
				fileName: "new-image.png",
			});
			mockApi.createAttachment.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachment)),
			);

			const result = await runTE(
				createAttachment({
					project: "project-1",
					type: "image",
					fileName: "new-image.png",
					filePath: "/uploads/new-image.png",
					size: 2048,
					mimeType: "image/png",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.fileName).toBe("new-image.png");
			}
			expect(mockApi.createAttachment).toHaveBeenCalledTimes(1);
		});

		it("should return Left with error on API failure", async () => {
			const error = {
				type: "DB_ERROR",
				message: "Failed to create attachment",
			};
			mockApi.createAttachment.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(
				createAttachment({
					type: "image",
					fileName: "new-image.png",
					filePath: "/uploads/new-image.png",
				}),
			);

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// updateAttachment
	// ==========================================================================

	describe("updateAttachment", () => {
		it("should return Right with updated attachment on success", async () => {
			const testAttachment = createTestAttachmentResponse({
				fileName: "updated-image.png",
			});
			mockApi.updateAttachment.mockReturnValue(() =>
				Promise.resolve(E.right(testAttachment)),
			);

			const result = await runTE(
				updateAttachment("attachment-test-1", {
					fileName: "updated-image.png",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.fileName).toBe("updated-image.png");
			}
			expect(mockApi.updateAttachment).toHaveBeenCalledTimes(1);
		});

		it("should return Left with error on API failure", async () => {
			const error = {
				type: "DB_ERROR",
				message: "Failed to update attachment",
			};
			mockApi.updateAttachment.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(
				updateAttachment("attachment-test-1", {
					fileName: "new-name.png",
				}),
			);

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// deleteAttachment
	// ==========================================================================

	describe("deleteAttachment", () => {
		it("should return Right on successful deletion", async () => {
			mockApi.deleteAttachment.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const result = await runTE(deleteAttachment("attachment-test-1"));

			expect(E.isRight(result)).toBe(true);
			expect(mockApi.deleteAttachment).toHaveBeenCalledWith(
				"attachment-test-1",
			);
		});

		it("should return Left with error on deletion failure", async () => {
			const error = {
				type: "DB_ERROR",
				message: "Failed to delete attachment",
			};
			mockApi.deleteAttachment.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(deleteAttachment("attachment-test-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// deleteAttachmentsByProject
	// ==========================================================================

	describe("deleteAttachmentsByProject", () => {
		it("should return Right with count on successful deletion", async () => {
			mockApi.deleteAttachmentsByProject.mockReturnValue(() =>
				Promise.resolve(E.right(5)),
			);

			const result = await runTE(deleteAttachmentsByProject("project-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(5);
			}
			expect(mockApi.deleteAttachmentsByProject).toHaveBeenCalledWith(
				"project-1",
			);
		});

		it("should return Left with error on deletion failure", async () => {
			const error = {
				type: "DB_ERROR",
				message: "Failed to delete attachments by project",
			};
			mockApi.deleteAttachmentsByProject.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(deleteAttachmentsByProject("project-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});
});
