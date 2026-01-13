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

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentInterface } from "@/types/content";
import type { NodeInterface } from "@/types/node";
import type { UserInterface } from "@/types/user";
import type { WorkspaceInterface } from "@/types/workspace";

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
 * 创建测试用的用户
 */
function createTestUser(overrides: Partial<UserInterface> = {}): UserInterface {
	return {
		id: "user-1",
		username: "testuser",
		displayName: "Test User",
		email: "test@example.com",
		avatar: "",
		plan: "free",
		planStartDate: new Date().toISOString(),
		token: "",
		tokenStatus: "unchecked",
		lastTokenCheck: new Date().toISOString(),
		features: {
			maxWorkspaces: 3,
			maxNodesPerWorkspace: 1000,
			cloudSync: false,
			aiAssistant: false,
			advancedExport: false,
			customThemes: false,
		},
		settings: {
			theme: "dark",
			language: "en",
			autosave: true,
			spellCheck: true,
			lastLocation: true,
			fontSize: "14px",
		},
		state: {
			lastWorkspaceId: null,
			lastNodeId: null,
			sidebarWidth: 280,
			sidebarCollapsed: false,
		},
		lastLogin: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

/**
 * 创建测试用的工作区
 */
function createTestWorkspace(
	overrides: Partial<WorkspaceInterface> = {},
): WorkspaceInterface {
	return {
		id: "workspace-1",
		title: "Test Workspace",
		description: "A test workspace",
		owner: "user-1",
		author: "Test Author",
		publisher: "",
		language: "en",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

/**
 * 创建测试用的节点
 */
function createTestNode(overrides: Partial<NodeInterface> = {}): NodeInterface {
	return {
		id: "node-1",
		workspace: "workspace-1",
		title: "Test Node",
		type: "file",
		parent: null,
		order: 0,
		collapsed: false,
		tags: [],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

/**
 * 创建测试用的内容
 */
function createTestContent(
	overrides: Partial<ContentInterface> = {},
): ContentInterface {
	return {
		id: "content-1",
		nodeId: "node-1",
		content: '{"root":{"children":[]}}',
		contentType: "lexical",
		version: 1,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

// ============================================================================
// Mock Setup
// ============================================================================

const { mockRepo, mockLogger, mockLegacyDatabase } = vi.hoisted(() => {
	return {
		mockRepo: {
			createUser: vi.fn(),
			createWorkspace: vi.fn(),
			createNode: vi.fn(),
			createContent: vi.fn(),
		},
		mockLogger: {
			info: vi.fn(),
			success: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		},
		mockLegacyDatabase: {
			workspaces: {
				count: vi.fn(),
				toArray: vi.fn(),
				clear: vi.fn(),
			},
			nodes: {
				count: vi.fn(),
				toArray: vi.fn(),
				clear: vi.fn(),
			},
			contents: {
				count: vi.fn(),
				toArray: vi.fn(),
				clear: vi.fn(),
			},
			users: {
				count: vi.fn(),
				toArray: vi.fn(),
				clear: vi.fn(),
			},
			transaction: vi.fn(),
		},
	};
});

// Mock repo
vi.mock("@/io/api", () => ({
	createUser: mockRepo.createUser,
	createWorkspace: mockRepo.createWorkspace,
	createNode: mockRepo.createNode,
	createContent: mockRepo.createContent,
}));

// Mock logger
vi.mock("@/log", () => ({
	default: mockLogger,
}));

// Mock legacy database
vi.mock("@/db/legacy-database", () => ({
	legacyDatabase: mockLegacyDatabase,
}));

// Mock localStorage
const mockLocalStorage = {
	store: {} as Record<string, string>,
	getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
	setItem: vi.fn((key: string, value: string) => {
		mockLocalStorage.store[key] = value;
	}),
	removeItem: vi.fn((key: string) => {
		delete mockLocalStorage.store[key];
	}),
	clear: vi.fn(() => {
		mockLocalStorage.store = {};
	}),
};

Object.defineProperty(global, "localStorage", {
	value: mockLocalStorage,
	writable: true,
});

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
} from "./dexie-to-sqlite.migration.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("dexie-to-sqlite.migration.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLocalStorage.clear();
	});

	// ==========================================================================
	// Migration Status Management
	// ==========================================================================

	describe("Migration Status Management", () => {
		it("should return 'not_started' when no status is set", () => {
			const status = getMigrationStatus();
			expect(status).toBe("not_started");
		});

		it("should set and get migration status correctly", () => {
			setMigrationStatus("in_progress");
			expect(getMigrationStatus()).toBe("in_progress");

			setMigrationStatus("completed");
			expect(getMigrationStatus()).toBe("completed");

			setMigrationStatus("failed");
			expect(getMigrationStatus()).toBe("failed");
		});

		it("should clear migration status", () => {
			setMigrationStatus("completed");
			clearMigrationStatus();
			expect(getMigrationStatus()).toBe("not_started");
		});
	});

	// ==========================================================================
	// Dexie Data Detection
	// ==========================================================================

	describe("hasDexieData", () => {
		it("should return true when Dexie has data", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1);
			mockLegacyDatabase.nodes.count.mockResolvedValue(5);
			mockLegacyDatabase.users.count.mockResolvedValue(1);

			const result = await runTE(hasDexieData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when Dexie is empty", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(0);
			mockLegacyDatabase.nodes.count.mockResolvedValue(0);
			mockLegacyDatabase.users.count.mockResolvedValue(0);

			const result = await runTE(hasDexieData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});

		it("should return true when only users exist", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(0);
			mockLegacyDatabase.nodes.count.mockResolvedValue(0);
			mockLegacyDatabase.users.count.mockResolvedValue(1);

			const result = await runTE(hasDexieData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});
	});

	// ==========================================================================
	// needsMigration
	// ==========================================================================

	describe("needsMigration", () => {
		it("should return true when status is not_started and has data", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1);
			mockLegacyDatabase.nodes.count.mockResolvedValue(5);
			mockLegacyDatabase.users.count.mockResolvedValue(1);

			const result = await runTE(needsMigration());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when status is completed", async () => {
			setMigrationStatus("completed");
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1);
			mockLegacyDatabase.nodes.count.mockResolvedValue(5);
			mockLegacyDatabase.users.count.mockResolvedValue(1);

			const result = await runTE(needsMigration());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});

		it("should return false when no data exists", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(0);
			mockLegacyDatabase.nodes.count.mockResolvedValue(0);
			mockLegacyDatabase.users.count.mockResolvedValue(0);

			const result = await runTE(needsMigration());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	// ==========================================================================
	// readDexieData
	// ==========================================================================

	describe("readDexieData", () => {
		it("should read all data from Dexie", async () => {
			const testUsers = [createTestUser()];
			const testWorkspaces = [createTestWorkspace()];
			const testNodes = [createTestNode()];
			const testContents = [createTestContent()];

			mockLegacyDatabase.users.toArray.mockResolvedValue(testUsers);
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue(testWorkspaces);
			mockLegacyDatabase.nodes.toArray.mockResolvedValue(testNodes);
			mockLegacyDatabase.contents.toArray.mockResolvedValue(testContents);

			const result = await runTE(readDexieData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.users).toHaveLength(1);
				expect(result.right.workspaces).toHaveLength(1);
				expect(result.right.nodes).toHaveLength(1);
				expect(result.right.contents).toHaveLength(1);
			}
		});

		it("should return empty arrays when no data exists", async () => {
			mockLegacyDatabase.users.toArray.mockResolvedValue([]);
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([]);
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([]);
			mockLegacyDatabase.contents.toArray.mockResolvedValue([]);

			const result = await runTE(readDexieData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.users).toHaveLength(0);
				expect(result.right.workspaces).toHaveLength(0);
				expect(result.right.nodes).toHaveLength(0);
				expect(result.right.contents).toHaveLength(0);
			}
		});
	});

	// ==========================================================================
	// Property 8: Migration Data Preservation
	// ==========================================================================

	describe("Property 8: Migration Data Preservation", () => {
		it("should migrate all users with correct data", async () => {
			const testUser = createTestUser({ id: "old-user-1" });
			const newUser = createTestUser({ id: "new-user-1" });

			mockLegacyDatabase.workspaces.count.mockResolvedValue(0);
			mockLegacyDatabase.nodes.count.mockResolvedValue(0);
			mockLegacyDatabase.users.count.mockResolvedValue(1);
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser]);
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([]);
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([]);
			mockLegacyDatabase.contents.toArray.mockResolvedValue([]);

			mockRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);

			const result = await runTE(migrateData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed");
				expect(result.right.migratedCounts.users).toBe(1);
				expect(mockRepo.createUser).toHaveBeenCalledWith(
					expect.objectContaining({
						username: testUser.username,
						displayName: testUser.displayName,
						email: testUser.email,
					}),
				);
			}
		});

		it("should migrate workspaces with correct owner mapping", async () => {
			const testUser = createTestUser({ id: "old-user-1" });
			const newUser = createTestUser({ id: "new-user-1" });
			const testWorkspace = createTestWorkspace({
				id: "old-workspace-1",
				owner: "old-user-1",
			});
			const newWorkspace = createTestWorkspace({ id: "new-workspace-1" });

			mockLegacyDatabase.workspaces.count.mockResolvedValue(1);
			mockLegacyDatabase.nodes.count.mockResolvedValue(0);
			mockLegacyDatabase.users.count.mockResolvedValue(1);
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser]);
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([testWorkspace]);
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([]);
			mockLegacyDatabase.contents.toArray.mockResolvedValue([]);

			mockRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);
			mockRepo.createWorkspace.mockReturnValue(() =>
				Promise.resolve(E.right(newWorkspace)),
			);

			const result = await runTE(migrateData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed");
				expect(result.right.migratedCounts.workspaces).toBe(1);
				// Verify owner ID was mapped
				expect(mockRepo.createWorkspace).toHaveBeenCalledWith(
					expect.objectContaining({
						title: testWorkspace.title,
						owner: "new-user-1", // Mapped from old-user-1
					}),
				);
			}
		});

		it("should migrate nodes with correct workspace and parent mapping", async () => {
			const testUser = createTestUser({ id: "old-user-1" });
			const newUser = createTestUser({ id: "new-user-1" });
			const testWorkspace = createTestWorkspace({ id: "old-workspace-1" });
			const newWorkspace = createTestWorkspace({ id: "new-workspace-1" });
			const testNode = createTestNode({
				id: "old-node-1",
				workspace: "old-workspace-1",
			});
			const newNode = createTestNode({ id: "new-node-1" });

			mockLegacyDatabase.workspaces.count.mockResolvedValue(1);
			mockLegacyDatabase.nodes.count.mockResolvedValue(1);
			mockLegacyDatabase.users.count.mockResolvedValue(1);
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser]);
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([testWorkspace]);
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([testNode]);
			mockLegacyDatabase.contents.toArray.mockResolvedValue([]);

			mockRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);
			mockRepo.createWorkspace.mockReturnValue(() =>
				Promise.resolve(E.right(newWorkspace)),
			);
			mockRepo.createNode.mockReturnValue(() =>
				Promise.resolve(E.right(newNode)),
			);

			const result = await runTE(migrateData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed");
				expect(result.right.migratedCounts.nodes).toBe(1);
				// Verify workspace ID was mapped
				expect(mockRepo.createNode).toHaveBeenCalledWith(
					expect.objectContaining({
						workspace: "new-workspace-1", // Mapped from old-workspace-1
						title: testNode.title,
					}),
					undefined,
					testNode.tags,
				);
			}
		});

		it("should migrate contents with correct node mapping", async () => {
			const testUser = createTestUser({ id: "old-user-1" });
			const newUser = createTestUser({ id: "new-user-1" });
			const testWorkspace = createTestWorkspace({ id: "old-workspace-1" });
			const newWorkspace = createTestWorkspace({ id: "new-workspace-1" });
			const testNode = createTestNode({
				id: "old-node-1",
				workspace: "old-workspace-1",
			});
			const newNode = createTestNode({ id: "new-node-1" });
			const testContent = createTestContent({
				id: "old-content-1",
				nodeId: "old-node-1",
			});
			const newContent = createTestContent({ id: "new-content-1" });

			mockLegacyDatabase.workspaces.count.mockResolvedValue(1);
			mockLegacyDatabase.nodes.count.mockResolvedValue(1);
			mockLegacyDatabase.users.count.mockResolvedValue(1);
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser]);
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([testWorkspace]);
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([testNode]);
			mockLegacyDatabase.contents.toArray.mockResolvedValue([testContent]);

			mockRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);
			mockRepo.createWorkspace.mockReturnValue(() =>
				Promise.resolve(E.right(newWorkspace)),
			);
			mockRepo.createNode.mockReturnValue(() =>
				Promise.resolve(E.right(newNode)),
			);
			mockRepo.createContent.mockReturnValue(() =>
				Promise.resolve(E.right(newContent)),
			);

			const result = await runTE(migrateData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed");
				expect(result.right.migratedCounts.contents).toBe(1);
				// Verify node ID was mapped
				expect(mockRepo.createContent).toHaveBeenCalledWith(
					expect.objectContaining({
						nodeId: "new-node-1", // Mapped from old-node-1
						content: testContent.content,
					}),
				);
			}
		});

		it("should preserve ID mappings in result", async () => {
			const testUser = createTestUser({ id: "old-user-1" });
			const newUser = createTestUser({ id: "new-user-1" });
			const testWorkspace = createTestWorkspace({ id: "old-workspace-1" });
			const newWorkspace = createTestWorkspace({ id: "new-workspace-1" });
			const testNode = createTestNode({
				id: "old-node-1",
				workspace: "old-workspace-1",
			});
			const newNode = createTestNode({ id: "new-node-1" });

			mockLegacyDatabase.workspaces.count.mockResolvedValue(1);
			mockLegacyDatabase.nodes.count.mockResolvedValue(1);
			mockLegacyDatabase.users.count.mockResolvedValue(1);
			mockLegacyDatabase.users.toArray.mockResolvedValue([testUser]);
			mockLegacyDatabase.workspaces.toArray.mockResolvedValue([testWorkspace]);
			mockLegacyDatabase.nodes.toArray.mockResolvedValue([testNode]);
			mockLegacyDatabase.contents.toArray.mockResolvedValue([]);

			mockRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);
			mockRepo.createWorkspace.mockReturnValue(() =>
				Promise.resolve(E.right(newWorkspace)),
			);
			mockRepo.createNode.mockReturnValue(() =>
				Promise.resolve(E.right(newNode)),
			);

			const result = await runTE(migrateData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.idMapping).toBeDefined();
				expect(result.right.idMapping?.users.get("old-user-1")).toBe(
					"new-user-1",
				);
				expect(result.right.idMapping?.workspaces.get("old-workspace-1")).toBe(
					"new-workspace-1",
				);
				expect(result.right.idMapping?.nodes.get("old-node-1")).toBe(
					"new-node-1",
				);
			}
		});
	});

	// ==========================================================================
	// Property 9: Migration Rollback
	// ==========================================================================

	describe("Property 9: Migration Rollback", () => {
		it("should set status to rolled_back on rollback", async () => {
			setMigrationStatus("failed");

			const result = await runTE(rollbackMigration());

			expect(E.isRight(result)).toBe(true);
			expect(getMigrationStatus()).toBe("rolled_back");
		});

		it("should reset migration status to allow re-migration", async () => {
			setMigrationStatus("completed");

			const result = await runTE(resetMigrationStatus());

			expect(E.isRight(result)).toBe(true);
			expect(getMigrationStatus()).toBe("not_started");
		});

		it("should set status to failed on migration error", async () => {
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1);
			mockLegacyDatabase.nodes.count.mockResolvedValue(0);
			mockLegacyDatabase.users.count.mockResolvedValue(1);
			mockLegacyDatabase.users.toArray.mockRejectedValue(
				new Error("Database error"),
			);

			const result = await runTE(migrateData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.status).toBe("failed");
				expect(result.right.errors).toHaveLength(1);
			}
			expect(getMigrationStatus()).toBe("failed");
		});

		it("should not migrate when status is already completed", async () => {
			setMigrationStatus("completed");
			mockLegacyDatabase.workspaces.count.mockResolvedValue(1);
			mockLegacyDatabase.nodes.count.mockResolvedValue(1);
			mockLegacyDatabase.users.count.mockResolvedValue(1);

			const result = await runTE(migrateData());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.status).toBe("completed");
				expect(result.right.migratedCounts.users).toBe(0);
				expect(result.right.migratedCounts.workspaces).toBe(0);
				expect(result.right.migratedCounts.nodes).toBe(0);
				expect(result.right.migratedCounts.contents).toBe(0);
			}
			// Should not call any repo functions
			expect(mockRepo.createUser).not.toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// clearDexieData
	// ==========================================================================

	describe("clearDexieData", () => {
		it("should clear all Dexie tables", async () => {
			mockLegacyDatabase.transaction.mockImplementation(
				async (_mode, _tables, callback) => {
					await callback();
				},
			);

			const result = await runTE(clearDexieData());

			expect(E.isRight(result)).toBe(true);
			expect(mockLegacyDatabase.transaction).toHaveBeenCalled();
		});
	});
});
