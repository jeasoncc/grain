/**
 * Legacy Database - Dexie Class Definition
 *
 * This file contains the legacy Dexie database for modules that haven't
 * been migrated to the Rust backend yet.
 *
 * MIGRATION STATUS:
 * - ✅ nodes: Migrated to Rust (use @/repo/node.repo.fn.ts)
 * - ✅ contents: Migrated to Rust (use @/repo/content.repo.fn.ts)
 * - ✅ workspaces: Migrated to Rust (use @/repo/workspace.repo.fn.ts)
 * - ✅ users: Migrated to Rust (use @/repo/user.repo.fn.ts)
 * - ⏳ tags: Pending migration (Phase 4)
 * - ⏳ attachments: Pending migration (Phase 5)
 *
 * This file will be removed once all modules are migrated.
 *
 * @deprecated Use @/repo for migrated modules
 */

import Dexie, { type Table } from "dexie";
import logger from "@/log/index.ts";
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
 */
export type ContentType = "lexical" | "excalidraw" | "text";

/**
 * Content interface for the contents table
 */
export interface ContentInterface {
	id: string;
	nodeId: string;
	content: string;
	contentType: ContentType;
	lastEdit: string;
}

/**
 * Legacy Database Class
 *
 * @deprecated This database is for backward compatibility only.
 * New code should use @/repo for data access.
 */
export class LegacyDatabase extends Dexie {
	// Core tables (for backward compatibility during migration)
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

		// Version 12: Current schema (same as before migration)
		this.version(12).stores({
			nodes: "id, workspace, parent, type, order, *tags",
			contents: "id, nodeId, contentType",
			workspaces: "id, title, owner",
			users: "id, username, email",
			attachments: "id, project",
			dbVersions: "id, version",
			tags: "id, workspace, name",
		});

		// Open database and log status
		this.open()
			.then(() => logger.success("LegacyDatabase initialized (v12)"))
			.catch((err) => logger.error("Legacy database open error:", err));
	}
}

/**
 * Legacy database singleton instance
 *
 * @deprecated Use @/repo for data access
 */
export const legacyDatabase = new LegacyDatabase();
