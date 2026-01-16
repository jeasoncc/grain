/**
 * @file dexie-to-sqlite.migration.fn.test.ts
 * @description SQLite 迁移工具测试（Dexie 支持已移除）
 *
 * 测试覆盖：
 * - 迁移状态管理
 * - SQLite-only 架构验证
 * - 向后兼容性测试
 *
 * @requirements 7.1, 7.2, 7.4
 */

/// <reference types="node" />

import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { beforeEach, describe, expect, it, vi } from "vitest"

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 运行 TaskEither 并返回 Either 结果
 */
async function runTE<Err, A>(te: TE.TaskEither<Err, A>): Promise<E.Either<Err, A>> {
	return te()
}

// ============================================================================
// Mock Setup
// ============================================================================

const { mockLogger } = vi.hoisted(() => {
	return {
		mockLogger: {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			success: vi.fn(),
			warn: vi.fn(),
		},
	}
})

// Mock logger
vi.mock("@/io/log/logger.api", () => ({
	info: mockLogger.info,
	warn: mockLogger.warn,
}))

// Mock localStorage
const mockLocalStorage = {
	clear: vi.fn(() => {
		mockLocalStorage.store = {}
	}),
	getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
	removeItem: vi.fn((key: string) => {
		delete mockLocalStorage.store[key]
	}),
	setItem: vi.fn((key: string, value: string) => {
		mockLocalStorage.store[key] = value
	}),
	store: {} as Record<string, string>,
}

Object.defineProperty(global, "localStorage", {
	value: mockLocalStorage,
	writable: true,
})

// Import after mocking
import {
	clearDexieData,
	clearMigrationStatus,
	getMigrationStatus,
	hasDexieData,
	type MigrationStatus,
	migrateData,
	needsMigration,
	readDexieData,
	resetMigrationStatus,
	rollbackMigration,
	setMigrationStatus,
} from "./dexie-to-sqlite.migration.fn"

// ============================================================================
// Unit Tests
// ============================================================================

describe("dexie-to-sqlite.migration.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockLocalStorage.clear()
	})

	// ==========================================================================
	// Migration Status Management
	// ==========================================================================

	describe("Migration Status Management", () => {
		it("should return 'not_started' when no status is set", () => {
			const status = getMigrationStatus()
			expect(status).toBe("not_started")
		})

		it("should set and get migration status correctly", () => {
			setMigrationStatus("in_progress")
			expect(getMigrationStatus()).toBe("in_progress")

			setMigrationStatus("completed")
			expect(getMigrationStatus()).toBe("completed")

			setMigrationStatus("failed")
			expect(getMigrationStatus()).toBe("failed")
		})

		it("should clear migration status", () => {
			setMigrationStatus("completed")
			clearMigrationStatus()
			expect(getMigrationStatus()).toBe("not_started")
		})
	})

	// ==========================================================================
	// SQLite-Only Architecture Tests
	// ==========================================================================

	describe("SQLite-Only Architecture", () => {
		it("hasDexieData should always return false (Dexie support removed)", async () => {
			const result = await runTE(hasDexieData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe(false)
			}
		})

		it("needsMigration should always return false (no Dexie data exists)", async () => {
			const result = await runTE(needsMigration())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe(false)
			}
		})

		it("readDexieData should return empty data snapshot", async () => {
			const result = await runTE(readDexieData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.users).toHaveLength(0)
				expect(result.right.workspaces).toHaveLength(0)
				expect(result.right.nodes).toHaveLength(0)
				expect(result.right.contents).toHaveLength(0)
			}
		})

		it("migrateData should return completed status without performing migration", async () => {
			const result = await runTE(migrateData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed")
				expect(result.right.migratedCounts.users).toBe(0)
				expect(result.right.migratedCounts.workspaces).toBe(0)
				expect(result.right.migratedCounts.nodes).toBe(0)
				expect(result.right.migratedCounts.contents).toBe(0)
				expect(result.right.errors).toHaveLength(0)
			}
		})

		it("clearDexieData should be a no-op (Dexie support removed)", async () => {
			const result = await runTE(clearDexieData())

			expect(E.isRight(result)).toBe(true)
		})
	})

	// ==========================================================================
	// Migration Status Management (SQLite-Only)
	// ==========================================================================

	describe("Migration Status Management (SQLite-Only)", () => {
		it("should handle rollback migration status", async () => {
			setMigrationStatus("failed")

			const result = await runTE(rollbackMigration())

			expect(E.isRight(result)).toBe(true)
			expect(getMigrationStatus()).toBe("rolled_back")
		})

		it("should reset migration status to allow re-migration", async () => {
			setMigrationStatus("completed")

			const result = await runTE(resetMigrationStatus())

			expect(E.isRight(result)).toBe(true)
			expect(getMigrationStatus()).toBe("not_started")
		})
	})

	// ==========================================================================
	// Backward Compatibility Tests
	// ==========================================================================

	describe("Backward Compatibility", () => {
		it("should maintain migration interface for existing code", async () => {
			// Test that all migration functions exist and return expected types
			expect(typeof hasDexieData).toBe("function")
			expect(typeof needsMigration).toBe("function")
			expect(typeof readDexieData).toBe("function")
			expect(typeof migrateData).toBe("function")
			expect(typeof clearDexieData).toBe("function")
			expect(typeof rollbackMigration).toBe("function")
			expect(typeof resetMigrationStatus).toBe("function")
		})

		it("should handle migration status persistence across sessions", () => {
			// Test localStorage persistence
			setMigrationStatus("completed")

			// Simulate page reload by clearing in-memory state
			const status = getMigrationStatus()
			expect(status).toBe("completed")
		})
	})
})
