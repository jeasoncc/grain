/**
 * @file io/storage/index.ts
 * @description Storage 层统一导出
 *
 * 职责：重导出所有 storage 相关模块
 * 依赖：types/
 */

// Layout storage - 布局状态持久化
export {
	clearLayoutState,
	hasLayoutState,
	LAYOUT_STORAGE_KEY,
	loadLayoutState,
	saveLayoutState,
} from "./layout.storage";
// Settings storage - localStorage 操作
export {
	clearAll,
	getAllKeys,
	// JSON 操作（类型安全）
	getJson,
	getJsonUnsafe,
	// 存储信息
	getStorageStats,
	// 字符串操作
	getString,
	has,
	remove,
	// 存储键常量
	STORAGE_KEYS,
	type StorageKey,
	setJson,
	setString,
} from "./settings.storage";
