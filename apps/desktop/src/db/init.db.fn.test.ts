/**
 * @file init.db.fn.test.ts
 * @description 数据库初始化函数的单元测试
 *
 * 测试覆盖：
 * - 检查用户是否存在
 * - 检查数据库版本是否存在
 * - 创建默认访客用户
 * - 设置数据库版本
 * - 获取数据库版本
 * - 初始化数据库
 * - 重置数据库
 * - 检查数据库初始化状态
 *
 * @requirements 3.2
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
// Mock Setup - 使用 vi.hoisted 确保变量在 mock 之前定义
// ============================================================================

const {
	mockUsersCount,
	mockUsersAdd,
	mockUsersClear,
	mockDbVersionsCount,
	mockDbVersionsPut,
	mockDbVersionsToArray,
	mockDbVersionsClear,
	mockWorkspacesClear,
	mockNodesClear,
	mockContentsClear,
	mockDrawingsClear,
	mockAttachmentsClear,
	mockTagsClear,
	mockTransaction,
	mockLogger,
} = vi.hoisted(() => {
	return {
		mockUsersCount: vi.fn(),
		mockUsersAdd: vi.fn(),
		mockUsersClear: vi.fn(),
		mockDbVersionsCount: vi.fn(),
		mockDbVersionsPut: vi.fn(),
		mockDbVersionsToArray: vi.fn(),
		mockDbVersionsClear: vi.fn(),
		mockWorkspacesClear: vi.fn(),
		mockNodesClear: vi.fn(),
		mockContentsClear: vi.fn(),
		mockDrawingsClear: vi.fn(),
		mockAttachmentsClear: vi.fn(),
		mockTagsClear: vi.fn(),
		mockTransaction: vi.fn(),
		mockLogger: {
			info: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		},
	};
});

// Mock logger
vi.mock("@/log", () => ({
	default: mockLogger,
}));

// Mock database
vi.mock("./database", () => ({
	database: {
		users: {
			count: () => mockUsersCount(),
			add: (data: unknown) => mockUsersAdd(data),
			clear: () => mockUsersClear(),
		},
		dbVersions: {
			count: () => mockDbVersionsCount(),
			put: (data: unknown) => mockDbVersionsPut(data),
			toArray: () => mockDbVersionsToArray(),
			clear: () => mockDbVersionsClear(),
		},
		workspaces: {
			clear: () => mockWorkspacesClear(),
		},
		nodes: {
			clear: () => mockNodesClear(),
		},
		contents: {
			clear: () => mockContentsClear(),
		},
		drawings: {
			clear: () => mockDrawingsClear(),
		},
		attachments: {
			clear: () => mockAttachmentsClear(),
		},
		tags: {
			clear: () => mockTagsClear(),
		},
		transaction: (
			_mode: string,
			_tables: unknown[],
			callback: () => Promise<void>,
		) => mockTransaction(_mode, _tables, callback),
	},
}));

// Import after mocking
import {
	createDefaultUser,
	getDBVersion,
	hasDBVersion,
	hasUsers,
	initDatabase,
	isDatabaseInitialized,
	resetDatabase,
	setDBVersion,
} from "./init.db.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("init.db.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// hasUsers
	// ==========================================================================

	describe("hasUsers", () => {
		it("should return Right(true) when users exist", async () => {
			mockUsersCount.mockResolvedValue(1);

			const result = await runTE(hasUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return Right(false) when no users exist", async () => {
			mockUsersCount.mockResolvedValue(0);

			const result = await runTE(hasUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});

		it("should return Left on database error", async () => {
			mockUsersCount.mockRejectedValue(new Error("Database error"));

			const result = await runTE(hasUsers());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("检查用户失败");
			}
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// hasDBVersion
	// ==========================================================================

	describe("hasDBVersion", () => {
		it("should return Right(true) when version exists", async () => {
			mockDbVersionsCount.mockResolvedValue(1);

			const result = await runTE(hasDBVersion());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return Right(false) when no version exists", async () => {
			mockDbVersionsCount.mockResolvedValue(0);

			const result = await runTE(hasDBVersion());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});

		it("should return Left on database error", async () => {
			mockDbVersionsCount.mockRejectedValue(new Error("Database error"));

			const result = await runTE(hasDBVersion());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("检查数据库版本失败");
			}
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// createDefaultUser
	// ==========================================================================

	describe("createDefaultUser", () => {
		it("should create default user with default config", async () => {
			mockUsersAdd.mockResolvedValue("user-id");

			const result = await runTE(createDefaultUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(typeof result.right).toBe("string");
			}
			expect(mockUsersAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "guest",
					displayName: "Guest User",
					plan: "free",
					tokenStatus: "unchecked",
				}),
			);
			expect(mockLogger.info).toHaveBeenCalledWith("[DB] 创建默认访客用户...");
			expect(mockLogger.success).toHaveBeenCalledWith(
				"[DB] 默认访客用户创建成功",
			);
		});

		it("should create user with custom config", async () => {
			mockUsersAdd.mockResolvedValue("user-id");

			const config = {
				username: "custom-user",
				displayName: "Custom User",
				theme: "light" as const,
				language: "zh-CN",
			};

			const result = await runTE(createDefaultUser(config));

			expect(E.isRight(result)).toBe(true);
			expect(mockUsersAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "custom-user",
					displayName: "Custom User",
					settings: expect.objectContaining({
						theme: "light",
						language: "zh-CN",
					}),
				}),
			);
		});

		it("should return Left on database error", async () => {
			mockUsersAdd.mockRejectedValue(new Error("Insert failed"));

			const result = await runTE(createDefaultUser());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("创建默认用户失败");
			}
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// setDBVersion
	// ==========================================================================

	describe("setDBVersion", () => {
		it("should set default version", async () => {
			mockDbVersionsPut.mockResolvedValue("version-id");

			const result = await runTE(setDBVersion());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(typeof result.right).toBe("string");
			}
			expect(mockDbVersionsPut).toHaveBeenCalledWith(
				expect.objectContaining({
					version: "2.0.0",
					migrationNotes: "Unified database architecture",
				}),
			);
			expect(mockLogger.info).toHaveBeenCalledWith(
				"[DB] 设置数据库版本:",
				"2.0.0",
			);
		});

		it("should set custom version", async () => {
			mockDbVersionsPut.mockResolvedValue("version-id");

			const result = await runTE(setDBVersion("3.0.0", "Custom migration"));

			expect(E.isRight(result)).toBe(true);
			expect(mockDbVersionsPut).toHaveBeenCalledWith(
				expect.objectContaining({
					version: "3.0.0",
					migrationNotes: "Custom migration",
				}),
			);
		});

		it("should return Left on database error", async () => {
			mockDbVersionsPut.mockRejectedValue(new Error("Put failed"));

			const result = await runTE(setDBVersion());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("设置数据库版本失败");
			}
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// getDBVersion
	// ==========================================================================

	describe("getDBVersion", () => {
		it("should return null when no versions exist", async () => {
			mockDbVersionsToArray.mockResolvedValue([]);

			const result = await runTE(getDBVersion());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});

		it("should return latest version", async () => {
			mockDbVersionsToArray.mockResolvedValue([
				{ version: "1.0.0", updatedAt: "2024-01-01T00:00:00.000Z" },
				{ version: "2.0.0", updatedAt: "2024-06-01T00:00:00.000Z" },
				{ version: "1.5.0", updatedAt: "2024-03-01T00:00:00.000Z" },
			]);

			const result = await runTE(getDBVersion());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe("2.0.0");
			}
		});

		it("should return Left on database error", async () => {
			mockDbVersionsToArray.mockRejectedValue(new Error("Query failed"));

			const result = await runTE(getDBVersion());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("获取数据库版本失败");
			}
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// initDatabase
	// ==========================================================================

	describe("initDatabase", () => {
		it("should initialize database when empty", async () => {
			// 没有用户，没有版本
			mockUsersCount.mockResolvedValue(0);
			mockDbVersionsCount.mockResolvedValue(0);
			mockUsersAdd.mockResolvedValue("user-id");
			mockDbVersionsPut.mockResolvedValue("version-id");

			const result = await runTE(initDatabase());

			expect(E.isRight(result)).toBe(true);
			expect(mockUsersAdd).toHaveBeenCalled();
			expect(mockDbVersionsPut).toHaveBeenCalled();
			expect(mockLogger.info).toHaveBeenCalledWith("[DB] 初始化数据库...");
			expect(mockLogger.success).toHaveBeenCalledWith(
				"[DB] 🎉 数据库初始化成功!",
			);
		});

		it("should skip user creation when users exist", async () => {
			mockUsersCount.mockResolvedValue(1);
			mockDbVersionsCount.mockResolvedValue(0);
			mockDbVersionsPut.mockResolvedValue("version-id");

			const result = await runTE(initDatabase());

			expect(E.isRight(result)).toBe(true);
			expect(mockUsersAdd).not.toHaveBeenCalled();
			expect(mockDbVersionsPut).toHaveBeenCalled();
		});

		it("should skip version setting when version exists", async () => {
			mockUsersCount.mockResolvedValue(0);
			mockDbVersionsCount.mockResolvedValue(1);
			mockUsersAdd.mockResolvedValue("user-id");

			const result = await runTE(initDatabase());

			expect(E.isRight(result)).toBe(true);
			expect(mockUsersAdd).toHaveBeenCalled();
			expect(mockDbVersionsPut).not.toHaveBeenCalled();
		});

		it("should do nothing when already initialized", async () => {
			mockUsersCount.mockResolvedValue(1);
			mockDbVersionsCount.mockResolvedValue(1);

			const result = await runTE(initDatabase());

			expect(E.isRight(result)).toBe(true);
			expect(mockUsersAdd).not.toHaveBeenCalled();
			expect(mockDbVersionsPut).not.toHaveBeenCalled();
		});

		it("should use custom config", async () => {
			mockUsersCount.mockResolvedValue(0);
			mockDbVersionsCount.mockResolvedValue(1);
			mockUsersAdd.mockResolvedValue("user-id");

			const config = {
				username: "admin",
				displayName: "Admin User",
			};

			const result = await runTE(initDatabase(config));

			expect(E.isRight(result)).toBe(true);
			expect(mockUsersAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "admin",
					displayName: "Admin User",
				}),
			);
		});

		it("should return Left on hasUsers error", async () => {
			mockUsersCount.mockRejectedValue(new Error("Count failed"));

			const result = await runTE(initDatabase());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// resetDatabase
	// ==========================================================================

	describe("resetDatabase", () => {
		it("should clear all tables and reinitialize", async () => {
			mockTransaction.mockImplementation(
				async (
					_mode: string,
					_tables: unknown[],
					callback: () => Promise<void>,
				) => {
					await callback();
				},
			);
			mockUsersClear.mockResolvedValue(undefined);
			mockWorkspacesClear.mockResolvedValue(undefined);
			mockNodesClear.mockResolvedValue(undefined);
			mockContentsClear.mockResolvedValue(undefined);
			mockDrawingsClear.mockResolvedValue(undefined);
			mockAttachmentsClear.mockResolvedValue(undefined);
			mockTagsClear.mockResolvedValue(undefined);
			mockDbVersionsClear.mockResolvedValue(undefined);

			// 重新初始化时的 mock
			mockUsersCount.mockResolvedValue(0);
			mockDbVersionsCount.mockResolvedValue(0);
			mockUsersAdd.mockResolvedValue("user-id");
			mockDbVersionsPut.mockResolvedValue("version-id");

			const result = await runTE(resetDatabase());

			expect(E.isRight(result)).toBe(true);
			expect(mockTransaction).toHaveBeenCalled();
			expect(mockLogger.warn).toHaveBeenCalledWith("[DB] 重置数据库...");
			expect(mockLogger.success).toHaveBeenCalledWith("[DB] 数据库重置成功");
		});

		it("should use custom config for reinitialization", async () => {
			mockTransaction.mockImplementation(
				async (
					_mode: string,
					_tables: unknown[],
					callback: () => Promise<void>,
				) => {
					await callback();
				},
			);
			mockUsersClear.mockResolvedValue(undefined);
			mockWorkspacesClear.mockResolvedValue(undefined);
			mockNodesClear.mockResolvedValue(undefined);
			mockContentsClear.mockResolvedValue(undefined);
			mockDrawingsClear.mockResolvedValue(undefined);
			mockAttachmentsClear.mockResolvedValue(undefined);
			mockTagsClear.mockResolvedValue(undefined);
			mockDbVersionsClear.mockResolvedValue(undefined);

			mockUsersCount.mockResolvedValue(0);
			mockDbVersionsCount.mockResolvedValue(0);
			mockUsersAdd.mockResolvedValue("user-id");
			mockDbVersionsPut.mockResolvedValue("version-id");

			const config = { username: "reset-user" };
			const result = await runTE(resetDatabase(config));

			expect(E.isRight(result)).toBe(true);
			expect(mockUsersAdd).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "reset-user",
				}),
			);
		});

		it("should return Left on transaction error", async () => {
			mockTransaction.mockRejectedValue(new Error("Transaction failed"));

			const result = await runTE(resetDatabase());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("重置数据库失败");
			}
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// isDatabaseInitialized
	// ==========================================================================

	describe("isDatabaseInitialized", () => {
		it("should return true when both users and version exist", async () => {
			mockUsersCount.mockResolvedValue(1);
			mockDbVersionsCount.mockResolvedValue(1);

			const result = await runTE(isDatabaseInitialized());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when no users exist", async () => {
			mockUsersCount.mockResolvedValue(0);
			mockDbVersionsCount.mockResolvedValue(1);

			const result = await runTE(isDatabaseInitialized());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});

		it("should return false when no version exists", async () => {
			mockUsersCount.mockResolvedValue(1);
			mockDbVersionsCount.mockResolvedValue(0);

			const result = await runTE(isDatabaseInitialized());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});

		it("should return false when both are missing", async () => {
			mockUsersCount.mockResolvedValue(0);
			mockDbVersionsCount.mockResolvedValue(0);

			const result = await runTE(isDatabaseInitialized());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});

		it("should return false on hasUsers error", async () => {
			mockUsersCount.mockRejectedValue(new Error("Count failed"));
			mockDbVersionsCount.mockResolvedValue(1);

			const result = await runTE(isDatabaseInitialized());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});

		it("should return false on hasDBVersion error", async () => {
			mockUsersCount.mockResolvedValue(1);
			mockDbVersionsCount.mockRejectedValue(new Error("Count failed"));

			const result = await runTE(isDatabaseInitialized());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});
});
