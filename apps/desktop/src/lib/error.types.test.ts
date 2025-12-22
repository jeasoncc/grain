/**
 * @file error.types.test.ts
 * @description 错误类型和类型守卫函数测试
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	type AppError,
	cycleError,
	dbError,
	exportError,
	importError,
	isCycleError,
	isDbError,
	isExportError,
	isImportError,
	isNotFoundError,
	isValidationError,
	notFoundError,
	validationError,
} from "./error.types";

// ============================================================================
// 类型守卫函数测试
// ============================================================================

describe("类型守卫函数", () => {
	describe("isValidationError", () => {
		it("应正确识别验证错误", () => {
			const error: AppError = { type: "VALIDATION_ERROR", message: "测试" };
			expect(isValidationError(error)).toBe(true);
		});

		it("应正确识别带 field 的验证错误", () => {
			const error: AppError = {
				type: "VALIDATION_ERROR",
				message: "测试",
				field: "title",
			};
			expect(isValidationError(error)).toBe(true);
		});

		it("应排除其他类型错误", () => {
			const error: AppError = { type: "DB_ERROR", message: "测试" };
			expect(isValidationError(error)).toBe(false);
		});
	});

	describe("isDbError", () => {
		it("应正确识别数据库错误", () => {
			const error: AppError = { type: "DB_ERROR", message: "测试" };
			expect(isDbError(error)).toBe(true);
		});

		it("应排除其他类型错误", () => {
			const error: AppError = { type: "VALIDATION_ERROR", message: "测试" };
			expect(isDbError(error)).toBe(false);
		});
	});

	describe("isNotFoundError", () => {
		it("应正确识别未找到错误", () => {
			const error: AppError = { type: "NOT_FOUND", message: "测试" };
			expect(isNotFoundError(error)).toBe(true);
		});

		it("应正确识别带 id 的未找到错误", () => {
			const error: AppError = {
				type: "NOT_FOUND",
				message: "测试",
				id: "123",
			};
			expect(isNotFoundError(error)).toBe(true);
		});

		it("应排除其他类型错误", () => {
			const error: AppError = { type: "DB_ERROR", message: "测试" };
			expect(isNotFoundError(error)).toBe(false);
		});
	});

	describe("isCycleError", () => {
		it("应正确识别循环引用错误", () => {
			const error: AppError = { type: "CYCLE_ERROR", message: "测试" };
			expect(isCycleError(error)).toBe(true);
		});

		it("应排除其他类型错误", () => {
			const error: AppError = { type: "DB_ERROR", message: "测试" };
			expect(isCycleError(error)).toBe(false);
		});
	});

	describe("isExportError", () => {
		it("应正确识别导出错误", () => {
			const error: AppError = { type: "EXPORT_ERROR", message: "测试" };
			expect(isExportError(error)).toBe(true);
		});

		it("应排除其他类型错误", () => {
			const error: AppError = { type: "DB_ERROR", message: "测试" };
			expect(isExportError(error)).toBe(false);
		});
	});

	describe("isImportError", () => {
		it("应正确识别导入错误", () => {
			const error: AppError = { type: "IMPORT_ERROR", message: "测试" };
			expect(isImportError(error)).toBe(true);
		});

		it("应排除其他类型错误", () => {
			const error: AppError = { type: "DB_ERROR", message: "测试" };
			expect(isImportError(error)).toBe(false);
		});
	});
});

// ============================================================================
// 错误创建辅助函数测试
// ============================================================================

describe("错误创建辅助函数", () => {
	describe("validationError", () => {
		it("应创建验证错误", () => {
			const error = validationError("标题不能为空");
			expect(error.type).toBe("VALIDATION_ERROR");
			expect(error.message).toBe("标题不能为空");
		});

		it("应创建带 field 的验证错误", () => {
			const error = validationError("标题不能为空", "title");
			expect(error.type).toBe("VALIDATION_ERROR");
			expect(error.message).toBe("标题不能为空");
			expect((error as { field?: string }).field).toBe("title");
		});
	});

	describe("dbError", () => {
		it("应创建数据库错误", () => {
			const error = dbError("连接失败");
			expect(error.type).toBe("DB_ERROR");
			expect(error.message).toBe("连接失败");
		});
	});

	describe("notFoundError", () => {
		it("应创建未找到错误", () => {
			const error = notFoundError("节点不存在");
			expect(error.type).toBe("NOT_FOUND");
			expect(error.message).toBe("节点不存在");
		});

		it("应创建带 id 的未找到错误", () => {
			const error = notFoundError("节点不存在", "node-123");
			expect(error.type).toBe("NOT_FOUND");
			expect(error.message).toBe("节点不存在");
			expect((error as { id?: string }).id).toBe("node-123");
		});
	});

	describe("cycleError", () => {
		it("应创建循环引用错误", () => {
			const error = cycleError("检测到循环引用");
			expect(error.type).toBe("CYCLE_ERROR");
			expect(error.message).toBe("检测到循环引用");
		});
	});

	describe("exportError", () => {
		it("应创建导出错误", () => {
			const error = exportError("导出失败");
			expect(error.type).toBe("EXPORT_ERROR");
			expect(error.message).toBe("导出失败");
		});
	});

	describe("importError", () => {
		it("应创建导入错误", () => {
			const error = importError("导入失败");
			expect(error.type).toBe("IMPORT_ERROR");
			expect(error.message).toBe("导入失败");
		});
	});
});

// ============================================================================
// Property-Based Testing
// ============================================================================

describe("Property-Based Testing", () => {
	it("创建的错误应能被对应的类型守卫正确识别", () => {
		fc.assert(
			fc.property(fc.string({ minLength: 1 }), (message) => {
				expect(isValidationError(validationError(message))).toBe(true);
				expect(isDbError(dbError(message))).toBe(true);
				expect(isNotFoundError(notFoundError(message))).toBe(true);
				expect(isCycleError(cycleError(message))).toBe(true);
				expect(isExportError(exportError(message))).toBe(true);
				expect(isImportError(importError(message))).toBe(true);
			}),
		);
	});

	it("类型守卫应互斥", () => {
		fc.assert(
			fc.property(fc.string({ minLength: 1 }), (message) => {
				const errors: AppError[] = [
					validationError(message),
					dbError(message),
					notFoundError(message),
					cycleError(message),
					exportError(message),
					importError(message),
				];

				for (const error of errors) {
					const guards = [
						isValidationError(error),
						isDbError(error),
						isNotFoundError(error),
						isCycleError(error),
						isExportError(error),
						isImportError(error),
					];
					// 只有一个守卫返回 true
					expect(guards.filter(Boolean).length).toBe(1);
				}
			}),
		);
	});

	it("错误消息应保持不变", () => {
		fc.assert(
			fc.property(fc.string(), (message) => {
				expect(validationError(message).message).toBe(message);
				expect(dbError(message).message).toBe(message);
				expect(notFoundError(message).message).toBe(message);
				expect(cycleError(message).message).toBe(message);
				expect(exportError(message).message).toBe(message);
				expect(importError(message).message).toBe(message);
			}),
		);
	});
});
