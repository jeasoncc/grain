/**
 * IO Database - 数据库模块
 *
 * 职责：提供数据库访问功能
 * - 遗留数据库 (IndexedDB/Dexie) - 用于向后兼容
 *
 * 注意：业务数据已迁移到 Rust 后端 (SQLite)，请使用 @/io/api
 * 日志数据已迁移到 SQLite，请使用 @/io/log/logger.api
 *
 * @module io/db
 */

export {
	type ContentInterface,
	type ContentType,
	type DBVersionInterface,
	LegacyDatabase,
	legacyDatabase,
} from "./legacy-database"
