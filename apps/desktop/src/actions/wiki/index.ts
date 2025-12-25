/**
 * Wiki 相关的业务操作
 */

export {
	checkMigrationNeeded,
	type MigrationResult,
	migrateWikiEntriesToFiles,
	runMigrationIfNeeded,
} from "./migrate-wiki.action";
