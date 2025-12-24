/**
 * @file update-workspace.action.test.ts
 * @description 更新工作区 Action 的单元测试
 *
 * 测试覆盖：
 * - 基本更新功能
 * - 部分更新
 * - 工作区不存在的情况
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

const mockUpdateWorkspace = vi.fn();

vi.mock("@/db/workspace.db.fn", () => ({
	updateWorkspace: (...args: unknown[]) => mockUpdateWorkspace(...args),
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

import logger from "@/log";
import { updateWorkspace } from "./update-workspace.action";

// ============================================================================
// Unit Tests
// ============================================================================

describe("updateWorkspace", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should update workspace title", async () => {
		mockUpdateWorkspace.mockReturnValue(() => Promise.resolve(E.right(1)));

		const result = await runTE(
			updateWorkspace({
				workspaceId: "ws-1",
				updates: { title: "New Title" },
			}),
		);

		expect(E.isRight(result)).toBe(true);
		expect(mockUpdateWorkspace).toHaveBeenCalledWith("ws-1", {
			title: "New Title",
		});
		expect(logger.start).toHaveBeenCalled();
		expect(logger.success).toHaveBeenCalled();
	});

	it("should update multiple fields", async () => {
		mockUpdateWorkspace.mockReturnValue(() => Promise.resolve(E.right(1)));

		const result = await runTE(
			updateWorkspace({
				workspaceId: "ws-1",
				updates: {
					title: "New Title",
					description: "New Description",
					author: "New Author",
				},
			}),
		);

		expect(E.isRight(result)).toBe(true);
		expect(mockUpdateWorkspace).toHaveBeenCalledWith("ws-1", {
			title: "New Title",
			description: "New Description",
			author: "New Author",
		});
	});

	it("should return Left with NOT_FOUND when workspace does not exist", async () => {
		mockUpdateWorkspace.mockReturnValue(() => Promise.resolve(E.right(0)));

		const result = await runTE(
			updateWorkspace({
				workspaceId: "non-existent",
				updates: { title: "New Title" },
			}),
		);

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("NOT_FOUND");
		}
	});

	it("should return Left with error on database failure", async () => {
		const error = { type: "DB_ERROR" as const, message: "Database error" };
		mockUpdateWorkspace.mockReturnValue(() => Promise.resolve(E.left(error)));

		const result = await runTE(
			updateWorkspace({
				workspaceId: "ws-1",
				updates: { title: "New Title" },
			}),
		);

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("DB_ERROR");
		}
	});

	it("should log start and success messages", async () => {
		mockUpdateWorkspace.mockReturnValue(() => Promise.resolve(E.right(1)));

		await runTE(
			updateWorkspace({
				workspaceId: "ws-123",
				updates: { title: "New Title" },
			}),
		);

		expect(logger.start).toHaveBeenCalledWith("[Action] 更新工作区:", "ws-123");
		expect(logger.success).toHaveBeenCalledWith(
			"[Action] 工作区更新成功:",
			"ws-123",
		);
	});
});
