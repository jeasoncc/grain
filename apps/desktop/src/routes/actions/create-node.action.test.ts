/**
 * @file create-node.action.test.ts
 * @description 创建节点 Action 测试
 */

import * as E from "fp-ts/Either";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNode } from "./create-node.action";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/db/content.db.fn", () => ({
	addContent: vi.fn(),
}));

vi.mock("@/db/node.db.fn", () => ({
	addNode: vi.fn(),
	getNextOrder: vi.fn(),
}));

vi.mock("@/log/index", () => ({
	default: {
		start: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
	},
}));

import { addContent } from "@/db/content.db.fn";
import { addNode, getNextOrder } from "@/db/node.db.fn";

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

// ============================================================================
// Tests
// ============================================================================

describe("createNode", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// 设置默认 mock 返回值
		vi.mocked(getNextOrder).mockReturnValue(() => Promise.resolve(E.right(0)));
		vi.mocked(addNode).mockReturnValue(() =>
			Promise.resolve(E.right(mockNode)),
		);
		vi.mocked(addContent).mockReturnValue(() =>
			Promise.resolve(E.right(undefined)),
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("应该成功创建文件节点", async () => {
		const params = {
			workspaceId: "ws-1",
			parentId: null,
			type: "file" as const,
			title: "测试文件",
		};

		// 更新 mock 返回值以匹配输入的标题
		const expectedNode = { ...mockNode, title: "测试文件" };
		vi.mocked(addNode).mockReturnValue(() =>
			Promise.resolve(E.right(expectedNode)),
		);

		const result = await createNode(params)();

		expect(E.isRight(result)).toBe(true);
		if (E.isRight(result)) {
			expect(result.right.title).toBe("测试文件");
			expect(result.right.type).toBe("file");
		}

		// 验证调用了正确的函数
		expect(getNextOrder).toHaveBeenCalledWith(null, "ws-1");
		expect(addNode).toHaveBeenCalledWith("ws-1", "测试文件", {
			parent: null,
			type: "file",
			order: 0,
			collapsed: true,
			tags: undefined,
		});
		expect(addContent).toHaveBeenCalledWith(expectedNode.id, "");
	});

	it("应该成功创建文件夹节点", async () => {
		// 重置 mock 以确保清洁状态
		vi.clearAllMocks();

		// 设置文件夹节点的 mock
		const folderNode = {
			...mockNode,
			title: "测试文件夹",
			type: "folder" as const,
		};
		vi.mocked(getNextOrder).mockReturnValue(() => Promise.resolve(E.right(0)));
		vi.mocked(addNode).mockReturnValue(() =>
			Promise.resolve(E.right(folderNode)),
		);

		const params = {
			workspaceId: "ws-1",
			parentId: null,
			type: "folder" as const,
			title: "测试文件夹",
		};

		const result = await createNode(params)();

		expect(E.isRight(result)).toBe(true);

		// 文件夹不应该创建内容记录
		expect(addContent).not.toHaveBeenCalled();
	});

	it("应该为文件类型节点创建内容记录", async () => {
		const params = {
			workspaceId: "ws-1",
			parentId: null,
			type: "file" as const,
			title: "测试文件",
			content: "初始内容",
		};

		await createNode(params)();

		expect(addContent).toHaveBeenCalledWith(mockNode.id, "初始内容");
	});

	it("应该处理获取排序号失败", async () => {
		vi.mocked(getNextOrder).mockReturnValue(() =>
			Promise.resolve(E.left({ type: "DB_ERROR", message: "获取排序号失败" })),
		);

		const params = {
			workspaceId: "ws-1",
			parentId: null,
			type: "file" as const,
			title: "测试文件",
		};

		const result = await createNode(params)();

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.message).toContain("获取排序号失败");
		}
	});

	it("应该处理创建节点失败", async () => {
		vi.mocked(addNode).mockReturnValue(() =>
			Promise.resolve(E.left({ type: "DB_ERROR", message: "创建节点失败" })),
		);

		const params = {
			workspaceId: "ws-1",
			parentId: null,
			type: "file" as const,
			title: "测试文件",
		};

		const result = await createNode(params)();

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.message).toContain("创建节点失败");
		}
	});

	it("应该处理创建内容失败", async () => {
		vi.mocked(addContent).mockReturnValue(() =>
			Promise.resolve(E.left({ type: "DB_ERROR", message: "创建内容失败" })),
		);

		const params = {
			workspaceId: "ws-1",
			parentId: null,
			type: "file" as const,
			title: "测试文件",
		};

		const result = await createNode(params)();

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.message).toContain("创建内容失败");
		}
	});

	it("应该支持标签", async () => {
		const params = {
			workspaceId: "ws-1",
			parentId: null,
			type: "file" as const,
			title: "测试文件",
			tags: ["标签1", "标签2"],
		};

		await createNode(params)();

		expect(addNode).toHaveBeenCalledWith("ws-1", "测试文件", {
			parent: null,
			type: "file",
			order: 0,
			collapsed: true,
			tags: ["标签1", "标签2"],
		});
	});
});
