/**
 * @file save-queue.property.test.ts
 * @description 保存队列服务属性测试
 *
 * 使用 fast-check 进行属性测试，验证通用正确性属性
 *
 * Feature: editor-save-queue
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import {
	type SaveQueueService,
	createSaveQueueService,
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

describe("SaveQueueService 属性测试", () => {
	// ============================================================================
	// Property 1: 单例一致性
	// Feature: editor-save-queue, Property 1: 单例一致性
	// Validates: Requirements 1.1
	// ============================================================================

	describe("Property 1: 单例一致性", () => {
		it("*For any* number of references to saveQueueService, they SHALL be the same object", () => {
			fc.assert(
				fc.property(fc.integer({ min: 1, max: 100 }), (n) => {
					// 获取 n 次 saveQueueService 引用
					const references: SaveQueueService[] = [];
					for (let i = 0; i < n; i++) {
						references.push(saveQueueService);
					}

					// 所有引用应该是同一个对象
					for (let i = 1; i < references.length; i++) {
						expect(references[i]).toBe(references[0]);
					}
				}),
				{ numRuns: 100 },
			);
		});
	});

	// ============================================================================
	// Property 2: 相同 nodeId 去重
	// Feature: editor-save-queue, Property 2: 相同 nodeId 去重
	// Validates: Requirements 1.5
	// ============================================================================

	describe("Property 2: 相同 nodeId 去重", () => {
		it("*For any* sequence of enqueueSave calls with the same nodeId, only the last save function SHALL be executed", async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 50 }),
					fc.integer({ min: 2, max: 10 }),
					async (nodeId, numCalls) => {
						const service = createSaveQueueService();
						const executedFns: number[] = [];

						// 创建多个保存函数
						const saveFns = Array.from({ length: numCalls }, (_, i) =>
							vi.fn().mockImplementation(async () => {
								executedFns.push(i);
								return true;
							}),
						);

						// 同步入队所有保存函数
						for (const saveFn of saveFns) {
							service.enqueueSave(nodeId, saveFn);
						}

						// 等待保存完成
						await service.waitForSave(nodeId);

						// 只有最后一个保存函数被执行
						expect(executedFns.length).toBe(1);
						expect(executedFns[0]).toBe(numCalls - 1);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	// ============================================================================
	// Property 3: 顺序执行
	// Feature: editor-save-queue, Property 3: 顺序执行
	// Validates: Requirements 1.6
	// ============================================================================

	describe("Property 3: 顺序执行", () => {
		it("*For any* sequence of enqueued save tasks with different nodeIds, they SHALL execute in FIFO order", async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
						minLength: 2,
						maxLength: 10,
					}),
					async (nodeIds) => {
						// 确保 nodeIds 唯一
						const uniqueNodeIds = [...new Set(nodeIds)];
						if (uniqueNodeIds.length < 2) return; // 跳过不够唯一的情况

						const service = createSaveQueueService();
						const executionOrder: string[] = [];

						// 为每个 nodeId 创建保存函数
						for (const nodeId of uniqueNodeIds) {
							const saveFn = vi.fn().mockImplementation(async () => {
								// 添加小延迟以确保顺序可观察
								await new Promise((resolve) => setTimeout(resolve, 5));
								executionOrder.push(nodeId);
								return true;
							});
							service.enqueueSave(nodeId, saveFn);
						}

						// 等待所有保存完成
						for (const nodeId of uniqueNodeIds) {
							await service.waitForSave(nodeId);
						}

						// 执行顺序应该与入队顺序一致
						expect(executionOrder).toEqual(uniqueNodeIds);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	// ============================================================================
	// Property 4: waitForSave 行为
	// Feature: editor-save-queue, Property 4: waitForSave 行为
	// Validates: Requirements 3.2, 3.3
	// ============================================================================

	describe("Property 4: waitForSave 行为", () => {
		it("*For any* nodeId without pending save, waitForSave SHALL resolve immediately", async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 50 }),
					async (nodeId) => {
						const service = createSaveQueueService();

						// 没有入队任何保存任务
						expect(service.hasPendingSave(nodeId)).toBe(false);

						const startTime = Date.now();
						await service.waitForSave(nodeId);
						const endTime = Date.now();

						// 应该立即返回（小于 50ms）
						expect(endTime - startTime).toBeLessThan(50);
					},
				),
				{ numRuns: 100 },
			);
		});

		it(
			"*For any* nodeId with pending save, waitForSave SHALL wait for it to complete",
			async () => {
				await fc.assert(
					fc.asyncProperty(
						fc.string({ minLength: 1, maxLength: 50 }),
						fc.integer({ min: 10, max: 30 }),
						async (nodeId, delay) => {
							const service = createSaveQueueService();
							let saveCompleted = false;

							const saveFn = vi.fn().mockImplementation(async () => {
								await new Promise((resolve) => setTimeout(resolve, delay));
								saveCompleted = true;
								return true;
							});

							service.enqueueSave(nodeId, saveFn);
							expect(saveCompleted).toBe(false);

							await service.waitForSave(nodeId);
							expect(saveCompleted).toBe(true);
						},
					),
					{ numRuns: 100 },
				);
			},
			30000,
		);
	});

	// ============================================================================
	// Property 5: 错误恢复
	// Feature: editor-save-queue, Property 5: 错误恢复
	// Validates: Requirements 5.2, 5.3, 5.4
	// ============================================================================

	describe("Property 5: 错误恢复", () => {
		it("*For any* failed save task, it SHALL be removed from pending saves and not block subsequent saves", async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 50 }),
					fc.string({ minLength: 1, maxLength: 50 }),
					fc.string({ minLength: 1, maxLength: 100 }),
					async (failingNodeId, successNodeId, errorMessage) => {
						// 确保两个 nodeId 不同
						if (failingNodeId === successNodeId) return;

						const service = createSaveQueueService();
						let successSaveExecuted = false;

						// 失败的保存函数
						const failingFn = vi
							.fn()
							.mockRejectedValue(new Error(errorMessage));

						// 成功的保存函数
						const successFn = vi.fn().mockImplementation(async () => {
							successSaveExecuted = true;
							return true;
						});

						// 入队失败的保存
						service.enqueueSave(failingNodeId, failingFn);
						// 入队成功的保存
						service.enqueueSave(successNodeId, successFn);

						// 等待失败的保存（不应该抛出异常）
						await expect(
							service.waitForSave(failingNodeId),
						).resolves.toBeUndefined();

						// 失败后应该从 pending 中移除
						expect(service.hasPendingSave(failingNodeId)).toBe(false);

						// 等待成功的保存
						await service.waitForSave(successNodeId);

						// 成功的保存应该被执行
						expect(successSaveExecuted).toBe(true);
					},
				),
				{ numRuns: 100 },
			);
		});
	});

	// ============================================================================
	// Property 6: 超时保护
	// Feature: editor-save-queue, Property 6: 超时保护
	// Validates: Requirements 6.2, 6.3
	// ============================================================================

	describe("Property 6: 超时保护", () => {
		it(
			"*For any* waitForSave call with timeout, if pending save takes longer, function SHALL resolve after timeout",
			async () => {
				await fc.assert(
					fc.asyncProperty(
						fc.string({ minLength: 1, maxLength: 50 }),
						fc.integer({ min: 50, max: 100 }),
						async (nodeId, timeout) => {
							const service = createSaveQueueService();

							// 创建一个永远不会完成的保存函数
							const saveFn = vi.fn().mockImplementation(
								() =>
									new Promise((resolve) => {
										// 设置一个很长的延迟，远超超时时间
										setTimeout(() => resolve(true), 10000);
									}),
							);

							service.enqueueSave(nodeId, saveFn);

							const startTime = Date.now();
							await service.waitForSave(nodeId, timeout);
							const endTime = Date.now();

							// 应该在超时后返回
							const elapsed = endTime - startTime;
							expect(elapsed).toBeGreaterThanOrEqual(timeout - 10); // 允许 10ms 误差
							expect(elapsed).toBeLessThan(timeout + 100); // 不应该等太久
						},
					),
					{ numRuns: 100 },
				);
			},
			30000,
		);
	});

	// ============================================================================
	// Property 7: 非阻塞入队
	// Feature: editor-save-queue, Property 7: 非阻塞入队
	// Validates: Requirements 6.1
	// ============================================================================

	describe("Property 7: 非阻塞入队", () => {
		it("*For any* enqueueSave call, the function SHALL return immediately without waiting for save to complete", () => {
			fc.assert(
				fc.property(
					fc.string({ minLength: 1, maxLength: 50 }),
					fc.integer({ min: 100, max: 1000 }),
					(nodeId, delay) => {
						const service = createSaveQueueService();

						// 创建一个需要很长时间的保存函数
						const saveFn = vi.fn().mockImplementation(
							() =>
								new Promise((resolve) => {
									setTimeout(() => resolve(true), delay);
								}),
						);

						const startTime = Date.now();
						service.enqueueSave(nodeId, saveFn);
						const endTime = Date.now();

						// 入队应该立即返回（小于 50ms）
						expect(endTime - startTime).toBeLessThan(50);
					},
				),
				{ numRuns: 100 },
			);
		});
	});
});
