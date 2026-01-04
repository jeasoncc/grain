/**
 * @file init.db.fn.test.ts
 * @description 数据库初始化函数的单元测试
 *
 * 测试覆盖：
 * - 检查用户是否存在
 * - 创建默认访客用户
 * - 初始化数据库
 * - 检查数据库初始化状态
 * - 获取或创建当前用户
 *
 * 注意：数据库版本现在由 Rust 后端管理，相关函数已废弃
 *
 * @requirements 11.1, 11.2, 11.3, 11.4
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserInterface } from "@/types/user";

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

// ============================================================================
// Mock Setup
// ============================================================================

const { mockUserRepo, mockLogger } = vi.hoisted(() => {
	return {
		mockUserRepo: {
			getUsers: vi.fn(),
			createUser: vi.fn(),
			getCurrentUser: vi.fn(),
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

// Mock logger
vi.mock("@/log", () => ({
	default: mockLogger,
}));

// Mock user repo
vi.mock("@/repo/user.repo.fn", () => ({
	getUsers: mockUserRepo.getUsers,
	createUser: mockUserRepo.createUser,
	getCurrentUser: mockUserRepo.getCurrentUser,
}));

// Import after mocking
import {
	createDefaultUser,
	ensureCurrentUser,
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
			mockUserRepo.getUsers.mockReturnValue(() =>
				Promise.resolve(E.right([createTestUser()])),
			);

			const result = await runTE(hasUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return Right(false) when no users exist", async () => {
			mockUserRepo.getUsers.mockReturnValue(() => Promise.resolve(E.right([])));

			const result = await runTE(hasUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});

		it("should return Left on repo error", async () => {
			const error = { type: "DB_ERROR", message: "Database error" };
			mockUserRepo.getUsers.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(hasUsers());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// createDefaultUser
	// ==========================================================================

	describe("createDefaultUser", () => {
		it("should create default user with default config", async () => {
			const newUser = createTestUser({ username: "guest" });
			mockUserRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);

			const result = await runTE(createDefaultUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(newUser.id);
			}
			expect(mockUserRepo.createUser).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "guest",
					displayName: "Guest User",
				}),
			);
		});

		it("should create user with custom config", async () => {
			const newUser = createTestUser({ username: "custom-user" });
			mockUserRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);

			const config = {
				username: "custom-user",
				displayName: "Custom User",
				theme: "light" as const,
				language: "zh-CN",
			};

			const result = await runTE(createDefaultUser(config));

			expect(E.isRight(result)).toBe(true);
			expect(mockUserRepo.createUser).toHaveBeenCalledWith(
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

		it("should return Left on repo error", async () => {
			const error = { type: "DB_ERROR", message: "Create failed" };
			mockUserRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(createDefaultUser());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// initDatabase
	// ==========================================================================

	describe("initDatabase", () => {
		it("should create default user when no users exist", async () => {
			mockUserRepo.getUsers.mockReturnValue(() => Promise.resolve(E.right([])));
			const newUser = createTestUser({ username: "guest" });
			mockUserRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);

			const result = await runTE(initDatabase());

			expect(E.isRight(result)).toBe(true);
			expect(mockUserRepo.createUser).toHaveBeenCalled();
		});

		it("should skip user creation when users exist", async () => {
			mockUserRepo.getUsers.mockReturnValue(() =>
				Promise.resolve(E.right([createTestUser()])),
			);

			const result = await runTE(initDatabase());

			expect(E.isRight(result)).toBe(true);
			expect(mockUserRepo.createUser).not.toHaveBeenCalled();
		});

		it("should use custom config", async () => {
			mockUserRepo.getUsers.mockReturnValue(() => Promise.resolve(E.right([])));
			const newUser = createTestUser({ username: "admin" });
			mockUserRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);

			const config = {
				username: "admin",
				displayName: "Admin User",
			};

			const result = await runTE(initDatabase(config));

			expect(E.isRight(result)).toBe(true);
			expect(mockUserRepo.createUser).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "admin",
					displayName: "Admin User",
				}),
			);
		});

		it("should return Left on hasUsers error", async () => {
			const error = { type: "DB_ERROR", message: "Check failed" };
			mockUserRepo.getUsers.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(initDatabase());

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// isDatabaseInitialized
	// ==========================================================================

	describe("isDatabaseInitialized", () => {
		it("should return true when users exist", async () => {
			mockUserRepo.getUsers.mockReturnValue(() =>
				Promise.resolve(E.right([createTestUser()])),
			);

			const result = await runTE(isDatabaseInitialized());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when no users exist", async () => {
			mockUserRepo.getUsers.mockReturnValue(() => Promise.resolve(E.right([])));

			const result = await runTE(isDatabaseInitialized());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	// ==========================================================================
	// ensureCurrentUser
	// ==========================================================================

	describe("ensureCurrentUser", () => {
		it("should return existing user ID when user exists", async () => {
			const existingUser = createTestUser({ id: "existing-user-id" });
			mockUserRepo.getCurrentUser.mockReturnValue(() =>
				Promise.resolve(E.right(existingUser)),
			);

			const result = await runTE(ensureCurrentUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe("existing-user-id");
			}
			expect(mockUserRepo.createUser).not.toHaveBeenCalled();
		});

		it("should create default user when no user exists", async () => {
			mockUserRepo.getCurrentUser.mockReturnValue(() =>
				Promise.resolve(E.right(null)),
			);
			const newUser = createTestUser({ id: "new-user-id" });
			mockUserRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);

			const result = await runTE(ensureCurrentUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe("new-user-id");
			}
			expect(mockUserRepo.createUser).toHaveBeenCalled();
		});

		it("should use custom config when creating user", async () => {
			mockUserRepo.getCurrentUser.mockReturnValue(() =>
				Promise.resolve(E.right(null)),
			);
			const newUser = createTestUser({ id: "custom-user-id" });
			mockUserRepo.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(newUser)),
			);

			const config = { username: "custom" };
			const result = await runTE(ensureCurrentUser(config));

			expect(E.isRight(result)).toBe(true);
			expect(mockUserRepo.createUser).toHaveBeenCalledWith(
				expect.objectContaining({
					username: "custom",
				}),
			);
		});
	});

	// ==========================================================================
	// Deprecated Functions
	// ==========================================================================

	describe("Deprecated Functions", () => {
		it("hasDBVersion should always return true", async () => {
			const result = await runTE(hasDBVersion());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("setDBVersion should return rust-managed", async () => {
			const result = await runTE(setDBVersion());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe("rust-managed");
			}
		});

		it("getDBVersion should return 2.0.0", async () => {
			const result = await runTE(getDBVersion());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe("2.0.0");
			}
		});

		it("resetDatabase should return error", async () => {
			const result = await runTE(resetDatabase());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("deprecated");
			}
		});
	});
});
