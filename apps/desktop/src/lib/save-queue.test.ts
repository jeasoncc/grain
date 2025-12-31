/**
 * @file save-queue.test.ts
 * @description 保存队列服务单元测试
 *
 * 测试内容：
 * - 单例一致性
 * - 入队保存
 * - 相同 nodeId 去重
 * - 等待保存完成
 * - 超时处理
 * - 错误处理
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSaveQueueService,
	type SaveQueueService,
	saveQueueService,
} from "./save-queue";

// Mock logger
vi.mock("@/log", () => ({
	default: {
		info: vi.fn(),
		success: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("SaveQueueService", () => {
	let service: SaveQueueService;

	beforeEach(() => {
		service = createSaveQueueService();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// 单例测试
	// ============================================================================

	describe("单例", () => {
		it("saveQueueService 应该是一个有效的服务实例", () => {
			expect(saveQueueService).toBeDefined();
			expect(saveQueueService.enqueueSave).toBeInstanceOf(Function);
			expect(saveQueueService.waitForSave).toBeInstanceOf(Function);
			expect(saveQueueService.hasPendingSave).toBeInstanceOf(Function);
			expect(saveQueueService.getPendingNodeIds).toBeInstanceOf(Function);
		});
	});

	// ============================================================================
	// 入队测试
	// ============================================================================

	describe("enqueueSave", () => {
		it("应该将保存任务入队", async () => {
			const saveFn = vi.fn().mockResolvedValue(true);

			service.enqueueSave("node-1", saveFn);

			expect(service.hasPendingSave("node-1")).toBe(true);
			expect(service.getPendingNodeIds()).toContain("node-1");

			// 等待任务完成
			await service.waitForSave("node-1");

			expect(saveFn).toHaveBeenCalledTimes(1);
			expect(service.hasPendingSave("node-1")).toBe(false);
		});

		it("应该立即返回（非阻塞）", () => {
			const saveFn = vi.fn().mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(() => resolve(true), 100);
					}),
			);

			const startTime = Date.now();
			service.enqueueSave("node-1", saveFn);
			const endTime = Date.now();

			// 入队应该立即返回，不等待保存完成
			expect(endTime - startTime).toBeLessThan(50);
		});
	});

	// ============================================================================
	// 去重测试
	// ============================================================================

	describe("去重", () => {
		it("相同 nodeId 多次入队应只执行最新的保存函数", async () => {
			let calledFn: string | null = null;
			const saveFn1 = vi.fn().mockImplementation(async () => {
				calledFn = "fn1";
				return true;
			});
			const saveFn2 = vi.fn().mockImplementation(async () => {
				calledFn = "fn2";
				return true;
			});
			const saveFn3 = vi.fn().mockImplementation(async () => {
				calledFn = "fn3";
				return true;
			});

			service.enqueueSave("node-1", saveFn1);
			service.enqueueSave("node-1", saveFn2);
			service.enqueueSave("node-1", saveFn3);

			// 等待任务完成
			await service.waitForSave("node-1");

			// 只有最新的保存函数被执行
			expect(calledFn).toBe("fn3");
			expect(saveFn3).toHaveBeenCalledTimes(1);
		});

		it("不同 nodeId 应该分别执行", async () => {
			const saveFn1 = vi.fn().mockResolvedValue(true);
			const saveFn2 = vi.fn().mockResolvedValue(true);

			service.enqueueSave("node-1", saveFn1);
			service.enqueueSave("node-2", saveFn2);

			// 等待所有任务完成
			await service.waitForSave("node-1");
			await service.waitForSave("node-2");

			expect(saveFn1).toHaveBeenCalledTimes(1);
			expect(saveFn2).toHaveBeenCalledTimes(1);
		});
	});

	// ============================================================================
	// 等待测试
	// ============================================================================

	describe("waitForSave", () => {
		it("没有待处理任务时应立即返回", async () => {
			const startTime = Date.now();
			await service.waitForSave("non-existent-node");
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(50);
		});

		it("有待处理任务时应等待完成", async () => {
			let saveCompleted = false;
			const saveFn = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				saveCompleted = true;
				return true;
			});

			service.enqueueSave("node-1", saveFn);
			expect(saveCompleted).toBe(false);

			await service.waitForSave("node-1");
			expect(saveCompleted).toBe(true);
		});
	});

	// ============================================================================
	// 超时测试
	// ============================================================================

	describe("超时", () => {
		it("超时后应返回而不是一直等待", async () => {
			const saveFn = vi.fn().mockImplementation(
				() =>
					new Promise((resolve) => {
						// 永远不会完成
						setTimeout(() => resolve(true), 10000);
					}),
			);

			service.enqueueSave("node-1", saveFn);

			const startTime = Date.now();
			await service.waitForSave("node-1", 100); // 100ms 超时
			const endTime = Date.now();

			// 应该在超时后返回
			expect(endTime - startTime).toBeLessThan(200);
			expect(endTime - startTime).toBeGreaterThanOrEqual(100);
		});
	});

	// ============================================================================
	// 错误处理测试
	// ============================================================================

	describe("错误处理", () => {
		it("保存失败不应阻塞后续保存", async () => {
			const failingFn = vi.fn().mockRejectedValue(new Error("保存失败"));
			const successFn = vi.fn().mockResolvedValue(true);

			service.enqueueSave("node-1", failingFn);
			service.enqueueSave("node-2", successFn);

			// 等待所有任务完成
			await service.waitForSave("node-1");
			await service.waitForSave("node-2");

			expect(failingFn).toHaveBeenCalledTimes(1);
			expect(successFn).toHaveBeenCalledTimes(1);
		});

		it("保存失败后应从 pending 中移除", async () => {
			const failingFn = vi.fn().mockRejectedValue(new Error("保存失败"));

			service.enqueueSave("node-1", failingFn);
			expect(service.hasPendingSave("node-1")).toBe(true);

			await service.waitForSave("node-1");
			expect(service.hasPendingSave("node-1")).toBe(false);
		});

		it("waitForSave 遇到失败的保存应 resolve 而不是 reject", async () => {
			const failingFn = vi.fn().mockRejectedValue(new Error("保存失败"));

			service.enqueueSave("node-1", failingFn);

			// 不应该抛出异常
			await expect(service.waitForSave("node-1")).resolves.toBeUndefined();
		});
	});

	// ============================================================================
	// 顺序执行测试
	// ============================================================================

	describe("顺序执行", () => {
		it("任务应按 FIFO 顺序执行", async () => {
			const executionOrder: string[] = [];

			const createSaveFn = (id: string) =>
				vi.fn().mockImplementation(async () => {
					await new Promise((resolve) => setTimeout(resolve, 10));
					executionOrder.push(id);
					return true;
				});

			service.enqueueSave("node-1", createSaveFn("node-1"));
			service.enqueueSave("node-2", createSaveFn("node-2"));
			service.enqueueSave("node-3", createSaveFn("node-3"));

			// 等待所有任务完成
			await service.waitForSave("node-1");
			await service.waitForSave("node-2");
			await service.waitForSave("node-3");

			expect(executionOrder).toEqual(["node-1", "node-2", "node-3"]);
		});
	});

	// ============================================================================
	// hasPendingSave 测试
	// ============================================================================

	describe("hasPendingSave", () => {
		it("入队后应返回 true", () => {
			const saveFn = vi.fn().mockResolvedValue(true);
			service.enqueueSave("node-1", saveFn);
			expect(service.hasPendingSave("node-1")).toBe(true);
		});

		it("完成后应返回 false", async () => {
			const saveFn = vi.fn().mockResolvedValue(true);
			service.enqueueSave("node-1", saveFn);
			await service.waitForSave("node-1");
			expect(service.hasPendingSave("node-1")).toBe(false);
		});

		it("不存在的 nodeId 应返回 false", () => {
			expect(service.hasPendingSave("non-existent")).toBe(false);
		});
	});

	// ============================================================================
	// getPendingNodeIds 测试
	// ============================================================================

	describe("getPendingNodeIds", () => {
		it("应返回所有待处理的 nodeId", () => {
			const saveFn = vi
				.fn()
				.mockImplementation(
					() => new Promise((resolve) => setTimeout(() => resolve(true), 100)),
				);

			service.enqueueSave("node-1", saveFn);
			service.enqueueSave("node-2", saveFn);

			const pendingIds = service.getPendingNodeIds();
			expect(pendingIds).toContain("node-1");
			expect(pendingIds).toContain("node-2");
			expect(pendingIds.length).toBe(2);
		});

		it("没有待处理任务时应返回空数组", () => {
			expect(service.getPendingNodeIds()).toEqual([]);
		});
	});
});
