/**
 * 清空所有数据的服务
 * 包括 IndexedDB、localStorage、sessionStorage、cookies 等
 */

import logger from "@/log";
import { db } from "@/db/curd";

export interface ClearDataOptions {
	clearIndexedDB?: boolean;
	clearLocalStorage?: boolean;
	clearSessionStorage?: boolean;
	clearCookies?: boolean;
}

/**
 * 清空 IndexedDB 数据
 */
export async function clearIndexedDB(): Promise<void> {
	try {
		// 清空所有表的数据（使用新的 node-based 结构）
		await db.transaction(
			"rw",
			[
				db.users,
				db.projects,
				db.nodes,
				db.wikiEntries,
				db.drawings,
				db.attachments,
			],
			async () => {
				await db.users.clear();
				await db.projects.clear();
				await db.nodes.clear();
				await db.wikiEntries.clear();
				await db.drawings.clear();
				await db.attachments.clear();
			},
		);

		logger.info("[Clear Data] IndexedDB cleared successfully");
	} catch (error) {
		logger.error("[Clear Data] Failed to clear IndexedDB:", error);
		throw new Error(
			"Failed to clear IndexedDB: " +
				(error instanceof Error ? error.message : "Unknown error"),
		);
	}
}

/**
 * 清空 localStorage
 */
export function clearLocalStorage(): void {
	try {
		const keysToKeep: string[] = [
			// 保留一些系统关键设置，确保应用正常运行
			'theme',
			'language', 
			'right-sidebar-open',
			'unified-sidebar-state',
			'font-settings',
			'editor-settings'
		];

		const allKeys = Object.keys(localStorage);
		for (const key of allKeys) {
			if (!keysToKeep.includes(key)) {
				localStorage.removeItem(key);
			}
		}

		logger.info("[Clear Data] localStorage cleared successfully");
	} catch (error) {
		logger.error("[Clear Data] Failed to clear localStorage:", error);
		throw new Error(
			"Failed to clear localStorage: " +
				(error instanceof Error ? error.message : "Unknown error"),
		);
	}
}

/**
 * 清空 sessionStorage
 */
export function clearSessionStorage(): void {
	try {
		sessionStorage.clear();
		logger.info("[Clear Data] sessionStorage cleared successfully");
	} catch (error) {
		logger.error("[Clear Data] Failed to clear sessionStorage:", error);
		throw new Error(
			"Failed to clear sessionStorage: " +
				(error instanceof Error ? error.message : "Unknown error"),
		);
	}
}

/**
 * 清空 cookies
 */
export function clearCookies(): void {
	try {
		// 获取所有 cookies
		const cookies = document.cookie.split(";");

		for (const cookie of cookies) {
			const eqPos = cookie.indexOf("=");
			const name =
				eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

			if (name) {
				// 删除 cookie（设置过期时间为过去）
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
			}
		}

		logger.info("[Clear Data] Cookies cleared successfully");
	} catch (error) {
		logger.error("[Clear Data] Failed to clear cookies:", error);
		throw new Error(
			"Failed to clear cookies: " +
				(error instanceof Error ? error.message : "Unknown error"),
		);
	}
}

/**
 * 初始化基本设置，确保应用正常运行
 */
function initializeBasicSettings(): void {
	try {
		// 设置默认主题
		localStorage.setItem('theme', 'system');
		
		// 设置默认语言
		localStorage.setItem('language', 'zh-CN');
		
		// 设置默认的侧边栏状态
		localStorage.setItem('right-sidebar-open', 'false');
		
		// 设置默认的统一侧边栏状态
		localStorage.setItem('unified-sidebar-state', JSON.stringify({
			isOpen: true,
			activePanel: 'files'
		}));
		
		logger.info("[Clear Data] Basic settings initialized");
	} catch (error) {
		logger.error("[Clear Data] Failed to initialize basic settings:", error);
	}
}

/**
 * 清空所有缓存（如果支持 Cache API）
 */
export async function clearCaches(): Promise<void> {
	try {
		if ("caches" in window) {
			const cacheNames = await caches.keys();
			await Promise.all(
				cacheNames.map((cacheName) => caches.delete(cacheName)),
			);
			logger.info("[Clear Data] Caches cleared successfully");
		}
	} catch (error) {
		logger.error("[Clear Data] Failed to clear caches:", error);
		// 不抛出错误，因为缓存清理失败不是致命的
	}
}

/**
 * 清空所有数据
 */
export async function clearAllData(
	options: ClearDataOptions = {},
): Promise<void> {
	const {
		clearIndexedDB: shouldClearIndexedDB = true,
		clearLocalStorage: shouldClearLocalStorage = true,
		clearSessionStorage: shouldClearSessionStorage = true,
		clearCookies: shouldClearCookies = true,
	} = options;

	const errors: string[] = [];

	try {
		// 清空 IndexedDB
		if (shouldClearIndexedDB) {
			await clearIndexedDB();
		}

		// 清空 localStorage
		if (shouldClearLocalStorage) {
			clearLocalStorage();
		}

		// 清空 sessionStorage
		if (shouldClearSessionStorage) {
			clearSessionStorage();
		}

		// 清空 cookies
		if (shouldClearCookies) {
			clearCookies();
		}

		// 清空缓存
		await clearCaches();

		// 重新初始化基本设置，确保应用正常运行
		if (shouldClearLocalStorage) {
			initializeBasicSettings();
		}

		logger.info("[Clear Data] All data cleared successfully");
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		errors.push(errorMessage);
	}

	if (errors.length > 0) {
		throw new Error(`Failed to clear some data: ${errors.join(", ")}`);
	}
}

/**
 * 获取存储使用情况统计
 */
export async function getStorageStats(): Promise<{
	indexedDB: { size: number; tables: Record<string, number> };
	localStorage: { size: number; keys: number };
	sessionStorage: { size: number; keys: number };
	cookies: { count: number };
}> {
	try {
		// IndexedDB 统计（使用新的 node-based 结构）
		const indexedDBStats = {
			size: 0,
			tables: {
				users: await db.users.count(),
				projects: await db.projects.count(),
				nodes: await db.nodes.count(),
				wikiEntries: await db.wikiEntries.count(),
				drawings: await db.drawings.count(),
				attachments: await db.attachments.count(),
			},
		};

		// localStorage 统计
		const localStorageStats = {
			size: JSON.stringify(localStorage).length,
			keys: Object.keys(localStorage).length,
		};

		// sessionStorage 统计
		const sessionStorageStats = {
			size: JSON.stringify(sessionStorage).length,
			keys: Object.keys(sessionStorage).length,
		};

		// cookies 统计
		const cookiesStats = {
			count: document.cookie.split(";").filter((c) => c.trim()).length,
		};

		return {
			indexedDB: indexedDBStats,
			localStorage: localStorageStats,
			sessionStorage: sessionStorageStats,
			cookies: cookiesStats,
		};
	} catch (error) {
		console.error("[Clear Data] Failed to get storage stats:", error);
		throw error;
	}
}
