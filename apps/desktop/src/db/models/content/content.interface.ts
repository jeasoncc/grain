/**
 * Content Interface Definitions
 *
 * Defines the ContentInterface for the independent content table.
 * Content is stored separately from nodes to enable lazy loading
 * and better performance with large documents (5000+ characters).
 *
 * @requirements 2.1, 5.1
 */

import type { UUID, ISODateString } from "../shared";

/**
 * Content type enumeration
 * Defines the different types of content that can be stored
 */
export type ContentType = "lexical" | "excalidraw" | "text";

/**
 * Content interface for the independent contents table
 *
 * This interface represents document content stored separately from node metadata.
 * This separation allows:
 * - Loading node tree without loading heavy content
 * - Lazy loading content only when needed
 * - Better performance for large documents
 */
export interface ContentInterface {
  /** Unique identifier for the content record */
  id: UUID;

  /** Reference to the parent node */
  nodeId: UUID;

  /** The actual content (Lexical JSON, Excalidraw JSON, or plain text) */
  content: string;

  /** Type of content stored */
  contentType: ContentType;

  /** Last modification timestamp in ISO 8601 format */
  lastEdit: ISODateString;
}

/**
 * Content creation input type
 * Used when creating new content records
 * id and lastEdit are auto-generated
 */
export interface ContentCreateInput {
  nodeId: UUID;
  content?: string;
  contentType?: ContentType;
}

/**
 * Content update input type
 * Used when updating existing content records
 * Only content and contentType can be updated
 */
export interface ContentUpdateInput {
  content?: string;
  contentType?: ContentType;
}
