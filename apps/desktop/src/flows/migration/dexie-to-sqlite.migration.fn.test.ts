/**
 * @file dexie-to-sqlite.migration.fn.test.ts
 * @description Dexie to SQLite 数据迁移工具测试
 *
 * 测试覆盖：
 * - Property 8: Migration Data Preservation - 迁移后数据完整性
 * - Property 9: Migration Rollback - 迁移回滚功能
 *
 * @requirements 10.2, 10.3, 10.4, 10.5
 */

/// <reference types="node" />

import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ContentInterface } from "@/types/content"
import type { NodeInterface } from "@/types/node"
import type { UserInterface } from "@/types/user"
import type { WorkspaceInterface } from "@/types/workspace"

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 运行 TaskEither 并返回 Either 结果
 */
async function runTE<Err, A>(te: TE.TaskEither<Err, A>): Promise<E.Either<Err, A>> {
	return te()
}

/**
 * 创建测试用的用户
 */
function createTestUser(overrides: Partial<UserInterface> = {}): UserInterface {
	return {
		avatar: "",
		createDate: dayjs().toISOString(),
		displayName: "Test User",
		email: "test@example.com",
		features: {
			canExportPDF: false,
			canUseAllScenes: true,
			canUseCloudSync: false,
			showAds: true,
		},
		id: "user-1",
		lastLogin: dayjs().toISOString(),
		lastTokenCheck: dayjs().toISOString(),
		plan: "free",
		planStartDate: dayjs().toISOString(),
		settings: {
			autosave: true,
			fontSize: "14px",
			language: "en",
			lastLocation: true,
			spellCheck: true,
			theme: "dark",
		},
		state: {
			currentChapter: "",
			currentProject: "",
			currentScene: "",
			currentTitle: "",
			currentTyping: "",
			isUserLoggedIn: false,
			lastCloudSave: "",
			lastLocalSave: "",
			lastLocation: "/",
		},
		token: "",
		tokenStatus: "unchecked",
		username: "testuser",
		...overrides,
	}
}

/**
 * 创建测试用的工作区
 */
function createTestWorkspace(overrides: Partial<WorkspaceInterface> = {}): WorkspaceInterface {
	return {
		author: "Test Author",
		createDate: dayjs().toISOString(),
		description: "A test workspace",
		id: "workspace-1",
		language: "en",
		lastOpen: dayjs().toISOString(),
		owner: "user-1",
		publisher: "",
		title: "Test Workspace",
		...overrides,
	}
}

/**
 * 创建测试用的节点
 */
function createTestNode(overrides: Partial<NodeInterface> = {}): NodeInterface {
	return {
		collapsed: false,
		createDate: dayjs().toISOString(),
		id: "node-1",
		lastEdit: dayjs().toISOString(),
		order: 0,
		parent: null,
		tags: [],
		title: "Test Node",
		type: "file",
		workspace: "workspace-1",
		...overrides,
	}
}

/**
 * 创建测试用的内容
 */
function createTestContent(overrides: Partial<ContentInterface> = {}): ContentInterface {
	return {
		content: '{"root":{"children":[]}}',
		contentType: "lexical",
		id: "content-1",
		lastEdit: dayjs().toISOString(),
		nodeId: "node-1",
		...overrides,
	}
}

// ============================================================================
// Mock Setup
// ============================================================================

const { mockRepo, mockLogger, mockLegacyDatabase } = vi.hoisted(() => {
	return {
		mockLegacyDatabase: {
			contents: {
				clear: vi.fn(),
				count: vi.fn(),
				toArray: vi.fn(),
			},
			nodes: {
				clear: vi.fn(),
				count: vi.fn(),
				toArray: vi.fn(),
			},
			transaction: vi.fn(),
			users: {
				clear: vi.fn(),
				count: vi.fn(),
				toArray: vi.fn(),
			},
			workspaces: {
				clear: vi.fn(),
				count: vi.fn(),
				toArray: vi.fn(),
			},
		},
		mockLogger: {
			debug: vi.fn(),
			error: vi.fn(),
			info: vi.fn(),
			success: vi.fn(),
			warn: vi.fn(),
		},
		mockRepo: {
			createContent: vi.fn(),
			createNode: vi.fn(),
			createUser: vi.fn(),
			createWorkspace: vi.fn(),
		},
	}
})

// Mock repo
vi.mock("@/io/api", () => ({
	createContent: mockRepo.createContent,
	createNode: mockRepo.createNode,
	createUser: mockRepo.createUser,
	createWorkspace: mockRepo.createWorkspace,
}))

// Mock logger
vi.mock("@/log", () => ({
	default: mockLogger,
}))

// Mock legacy database
vi.mock("@/db/legacy-database", () => ({
	legacyDatabase: mockLegacyDatabase,
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
	// Dexie Data Detection
	// ==========================================================================

	describe("hasDexieData", () => {
		it("should return true when Dexie has data", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1)
			mockLegacyDatabase.nodes.count.mockResolvedValue(5)
			mockLegacyDatabase.users.count.mockResolvedValue(1)

			const result = await runTE(hasDexieData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe(true)
			}
		})

		it("should return false when Dexie is empty", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(0)
			mockLegacyDatabase.nodes.count.mockResolvedValue(0)
			mockLegacyDatabase.users.count.mockResolvedValue(0)

			const result = await runTE(hasDexieData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe(false)
			}
		})

		it("should return true when only users exist", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(0)
			mockLegacyDatabase.nodes.count.mockResolvedValue(0)
			mockLegacyDatabase.users.count.mockResolvedValue(1)

			const result = await runTE(hasDexieData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe(true)
			}
		})
	})

	// ==========================================================================
	// needsMigration
	// ==========================================================================

	describe("needsMigration", () => {
		it("should return true when status is not_started and has data", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1)
			mockLegacyDatabase.nodes.count.mockResolvedValue(5)
			mockLegacyDatabase.users.count.mockResolvedValue(1)

			const result = await runTE(needsMigration())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe(true)
			}
		})

		it("should return false when status is completed", async () => {
			setMigrationStatus("completed")
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1)
			mockLegacyDatabase.nodes.count.mockResolvedValue(5)
			mockLegacyDatabase.users.count.mockResolvedValue(1)

			const result = await runTE(needsMigration())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe(false)
			}
		})

		it("should return false when no data exists", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(0)
			mockLegacyDatabase.nodes.count.mockResolvedValue(0)
			mockLegacyDatabase.users.count.mockResolvedValue(0)

			const result = await runTE(needsMigration())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right).toBe(false)
			}
		})
	})

	// ==========================================================================
	// readDexieData
	// ==========================================================================

	describe("readDexieData", () => {
		it("should read all data from Dexie", async () => {
			const testUsers = [createTestUser()]
			const testWorkspaces = [createTestWorkspace()]
			const testNodes = [createTestNode()]
			const testContents = [createTestContent()]

			mockLegacyDatabase.users.toArray.mockResolvedValue(testUsers)
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue(testWorkspaces)
			mockLegacyDatabase.nodes.toArray.mockResolvedValue(testNodes)
			mockLegacyDatabase.contents.toArray.mockResolvedValue(testContents)

			const result = await runTE(readDexieData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.users).toHaveLength(1)
				expect(result.right.workspaces).toHaveLength(1)
				expect(result.right.nodes).toHaveLength(1)
				expect(result.right.contents).toHaveLength(1)
			}
		})

		it("should return empty arrays when no data exists", async () => {
			mockLegacyDatabase.users.toArray.mockResolvedValue([])
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([])
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([])
			mockLegacyDatabase.contents.toArray.mockResolvedValue([])

			const result = await runTE(readDexieData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.users).toHaveLength(0)
				expect(result.right.workspaces).toHaveLength(0)
				expect(result.right.nodes).toHaveLength(0)
				expect(result.right.contents).toHaveLength(0)
			}
		})
	})

	// ==========================================================================
	// Property 8: Migration Data Preservation
	// ==========================================================================

	describe("Property 8: Migration Data Preservation", () => {
		it("should migrate all users with correct data", async () => {
			const testUser = createTestUser({ id: "old-user-1" })
			const newUser = createTestUser({ id: "new-user-1" })

			mockLegacyDatabase.workspaces.count.mockResolvedValue(0)
			mockLegacyDatabase.nodes.count.mockResolvedValue(0)
			mockLegacyDatabase.users.count.mockResolvedValue(1)
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser])
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([])
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([])
			mockLegacyDatabase.contents.toArray.mockResolvedValue([])

			mockRepo.createUser.mockReturnValue(() => Promise.resolve(E.right(newUser)))

			const result = await runTE(migrateData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed")
				expect(result.right.migratedCounts.users).toBe(1)
				expect(mockRepo.createUser).toHaveBeenCalledWith(
					expect.objectContaining({
						displayName: testUser.displayName,
						email: testUser.email,
						username: testUser.username,
					}),
				)
			}
		})

		it("should migrate workspaces with correct owner mapping", async () => {
			const testUser = createTestUser({ id: "old-user-1" })
			const newUser = createTestUser({ id: "new-user-1" })
			const testWorkspace = createTestWorkspace({
				id: "old-workspace-1",
				owner: "old-user-1",
			})
			const newWorkspace = createTestWorkspace({ id: "new-workspace-1" })

			mockLegacyDatabase.workspaces.count.mockResolvedValue(1)
			mockLegacyDatabase.nodes.count.mockResolvedValue(0)
			mockLegacyDatabase.users.count.mockResolvedValue(1)
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser])
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([testWorkspace])
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([])
			mockLegacyDatabase.contents.toArray.mockResolvedValue([])

			mockRepo.createUser.mockReturnValue(() => Promise.resolve(E.right(newUser)))
			mockRepo.createWorkspace.mockReturnValue(() => Promise.resolve(E.right(newWorkspace)))

			const result = await runTE(migrateData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed")
				expect(result.right.migratedCounts.workspaces).toBe(1)
				// Verify owner ID was mapped
				expect(mockRepo.createWorkspace).toHaveBeenCalledWith(
					expect.objectContaining({
						owner: "new-user-1", // Mapped from old-user-1
						title: testWorkspace.title,
					}),
				)
			}
		})

		it("should migrate nodes with correct workspace and parent mapping", async () => {
			const testUser = createTestUser({ id: "old-user-1" })
			const newUser = createTestUser({ id: "new-user-1" })
			const testWorkspace = createTestWorkspace({ id: "old-workspace-1" })
			const newWorkspace = createTestWorkspace({ id: "new-workspace-1" })
			const testNode = createTestNode({
				id: "old-node-1",
				workspace: "old-workspace-1",
			})
			const newNode = createTestNode({ id: "new-node-1" })

			mockLegacyDatabase.workspaces.count.mockResolvedValue(1)
			mockLegacyDatabase.nodes.count.mockResolvedValue(1)
			mockLegacyDatabase.users.count.mockResolvedValue(1)
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser])
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([testWorkspace])
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([testNode])
			mockLegacyDatabase.contents.toArray.mockResolvedValue([])

			mockRepo.createUser.mockReturnValue(() => Promise.resolve(E.right(newUser)))
			mockRepo.createWorkspace.mockReturnValue(() => Promise.resolve(E.right(newWorkspace)))
			mockRepo.createNode.mockReturnValue(() => Promise.resolve(E.right(newNode)))

			const result = await runTE(migrateData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed")
				expect(result.right.migratedCounts.nodes).toBe(1)
				// Verify workspace ID was mapped
				expect(mockRepo.createNode).toHaveBeenCalledWith(
					expect.objectContaining({
						title: testNode.title,
						workspace: "new-workspace-1", // Mapped from old-workspace-1
					}),
					undefined,
					testNode.tags,
				)
			}
		})

		it("should migrate contents with correct node mapping", async () => {
			const testUser = createTestUser({ id: "old-user-1" })
			const newUser = createTestUser({ id: "new-user-1" })
			const testWorkspace = createTestWorkspace({ id: "old-workspace-1" })
			const newWorkspace = createTestWorkspace({ id: "new-workspace-1" })
			const testNode = createTestNode({
				id: "old-node-1",
				workspace: "old-workspace-1",
			})
			const newNode = createTestNode({ id: "new-node-1" })
			const testContent = createTestContent({
				id: "old-content-1",
				nodeId: "old-node-1",
			})
			const newContent = createTestContent({ id: "new-content-1" })

			mockLegacyDatabase.workspaces.count.mockResolvedValue(1)
			mockLegacyDatabase.nodes.count.mockResolvedValue(1)
			mockLegacyDatabase.users.count.mockResolvedValue(1)
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser])
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([testWorkspace])
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([testNode])
			mockLegacyDatabase.contents.toArray.mockResolvedValue([testContent])

			mockRepo.createUser.mockReturnValue(() => Promise.resolve(E.right(newUser)))
			mockRepo.createWorkspace.mockReturnValue(() => Promise.resolve(E.right(newWorkspace)))
			mockRepo.createNode.mockReturnValue(() => Promise.resolve(E.right(newNode)))
			mockRepo.createContent.mockReturnValue(() => Promise.resolve(E.right(newContent)))

			const result = await runTE(migrateData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed")
				expect(result.right.migratedCounts.contents).toBe(1)
				// Verify node ID was mapped
				expect(mockRepo.createContent).toHaveBeenCalledWith(
					expect.objectContaining({
						content: testContent.content,
						nodeId: "new-node-1", // Mapped from old-node-1
					}),
				)
			}
		})

		it("should preserve ID mappings in result", async () => {
			const testUser = createTestUser({ id: "old-user-1" })
			const newUser = createTestUser({ id: "new-user-1" })
			const testWorkspace = createTestWorkspace({ id: "old-workspace-1" })
			const newWorkspace = createTestWorkspace({ id: "new-workspace-1" })
			const testNode = createTestNode({
				id: "old-node-1",
				workspace: "old-workspace-1",
			})
			const newNode = createTestNode({ id: "new-node-1" })

			mockLegacyDatabase.workspaces.count.mockResolvedValue(1)
			mockLegacyDatabase.nodes.count.mockResolvedValue(1)
			mockLegacyDatabase.users.count.mockResolvedValue(1)
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser])
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([testWorkspace])
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([testNode])
			mockLegacyDatabase.contents.toArray.mockResolvedValue([])

			mockRepo.createUser.mockReturnValue(() => Promise.resolve(E.right(newUser)))
			mockRepo.createWorkspace.mockReturnValue(() => Promise.resolve(E.right(newWorkspace)))
			mockRepo.createNode.mockReturnValue(() => Promise.resolve(E.right(newNode)))

			const result = await runTE(migrateData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.idMapping).toBeDefined()
				expect(result.right.idMapping?.users.get("old-user-1")).toBe("new-user-1")
				expect(result.right.idMapping?.workspaces.get("old-workspace-1")).toBe("new-workspace-1")
				expect(result.right.idMapping?.nodes.get("old-node-1")).toBe("new-node-1")
			}
		})
	})

	// ==========================================================================
	// Property 9: Migration Rollback
	// ==========================================================================

	describe("Property 9: Migration Rollback", () => {
		it("should set status to rolled_back on rollback", async () => {
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

		it("should set status to failed on migration error", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1)
			mockLegacyDatabase.nodes.count.mockResolvedValue(0)
			mockLegacyDatabase.users.count.mockResolvedValue(1)
			mockLegacyDatabase.users.toArray.mockRejectedValue(new Error("Database error"))

			const result = await runTE(migrateData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.status).toBe("failed")
				expect(result.right.errors).toHaveLength(1)
			}
			expect(getMigrationStatus()).toBe("failed")
		})

		it("should not migrate when status is already completed", async () => {
			setMigrationStatus("completed")
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1)
			mockLegacyDatabase.nodes.count.mockResolvedValue(1)
			mockLegacyDatabase.users.count.mockResolvedValue(1)

			const result = await runTE(migrateData())

			expect(E.isRight(result)).toBe(true)
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed")
				expect(result.right.migratedCounts.users).toBe(0)
				expect(result.right.migratedCounts.workspaces).toBe(0)
				expect(result.right.migratedCounts.nodes).toBe(0)
				expect(result.right.migratedCounts.contents).toBe(0)
			}
			// Should not call any repo functions
			expect(mockRepo.createUser).not.toHaveBeenCalled()
		})
	})

	// ==========================================================================
	// clearDexieData
	// ==========================================================================

	describe("clearDexieData", () => {
		it("should clear all Dexie tables", async () => {
			mockLegacyDatabase.transaction.mockImplementation(async (_mode, _tables, callback) => {
				await callback()
			})

			const result = await runTE(clearDexieData())

			expect(E.isRight(result)).toBe(true)
			expect(mockLegacyDatabase.transaction).toHaveBeenCalled()
		})
	})
})
