/**
 * @file rename-node.action.test.ts
 * @description 重命名节点 Action 测试
 */

import * as E from "fp-ts/Either";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renameNode } from "./rename-node.action";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/repo/node.repo.fn", () => ({
	updateNode: vi.fn(),
}));

vi.mock("@/log/index", () => ({
	default: {
		start: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
}));

import { updateNode } from "@/repo/node.repo.fn";

// ============================================================================
// Mock Data
// ============================================================================

const mockNode = {
	id: "node-1",
	title: "新标题",
	type: "file" as const,
	workspace: "ws-1",
	parent: null,
	order: 0,
	collapsed: false,
	tags: [],
	createDate: "2024-01-01T00:00:00.000Z",
	lastEdit: "2024-01-01T00:00:00.000Z",
};

// ============================================================================
// Tests
// ============================================================================

describe("renameNode", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// 设置默认 mock 返回值
		vi.mocked(updateNode).mockReturnValue(() =>
			Promise.resolve(E.right(mockNode)),
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("应该成功重命名节点", async () => {
		const params = {
			nodeId: "node-1",
			title: "新标题",
		};

		const result = await renameNode(params)();

		expect(E.isRight(result)).toBe(true);
		expect(updateNode).toHaveBeenCalledWith("node-1", { title: "新标题" });
	});

	it("应该处理空标题", async () => {
		const params = {
			nodeId: "node-1",
			title: "",
		};

		const result = await renameNode(params)();

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.message).toBe("标题不能为空");
			expect(result.left.type).toBe("VALIDATION_ERROR");
		}

		// 不应该调用数据库函数
		expect(updateNode).not.toHaveBeenCalled();
	});

	it("应该处理只有空格的标题", async () => {
		const params = {
			nodeId: "node-1",
			title: "   ",
		};

		const result = await renameNode(params)();

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.message).toBe("标题不能为空");
		}
	});

	it("应该去除标题前后空格", async () => {
		const params = {
			nodeId: "node-1",
			title: "  新标题  ",
		};

		const result = await renameNode(params)();

		expect(E.isRight(result)).toBe(true);
		expect(updateNode).toHaveBeenCalledWith("node-1", { title: "新标题" });
	});

	it("应该处理数据库更新失败", async () => {
		vi.mocked(updateNode).mockReturnValue(() =>
			Promise.resolve(E.left({ type: "DB_ERROR", message: "更新失败" })),
		);

		const params = {
			nodeId: "node-1",
			title: "新标题",
		};

		const result = await renameNode(params)();

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.message).toContain("更新失败");
		}
	});
});
