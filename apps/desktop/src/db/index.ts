/**
 * Database Module - Unified Exports
 *
 * This file provides a single entry point for all database-related exports.
 * Import from '@/db' to access database instance, types, and models.
 *
 * @requirements 2.1
 */

// Database instance and class
export { database, GrainDatabase, NovelEditorDatabase } from "./database";

// Legacy exports for backward compatibility
// @deprecated Use database from "./database" instead
export { db, initDatabase, GrainDB, NovelEditorDB } from "./curd";

// Legacy schema types for backward compatibility
// @deprecated Use types from "./models" instead
export type {
	AttachmentInterface as LegacyAttachmentInterface,
	DBVersionInterface,
	DrawingInterface as LegacyDrawingInterface,
	NodeInterface as LegacyNodeInterface,
	NodeType as LegacyNodeType,
	ProjectInterface,
	SettingInterface,
	StateInterface,
	UserInterface as LegacyUserInterface,
} from "./schema";

// New data models - unified export from models directory
// Import all types, schemas, builders, repositories, and hooks
export * from "./models";
