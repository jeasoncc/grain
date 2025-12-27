/**
 * @file clear-data.db.fn.test.ts
 * @description 数据清理函数的单元测试
 *
 * 测试覆盖：
 * - IndexedDB 清理
 * - 浏览器存储清理
 * - 综合清理
 * - 统计信息
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
// Mock Setup
// ============================================================================

const { mockLogger, mockLocalStorage, mockSessionStorage } = vi.hoisted(() => {
	// 创建 storage mock
	const createStorageMock = () => {
		const storage = new Map<string, string>();
		return {
			getItem: vi.fn((key: string) => storage.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
			removeItem: vi.fn((key: string) => storage.delete(key)),
			clear: vi.fn(() => storage.clear()),
			key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
			get length() {
				return storage.size;
			},
		};
	};

	return {
		mockLogger: {
			info: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		},
		mockLocalStorage: createStorageMock(),
		mockSessionStorage: createStorageMock(),
	};
});

// 设置全局 storage
vi.stubGlobal("localStorage", mockLocalStorage);
vi.stubGlobal("sessionStorage", mockSessionStorage);

// Mock document.cookie
let mockCookies = "";
const mockDocument = {
	get cookie() {
		return mockCookies;
	},
	set cookie(value: string) {
		// 简单模拟：如果设置过期时间为过去，则清除
		if (value.includes("expires=Thu, 01 Jan 1970")) {
			mockCookies = "";
		} else {
			mockCookies = value;
		}
	},
};
vi.stubGlobal("document", mockDocument);

// Mock caches API
const mockCaches = {
	keys: vi.fn().mockResolvedValue(["cache-1", "cache-2"]),
	delete: vi.fn().mockResolvedValue(true),
};
vi.stubGlobal("caches", mockCaches);

// Mock window
const mockWindow = {
	caches: mockCaches,
	location: {
		hostname: "localhost",
	},
};
vi.stubGlobal("window", mockWindow);

// Mock database
vi.mock("./database", () => ({
	database: {
		users: {
			clear: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
		},
		workspaces: {
			clear: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
		},
		nodes: {
			clear: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
		},
		contents: {
			clear: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
		},
		drawings: {
			clear: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
		},
		attachments: {
			clear: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
		},
		tags: {
			clear: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
		},
		dbVersions: {
			clear: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
		},
		transaction: vi
			.fn()
			.mockImplementation(
				async (
					_mode: string,
					_tables: unknown[],
					callback: () => Promise<void>,
				) => {
					await callback();
				},
			),
	},
}));

vi.mock("@/log", () => ({
	default: mockLogger,
}));

import { formatBytes } from "@/fn/format";
// Import after mocking
import {
	clearAllData,
	clearCaches,
	clearCookies,
	clearIndexedDB,
	clearLocalStorage,
	clearSessionStorage,
	getStorageStats,
} from "./clear-data.db.fn";
import { database } from "./database";

// ============================================================================
// Unit Tests
// ============================================================================

describe("clear-data.db.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLocalStorage.clear();
		mockSessionStorage.clear();
		mockCookies = "";
	});

	// ==========================================================================
	// clearIndexedDB
	// ==========================================================================

	describe("clearIndexedDB", () => {
		it("should clear all database tables", async () => {
			const result = await runTE(clearIndexedDB());

			expect(E.isRight(result)).toBe(true);
			expect(database.transaction).toHaveBeenCalled();
			expect(mockLogger.success).toHaveBeenCalledWith(
				"[DB] IndexedDB 清理成功",
			);
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.transaction).mockRejectedValueOnce(
				new Error("Transaction failed"),
			);

			const result = await runTE(clearIndexedDB());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// clearLocalStorage
	// ==========================================================================

	describe("clearLocalStorage", () => {
		it("should clear localStorage", async () => {
			mockLocalStorage.setItem("key1", "value1");
			mockLocalStorage.setItem("key2", "value2");

			const result = await runTE(clearLocalStorage());

			expect(E.isRight(result)).toBe(true);
			expect(mockLocalStorage.clear).toHaveBeenCalled();
			expect(mockLogger.success).toHaveBeenCalledWith(
				"[DB] localStorage 清理成功",
			);
		});
	});

	// ==========================================================================
	// clearSessionStorage
	// ==========================================================================

	describe("clearSessionStorage", () => {
		it("should clear sessionStorage", async () => {
			mockSessionStorage.setItem("key1", "value1");

			const result = await runTE(clearSessionStorage());

			expect(E.isRight(result)).toBe(true);
			expect(mockSessionStorage.clear).toHaveBeenCalled();
			expect(mockLogger.success).toHaveBeenCalledWith(
				"[DB] sessionStorage 清理成功",
			);
		});
	});

	// ==========================================================================
	// clearCookies
	// ==========================================================================

	describe("clearCookies", () => {
		it("should clear cookies", async () => {
			mockCookies = "session=abc123; user=test";

			const result = await runTE(clearCookies());

			expect(E.isRight(result)).toBe(true);
			expect(mockLogger.success).toHaveBeenCalledWith("[DB] cookies 清理成功");
		});

		it("should handle empty cookies", async () => {
			mockCookies = "";

			const result = await runTE(clearCookies());

			expect(E.isRight(result)).toBe(true);
		});
	});

	// ==========================================================================
	// clearCaches
	// ==========================================================================

	describe("clearCaches", () => {
		it("should clear all caches", async () => {
			const result = await runTE(clearCaches());

			expect(E.isRight(result)).toBe(true);
			expect(mockCaches.keys).toHaveBeenCalled();
			expect(mockCaches.delete).toHaveBeenCalledTimes(2);
			expect(mockLogger.success).toHaveBeenCalledWith("[DB] 缓存清理成功");
		});

		it("should handle missing caches API gracefully", async () => {
			// 临时移除 window.caches
			const originalWindow = globalThis.window;
			vi.stubGlobal("window", { location: { hostname: "localhost" } });

			const result = await runTE(clearCaches());

			expect(E.isRight(result)).toBe(true);
			expect(mockLogger.info).toHaveBeenCalledWith(
				"[DB] 浏览器不支持 Cache API，跳过缓存清理",
			);

			// 恢复
			vi.stubGlobal("window", originalWindow);
		});
	});

	// ==========================================================================
	// clearAllData
	// ==========================================================================

	describe("clearAllData", () => {
		it("should clear all data by default", async () => {
			const result = await runTE(clearAllData());

			expect(E.isRight(result)).toBe(true);
			expect(mockLogger.success).toHaveBeenCalledWith("[DB] 所有数据清理成功");
		});

		it("should respect options", async () => {
			const result = await runTE(
				clearAllData({
					clearIndexedDB: true,
					clearLocalStorage: false,
					clearSessionStorage: false,
					clearCookies: false,
					clearCaches: false,
				}),
			);

			expect(E.isRight(result)).toBe(true);
			expect(database.transaction).toHaveBeenCalled();
			// localStorage.clear 不应该被调用
		});

		it("should continue on partial failures", async () => {
			vi.mocked(database.transaction).mockRejectedValueOnce(
				new Error("DB Error"),
			);

			const result = await runTE(
				clearAllData({
					clearIndexedDB: true,
					clearLocalStorage: true,
					clearSessionStorage: false,
					clearCookies: false,
					clearCaches: false,
				}),
			);

			// 应该返回错误，因为有部分失败
			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// getStorageStats
	// ==========================================================================

	describe("getStorageStats", () => {
		it("should return storage statistics", async () => {
			vi.mocked(database.users.toArray).mockResolvedValue([{ id: "1" }]);
			vi.mocked(database.workspaces.toArray).mockResolvedValue([
				{ id: "1" },
				{ id: "2" },
			]);
			vi.mocked(database.nodes.toArray).mockResolvedValue([]);
			vi.mocked(database.contents.toArray).mockResolvedValue([]);
			vi.mocked(database.attachments.toArray).mockResolvedValue([]);
			vi.mocked(database.tags.toArray).mockResolvedValue([]);

			const result = await runTE(getStorageStats());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.indexedDB.tables.users).toBe(1);
				expect(result.right.indexedDB.tables.workspaces).toBe(2);
				expect(result.right.localStorage).toBeDefined();
				expect(result.right.sessionStorage).toBeDefined();
				expect(result.right.cookies).toBeDefined();
			}
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.users.toArray).mockRejectedValue(
				new Error("DB Error"),
			);

			const result = await runTE(getStorageStats());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// formatBytes
	// ==========================================================================

	describe("formatBytes", () => {
		it("should format 0 bytes", () => {
			expect(formatBytes(0)).toBe("0 B");
		});

		it("should format bytes", () => {
			expect(formatBytes(500)).toBe("500 B");
		});

		it("should format kilobytes", () => {
			expect(formatBytes(1024)).toBe("1 KB");
			expect(formatBytes(1536)).toBe("1.5 KB");
		});

		it("should format megabytes", () => {
			expect(formatBytes(1048576)).toBe("1 MB");
			expect(formatBytes(1572864)).toBe("1.5 MB");
		});

		it("should format gigabytes", () => {
			expect(formatBytes(1073741824)).toBe("1 GB");
		});
	});
});
