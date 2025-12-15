/**
 * Tag Interface Definitions (Simplified)
 *
 * Tags are stored directly in nodes.tags array.
 * This table is an aggregation cache for statistics and graph visualization.
 *
 * @requirements 2.1
 */

import type { UUID, ISODateString } from "../shared";

/**
 * Tag interface - aggregation cache
 *
 * This is NOT the source of truth. The source is nodes.tags array.
 * This table provides:
 * - Tag usage statistics
 * - Quick lookup for autocomplete
 * - Data for graph visualization
 */
export interface TagInterface {
  /** Tag name as ID (unique per workspace) */
  id: string;

  /** Tag display name */
  name: string;

  /** Workspace this tag belongs to */
  workspace: UUID;

  /** Number of documents using this tag */
  count: number;

  /** Last time this tag was used */
  lastUsed: ISODateString;

  /** First time this tag was created */
  createDate: ISODateString;
}

/**
 * Tag creation input
 */
export interface TagCreateInput {
  name: string;
  workspace: UUID;
}
