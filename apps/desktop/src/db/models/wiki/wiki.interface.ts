/**
 * Wiki Interface Definitions
 *
 * Defines the WikiInterface for wiki/knowledge base entries.
 * Wiki entries support characters, locations, items, and other
 * knowledge management within a workspace.
 *
 * @requirements 2.1
 */

import type { UUID, ISODateString } from "../shared";

/**
 * Wiki entry interface for knowledge base items
 *
 * This interface represents a wiki entry that can be:
 * - Characters (角色)
 * - Locations (地点)
 * - Items (物品)
 * - Concepts (概念)
 * - Any other knowledge type via tags
 */
export interface WikiInterface {
  /** Unique identifier for the wiki entry */
  id: UUID;

  /** Project/workspace ID this entry belongs to */
  project: UUID;

  /** Entry name/title */
  name: string;

  /** Alternative names/aliases for the entry */
  alias: string[];

  /** Custom tags for categorization */
  tags: string[];

  /** Rich text content (Lexical JSON serialized state) */
  content: string;

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateString;

  /** Last update timestamp in ISO 8601 format */
  updatedAt: ISODateString;
}

/**
 * Wiki creation input type
 * Used when creating new wiki entries
 * id, createDate, and updatedAt are auto-generated
 */
export interface WikiCreateInput {
  project: UUID;
  name: string;
  alias?: string[];
  tags?: string[];
  content?: string;
}

/**
 * Wiki update input type
 * Used when updating existing wiki entries
 * Only mutable fields can be updated
 */
export interface WikiUpdateInput {
  name?: string;
  alias?: string[];
  tags?: string[];
  content?: string;
  updatedAt?: ISODateString;
}
