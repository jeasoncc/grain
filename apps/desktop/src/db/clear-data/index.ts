/**
 * Clear Data Module
 * 
 * Provides data clearing functionality for IndexedDB, localStorage, etc.
 */

export {
	clearIndexedDB,
	clearLocalStorage,
	clearSessionStorage,
	clearCookies,
	clearCaches,
	clearAllData,
	getStorageStats,
	type ClearDataOptions,
} from "./clear-data.service";
