/**
 * Log Database - Dexie Class Definition
 *
 * This file defines the Dexie database class for log storage only.
 * All business data (nodes, contents, workspaces, users, attachments, tags)
 * has been migrated to the Rust backend (SQLite).
 *
 * Tables:
 * - logs: Application logs (high-frequency writes, short lifecycle)
 *
 * Note: This database is kept separate from the main SQLite database
 * because logs have high-frequency writes and don't need to be
 * persisted to the main database.
 *
 * @requirements 7.1, 7.2, 7.3, 9.1, 9.2
 */

import Dexie, { type Table } from "dexie";
import logger from "@/log/index.ts";

/**
 * Log entry interface
 */
export interface LogEntry {
	id?: number;
	timestamp: string;
	level: string;
	message: string;
}

/**
 * Log Database Class
 *
 * Extends Dexie to provide typed table access for logs.
 * This is the only remaining Dexie database after migration to Rust backend.
 *
 * @deprecated Use logDB from log-db.ts instead for new code.
 * This class is kept for backward compatibility during migration.
 */
export class LogDatabase extends Dexie {
	logs!: Table<LogEntry, number>;

	constructor() {
		super("GrainLogDB");

		// Version 1: Log storage only
		this.version(1).stores({
			logs: "++id, timestamp, level",
		});

		// Open database and log status
		this.open()
			.then(() => logger.success("LogDatabase initialized (v1)"))
			.catch((err) => logger.error("Log database open error:", err));
	}
}

/**
 * Log database singleton instance
 * Use this instance for log operations
 */
export const logDatabase = new LogDatabase();

// ============================================================================
// Legacy Exports (Backward Compatibility)
// ============================================================================

/**
 * @deprecated Use LogDatabase instead
 * Kept for backward compatibility during migration
 */
export const GrainDatabase = LogDatabase;

/**
 * @deprecated Use LogDatabase instead
 * Kept for backward compatibility during migration
 */
export const NovelEditorDatabase = LogDatabase;

/**
 * @deprecated Use logDatabase instead
 * Kept for backward compatibility during migration
 */
export const database = logDatabase;
