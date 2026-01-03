/**
 * @file move-node.action.test.ts
 * @description 移动节点 Action 测试
 */

import * as E from "fp-ts/Either";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moveNode } from "./move-node.action";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/repo/node.repo.fn", () => ({
	getNextSortOrder: vi.fn(),
	getNode: vi.fn(),
	getNodesByWorkspace: vi.fn(),
	moveNode: vi.fn(),
}));

vi.mock("@/fn/node/node.tree.fn", () => ({
	wouldCreateCycle: vi.fn(),
}));

vi.mock("@/log/index", () => ({
	default: {
		start: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
}));

import {
	getNextSortOrder,
	getNode,
	getNodesByWorkspace,
	moveNode as moveNodeRepo,
} from "@/repo/node.repo.fn";
import { wouldCreateCycle } from "@/fn/node/node.tree.fn";

// ============================================================================
// Test Data
// ============================================================================

const mockNode = {
	id: "node-1",
	title: "测试节点",
	type: "file" as const,
	workspace: "ws-1",
	parent: null,
	order: 0,
	collapsed: false,
	tags: [],
	createDate: "2024-01-01T00:00:00.000Z",
	lastEdit: "2024-01-01T00:00:00.000Z",
};

const mockNodes = [
	mockNode,
	{
		...mockNode,
		id: "node-2",
		title: "父节点",
		type: "folder" as const,
	},
];

// ============================================================================
// Tests
// ============================================================================

describe("moveNode", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// 设置默认 mock 返回值
		vi.mocked(getNode).mockReturnValue(() =>
			Promise.resolve(E.right(mockNode)),
		);
		vi.mocked(getNodesByWorkspace).mockReturnValue(() =>
			Promise.resolve(E.right(mockNodes)),
		);
		vi.mocked(wouldCreateCycle).mockReturnValue(false);
		vi.mocked(getNextSortOrder).mockReturnValue(() => Promise.resolve(E.right(1)));
		vi.mocked(moveNodeRepo).mockReturnValue(() =>
			Promise.resolve(E.right(mockNode)),
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("应该成功移动节点", async () => {
		const params = {
			nodeId: "node-1",
			newParentId: "node-2",
			newOrder: 0,
		};

		const result = await moveNode(params)();

		expect(E.isRight(result)).toBe(true);
		expect(getNode).toHaveBeenCalledWith("node-1");
		expect(getNodesByWorkspace).toHaveBeenCalledWith("ws-1");
		expect(wouldCreateCycle).toHaveBeenCalledWith(
			mockNodes,
			"node-1",
			"node-2",
		);
		expect(moveNodeRepo).toHaveBeenCalledWith("node-1", "node-2", 0);
	});

	it("应该在未指定排序时自动计算", async () => {
		const params = {
			nodeId: "node-1",
			newParentId: "node-2",
		};

		const result = await moveNode(params)();

		expect(E.isRight(result)).toBe(true);
		expect(getNextSortOrder).toHaveBeenCalledWith("ws-1", "node-2");
		expect(moveNodeRepo).toHaveBeenCalledWith("node-1", "node-2", 1);
	});

	it("应该检测循环引用", async () => {
		vi.mocked(wouldCreateCycle).mockReturnValue(true);

		const params = {
			nodeId: "node-1",
			newParentId: "node-2",
		};

		const result = await moveNode(params)();

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.message).toContain("循环引用");
			expect(result.left.type).toBe("CYCLE_ERROR");
		}

		// 不应该执行移动
		expect(moveNodeRepo).not.toHaveBeenCalled();
	});

	it("应该处理节点不存在", async () => {
		vi.mocked(getNode).mockReturnValue(() =>
			Promise.resolve(E.right(null)),
		);

		const params = {
			nodeId: "nonexistent",
			newParentId: "node-2",
		};

		const result = await moveNode(params)();

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.message).toContain("节点不存在");
		}
	});

	it("应该处理获取工作区节点失败", async () => {
		vi.mocked(getNodesByWorkspace).mockReturnValue(() =>
			Promise.resolve(E.left({ type: "DB_ERROR", message: "获取节点失败" })),
		);

		const params = {
			nodeId: "node-1",
			newParentId: "node-2",
		};

		const result = await moveNode(params)();

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.message).toContain("获取节点失败");
		}
	});

	it("应该处理移动到根级", async () => {
		const params = {
			nodeId: "node-1",
			newParentId: null,
			newOrder: 0,
		};

		const result = await moveNode(params)();

		expect(E.isRight(result)).toBe(true);
		expect(wouldCreateCycle).toHaveBeenCalledWith(mockNodes, "node-1", null);
		expect(moveNodeRepo).toHaveBeenCalledWith("node-1", null, 0);
	});
});
