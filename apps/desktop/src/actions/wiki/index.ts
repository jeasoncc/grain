/**
 * Wiki 相关的业务操作
 */

export {
	checkMigrationNeeded,
	migrateWikiEntriesToFiles,
	type MigrationResult,
	runMigrationIfNeeded,
} from "./migrate-wiki.action";
