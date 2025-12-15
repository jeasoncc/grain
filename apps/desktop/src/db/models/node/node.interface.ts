/**
 * Node Interface Definitions
 *
 * Defines the NodeInterface for the file tree structure.
 * Content is stored separately in the contents table for performance
 * optimization with large documents (5000+ characters).
 *
 * @requirements 2.1
 */

import type { UUID, ISODateString } from "../shared";

/**
 * Node type enumeration
 * Defines the different types of nodes in the file tree
 * - folder: Container node that can have children
 * - file: Text document using Lexical editor
 * - canvas: Drawing using Excalidraw
 * - diary: Diary entry
 */
export type NodeType = "folder" | "file" | "canvas" | "diary";

/**
 * Node interface for the file tree structure
 *
 * This interface represents nodes in the hierarchical file tree.
 * Content is NOT stored here - it's in the separate contents table.
 * This separation allows:
 * - Fast loading of file tree without loading heavy content
 * - Efficient tree operations (move, reorder, collapse)
 * - Better performance for large workspaces
 */
export interface NodeInterface {
  /** Unique identifier for the node */
  id: UUID;

  /** Reference to the parent workspace/project */
  workspace: UUID;

  /** Parent node ID, null for root-level nodes */
  parent: UUID | null;

  /** Type of node (folder, file, canvas, diary) */
  type: NodeType;

  /** Display title of the node */
  title: string;

  /** Sort order among siblings (0-based) */
  order: number;

  /** Whether folder is collapsed in the tree view */
  collapsed?: boolean;

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateString;

  /** Last modification timestamp in ISO 8601 format */
  lastEdit: ISODateString;

  /** Tags array - extracted from #+TAGS: in content */
  tags?: string[];
}

/**
 * Node creation input type
 * Used when creating new nodes
 * id, createDate, and lastEdit are auto-generated
 */
export interface NodeCreateInput {
  workspace: UUID;
  parent?: UUID | null;
  type?: NodeType;
  title: string;
  order?: number;
  collapsed?: boolean;
}

/**
 * Node update input type
 * Used when updating existing nodes
 * Only mutable fields can be updated
 */
export interface NodeUpdateInput {
  parent?: UUID | null;
  type?: NodeType;
  title?: string;
  order?: number;
  collapsed?: boolean;
  tags?: string[];
}
