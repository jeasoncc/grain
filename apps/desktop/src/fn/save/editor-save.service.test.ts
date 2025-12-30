/**
 * @file editor-save.service.test.ts
 * @description EditorSaveService 单元测试
 *
 * 测试覆盖：
 * - updateContent 防抖逻辑
 * - saveNow 立即保存
 * - hasUnsavedChanges 状态
 * - dispose 清理
 * - setInitialContent 初始化
 * - autoSaveDelay=0 禁用自动保存
 * - 属性测试（fast-check）
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, REQ-3
 */

import fc from "fast-check";
import * as E from "fp-ts/Either";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createEditorSaveService,
	type EditorSaveConfig,
} from "./editor-save.service";

// ============================================================================
// Mocks
// ============================================================================

// Mock updateContentByNodeId
const mockUpdateContentByNodeId = vi.fn();

vi.mock("@/db", () => ({
	updateContentByNodeId:
		(...args: unknown[]) =>
		() =>
			mockUpdateContentByNodeId(...args),
}));

// Mock logger
vi.mock("@/log", () => ({
	default: {
		debug: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建默认的 EditorSaveConfig
 */
function createDefaultConfig(
	overrides: Partial<EditorSaveConfig> = {},
): EditorSaveConfig {
	return {
		nodeId: overrides.nodeId ?? "test-node-id",
		contentType: overrides.contentType ?? "text",
		autoSaveDelay: overrides.autoSaveDelay ?? 100, // 使用较短的延迟便于测试
		onSaving: overrides.onSaving ?? vi.fn(),
		onSaved: overrides.onSaved ?? vi.fn(),
		onError: overrides.onError ?? vi.fn(),
	};
}

// ============================================================================
// Unit Tests
// ============================================================================

describe("EditorSaveService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		// 默认返回成功
		mockUpdateContentByNodeId.mockResolvedValue(E.right({ id: "content-id" }));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("createEditorSaveService", () => {
		it("should create a service instance with all methods", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			expect(service).toBeDefined();
			expect(typeof service.updateContent).toBe("function");
			expect(typeof service.saveNow).toBe("function");
			expect(typeof service.setInitialContent).toBe("function");
			expect(typeof service.dispose).toBe("function");
			expect(typeof service.hasUnsavedChanges).toBe("function");
			expect(typeof service.getPendingContent).toBe("function");
		});
	});

	describe("updateContent - 防抖逻辑", () => {
		it("should not save immediately when updateContent is called", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			service.updateContent("new content");

			// 不应该立即调用保存
			expect(mockUpdateContentByNodeId).not.toHaveBeenCalled();
		});

		it("should save after debounce delay", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");

			// 等待防抖延迟
			await vi.advanceTimersByTimeAsync(100);

			expect(mockUpdateContentByNodeId).toHaveBeenCalledWith(
				"test-node-id",
				"new content",
				"text",
			);
		});

		it("should reset debounce timer on subsequent calls", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.updateContent("content 1");
			await vi.advanceTimersByTimeAsync(50);

			service.updateContent("content 2");
			await vi.advanceTimersByTimeAsync(50);

			// 还没到防抖时间，不应该保存
			expect(mockUpdateContentByNodeId).not.toHaveBeenCalled();

			// 再等待 50ms，总共 100ms
			await vi.advanceTimersByTimeAsync(50);

			// 应该只保存最后一次的内容
			expect(mockUpdateContentByNodeId).toHaveBeenCalledTimes(1);
			expect(mockUpdateContentByNodeId).toHaveBeenCalledWith(
				"test-node-id",
				"content 2",
				"text",
			);
		});

		it("should call onSaving callback when save starts", async () => {
			const onSaving = vi.fn();
			const config = createDefaultConfig({ onSaving, autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			await vi.advanceTimersByTimeAsync(100);

			expect(onSaving).toHaveBeenCalled();
		});

		it("should call onSaved callback when save succeeds", async () => {
			const onSaved = vi.fn();
			const config = createDefaultConfig({ onSaved, autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			await vi.advanceTimersByTimeAsync(100);

			expect(onSaved).toHaveBeenCalled();
		});

		it("should call onError callback when save fails", async () => {
			const onError = vi.fn();
			mockUpdateContentByNodeId.mockResolvedValue(
				E.left({ message: "Save failed" }),
			);

			const config = createDefaultConfig({ onError, autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			await vi.advanceTimersByTimeAsync(100);

			expect(onError).toHaveBeenCalledWith(expect.any(Error));
			expect(onError.mock.calls[0][0].message).toBe("Save failed");
		});
	});

	describe("saveNow - 立即保存", () => {
		it("should save immediately without waiting for debounce", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 1000 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			await service.saveNow();

			expect(mockUpdateContentByNodeId).toHaveBeenCalledWith(
				"test-node-id",
				"new content",
				"text",
			);
		});

		it("should cancel pending debounced save", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			await service.saveNow();

			// 等待防抖时间过去
			await vi.advanceTimersByTimeAsync(100);

			// 应该只保存一次（saveNow 调用的）
			expect(mockUpdateContentByNodeId).toHaveBeenCalledTimes(1);
		});

		it("should not save if no pending content", async () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			await service.saveNow();

			expect(mockUpdateContentByNodeId).not.toHaveBeenCalled();
		});

		it("should not save if content unchanged from initial", async () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			service.setInitialContent("initial content");
			service.updateContent("initial content");
			await service.saveNow();

			// 内容没有变化，不应该保存
			expect(mockUpdateContentByNodeId).not.toHaveBeenCalled();
		});
	});

	describe("setInitialContent", () => {
		it("should set initial content without triggering save", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.setInitialContent("initial content");
			await vi.advanceTimersByTimeAsync(100);

			expect(mockUpdateContentByNodeId).not.toHaveBeenCalled();
		});

		it("should not mark content as unsaved", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			service.setInitialContent("initial content");

			expect(service.hasUnsavedChanges()).toBe(false);
		});
	});

	describe("hasUnsavedChanges", () => {
		it("should return false initially", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			expect(service.hasUnsavedChanges()).toBe(false);
		});

		it("should return true after updateContent", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			service.updateContent("new content");

			expect(service.hasUnsavedChanges()).toBe(true);
		});

		it("should return false after successful save", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			expect(service.hasUnsavedChanges()).toBe(true);

			await vi.advanceTimersByTimeAsync(100);

			expect(service.hasUnsavedChanges()).toBe(false);
		});

		it("should return false if content matches initial", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			service.setInitialContent("same content");
			service.updateContent("same content");

			expect(service.hasUnsavedChanges()).toBe(false);
		});

		it("should return true if content differs from initial", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			service.setInitialContent("initial content");
			service.updateContent("different content");

			expect(service.hasUnsavedChanges()).toBe(true);
		});
	});

	describe("dispose - 清理", () => {
		it("should cancel pending debounced save", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			service.dispose();

			// 等待防抖时间过去
			await vi.advanceTimersByTimeAsync(100);

			// 不应该保存，因为已经 dispose
			expect(mockUpdateContentByNodeId).not.toHaveBeenCalled();
		});

		it("should not affect hasUnsavedChanges state", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			service.dispose();

			// dispose 不会清除未保存状态
			expect(service.hasUnsavedChanges()).toBe(true);
		});
	});

	describe("getPendingContent", () => {
		it("should return null initially", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			expect(service.getPendingContent()).toBeNull();
		});

		it("should return pending content after updateContent", () => {
			const config = createDefaultConfig();
			const service = createEditorSaveService(config);

			service.updateContent("pending content");

			expect(service.getPendingContent()).toBe("pending content");
		});

		it("should return null after successful save", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.updateContent("pending content");
			await vi.advanceTimersByTimeAsync(100);

			expect(service.getPendingContent()).toBeNull();
		});
	});

	describe("配置选项", () => {
		it("should use default autoSaveDelay of 1000ms", async () => {
			const config: EditorSaveConfig = {
				nodeId: "test-node",
				contentType: "text",
				// 不设置 autoSaveDelay，使用默认值
			};
			const service = createEditorSaveService(config);

			service.updateContent("new content");

			// 500ms 后不应该保存
			await vi.advanceTimersByTimeAsync(500);
			expect(mockUpdateContentByNodeId).not.toHaveBeenCalled();

			// 1000ms 后应该保存
			await vi.advanceTimersByTimeAsync(500);
			expect(mockUpdateContentByNodeId).toHaveBeenCalled();
		});

		it("should pass correct contentType to db function", async () => {
			const config = createDefaultConfig({
				contentType: "lexical",
				autoSaveDelay: 100,
			});
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			await vi.advanceTimersByTimeAsync(100);

			expect(mockUpdateContentByNodeId).toHaveBeenCalledWith(
				"test-node-id",
				"new content",
				"lexical",
			);
		});

		it("should pass correct nodeId to db function", async () => {
			const config = createDefaultConfig({
				nodeId: "custom-node-id",
				autoSaveDelay: 100,
			});
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			await vi.advanceTimersByTimeAsync(100);

			expect(mockUpdateContentByNodeId).toHaveBeenCalledWith(
				"custom-node-id",
				"new content",
				"text",
			);
		});
	});

	describe("边界情况", () => {
		it("should handle empty string content", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			service.setInitialContent("initial");
			service.updateContent("");
			await vi.advanceTimersByTimeAsync(100);

			expect(mockUpdateContentByNodeId).toHaveBeenCalledWith(
				"test-node-id",
				"",
				"text",
			);
		});

		it("should handle very long content", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			const longContent = "a".repeat(100000);
			service.updateContent(longContent);
			await vi.advanceTimersByTimeAsync(100);

			expect(mockUpdateContentByNodeId).toHaveBeenCalledWith(
				"test-node-id",
				longContent,
				"text",
			);
		});

		it("should handle special characters in content", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 100 });
			const service = createEditorSaveService(config);

			const specialContent = "Hello\n\t世界\r\n🎉";
			service.updateContent(specialContent);
			await vi.advanceTimersByTimeAsync(100);

			expect(mockUpdateContentByNodeId).toHaveBeenCalledWith(
				"test-node-id",
				specialContent,
				"text",
			);
		});
	});

	// ==========================================================================
	// autoSaveDelay=0 禁用自动保存
	// ==========================================================================

	describe("autoSaveDelay=0 - 禁用自动保存", () => {
		it("should not trigger auto-save when autoSaveDelay is 0", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 0 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");

			// 等待足够长的时间
			await vi.advanceTimersByTimeAsync(10000);

			// 不应该自动保存
			expect(mockUpdateContentByNodeId).not.toHaveBeenCalled();
		});

		it("should still allow manual save with saveNow when autoSaveDelay is 0", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 0 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			await service.saveNow();

			// 手动保存应该正常工作
			expect(mockUpdateContentByNodeId).toHaveBeenCalledWith(
				"test-node-id",
				"new content",
				"text",
			);
		});

		it("should track hasUnsavedChanges correctly when autoSaveDelay is 0", () => {
			const config = createDefaultConfig({ autoSaveDelay: 0 });
			const service = createEditorSaveService(config);

			expect(service.hasUnsavedChanges()).toBe(false);

			service.updateContent("new content");
			expect(service.hasUnsavedChanges()).toBe(true);
		});

		it("should clear hasUnsavedChanges after manual save when autoSaveDelay is 0", async () => {
			const config = createDefaultConfig({ autoSaveDelay: 0 });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			expect(service.hasUnsavedChanges()).toBe(true);

			await service.saveNow();
			expect(service.hasUnsavedChanges()).toBe(false);
		});

		it("should call onSaved callback after manual save when autoSaveDelay is 0", async () => {
			const onSaved = vi.fn();
			const config = createDefaultConfig({ autoSaveDelay: 0, onSaved });
			const service = createEditorSaveService(config);

			service.updateContent("new content");
			await service.saveNow();

			expect(onSaved).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// 属性测试
	// ==========================================================================

	describe("属性测试", () => {
		/**
		 * Property 3: 自动保存延迟行为
		 *
		 * 对于任意正整数 autoSaveDelay，updateContent 后应该在 autoSaveDelay 毫秒后触发保存。
		 *
		 * @validates REQ-3.1
		 */
		it("Property 3: 正整数 autoSaveDelay 应该在指定延迟后触发保存", async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.integer({ min: 10, max: 500 }), // 使用较小范围避免测试超时
					async (delay) => {
						vi.clearAllMocks();
						mockUpdateContentByNodeId.mockResolvedValue(
							E.right({ id: "content-id" }),
						);

						const config = createDefaultConfig({ autoSaveDelay: delay });
						const service = createEditorSaveService(config);

						service.updateContent("test content");

						// 延迟前不应该保存
						await vi.advanceTimersByTimeAsync(delay - 1);
						const notSavedYet =
							mockUpdateContentByNodeId.mock.calls.length === 0;

						// 延迟后应该保存
						await vi.advanceTimersByTimeAsync(2);
						const savedAfterDelay =
							mockUpdateContentByNodeId.mock.calls.length === 1;

						service.dispose();
						return notSavedYet && savedAfterDelay;
					},
				),
				{ numRuns: 20 },
			);
		});

		/**
		 * Property 3 补充: autoSaveDelay=0 永远不触发自动保存
		 *
		 * @validates REQ-3.2
		 */
		it("Property 3 补充: autoSaveDelay=0 永远不触发自动保存", async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.integer({ min: 100, max: 5000 }), // 任意等待时间
					async (waitTime) => {
						vi.clearAllMocks();
						mockUpdateContentByNodeId.mockResolvedValue(
							E.right({ id: "content-id" }),
						);

						const config = createDefaultConfig({ autoSaveDelay: 0 });
						const service = createEditorSaveService(config);

						service.updateContent("test content");
						await vi.advanceTimersByTimeAsync(waitTime);

						const neverAutoSaved =
							mockUpdateContentByNodeId.mock.calls.length === 0;

						service.dispose();
						return neverAutoSaved;
					},
				),
				{ numRuns: 10 },
			);
		});

		/**
		 * Property: hasUnsavedChanges 状态一致性
		 *
		 * 对于任意内容，updateContent 后 hasUnsavedChanges 应该返回 true（除非内容与初始值相同）。
		 */
		it("Property: hasUnsavedChanges 状态一致性", () => {
			fc.assert(
				fc.property(
					fc.string({ minLength: 1, maxLength: 100 }),
					fc.string({ minLength: 1, maxLength: 100 }),
					(initialContent, newContent) => {
						const config = createDefaultConfig({ autoSaveDelay: 1000 });
						const service = createEditorSaveService(config);

						service.setInitialContent(initialContent);
						service.updateContent(newContent);

						const hasChanges = service.hasUnsavedChanges();
						const expectedHasChanges = initialContent !== newContent;

						service.dispose();
						return hasChanges === expectedHasChanges;
					},
				),
				{ numRuns: 50 },
			);
		});

		/**
		 * Property: getPendingContent 返回最新内容
		 *
		 * 对于任意内容序列，getPendingContent 应该返回最后一次 updateContent 的内容。
		 */
		it("Property: getPendingContent 返回最新内容", () => {
			fc.assert(
				fc.property(
					fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
						minLength: 1,
						maxLength: 10,
					}),
					(contents) => {
						const config = createDefaultConfig({ autoSaveDelay: 1000 });
						const service = createEditorSaveService(config);

						// 依次更新内容
						for (const content of contents) {
							service.updateContent(content);
						}

						const pendingContent = service.getPendingContent();
						const lastContent = contents[contents.length - 1];

						service.dispose();
						return pendingContent === lastContent;
					},
				),
				{ numRuns: 30 },
			);
		});
	});
});
