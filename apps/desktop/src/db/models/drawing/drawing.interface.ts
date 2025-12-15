/**
 * Drawing Interface Definitions
 *
 * Defines the DrawingInterface for Excalidraw drawings.
 * Drawings are project-level assets that can be embedded in documents
 * or used standalone in the canvas editor.
 *
 * @requirements 2.1
 */

import type { UUID, ISODateString } from "../shared";

/**
 * Drawing interface for Excalidraw drawings
 *
 * This interface represents a drawing that can be:
 * - Standalone canvas drawings
 * - Embedded in documents via Excalidraw nodes
 * - Shared across multiple documents in a project
 */
export interface DrawingInterface {
  /** Unique identifier for the drawing */
  id: UUID;

  /** Project/workspace ID this drawing belongs to */
  project: UUID;

  /** Drawing name/title */
  name: string;

  /** Excalidraw data as JSON string */
  content: string;

  /** Drawing canvas width in pixels */
  width: number;

  /** Drawing canvas height in pixels */
  height: number;

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateString;

  /** Last update timestamp in ISO 8601 format */
  updatedAt: ISODateString;
}

/**
 * Drawing creation input type
 * Used when creating new drawings
 * id, createDate, and updatedAt are auto-generated
 */
export interface DrawingCreateInput {
  project: UUID;
  name: string;
  content?: string;
  width?: number;
  height?: number;
}

/**
 * Drawing update input type
 * Used when updating existing drawings
 * Only mutable fields can be updated
 */
export interface DrawingUpdateInput {
  name?: string;
  content?: string;
  width?: number;
  height?: number;
  updatedAt?: ISODateString;
}
