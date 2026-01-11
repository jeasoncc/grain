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
import logger from "@/io/log";

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
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// ============================================================================
// 通用存储操作
// ============================================================================

/**
 * 从 localStorage 获取字符串值
 *
 * @param key - 存储键
 * @returns 存储的字符串值，如果不存在则返回 null
 */
export function getString(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch (error) {
		logger.error(`[Storage] 读取失败 (${key}):`, error);
		return null;
	}
}

/**
 * 设置 localStorage 字符串值
 *
 * @param key - 存储键
 * @param value - 要存储的字符串值
 * @returns 是否成功
 */
export function setString(key: string, value: string): boolean {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch (error) {
		logger.error(`[Storage] 写入失败 (${key}):`, error);
		return false;
	}
}

/**
 * 从 localStorage 删除值
 *
 * @param key - 存储键
 * @returns 是否成功
 */
export function remove(key: string): boolean {
	try {
		localStorage.removeItem(key);
		return true;
	} catch (error) {
		logger.error(`[Storage] 删除失败 (${key}):`, error);
		return false;
	}
}

/**
 * 清空所有 localStorage 数据
 *
 * @returns 是否成功
 */
export function clearAll(): boolean {
	try {
		localStorage.clear();
		return true;
	} catch (error) {
		logger.error("[Storage] 清空失败:", error);
		return false;
	}
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
	try {
		const stored = localStorage.getItem(key);
		if (!stored) {
			return defaultValue;
		}

		const parsed = JSON.parse(stored);
		const result = schema.safeParse(parsed);

		if (result.success) {
			return result.data;
		}

		logger.warn(`[Storage] 数据格式无效 (${key})，使用默认值:`, result.error);
		return defaultValue;
	} catch (error) {
		logger.error(`[Storage] 读取 JSON 失败 (${key}):`, error);
		return defaultValue;
	}
}

/**
 * 将数据序列化为 JSON 并存储到 localStorage
 *
 * @param key - 存储键
 * @param value - 要存储的数据
 * @returns 是否成功
 */
export function setJson<T>(key: string, value: T): boolean {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		logger.error(`[Storage] 写入 JSON 失败 (${key}):`, error);
		return false;
	}
}

/**
 * 获取 JSON 数据（无 Schema 校验，仅解析）
 *
 * @param key - 存储键
 * @param defaultValue - 默认值
 * @returns 解析后的数据或默认值
 */
export function getJsonUnsafe<T>(key: string, defaultValue: T): T {
	try {
		const stored = localStorage.getItem(key);
		if (!stored) {
			return defaultValue;
		}
		return JSON.parse(stored) as T;
	} catch (error) {
		logger.error(`[Storage] 解析 JSON 失败 (${key}):`, error);
		return defaultValue;
	}
}

// ============================================================================
// 存储信息
// ============================================================================

/**
 * 获取 localStorage 使用统计
 *
 * @returns 存储统计信息
 */
export function getStorageStats(): { size: number; keys: number } {
	try {
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
	} catch (error) {
		logger.error("[Storage] 获取统计信息失败:", error);
		return { size: 0, keys: 0 };
	}
}

/**
 * 获取所有存储的键
 *
 * @returns 键名数组
 */
export function getAllKeys(): string[] {
	try {
		return Object.keys(localStorage);
	} catch (error) {
		logger.error("[Storage] 获取键列表失败:", error);
		return [];
	}
}

/**
 * 检查键是否存在
 *
 * @param key - 存储键
 * @returns 是否存在
 */
export function has(key: string): boolean {
	try {
		return localStorage.getItem(key) !== null;
	} catch (error) {
		logger.error(`[Storage] 检查键失败 (${key}):`, error);
		return false;
	}
}
