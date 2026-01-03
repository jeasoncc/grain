/**
 * @file clear-data.repo.fn.test.ts
 * @description Clear Data Repository 单元测试
 *
 * 测试覆盖：
 * - clearSqliteData: 清除 SQLite 数据
 * - clearSqliteDataKeepUsers: 清除 SQLite 数据（保留用户）
 * - clearLogs: 清除日志数据库
 * - clearAllData: 清除所有数据
 * - clearAllDataKeepUsers: 清除所有数据（保留用户）
 *
 * @requirements 3.2, 3.3, 3.4
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClearDataResult } from "@/types/rust-api";

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
 * 创建测试用的清除数据结果
 */
function createTestClearDataResult(
	overrides: Partial<ClearDataResult> = {},
): ClearDataResult {
	return {
		usersDeleted: 1,
		workspacesDeleted: 2,
		nodesDeleted: 10,
		contentsDeleted: 8,
		tagsDeleted: 5,
		attachmentsDeleted: 3,
		...overrides,
	};
}

// ============================================================================
// Mock Setup
// ============================================================================

const { mockApi, mockLogger, mockLogDatabase } = vi.hoisted(() => {
	return {
		mockApi: {
			clearSqliteData: vi.fn(),
			clearSqliteDataKeepUsers: vi.fn(),
		},
		mockLogger: {
			info: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		},
		mockLogDatabase: {
			logs: {
				clear: vi.fn(),
			},
		},
	};
});

// Mock api-client
vi.mock("@/db/api-client.fn", () => ({
	api: mockApi,
}));

// Mock logger
vi.mock("@/log", () => ({
	default: mockLogger,
}));

// Mock log-db (动态导入)
vi.mock("@/db/log-db", () => ({
	logDatabase: mockLogDatabase,
}));

// Import after mocking
import {
	clearAllData,
	clearAllDataKeepUsers,
	clearLogs,
	clearSqliteData,
	clearSqliteDataKeepUsers,
} from "./clear-data.repo.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("clear-data.repo.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// clearSqliteData
	// ==========================================================================

	describe("clearSqliteData", () => {
		it("should return Right with ClearDataResult on success", async () => {
			const testResult = createTestClearDataResult();
			mockApi.clearSqliteData.mockReturnValue(() =>
				Promise.resolve(E.right(testResult)),
			);

			const result = await runTE(clearSqliteData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testResult);
				expect(result.right.usersDeleted).toBe(1);
				expect(result.right.workspacesDeleted).toBe(2);
				expect(result.right.nodesDeleted).toBe(10);
			}
			expect(mockApi.clearSqliteData).toHaveBeenCalledTimes(1);
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Clear data failed" };
			mockApi.clearSqliteData.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(clearSqliteData());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("Clear data failed");
			}
		});
	});

	// ==========================================================================
	// clearSqliteDataKeepUsers
	// ==========================================================================

	describe("clearSqliteDataKeepUsers", () => {
		it("should return Right with ClearDataResult on success", async () => {
			const testResult = createTestClearDataResult({ usersDeleted: 0 });
			mockApi.clearSqliteDataKeepUsers.mockReturnValue(() =>
				Promise.resolve(E.right(testResult)),
			);

			const result = await runTE(clearSqliteDataKeepUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.usersDeleted).toBe(0);
				expect(result.right.workspacesDeleted).toBe(2);
			}
			expect(mockApi.clearSqliteDataKeepUsers).toHaveBeenCalledTimes(1);
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Clear data keep users failed" };
			mockApi.clearSqliteDataKeepUsers.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(clearSqliteDataKeepUsers());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("Clear data keep users failed");
			}
		});
	});

	// ==========================================================================
	// clearLogs
	// ==========================================================================

	describe("clearLogs", () => {
		it("should return Right on successful log clear", async () => {
			mockLogDatabase.logs.clear.mockResolvedValue(undefined);

			const result = await runTE(clearLogs());

			expect(E.isRight(result)).toBe(true);
			expect(mockLogDatabase.logs.clear).toHaveBeenCalledTimes(1);
			expect(mockLogger.info).toHaveBeenCalledWith(
				"[ClearData] 清除日志数据库...",
			);
			expect(mockLogger.success).toHaveBeenCalledWith(
				"[ClearData] 日志数据库清除成功",
			);
		});

		it("should return Left with error on log clear failure", async () => {
			mockLogDatabase.logs.clear.mockRejectedValue(
				new Error("Log clear failed"),
			);

			const result = await runTE(clearLogs());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("清除日志数据库失败");
			}
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// clearAllData
	// ==========================================================================

	describe("clearAllData", () => {
		it("should clear SQLite and logs on success", async () => {
			const testResult = createTestClearDataResult();
			mockApi.clearSqliteData.mockReturnValue(() =>
				Promise.resolve(E.right(testResult)),
			);
			mockLogDatabase.logs.clear.mockResolvedValue(undefined);

			const result = await runTE(clearAllData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testResult);
			}
			expect(mockApi.clearSqliteData).toHaveBeenCalledTimes(1);
			expect(mockLogDatabase.logs.clear).toHaveBeenCalledTimes(1);
		});

		it("should return SQLite result even if log clear fails", async () => {
			const testResult = createTestClearDataResult();
			mockApi.clearSqliteData.mockReturnValue(() =>
				Promise.resolve(E.right(testResult)),
			);
			mockLogDatabase.logs.clear.mockRejectedValue(
				new Error("Log clear failed"),
			);

			const result = await runTE(clearAllData());

			// 日志清理失败不影响主结果
			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testResult);
			}
		});

		it("should return Left if SQLite clear fails", async () => {
			const error = { type: "DB_ERROR", message: "SQLite clear failed" };
			mockApi.clearSqliteData.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(clearAllData());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("SQLite clear failed");
			}
		});
	});

	// ==========================================================================
	// clearAllDataKeepUsers
	// ==========================================================================

	describe("clearAllDataKeepUsers", () => {
		it("should clear SQLite (keep users) and logs on success", async () => {
			const testResult = createTestClearDataResult({ usersDeleted: 0 });
			mockApi.clearSqliteDataKeepUsers.mockReturnValue(() =>
				Promise.resolve(E.right(testResult)),
			);
			mockLogDatabase.logs.clear.mockResolvedValue(undefined);

			const result = await runTE(clearAllDataKeepUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.usersDeleted).toBe(0);
			}
			expect(mockApi.clearSqliteDataKeepUsers).toHaveBeenCalledTimes(1);
			expect(mockLogDatabase.logs.clear).toHaveBeenCalledTimes(1);
		});

		it("should return SQLite result even if log clear fails", async () => {
			const testResult = createTestClearDataResult({ usersDeleted: 0 });
			mockApi.clearSqliteDataKeepUsers.mockReturnValue(() =>
				Promise.resolve(E.right(testResult)),
			);
			mockLogDatabase.logs.clear.mockRejectedValue(
				new Error("Log clear failed"),
			);

			const result = await runTE(clearAllDataKeepUsers());

			// 日志清理失败不影响主结果
			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.usersDeleted).toBe(0);
			}
		});

		it("should return Left if SQLite clear fails", async () => {
			const error = { type: "DB_ERROR", message: "SQLite clear keep users failed" };
			mockApi.clearSqliteDataKeepUsers.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(clearAllDataKeepUsers());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("SQLite clear keep users failed");
			}
		});
	});
});
