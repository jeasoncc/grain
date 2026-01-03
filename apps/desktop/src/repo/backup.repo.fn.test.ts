/**
 * @file backup.repo.fn.test.ts
 * @description Backup Repository 单元测试
 *
 * 测试覆盖：
 * - createBackup: 创建备份
 * - restoreBackup: 恢复备份
 * - listBackups: 列出备份
 * - deleteBackup: 删除备份
 * - cleanupOldBackups: 清理旧备份
 *
 * @requirements 2.2, 2.3, 2.4, 2.5, 2.6
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackupInfo } from "@/types/rust-api";

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
 * 创建测试用的备份信息
 */
function createTestBackupInfo(overrides: Partial<BackupInfo> = {}): BackupInfo {
	return {
		filename: "backup-2024-01-01.db",
		path: "/path/to/backup-2024-01-01.db",
		createdAt: Date.now(),
		size: 1024 * 1024,
		...overrides,
	};
}

// ============================================================================
// Mock Setup
// ============================================================================

const { mockApi, mockLogger } = vi.hoisted(() => {
	return {
		mockApi: {
			createBackup: vi.fn(),
			restoreBackup: vi.fn(),
			listBackups: vi.fn(),
			deleteBackup: vi.fn(),
			cleanupOldBackups: vi.fn(),
		},
		mockLogger: {
			info: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
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

// Import after mocking
import {
	cleanupOldBackups,
	createBackup,
	deleteBackup,
	listBackups,
	restoreBackup,
} from "./backup.repo.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("backup.repo.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// createBackup
	// ==========================================================================

	describe("createBackup", () => {
		it("should return Right with BackupInfo on success", async () => {
			const testBackup = createTestBackupInfo();
			mockApi.createBackup.mockReturnValue(() =>
				Promise.resolve(E.right(testBackup)),
			);

			const result = await runTE(createBackup());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testBackup);
				expect(result.right.filename).toBe("backup-2024-01-01.db");
			}
			expect(mockApi.createBackup).toHaveBeenCalledTimes(1);
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Backup creation failed" };
			mockApi.createBackup.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(createBackup());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
				expect(result.left.message).toContain("Backup creation failed");
			}
		});
	});

	// ==========================================================================
	// restoreBackup
	// ==========================================================================

	describe("restoreBackup", () => {
		it("should return Right on successful restore", async () => {
			mockApi.restoreBackup.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const result = await runTE(restoreBackup("/path/to/backup.db"));

			expect(E.isRight(result)).toBe(true);
			expect(mockApi.restoreBackup).toHaveBeenCalledWith("/path/to/backup.db");
		});

		it("should return Left with error on restore failure", async () => {
			const error = { type: "DB_ERROR", message: "Restore failed" };
			mockApi.restoreBackup.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(restoreBackup("/path/to/backup.db"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("Restore failed");
			}
		});

		it("should pass correct backup path to API", async () => {
			mockApi.restoreBackup.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const backupPath = "/custom/path/backup-2024-01-15.db";
			await runTE(restoreBackup(backupPath));

			expect(mockApi.restoreBackup).toHaveBeenCalledWith(backupPath);
		});
	});

	// ==========================================================================
	// listBackups
	// ==========================================================================

	describe("listBackups", () => {
		it("should return Right with empty array when no backups exist", async () => {
			mockApi.listBackups.mockReturnValue(() => Promise.resolve(E.right([])));

			const result = await runTE(listBackups());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("should return Right with backup list on success", async () => {
			const testBackups = [
				createTestBackupInfo({ filename: "backup-1.db" }),
				createTestBackupInfo({ filename: "backup-2.db" }),
				createTestBackupInfo({ filename: "backup-3.db" }),
			];
			mockApi.listBackups.mockReturnValue(() =>
				Promise.resolve(E.right(testBackups)),
			);

			const result = await runTE(listBackups());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(3);
				expect(result.right[0].filename).toBe("backup-1.db");
				expect(result.right[1].filename).toBe("backup-2.db");
				expect(result.right[2].filename).toBe("backup-3.db");
			}
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to list backups" };
			mockApi.listBackups.mockReturnValue(() => Promise.resolve(E.left(error)));

			const result = await runTE(listBackups());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("Failed to list backups");
			}
		});
	});

	// ==========================================================================
	// deleteBackup
	// ==========================================================================

	describe("deleteBackup", () => {
		it("should return Right on successful deletion", async () => {
			mockApi.deleteBackup.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const result = await runTE(deleteBackup("/path/to/backup.db"));

			expect(E.isRight(result)).toBe(true);
			expect(mockApi.deleteBackup).toHaveBeenCalledWith("/path/to/backup.db");
		});

		it("should return Left with error on deletion failure", async () => {
			const error = { type: "DB_ERROR", message: "Delete failed" };
			mockApi.deleteBackup.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(deleteBackup("/path/to/backup.db"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("Delete failed");
			}
		});

		it("should pass correct backup path to API", async () => {
			mockApi.deleteBackup.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const backupPath = "/custom/path/old-backup.db";
			await runTE(deleteBackup(backupPath));

			expect(mockApi.deleteBackup).toHaveBeenCalledWith(backupPath);
		});
	});

	// ==========================================================================
	// cleanupOldBackups
	// ==========================================================================

	describe("cleanupOldBackups", () => {
		it("should return Right with deleted count on success", async () => {
			mockApi.cleanupOldBackups.mockReturnValue(() =>
				Promise.resolve(E.right(5)),
			);

			const result = await runTE(cleanupOldBackups(3));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(5);
			}
			expect(mockApi.cleanupOldBackups).toHaveBeenCalledWith(3);
		});

		it("should return Right with 0 when no backups to delete", async () => {
			mockApi.cleanupOldBackups.mockReturnValue(() =>
				Promise.resolve(E.right(0)),
			);

			const result = await runTE(cleanupOldBackups(10));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(0);
			}
		});

		it("should return Left with error on cleanup failure", async () => {
			const error = { type: "DB_ERROR", message: "Cleanup failed" };
			mockApi.cleanupOldBackups.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(cleanupOldBackups(3));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("Cleanup failed");
			}
		});

		it("should pass correct keepCount to API", async () => {
			mockApi.cleanupOldBackups.mockReturnValue(() =>
				Promise.resolve(E.right(2)),
			);

			await runTE(cleanupOldBackups(5));

			expect(mockApi.cleanupOldBackups).toHaveBeenCalledWith(5);
		});
	});
});
