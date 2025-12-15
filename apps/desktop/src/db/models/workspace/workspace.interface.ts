/**
 * Workspace Interface Definitions
 *
 * Defines the WorkspaceInterface for project/workspace metadata.
 * Workspaces are the top-level containers for organizing nodes, wiki entries,
 * drawings, and other project-related data.
 *
 * @requirements 2.1
 */

import type { UUID, ISODateString } from "../shared";

/**
 * Workspace interface for project metadata
 *
 * This interface represents a workspace/project that contains:
 * - Nodes (file tree structure)
 * - Wiki entries (knowledge base)
 * - Drawings (Excalidraw canvases)
 * - Attachments (files)
 */
export interface WorkspaceInterface {
  /** Unique identifier for the workspace */
  id: UUID;

  /** Display title of the workspace */
  title: string;

  /** Author name */
  author: string;

  /** Project description */
  description: string;

  /** Publisher information */
  publisher: string;

  /** Project language (e.g., "zh", "en") */
  language: string;

  /** Last time the workspace was opened */
  lastOpen: ISODateString;

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateString;

  /** Optional: Team members (user IDs) for collaborative workspaces */
  members?: string[];

  /** Optional: Owner user ID */
  owner?: UUID;
}

/**
 * Workspace creation input type
 * Used when creating new workspaces
 * id, createDate, and lastOpen are auto-generated
 */
export interface WorkspaceCreateInput {
  title: string;
  author?: string;
  description?: string;
  publisher?: string;
  language?: string;
  members?: string[];
  owner?: UUID;
}

/**
 * Workspace update input type
 * Used when updating existing workspaces
 * Only mutable fields can be updated
 */
export interface WorkspaceUpdateInput {
  title?: string;
  author?: string;
  description?: string;
  publisher?: string;
  language?: string;
  lastOpen?: ISODateString;
  members?: string[];
  owner?: UUID;
}
