/**
 * @file user.db.fn.test.ts
 * @description User 数据库函数的单元测试
 *
 * 测试覆盖：
 * - 基础 CRUD 操作
 * - 认证和订阅管理
 * - 用户查询
 *
 * @requirements 3.1, 3.2, 3.3
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserInterface } from "@/types/user/user.interface";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 UserInterface 对象
 */
function createTestUser(overrides: Partial<UserInterface> = {}): UserInterface {
	return {
		id: overrides.id ?? "550e8400-e29b-41d4-a716-446655440000",
		username: overrides.username ?? "testuser",
		displayName: overrides.displayName ?? "Test User",
		avatar: overrides.avatar ?? "",
		email: overrides.email ?? "test@example.com",
		lastLogin: overrides.lastLogin ?? new Date().toISOString(),
		createDate: overrides.createDate ?? new Date().toISOString(),
		plan: overrides.plan ?? "free",
		tokenStatus: overrides.tokenStatus ?? "unchecked",
		state: overrides.state ?? {
			lastLocation: "",
			currentProject: "",
			currentChapter: "",
			currentScene: "",
			currentTitle: "",
			currentTyping: "",
			lastCloudSave: "",
			lastLocalSave: "",
			isUserLoggedIn: false,
		},
		settings: overrides.settings ?? {
			theme: "dark",
			language: "en",
			fontSize: "16px",
		},
	};
}

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

const createWhereChain = (
	firstResult: unknown = undefined,
	toArrayResult: unknown[] = [],
	countResult = 0,
) => ({
	equals: vi.fn().mockReturnValue({
		first: vi.fn().mockResolvedValue(firstResult),
		toArray: vi.fn().mockResolvedValue(toArrayResult),
		count: vi.fn().mockResolvedValue(countResult),
	}),
});

vi.mock("./database", () => {
	const mockAdd = vi.fn();
	const mockGet = vi.fn();
	const mockPut = vi.fn();
	const mockUpdate = vi.fn();
	const mockDelete = vi.fn();
	const mockToArray = vi.fn();
	const mockCount = vi.fn();
	const mockWhere = vi.fn().mockReturnValue({
		equals: vi.fn().mockReturnValue({
			first: vi.fn().mockResolvedValue(undefined),
			toArray: vi.fn().mockResolvedValue([]),
			count: vi.fn().mockResolvedValue(0),
		}),
	});

	return {
		database: {
			users: {
				add: mockAdd,
				get: mockGet,
				put: mockPut,
				update: mockUpdate,
				delete: mockDelete,
				toArray: mockToArray,
				count: mockCount,
				where: mockWhere,
			},
		},
	};
});

vi.mock("@/log", () => ({
	default: {
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

import logger from "@/log";
import { database } from "./database";
import {
	addUser,
	countUsers,
	deleteUser,
	emailExists,
	getAllUsers,
	getCurrentUser,
	getOrCreateDefaultUser,
	getUserByEmail,
	getUserById,
	getUserByIdOrFail,
	getUserByUsername,
	getUsersByPlan,
	saveUser,
	touchUser,
	updateUser,
	updateUserFeatures,
	updateUserPlan,
	updateUserSettings,
	updateUserState,
	updateUserToken,
	userExists,
	usernameExists,
} from "./user.db.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("user.db.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// addUser
	// ==========================================================================

	describe("addUser", () => {
		it("should return Right with user on success", async () => {
			vi.mocked(database.users.add).mockResolvedValue("test-id");

			const result = await runTE(addUser("testuser"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.username).toBe("testuser");
			}
			expect(logger.info).toHaveBeenCalled();
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on database failure", async () => {
			vi.mocked(database.users.add).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(addUser("testuser"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
			expect(logger.error).toHaveBeenCalled();
		});

		it("should apply optional parameters", async () => {
			vi.mocked(database.users.add).mockResolvedValue("test-id");

			const result = await runTE(
				addUser("testuser", {
					displayName: "Test User",
					email: "test@example.com",
					plan: "premium",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.displayName).toBe("Test User");
				expect(result.right.email).toBe("test@example.com");
				expect(result.right.plan).toBe("premium");
			}
		});
	});

	// ==========================================================================
	// updateUser
	// ==========================================================================

	describe("updateUser", () => {
		it("should return Right with count on success", async () => {
			vi.mocked(database.users.update).mockResolvedValue(1);

			const result = await runTE(
				updateUser("user-1", { displayName: "New Name" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(1);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Right with 0 when user not found", async () => {
			vi.mocked(database.users.update).mockResolvedValue(0);

			const result = await runTE(
				updateUser("non-existent", { displayName: "New Name" }),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(0);
			}
			expect(logger.warn).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.users.update).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(
				updateUser("user-1", { displayName: "New Name" }),
			);

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// deleteUser
	// ==========================================================================

	describe("deleteUser", () => {
		it("should return Right on success", async () => {
			vi.mocked(database.users.delete).mockResolvedValue(undefined);

			const result = await runTE(deleteUser("user-1"));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.users.delete).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(deleteUser("user-1"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});

	// ==========================================================================
	// getUserById
	// ==========================================================================

	describe("getUserById", () => {
		it("should return Right with user when found", async () => {
			const testUser = createTestUser({ id: "user-1" });
			vi.mocked(database.users.get).mockResolvedValue(testUser);

			const result = await runTE(getUserById("user-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testUser);
			}
		});

		it("should return Right with undefined when not found", async () => {
			vi.mocked(database.users.get).mockResolvedValue(undefined);

			const result = await runTE(getUserById("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeUndefined();
			}
		});

		it("should return Left with error on failure", async () => {
			vi.mocked(database.users.get).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(getUserById("user-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// getUserByIdOrFail
	// ==========================================================================

	describe("getUserByIdOrFail", () => {
		it("should return Right with user when found", async () => {
			const testUser = createTestUser({ id: "user-1" });
			vi.mocked(database.users.get).mockResolvedValue(testUser);

			const result = await runTE(getUserByIdOrFail("user-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testUser);
			}
		});

		it("should return Left with NOT_FOUND when not found", async () => {
			vi.mocked(database.users.get).mockResolvedValue(undefined);

			const result = await runTE(getUserByIdOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
			}
		});
	});

	// ==========================================================================
	// getAllUsers
	// ==========================================================================

	describe("getAllUsers", () => {
		it("should return all users sorted by lastLogin", async () => {
			const testUsers = [
				createTestUser({
					id: "user-1",
					lastLogin: "2024-01-01T00:00:00.000Z",
				}),
				createTestUser({
					id: "user-2",
					lastLogin: "2024-01-02T00:00:00.000Z",
				}),
			];
			vi.mocked(database.users.toArray).mockResolvedValue(testUsers);

			const result = await runTE(getAllUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				// 最近登录的在前
				expect(result.right[0].id).toBe("user-2");
			}
		});
	});

	// ==========================================================================
	// getUserByUsername
	// ==========================================================================

	describe("getUserByUsername", () => {
		it("should return user when found", async () => {
			const testUser = createTestUser({ username: "testuser" });
			vi.mocked(database.users.where).mockReturnValue(
				createWhereChain(testUser) as unknown as ReturnType<
					typeof database.users.where
				>,
			);

			const result = await runTE(getUserByUsername("testuser"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right?.username).toBe("testuser");
			}
		});
	});

	// ==========================================================================
	// getUserByEmail
	// ==========================================================================

	describe("getUserByEmail", () => {
		it("should return user when found", async () => {
			const testUser = createTestUser({ email: "test@example.com" });
			vi.mocked(database.users.where).mockReturnValue(
				createWhereChain(testUser) as unknown as ReturnType<
					typeof database.users.where
				>,
			);

			const result = await runTE(getUserByEmail("test@example.com"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right?.email).toBe("test@example.com");
			}
		});
	});

	// ==========================================================================
	// getUsersByPlan
	// ==========================================================================

	describe("getUsersByPlan", () => {
		it("should return users with specified plan", async () => {
			const testUsers = [
				createTestUser({ id: "user-1", plan: "premium" }),
				createTestUser({ id: "user-2", plan: "free" }),
				createTestUser({ id: "user-3", plan: "premium" }),
			];
			vi.mocked(database.users.toArray).mockResolvedValue(testUsers);

			const result = await runTE(getUsersByPlan("premium"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right.every((u) => u.plan === "premium")).toBe(true);
			}
		});
	});

	// ==========================================================================
	// touchUser
	// ==========================================================================

	describe("touchUser", () => {
		it("should update lastLogin timestamp", async () => {
			vi.mocked(database.users.update).mockResolvedValue(1);

			const result = await runTE(touchUser("user-1"));

			expect(E.isRight(result)).toBe(true);
			expect(database.users.update).toHaveBeenCalledWith(
				"user-1",
				expect.objectContaining({ lastLogin: expect.any(String) }),
			);
		});
	});

	// ==========================================================================
	// updateUserPlan
	// ==========================================================================

	describe("updateUserPlan", () => {
		it("should update user plan", async () => {
			vi.mocked(database.users.update).mockResolvedValue(1);

			const result = await runTE(updateUserPlan("user-1", "premium"));

			expect(E.isRight(result)).toBe(true);
			expect(database.users.update).toHaveBeenCalledWith(
				"user-1",
				expect.objectContaining({ plan: "premium" }),
			);
		});

		it("should include expiresAt when provided", async () => {
			vi.mocked(database.users.update).mockResolvedValue(1);

			const expiresAt = "2025-01-01T00:00:00.000Z";
			const result = await runTE(
				updateUserPlan("user-1", "premium", expiresAt),
			);

			expect(E.isRight(result)).toBe(true);
			expect(database.users.update).toHaveBeenCalledWith(
				"user-1",
				expect.objectContaining({
					plan: "premium",
					planExpiresAt: expiresAt,
				}),
			);
		});
	});

	// ==========================================================================
	// updateUserToken
	// ==========================================================================

	describe("updateUserToken", () => {
		it("should update user token", async () => {
			vi.mocked(database.users.update).mockResolvedValue(1);

			const result = await runTE(
				updateUserToken("user-1", "new-token", "valid"),
			);

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// updateUserFeatures
	// ==========================================================================

	describe("updateUserFeatures", () => {
		it("should update user features", async () => {
			vi.mocked(database.users.update).mockResolvedValue(1);

			const features = { canUseCloudSync: true, canExportPDF: false };
			const result = await runTE(updateUserFeatures("user-1", features));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// updateUserState
	// ==========================================================================

	describe("updateUserState", () => {
		it("should update user state", async () => {
			vi.mocked(database.users.update).mockResolvedValue(1);

			const state = {
				lastLocation: "/workspace/1",
				currentProject: "project-1",
				currentChapter: "",
				currentScene: "",
				currentTitle: "",
				currentTyping: "",
				lastCloudSave: "",
				lastLocalSave: "",
				isUserLoggedIn: true,
			};
			const result = await runTE(updateUserState("user-1", state));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// updateUserSettings
	// ==========================================================================

	describe("updateUserSettings", () => {
		it("should update user settings", async () => {
			vi.mocked(database.users.update).mockResolvedValue(1);

			const settings = {
				theme: "light" as const,
				language: "zh-CN",
				fontSize: "14px",
			};
			const result = await runTE(updateUserSettings("user-1", settings));

			expect(E.isRight(result)).toBe(true);
			expect(logger.success).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// userExists
	// ==========================================================================

	describe("userExists", () => {
		it("should return true when user exists", async () => {
			vi.mocked(database.users.where).mockReturnValue(
				createWhereChain(undefined, [], 1) as unknown as ReturnType<
					typeof database.users.where
				>,
			);

			const result = await runTE(userExists("user-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});

		it("should return false when user does not exist", async () => {
			vi.mocked(database.users.where).mockReturnValue(
				createWhereChain(undefined, [], 0) as unknown as ReturnType<
					typeof database.users.where
				>,
			);

			const result = await runTE(userExists("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(false);
			}
		});
	});

	// ==========================================================================
	// usernameExists
	// ==========================================================================

	describe("usernameExists", () => {
		it("should return true when username exists", async () => {
			vi.mocked(database.users.where).mockReturnValue(
				createWhereChain(undefined, [], 1) as unknown as ReturnType<
					typeof database.users.where
				>,
			);

			const result = await runTE(usernameExists("testuser"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});
	});

	// ==========================================================================
	// emailExists
	// ==========================================================================

	describe("emailExists", () => {
		it("should return true when email exists", async () => {
			vi.mocked(database.users.where).mockReturnValue(
				createWhereChain(undefined, [], 1) as unknown as ReturnType<
					typeof database.users.where
				>,
			);

			const result = await runTE(emailExists("test@example.com"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(true);
			}
		});
	});

	// ==========================================================================
	// countUsers
	// ==========================================================================

	describe("countUsers", () => {
		it("should return user count", async () => {
			vi.mocked(database.users.count).mockResolvedValue(5);

			const result = await runTE(countUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBe(5);
			}
		});
	});

	// ==========================================================================
	// getCurrentUser
	// ==========================================================================

	describe("getCurrentUser", () => {
		it("should return first user", async () => {
			const testUsers = [
				createTestUser({
					id: "user-1",
					lastLogin: "2024-01-02T00:00:00.000Z",
				}),
				createTestUser({
					id: "user-2",
					lastLogin: "2024-01-01T00:00:00.000Z",
				}),
			];
			vi.mocked(database.users.toArray).mockResolvedValue(testUsers);

			const result = await runTE(getCurrentUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right?.id).toBe("user-1");
			}
		});

		it("should return undefined when no users", async () => {
			vi.mocked(database.users.toArray).mockResolvedValue([]);

			const result = await runTE(getCurrentUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeUndefined();
			}
		});
	});

	// ==========================================================================
	// getOrCreateDefaultUser
	// ==========================================================================

	describe("getOrCreateDefaultUser", () => {
		it("should return existing user", async () => {
			const testUser = createTestUser({ id: "user-1" });
			vi.mocked(database.users.toArray).mockResolvedValue([testUser]);

			const result = await runTE(getOrCreateDefaultUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.id).toBe("user-1");
			}
		});

		it("should create default user when none exists", async () => {
			vi.mocked(database.users.toArray).mockResolvedValue([]);
			vi.mocked(database.users.add).mockResolvedValue("new-id");

			const result = await runTE(getOrCreateDefaultUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.username).toBe("default");
			}
		});
	});

	// ==========================================================================
	// saveUser
	// ==========================================================================

	describe("saveUser", () => {
		it("should return Right with saved user", async () => {
			const testUser = createTestUser({ id: "user-1" });
			vi.mocked(database.users.put).mockResolvedValue("user-1");

			const result = await runTE(saveUser(testUser));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual(testUser);
			}
			expect(logger.success).toHaveBeenCalled();
		});

		it("should return Left with error on failure", async () => {
			const testUser = createTestUser({ id: "user-1" });
			vi.mocked(database.users.put).mockRejectedValue(new Error("DB Error"));

			const result = await runTE(saveUser(testUser));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("DB_ERROR");
			}
		});
	});
});
