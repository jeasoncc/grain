/**
 * Novel Editor Database - Dexie Class Definition
 *
 * This file defines the Dexie database class with all tables and indexes.
 * Following the data-driven architecture, content is stored separately from nodes
 * for performance optimization with large documents (5000+ characters).
 *
 * Tables:
 * - nodes: File tree structure (with tags array for org-mode style tagging)
 * - contents: Document content (Lexical JSON, Excalidraw, etc.)
 * - workspaces: Project/workspace metadata
 * - users: User information and settings
 * - attachments: File attachments
 * - tags: Tag aggregation cache (for statistics and graph visualization)
 * - dbVersions: Database version tracking
 *
 * @requirements 5.1, 5.2
 */

import Dexie, { type Table } from "dexie";
import logger from "@/log/index.ts";
// Import types from new architecture
import type { AttachmentInterface } from "@/types/attachment";
import type { NodeInterface } from "@/types/node";
import type { TagInterface } from "@/types/tag";
import type { UserInterface } from "@/types/user";
import type { WorkspaceInterface } from "@/types/workspace";

/**
 * Database version info interface
 */
export interface DBVersionInterface {
	id: string;
	version: string;
	updatedAt: string;
	migrationNotes?: string;
}

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
export class GrainDatabase extends Dexie {
	// Core tables
	nodes!: Table<NodeInterface, string>;
	contents!: Table<ContentInterface, string>;
	workspaces!: Table<WorkspaceInterface, string>;
	users!: Table<UserInterface, string>;
	attachments!: Table<AttachmentInterface, string>;
	dbVersions!: Table<DBVersionInterface, string>;

	// Tag aggregation cache (source of truth is nodes.tags)
	tags!: Table<TagInterface, string>;

	constructor() {
		super("GrainDB");

		// Version 7: Add contents table for content separation
		this.version(7).stores({
			nodes: "id, workspace, parent, type, order",
			contents: "id, nodeId, contentType",
			workspaces: "id, title, owner",
			wikiEntries: "id, project, name",
			drawings: "id, project, name",
			users: "id, username, email",
			attachments: "id, project",
			dbVersions: "id, version",
			projects: "id, title, owner",
		});

		// Version 8: Add tag system tables (legacy)
		this.version(8).stores({
			nodes: "id, workspace, parent, type, order",
			contents: "id, nodeId, contentType",
			workspaces: "id, title, owner",
			wikiEntries: "id, project, name",
			drawings: "id, project, name",
			users: "id, username, email",
			attachments: "id, project",
			dbVersions: "id, version",
			projects: "id, title, owner",
			tags: "id, workspace, name, category",
			nodeTags: "id, nodeId, tagId, [nodeId+tagId]",
			tagRelations:
				"id, workspace, sourceTagId, targetTagId, [sourceTagId+targetTagId]",
		});

		// Version 9: Simplified tag system (org-mode style)
		// - Tags stored in nodes.tags array (source of truth)
		// - *tags creates multi-entry index for efficient tag queries
		// - tags table is aggregation cache only
		// - Remove nodeTags and tagRelations tables
		this.version(9).stores({
			nodes: "id, workspace, parent, type, order, *tags",
			contents: "id, nodeId, contentType",
			workspaces: "id, title, owner",
			wikiEntries: "id, project, name",
			drawings: "id, project, name",
			users: "id, username, email",
			attachments: "id, project",
			dbVersions: "id, version",
			// Simplified tags table - aggregation cache only
			tags: "id, workspace, name",
			// Remove junction tables (set to null to delete)
			nodeTags: null,
			tagRelations: null,
		});

		// Version 10: Remove deprecated projects table
		// - Fully migrate to workspaces table
		// - Remove projects table for clean architecture
		this.version(10).stores({
			nodes: "id, workspace, parent, type, order, *tags",
			contents: "id, nodeId, contentType",
			workspaces: "id, title, owner",
			wikiEntries: "id, project, name",
			drawings: "id, project, name",
			users: "id, username, email",
			attachments: "id, project",
			dbVersions: "id, version",
			tags: "id, workspace, name",
			// Remove deprecated projects table
			projects: null,
		});

		// Version 11: Remove wikiEntries table
		// - Wiki entries are now stored as regular file nodes with "wiki" tag
		// - Migration handled by wiki-migration.ts service
		this.version(11).stores({
			nodes: "id, workspace, parent, type, order, *tags",
			contents: "id, nodeId, contentType",
			workspaces: "id, title, owner",
			drawings: "id, project, name",
			users: "id, username, email",
			attachments: "id, project",
			dbVersions: "id, version",
			tags: "id, workspace, name",
			// Remove wikiEntries table - wiki entries are now file nodes with "wiki" tag
			wikiEntries: null,
		});

		// Version 12: Remove drawings table
		// - Excalidraw drawings are now stored as file nodes with type "drawing"
		// - Content stored in contents table with contentType "excalidraw"
		this.version(12).stores({
			nodes: "id, workspace, parent, type, order, *tags",
			contents: "id, nodeId, contentType",
			workspaces: "id, title, owner",
			users: "id, username, email",
			attachments: "id, project",
			dbVersions: "id, version",
			tags: "id, workspace, name",
			// Remove drawings table - drawings are now file nodes with type "drawing"
			drawings: null,
		});

		// Open database and log status
		this.open()
			.then(() => logger.success("GrainDatabase initialized (v12)"))
			.catch((err) => logger.error("Database open error:", err));
	}
}

/**
 * Database singleton instance
 * Use this instance throughout the application for all database operations
 */
export const database = new GrainDatabase();

// Legacy alias for backward compatibility
export const NovelEditorDatabase = GrainDatabase;
