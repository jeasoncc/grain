/**
 * @file index.ts
 * @description Migration Module Exports
 */

export {
	// Types
	type MigrationStatus,
	type MigrationResult,
	type DexieDataSnapshot,
	type IdMapping,
	// Status management
	getMigrationStatus,
	setMigrationStatus,
	clearMigrationStatus,
	// Detection
	hasDexieData,
	needsMigration,
	// Data operations
	readDexieData,
	migrateData,
	// Rollback
	rollbackMigration,
	resetMigrationStatus,
	// Cleanup
	clearDexieData,
	migrateAndCleanup,
} from "./dexie-to-sqlite.migration.fn";
