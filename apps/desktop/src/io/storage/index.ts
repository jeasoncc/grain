/**
 * IO/Storage - 浏览器存储层
 *
 * 职责：与 localStorage 交互
 * 依赖：types/
 */

// 通用存储操作
export {
	// 常量
	STORAGE_KEYS,
	type StorageKey,
	// 字符串操作
	getString,
	setString,
	remove,
	clearAll,
	// JSON 操作
	getJson,
	setJson,
	getJsonUnsafe,
	// 存储信息
	getStorageStats,
	getAllKeys,
	has,
} from "./settings.storage";
