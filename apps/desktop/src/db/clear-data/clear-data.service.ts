/**
 * Clear Data Service
 * Includes IndexedDB, localStorage, sessionStorage, cookies, etc.
 */

import { database } from "@/db/database";
import logger from "@/log";

export interface ClearDataOptions {
	clearIndexedDB?: boolean;
	clearLocalStorage?: boolean;
	clearSessionStorage?: boolean;
	clearCookies?: boolean;
}

/**
 * Clear IndexedDB data
 */
export async function clearIndexedDB(): Promise<void> {
	try {
		// Clear all table data
		await database.transaction(
			"rw",
			[
				database.users,
				database.workspaces,
				database.nodes,
				database.contents,
				database.drawings,
				database.attachments,
				database.tags,
				database.dbVersions,
			],
			async () => {
				await database.users.clear();
				await database.workspaces.clear();
				await database.nodes.clear();
				await database.contents.clear();
				await database.drawings.clear();
				await database.attachments.clear();
				await database.tags.clear();
				await database.dbVersions.clear();
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
 * Clear localStorage
 */
export function clearLocalStorage(): void {
	try {
		// Clear all localStorage data, including zustand persisted stores
		localStorage.clear();

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
 * Clear sessionStorage
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
 * Clear cookies
 */
export function clearCookies(): void {
	try {
		// Get all cookies
		const cookies = document.cookie.split(";");

		for (const cookie of cookies) {
			const eqPos = cookie.indexOf("=");
			const name =
				eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

			if (name) {
				// Delete cookie by setting expiration to the past
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
 * Initialize basic settings to ensure app runs normally
 * After clearing all data, set some default values
 */
function initializeBasicSettings(): void {
	try {
		// Don't set any default values, let the app use code defaults
		// This ensures complete clearing, app will auto-initialize

		logger.info(
			"[Clear Data] Basic settings will be initialized by app on next load",
		);
	} catch (error) {
		logger.error("[Clear Data] Failed to initialize basic settings:", error);
	}
}

/**
 * Clear all caches (if Cache API is supported)
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
		// Don't throw error, cache clearing failure is not fatal
	}
}

/**
 * Clear all data
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
		// Clear IndexedDB
		if (shouldClearIndexedDB) {
			await clearIndexedDB();
		}

		// Clear localStorage
		if (shouldClearLocalStorage) {
			clearLocalStorage();
		}

		// Clear sessionStorage
		if (shouldClearSessionStorage) {
			clearSessionStorage();
		}

		// Clear cookies
		if (shouldClearCookies) {
			clearCookies();
		}

		// Clear caches
		await clearCaches();

		// Re-initialize basic settings to ensure app runs normally
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
 * Calculate the size of data in bytes
 */
function calculateDataSize(data: unknown[]): number {
	try {
		return new Blob([JSON.stringify(data)]).size;
	} catch {
		return 0;
	}
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
	indexedDB: {
		size: number;
		tables: Record<string, number>;
		tableSizes: Record<string, number>;
	};
	localStorage: { size: number; keys: number };
	sessionStorage: { size: number; keys: number };
	cookies: { count: number };
}> {
	try {
		// Get all data from each table to calculate sizes
		const [users, workspaces, nodes, contents, drawings, attachments, tags] =
			await Promise.all([
				database.users.toArray(),
				database.workspaces.toArray(),
				database.nodes.toArray(),
				database.contents.toArray(),
				database.drawings.toArray(),
				database.attachments.toArray(),
				database.tags.toArray(),
			]);

		// Calculate sizes for each table
		const tableSizes = {
			users: calculateDataSize(users),
			workspaces: calculateDataSize(workspaces),
			nodes: calculateDataSize(nodes),
			contents: calculateDataSize(contents),
			drawings: calculateDataSize(drawings),
			attachments: calculateDataSize(attachments),
			tags: calculateDataSize(tags),
		};

		// Total IndexedDB size
		const totalSize = Object.values(tableSizes).reduce((a, b) => a + b, 0);

		const indexedDBStats = {
			size: totalSize,
			tables: {
				users: users.length,
				workspaces: workspaces.length,
				nodes: nodes.length,
				contents: contents.length,
				drawings: drawings.length,
				attachments: attachments.length,
				tags: tags.length,
			},
			tableSizes,
		};

		// localStorage stats
		const localStorageStats = {
			size: new Blob([JSON.stringify(localStorage)]).size,
			keys: Object.keys(localStorage).length,
		};

		// sessionStorage stats
		const sessionStorageStats = {
			size: new Blob([JSON.stringify(sessionStorage)]).size,
			keys: Object.keys(sessionStorage).length,
		};

		// cookies stats
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
