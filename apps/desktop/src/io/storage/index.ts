/**
 * @file io/storage/index.ts
 * @description Storage 层统一导出
 *
 * 职责：重导出所有 storage 相关模块
 * 依赖：types/
 */

// Settings storage - localStorage 操作
export {
	// 存储键常量
	STORAGE_KEYS,
	type StorageKey,
	// 字符串操作
	getString,
	setString,
	remove,
	clearAll,
	// JSON 操作（类型安全）
	getJson,
	setJson,
	getJsonUnsafe,
	// 存储信息
	getStorageStats,
	getAllKeys,
	has,
} from "./settings.storage";

// Layout storage - 布局状态持久化
export {
	LAYOUT_STORAGE_KEY,
	saveLayoutState,
	loadLayoutState,
	clearLayoutState,
	hasLayoutState,
} from "./layout.storage";
