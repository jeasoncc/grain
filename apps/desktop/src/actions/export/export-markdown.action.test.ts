/**
 * @file export-markdown.action.test.ts
 * @description Markdown 导出 Action 的单元测试
 *
 * 测试覆盖：
 * - 节点内容导出
 * - 直接内容导出
 * - 错误处理
 */

import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentInterface } from "@/types/content/content.interface";
import type { NodeInterface } from "@/types/node/node.interface";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试用的 NodeInterface 对象
 */
function createTestNode(overrides: Partial<NodeInterface> = {}): NodeInterface {
	return {
		id: overrides.id ?? "node-1",
		workspace: overrides.workspace ?? "workspace-1",
		parent: overrides.parent ?? null,
		type: overrides.type ?? "file",
		title: overrides.title ?? "Test Node",
		order: overrides.order ?? 0,
		collapsed: overrides.collapsed ?? false,
		createDate: overrides.createDate ?? new Date().toISOString(),
		lastEdit: overrides.lastEdit ?? new Date().toISOString(),
		tags: overrides.tags ?? [],
	};
}

/**
 * 创建测试用的 ContentInterface 对象
 */
function createTestContent(
	overrides: Partial<ContentInterface> = {},
): ContentInterface {
	return {
		id: overrides.id ?? "content-1",
		nodeId: overrides.nodeId ?? "node-1",
		content:
			overrides.content ??
			JSON.stringify({
				root: {
					children: [
						{
							type: "paragraph",
							children: [{ type: "text", text: "Hello World", format: 0 }],
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "root",
					version: 1,
				},
			}),
		contentType: overrides.contentType ?? "lexical",
		lastEdit: overrides.lastEdit ?? new Date().toISOString(),
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

const mockGetNodeByIdOrFail = vi.fn();
const mockGetContentByNodeIdOrFail = vi.fn();

vi.mock("@/db/node.db.fn", () => ({
	getNodeByIdOrFail: (...args: unknown[]) => mockGetNodeByIdOrFail(...args),
}));

vi.mock("@/db/content.db.fn", () => ({
	getContentByNodeIdOrFail: (...args: unknown[]) =>
		mockGetContentByNodeIdOrFail(...args),
}));

vi.mock("@/log", () => ({
	default: {
		start: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn(),
	},
}));

import logger from "@/log";
import {
	exportContentToMarkdown,
	exportNodeToMarkdown,
} from "./export-markdown.action";

// ============================================================================
// Unit Tests
// ============================================================================

describe("exportNodeToMarkdown", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should export node content to Markdown format", async () => {
		const testNode = createTestNode({ title: "My Document" });
		const testContent = createTestContent({ nodeId: testNode.id });

		mockGetNodeByIdOrFail.mockReturnValue(() =>
			Promise.resolve(E.right(testNode)),
		);
		mockGetContentByNodeIdOrFail.mockReturnValue(() =>
			Promise.resolve(E.right(testContent)),
		);

		const result = await runTE(exportNodeToMarkdown({ nodeId: testNode.id }));

		expect(E.isRight(result)).toBe(true);
		if (E.isRight(result)) {
			expect(result.right.filename).toBe("My Document");
			expect(result.right.extension).toBe("md");
			expect(result.right.content).toContain("Hello World");
		}
		expect(logger.start).toHaveBeenCalled();
		expect(logger.success).toHaveBeenCalled();
	});

	it("should include title in export when option is set", async () => {
		const testNode = createTestNode({ title: "My Document" });
		const testContent = createTestContent({ nodeId: testNode.id });

		mockGetNodeByIdOrFail.mockReturnValue(() =>
			Promise.resolve(E.right(testNode)),
		);
		mockGetContentByNodeIdOrFail.mockReturnValue(() =>
			Promise.resolve(E.right(testContent)),
		);

		const result = await runTE(
			exportNodeToMarkdown({
				nodeId: testNode.id,
				options: { includeTitle: true },
			}),
		);

		expect(E.isRight(result)).toBe(true);
		if (E.isRight(result)) {
			expect(result.right.content).toContain("# My Document");
		}
	});

	it("should return Left when node not found", async () => {
		const error = { type: "NOT_FOUND" as const, message: "Node not found" };
		mockGetNodeByIdOrFail.mockReturnValue(() => Promise.resolve(E.left(error)));

		const result = await runTE(
			exportNodeToMarkdown({ nodeId: "non-existent" }),
		);

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("NOT_FOUND");
		}
	});

	it("should return Left when content not found", async () => {
		const testNode = createTestNode();
		const error = { type: "NOT_FOUND" as const, message: "Content not found" };

		mockGetNodeByIdOrFail.mockReturnValue(() =>
			Promise.resolve(E.right(testNode)),
		);
		mockGetContentByNodeIdOrFail.mockReturnValue(() =>
			Promise.resolve(E.left(error)),
		);

		const result = await runTE(exportNodeToMarkdown({ nodeId: testNode.id }));

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("NOT_FOUND");
		}
	});
});

describe("exportContentToMarkdown", () => {
	it("should export content directly to Markdown format", () => {
		const content = JSON.stringify({
			root: {
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "Direct export", format: 0 }],
					},
				],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "root",
				version: 1,
			},
		});

		const result = exportContentToMarkdown(content);

		expect(E.isRight(result)).toBe(true);
		if (E.isRight(result)) {
			expect(result.right).toContain("Direct export");
		}
	});

	it("should return Left for invalid content", () => {
		const result = exportContentToMarkdown("invalid json");

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("EXPORT_ERROR");
		}
	});

	it("should return Left for empty content", () => {
		const result = exportContentToMarkdown("");

		expect(E.isLeft(result)).toBe(true);
		if (E.isLeft(result)) {
			expect(result.left.type).toBe("EXPORT_ERROR");
		}
	});
});
