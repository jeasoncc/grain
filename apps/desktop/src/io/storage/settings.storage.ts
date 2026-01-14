/**
 * @file io/storage/settings.storage.ts
 * @description 浏览器 localStorage 存储层
 *
 * 职责：提供类型安全的 localStorage 操作
 * 依赖：types/
 *
 * 设计原则：
 * - 入口窄：使用 Zod Schema 校验读取的数据
 * - 出口宽：写入时容错处理
 * - 纯函数风格：无副作用的数据转换
 */

import type { z } from "zod";
import * as E from "fp-ts/Either";
import { warn, error as logError } from "@/io/log/logger.api";

// ============================================================================
// 存储键常量
// ============================================================================

/**
 * 所有 localStorage 键的集中定义
 * 便于管理和避免键名冲突
 */
export const STORAGE_KEYS = {
	/** 导出设置 */
	EXPORT_SETTINGS: "grain-export-settings",
	/** 迁移状态 */
	MIGRATION_STATUS: "grain_dexie_to_sqlite_migration_status",
	/** 自动备份列表 */
	AUTO_BACKUPS: "auto-backups",
	/** 上次自动备份时间 */
	LAST_AUTO_BACKUP: "last-auto-backup",
	/** 自动备份启用状态 */
	AUTO_BACKUP_ENABLED: "auto-backup-enabled",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// ============================================================================
// 通用存储操作
// ============================================================================

/**
 * 从 localStorage 获取字符串值
 *
 * @param key - 存储键
 * @returns Either<Error, string | null>
 */
export function getString(key: string): E.Either<Error, string | null> {
	return E.tryCatch(
		() => localStorage.getItem(key),
		(err) => {
			const error = new Error(`[Storage] 读取失败 (${key}): ${String(err)}`);
			logError(`[Storage] 读取失败 (${key}):`, { error: err });
			return error;
		},
	);
}

/**
 * 设置 localStorage 字符串值
 *
 * @param key - 存储键
 * @param value - 要存储的字符串值
 * @returns Either<Error, void>
 */
export function setString(key: string, value: string): E.Either<Error, void> {
	return E.tryCatch(
		() => localStorage.setItem(key, value),
		(err) => {
			const error = new Error(`[Storage] 写入失败 (${key}): ${String(err)}`);
			logError(`[Storage] 写入失败 (${key}):`, { error: err });
			return error;
		},
	);
}

/**
 * 从 localStorage 删除值
 *
 * @param key - 存储键
 * @returns Either<Error, void>
 */
export function remove(key: string): E.Either<Error, void> {
	return E.tryCatch(
		() => localStorage.removeItem(key),
		(err) => {
			const error = new Error(`[Storage] 删除失败 (${key}): ${String(err)}`);
			logError(`[Storage] 删除失败 (${key}):`, { error: err });
			return error;
		},
	);
}

/**
 * 清空所有 localStorage 数据
 *
 * @returns Either<Error, void>
 */
export function clearAll(): E.Either<Error, void> {
	return E.tryCatch(
		() => localStorage.clear(),
		(err) => {
			logError("[Storage] 清空失败", { error: err }, "settings.storage");
			return new Error(`[Storage] 清空失败: ${String(err)}`);
		},
	);
}

// ============================================================================
// 类型安全的 JSON 存储操作
// ============================================================================

/**
 * 从 localStorage 获取 JSON 数据并使用 Zod Schema 校验
 *
 * @param key - 存储键
 * @param schema - Zod Schema 用于校验数据
 * @param defaultValue - 默认值（校验失败或数据不存在时返回）
 * @returns 校验后的数据或默认值
 */
export function getJson<T>(
	key: string,
	schema: z.ZodType<T>,
	defaultValue: T,
): T {
	const result = E.tryCatch(
		() => {
			const stored = localStorage.getItem(key);
			if (!stored) {
				return defaultValue;
			}

			const parsed = JSON.parse(stored);
			const validation = schema.safeParse(parsed);

			if (validation.success) {
				return validation.data;
			}

			warn(`[Storage] 数据格式无效 (${key})，使用默认值:`, { error: validation.error });
			return defaultValue;
		},
		(err) => {
			logError(`[Storage] 读取 JSON 失败 (${key}):`, { error: err });
			return new Error(`[Storage] 读取 JSON 失败 (${key}): ${String(err)}`);
		},
	);

	return E.getOrElse(() => defaultValue)(result);
}

/**
 * 将数据序列化为 JSON 并存储到 localStorage
 *
 * @param key - 存储键
 * @param value - 要存储的数据
 * @returns Either<Error, void>
 */
export function setJson<T>(key: string, value: T): E.Either<Error, void> {
	return E.tryCatch(
		() => localStorage.setItem(key, JSON.stringify(value)),
		(err) => {
			logError(`[Storage] 写入 JSON 失败 (${key}):`, { error: err });
			return new Error(`[Storage] 写入 JSON 失败 (${key}): ${String(err)}`);
		},
	);
}

/**
 * 获取 JSON 数据（无 Schema 校验，仅解析）
 *
 * @param key - 存储键
 * @param defaultValue - 默认值
 * @returns 解析后的数据或默认值
 */
export function getJsonUnsafe<T>(key: string, defaultValue: T): T {
	const result = E.tryCatch(
		() => {
			const stored = localStorage.getItem(key);
			if (!stored) {
				return defaultValue;
			}
			return JSON.parse(stored) as T;
		},
		(err) => {
			logError(`[Storage] 解析 JSON 失败 (${key}):`, { error: err });
			return new Error(`[Storage] 解析 JSON 失败 (${key}): ${String(err)}`);
		},
	);

	return E.getOrElse(() => defaultValue)(result);
}

// ============================================================================
// 存储信息
// ============================================================================

/**
 * 获取 localStorage 使用统计
 *
 * @returns 存储统计信息
 */
export function getStorageStats(): { readonly size: number; readonly keys: number } {
	const result = E.tryCatch(
		() => {
			let totalSize = 0;
			const keys = Object.keys(localStorage);

			for (const key of keys) {
				const value = localStorage.getItem(key);
				if (value) {
					// 计算字符串的字节大小（UTF-16）
					totalSize += (key.length + value.length) * 2;
				}
			}

			return {
				size: totalSize,
				keys: keys.length,
			};
		},
		(err) => {
			logError("[Storage] 获取统计信息失败", { error: err }, "settings.storage");
			return new Error(`[Storage] 获取统计信息失败: ${err}`);
		},
	);

	return E.getOrElse(() => ({ size: 0, keys: 0 }))(result);
}

/**
 * 获取所有存储的键
 *
 * @returns 键名数组
 */
export function getAllKeys(): readonly string[] {
	const result = E.tryCatch(
		() => Object.keys(localStorage),
		(err) => {
			logError("[Storage] 获取键列表失败", { error: err }, "settings.storage");
			return new Error(`[Storage] 获取键列表失败: ${err}`);
		},
	);

	return E.getOrElse(() => [] as readonly string[])(result);
}

/**
 * 检查键是否存在
 *
 * @param key - 存储键
 * @returns 是否存在
 */
export function has(key: string): boolean {
	const result = E.tryCatch(
		() => localStorage.getItem(key) !== null,
		(err) => {
			logError(`[Storage] 检查键失败 (${key}):`, { error: err });
			return new Error(`[Storage] 检查键失败 (${key}): ${String(err)}`);
		},
	);

	return E.getOrElse(() => false)(result);
}

// ============================================================================
// 自动备份设置
// ============================================================================

/**
 * 获取自动备份启用状态
 *
 * @returns 是否启用自动备份
 */
export function getAutoBackupEnabled(): boolean {
	const result = E.tryCatch(
		() => localStorage.getItem(STORAGE_KEYS.AUTO_BACKUP_ENABLED) === "true",
		(err) => {
			logError("[Storage] 获取自动备份状态失败", { error: err }, "settings.storage");
			return new Error(`[Storage] 获取自动备份状态失败: ${err}`);
		},
	);

	return E.getOrElse(() => false)(result);
}

/**
 * 设置自动备份启用状态
 *
 * @param enabled - 是否启用
 * @returns Either<Error, void>
 */
export function setAutoBackupEnabled(enabled: boolean): E.Either<Error, void> {
	return E.tryCatch(
		() => localStorage.setItem(STORAGE_KEYS.AUTO_BACKUP_ENABLED, enabled.toString()),
		(err) => {
			logError("[Storage] 设置自动备份状态失败", { error: err }, "settings.storage");
			return new Error(`[Storage] 设置自动备份状态失败: ${String(err)}`);
		},
	);
}
