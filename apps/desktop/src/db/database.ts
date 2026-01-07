/**
 * @deprecated 此模块已迁移到 @/io/db
 * 请使用: import { logDB, LogDB } from "@/io/db"
 *
 * 此文件保留作为兼容层，将在未来版本移除
 */

import { LogDB as LogDatabase, logDB as logDatabase } from "@/io/db/log-db";

// Re-export LogEntry type
export type { LogEntry } from "@/io/db/log-db";

// Export LogDatabase class and instance
export { LogDatabase, logDatabase };

// Legacy exports for backward compatibility
export const GrainDatabase = LogDatabase;
export const NovelEditorDatabase = LogDatabase;
export const database = logDatabase;
