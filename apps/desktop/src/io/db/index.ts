/**
 * IO Database - 数据库模块
 *
 * 职责：提供数据库访问功能
 * - 日志数据库 (IndexedDB/Dexie)
 * - 遗留数据库 (IndexedDB/Dexie) - 用于向后兼容
 *
 * 注意：业务数据已迁移到 Rust 后端 (SQLite)，请使用 @/io/api
 *
 * @module io/db
 */

export {
	type ContentInterface,
	type ContentType,
	type DBVersionInterface,
	LegacyDatabase,
	legacyDatabase,
} from "./legacy-database";
export { LogDB, type LogEntry, logDB } from "./log-db";
