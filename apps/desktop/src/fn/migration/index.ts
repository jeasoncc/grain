/**
 * @file index.ts
 * @description Migration Module Exports
 */

export {
	// Cleanup
	clearDexieData,
	clearMigrationStatus,
	type DexieDataSnapshot,
	// Status management
	getMigrationStatus,
	// Detection
	hasDexieData,
	type IdMapping,
	type MigrationResult,
	// Types
	type MigrationStatus,
	migrateAndCleanup,
	migrateData,
	needsMigration,
	// Data operations
	readDexieData,
	resetMigrationStatus,
	// Rollback
	rollbackMigration,
	setMigrationStatus,
} from "./dexie-to-sqlite.migration.fn";
