/**
 * @file create-workspace.action.test.ts
 * @description 创建工作区 Action 的单元测试
 *
 * 测试覆盖：
 * - 基本创建功能
 * - 可选参数处理
 * - 错误处理
 *
 * @requirements 7.1, 7.4
 */

import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import type * as TE from "fp-ts/TaskEither"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { WorkspaceInterface } from "@/types/workspace/workspace.interface"

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 WorkspaceInterface 对象
 */
function createTestWorkspace(overrides: Partial<WorkspaceInterface> = {}): WorkspaceInterface {
	return {
		author: overrides.author ?? "",
		createDate: overrides.createDate ?? dayjs().toISOString(),
		description: overrides.description ?? "",
		id: overrides.id ?? "550e8400-e29b-41d4-a716-446655440000",
		language: overrides.language ?? "zh-CN",
		lastOpen: overrides.lastOpen ?? dayjs().toISOString(),
		members: overrides.members ?? [],
		owner: overrides.owner ?? undefined,
		publisher: overrides.publisher ?? "",
		title: overrides.title ?? "Test Workspace",
	}
}

/**
 * 运行 TaskEither 并返回 Either 结果
 */
async function runTE<Err, A>(te: TE.TaskEither<Err, A>): Promise<E.Either<Err, A>> {
	return te()
}

// ============================================================================
// Mock Setup
// ============================================================================

const mockAddWorkspace = vi.fn()

vi.mock("@/db/workspace.db.fn", () => ({
	addWorkspace: (...args: unknown[]) => mockAddWorkspace(...args),
}))

vi.mock("@/log", () => ({
	default: {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		start: vi.fn(),
		success: vi.fn(),
		warn: vi.fn(),
	},
}))

// Logger removed - not needed in tests
import { createWorkspace } from "./create-workspace.flow"

// ============================================================================
// Unit Tests
// ============================================================================

describe("createWorkspace", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should create workspace with only title", async () => {
		const testWorkspace = createTestWorkspace({ title: "My Workspace" })
		mockAddWorkspace.mockReturnValue(() => Promise.resolve(E.right(testWorkspace)))

		const result = await runTE(createWorkspace({ title: "My Workspace" }))

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right.title).toBe("My Workspace")
		}
	})

	it("should create workspace with all optional parameters", async () => {
		const testWorkspace = createTestWorkspace({
			author: "Test Author",
			description: "Test Description",
			language: "en",
			members: ["user-1", "user-2"],
			owner: "owner-1",
			publisher: "Test Publisher",
			title: "My Workspace",
		})
		mockAddWorkspace.mockReturnValue(() => Promise.resolve(E.right(testWorkspace)))

		const result = await runTE(
			createWorkspace({
				author: "Test Author",
				description: "Test Description",
				language: "en",
				members: ["user-1", "user-2"],
				owner: "owner-1",
				publisher: "Test Publisher",
				title: "My Workspace",
			}),
		)

		expect(E.isRight(result)).toBe(true)
		if (E.isRight(result)) {
			expect(result.right.title).toBe("My Workspace")
			expect(result.right.author).toBe("Test Author")
			expect(result.right.description).toBe("Test Description")
			expect(result.right.publisher).toBe("Test Publisher")
			expect(result.right.language).toBe("en")
			expect(result.right.members).toEqual(["user-1", "user-2"])
			expect(result.right.owner).toBe("owner-1")
		}
		expect(mockAddWorkspace).toHaveBeenCalledWith("My Workspace", {
			author: "Test Author",
			description: "Test Description",
			language: "en",
			members: ["user-1", "user-2"],
			owner: "owner-1",
			publisher: "Test Publisher",
		})
	})

	it("should return Left with error on failure", async () => {
		const error = { message: "Database error", type: "DB_ERROR" as const }
		mockAddWorkspace.mockReturnValue(() => Promise.resolve(E.left(error)))

		const result = await runTE(createWorkspace({ title: "My Workspace" }))

		expect(E.isLeft(result)).toBe(true)
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("DB_ERROR")
		}
	})
})
