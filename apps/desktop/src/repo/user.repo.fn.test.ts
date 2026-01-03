/**
 * @file user.repo.fn.test.ts
 * @description User Repository 单元测试
 *
 * 测试覆盖：
 * - getUsers: 获取所有用户
 * - getUser: 获取单个用户
 * - getUserByUsername: 按用户名获取用户
 * - getUserByEmail: 按邮箱获取用户
 * - getCurrentUser: 获取当前用户
 * - createUser: 创建用户
 * - updateUser: 更新用户
 * - deleteUser: 删除用户
 *
 * @requirements 4.4
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserResponse } from "@/types/rust-api";

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
 * 创建测试用的用户响应
 */
function createTestUserResponse(
	overrides: Partial<UserResponse> = {},
): UserResponse {
	const now = Date.now();
	return {
		id: "user-test-1",
		username: "testuser",
		displayName: "Test User",
		avatar: null,
		email: "test@example.com",
		lastLogin: now,
		createdAt: now - 86400000, // 1 day ago
		plan: "free",
		planStartDate: null,
		planExpiresAt: null,
		trialExpiresAt: null,
		token: null,
		serverMessage: null,
		features: null,
		state: null,
		settings: null,
		...overrides,
	};
}

// ============================================================================
// Mock Setup
// ============================================================================

const { mockApi } = vi.hoisted(() => {
	return {
		mockApi: {
			getUsers: vi.fn(),
			getUser: vi.fn(),
			getUserByUsername: vi.fn(),
			getUserByEmail: vi.fn(),
			getCurrentUser: vi.fn(),
			createUser: vi.fn(),
			updateUser: vi.fn(),
			updateUserLastLogin: vi.fn(),
			deleteUser: vi.fn(),
		},
	};
});

// Mock api-client
vi.mock("@/db/api-client.fn", () => mockApi);

// Import after mocking
import {
	createUser,
	deleteUser,
	getCurrentUser,
	getUser,
	getUserByEmail,
	getUserByUsername,
	getUserOrFail,
	getUsers,
	updateUser,
	updateUserLastLogin,
} from "./user.repo.fn";

// ============================================================================
// Unit Tests
// ============================================================================

describe("user.repo.fn", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// getUsers
	// ==========================================================================

	describe("getUsers", () => {
		it("should return Right with empty array when no users exist", async () => {
			mockApi.getUsers.mockReturnValue(() => Promise.resolve(E.right([])));

			const result = await runTE(getUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toEqual([]);
			}
		});

		it("should return Right with decoded users on success", async () => {
			const testUsers = [
				createTestUserResponse({ id: "user-1", username: "user1" }),
				createTestUserResponse({ id: "user-2", username: "user2" }),
			];
			mockApi.getUsers.mockReturnValue(() =>
				Promise.resolve(E.right(testUsers)),
			);

			const result = await runTE(getUsers());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toHaveLength(2);
				expect(result.right[0].id).toBe("user-1");
				expect(result.right[0].username).toBe("user1");
				expect(result.right[1].id).toBe("user-2");
			}
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to get users" };
			mockApi.getUsers.mockReturnValue(() => Promise.resolve(E.left(error)));

			const result = await runTE(getUsers());

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.message).toContain("Failed to get users");
			}
		});
	});

	// ==========================================================================
	// getUser
	// ==========================================================================

	describe("getUser", () => {
		it("should return Right with null when user not found", async () => {
			mockApi.getUser.mockReturnValue(() => Promise.resolve(E.right(null)));

			const result = await runTE(getUser("non-existent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});

		it("should return Right with decoded user on success", async () => {
			const testUser = createTestUserResponse();
			mockApi.getUser.mockReturnValue(() => Promise.resolve(E.right(testUser)));

			const result = await runTE(getUser("user-test-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).not.toBeNull();
				expect(result.right?.id).toBe("user-test-1");
				expect(result.right?.username).toBe("testuser");
			}
			expect(mockApi.getUser).toHaveBeenCalledWith("user-test-1");
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to get user" };
			mockApi.getUser.mockReturnValue(() => Promise.resolve(E.left(error)));

			const result = await runTE(getUser("user-test-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// getUserOrFail
	// ==========================================================================

	describe("getUserOrFail", () => {
		it("should return Right with user when found", async () => {
			const testUser = createTestUserResponse();
			mockApi.getUser.mockReturnValue(() => Promise.resolve(E.right(testUser)));

			const result = await runTE(getUserOrFail("user-test-1"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.id).toBe("user-test-1");
			}
		});

		it("should return Left with NOT_FOUND error when user not found", async () => {
			mockApi.getUser.mockReturnValue(() => Promise.resolve(E.right(null)));

			const result = await runTE(getUserOrFail("non-existent"));

			expect(E.isLeft(result)).toBe(true);
			if (E.isLeft(result)) {
				expect(result.left.type).toBe("NOT_FOUND");
				expect(result.left.message).toContain("用户不存在");
			}
		});
	});

	// ==========================================================================
	// getUserByUsername
	// ==========================================================================

	describe("getUserByUsername", () => {
		it("should return Right with null when user not found", async () => {
			mockApi.getUserByUsername.mockReturnValue(() =>
				Promise.resolve(E.right(null)),
			);

			const result = await runTE(getUserByUsername("nonexistent"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});

		it("should return Right with decoded user on success", async () => {
			const testUser = createTestUserResponse({ username: "findme" });
			mockApi.getUserByUsername.mockReturnValue(() =>
				Promise.resolve(E.right(testUser)),
			);

			const result = await runTE(getUserByUsername("findme"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right?.username).toBe("findme");
			}
			expect(mockApi.getUserByUsername).toHaveBeenCalledWith("findme");
		});
	});

	// ==========================================================================
	// getUserByEmail
	// ==========================================================================

	describe("getUserByEmail", () => {
		it("should return Right with null when user not found", async () => {
			mockApi.getUserByEmail.mockReturnValue(() =>
				Promise.resolve(E.right(null)),
			);

			const result = await runTE(getUserByEmail("notfound@example.com"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});

		it("should return Right with decoded user on success", async () => {
			const testUser = createTestUserResponse({ email: "found@example.com" });
			mockApi.getUserByEmail.mockReturnValue(() =>
				Promise.resolve(E.right(testUser)),
			);

			const result = await runTE(getUserByEmail("found@example.com"));

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right?.email).toBe("found@example.com");
			}
			expect(mockApi.getUserByEmail).toHaveBeenCalledWith("found@example.com");
		});
	});

	// ==========================================================================
	// getCurrentUser
	// ==========================================================================

	describe("getCurrentUser", () => {
		it("should return Right with null when no current user", async () => {
			mockApi.getCurrentUser.mockReturnValue(() =>
				Promise.resolve(E.right(null)),
			);

			const result = await runTE(getCurrentUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right).toBeNull();
			}
		});

		it("should return Right with decoded current user on success", async () => {
			const testUser = createTestUserResponse();
			mockApi.getCurrentUser.mockReturnValue(() =>
				Promise.resolve(E.right(testUser)),
			);

			const result = await runTE(getCurrentUser());

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right?.id).toBe("user-test-1");
			}
		});
	});

	// ==========================================================================
	// createUser
	// ==========================================================================

	describe("createUser", () => {
		it("should return Right with created user on success", async () => {
			const testUser = createTestUserResponse({ username: "newuser" });
			mockApi.createUser.mockReturnValue(() =>
				Promise.resolve(E.right(testUser)),
			);

			const result = await runTE(
				createUser({
					username: "newuser",
					email: "new@example.com",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.username).toBe("newuser");
			}
			expect(mockApi.createUser).toHaveBeenCalledTimes(1);
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to create user" };
			mockApi.createUser.mockReturnValue(() => Promise.resolve(E.left(error)));

			const result = await runTE(
				createUser({
					username: "newuser",
				}),
			);

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// updateUser
	// ==========================================================================

	describe("updateUser", () => {
		it("should return Right with updated user on success", async () => {
			const testUser = createTestUserResponse({
				displayName: "Updated Name",
			});
			mockApi.updateUser.mockReturnValue(() =>
				Promise.resolve(E.right(testUser)),
			);

			const result = await runTE(
				updateUser("user-test-1", {
					displayName: "Updated Name",
				}),
			);

			expect(E.isRight(result)).toBe(true);
			if (E.isRight(result)) {
				expect(result.right.displayName).toBe("Updated Name");
			}
			expect(mockApi.updateUser).toHaveBeenCalledTimes(1);
		});

		it("should return Left with error on API failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to update user" };
			mockApi.updateUser.mockReturnValue(() => Promise.resolve(E.left(error)));

			const result = await runTE(
				updateUser("user-test-1", {
					displayName: "New Name",
				}),
			);

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// updateUserLastLogin
	// ==========================================================================

	describe("updateUserLastLogin", () => {
		it("should return Right with updated user on success", async () => {
			const testUser = createTestUserResponse();
			mockApi.updateUserLastLogin.mockReturnValue(() =>
				Promise.resolve(E.right(testUser)),
			);

			const result = await runTE(updateUserLastLogin("user-test-1"));

			expect(E.isRight(result)).toBe(true);
			expect(mockApi.updateUserLastLogin).toHaveBeenCalledWith("user-test-1");
		});

		it("should return Left with error on API failure", async () => {
			const error = {
				type: "DB_ERROR",
				message: "Failed to update last login",
			};
			mockApi.updateUserLastLogin.mockReturnValue(() =>
				Promise.resolve(E.left(error)),
			);

			const result = await runTE(updateUserLastLogin("user-test-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});

	// ==========================================================================
	// deleteUser
	// ==========================================================================

	describe("deleteUser", () => {
		it("should return Right on successful deletion", async () => {
			mockApi.deleteUser.mockReturnValue(() =>
				Promise.resolve(E.right(undefined)),
			);

			const result = await runTE(deleteUser("user-test-1"));

			expect(E.isRight(result)).toBe(true);
			expect(mockApi.deleteUser).toHaveBeenCalledWith("user-test-1");
		});

		it("should return Left with error on deletion failure", async () => {
			const error = { type: "DB_ERROR", message: "Failed to delete user" };
			mockApi.deleteUser.mockReturnValue(() => Promise.resolve(E.left(error)));

			const result = await runTE(deleteUser("user-test-1"));

			expect(E.isLeft(result)).toBe(true);
		});
	});
});
