/**
 * @file delete-workspace.action.test.ts
 * @description 删除工作区 Action 的单元测试
 *
 * 测试覆盖：
 * - 基本删除功能
 * - 级联删除（关联数据）
 * - 错误处理
 *
 * @requirements 7.1, 7.4
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// ============================================================================
// Mock Setup
// ============================================================================

const mockDeleteWorkspaceWithContents = vi.fn();

vi.mock("@/db/workspace.db.fn", () => ({
	deleteWorkspaceWithContents: (...args: unknown[]) =>
		mockDeleteWorkspaceWithContents(...args),
}));

vi.mock("@/log", () => ({
	default: {
		start: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

import logger from "@/io/log";
import { deleteWorkspace } from "./delete-workspace.flow";

// ============================================================================
// Unit Tests
// ============================================================================

describe("deleteWorkspace", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should delete workspace and all associated data", async () => {
		mockDeleteWorkspaceWithContents.mockReturnValue(() =>
			Promise.resolve(E.right(undefined)),
		);

		const result = await runTE(deleteWorkspace("ws-1"));

		expect(E.isRight(result)).toBe(true);
		expect(mockDeleteWorkspaceWithContents).toHaveBeenCalledWith("ws-1");
		expect(logger.start).toHaveBeenCalled();
		expect(logger.success).toHaveBeenCalled();
	});

	it("should return Left with error on failure", async () => {
		const error = { type: "DB_ERROR" as const, message: "Database error" };
		mockDeleteWorkspaceWithContents.mockReturnValue(() =>
			Promise.resolve(E.left(error)),
		);

		const result = await runTE(deleteWorkspace("ws-1"));

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("DB_ERROR");
		}
	});

	it("should log start and success messages", async () => {
		mockDeleteWorkspaceWithContents.mockReturnValue(() =>
			Promise.resolve(E.right(undefined)),
		);

		await runTE(deleteWorkspace("ws-123"));

		expect(logger.start).toHaveBeenCalledWith("[Action] 删除工作区:", "ws-123");
		expect(logger.success).toHaveBeenCalledWith(
			"[Action] 工作区删除成功:",
			"ws-123",
		);
	});
});
