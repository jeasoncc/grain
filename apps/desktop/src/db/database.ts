/**
 * Novel Editor Database - Dexie Class Definition
 *
 * This file defines the Dexie database class with all tables and indexes.
 * Following the data-driven architecture, content is stored separately from nodes
 * for performance optimization with large documents (5000+ characters).
 *
 * Tables:
 * - nodes: File tree structure (without content)
 * - contents: Document content (Lexical JSON, Excalidraw, etc.)
 * - workspaces: Project/workspace metadata
 * - wikiEntries: Wiki knowledge base entries
 * - drawings: Excalidraw drawings
 * - users: User information and settings
 * - attachments: File attachments
 * - dbVersions: Database version tracking
 *
 * @requirements 5.1, 5.2
 */

import Dexie, { type Table } from "dexie";
import logger from "@/log/index.ts";

// Import interfaces from schema (will be migrated to models later)
import type {
	AttachmentInterface,
	DBVersionInterface,
	DrawingInterface,
	NodeInterface,
	ProjectInterface,
	UserInterface,
	WikiEntryInterface,
} from "./schema.ts";

/**
 * Content type for the contents table
 * Separating content from nodes enables lazy loading and better performance
 */
export type ContentType = "lexical" | "excalidraw" | "text";

/**
 * Content interface for the independent contents table
 * This allows loading node metadata without loading heavy content
 */
export interface ContentInterface {
	id: string;
	nodeId: string;
	content: string;
	contentType: ContentType;
	lastEdit: string;
}


/**
 * Novel Editor Database Class
 *
 * Extends Dexie to provide typed table access and version management.
 * Uses indexed queries for efficient data retrieval.
 */
export class NovelEditorDatabase extends Dexie {
	// Core tables
	nodes!: Table<NodeInterface, string>;
	contents!: Table<ContentInterface, string>;
	workspaces!: Table<ProjectInterface, string>;
	wikiEntries!: Table<WikiEntryInterface, string>;
	drawings!: Table<DrawingInterface, string>;
	users!: Table<UserInterface, string>;
	attachments!: Table<AttachmentInterface, string>;
	dbVersions!: Table<DBVersionInterface, string>;

	constructor() {
		super("NovelEditorDB");

		// Version 7: Add contents table for content separation
		// Preserves backward compatibility with existing data
		this.version(7).stores({
			// Nodes table - file tree structure without content
			// Indexes: id (primary), workspace, parent, type, order
			nodes: "id, workspace, parent, type, order",

			// Contents table - document content stored separately
			// Indexes: id (primary), nodeId, contentType
			contents: "id, nodeId, contentType",

			// Workspaces table (renamed from projects for clarity)
			// Indexes: id (primary), title, owner
			workspaces: "id, title, owner",

			// Wiki entries table
			// Indexes: id (primary), project, name
			wikiEntries: "id, project, name",

			// Drawings table
			// Indexes: id (primary), project, name
			drawings: "id, project, name",

			// Users table
			// Indexes: id (primary), username, email
			users: "id, username, email",

			// Attachments table
			// Indexes: id (primary), project
			attachments: "id, project",

			// Database versions table
			// Indexes: id (primary), version
			dbVersions: "id, version",

			// Keep projects as alias for workspaces during migration
			projects: "id, title, owner",
		});

		// Open database and log status
		this.open()
			.then(() => logger.success("NovelEditorDatabase initialized (v7)"))
			.catch((err) => logger.error("Database open error:", err));
	}
}

/**
 * Database singleton instance
 * Use this instance throughout the application for all database operations
 */
export const database = new NovelEditorDatabase();
