/**
 * Attachment Interface Definitions
 *
 * Defines the AttachmentInterface for storing project-related file attachments.
 * Supports images, audio files, and other file types.
 *
 * @requirements 2.1
 */

import type { UUID, ISODateString } from "../shared";

/**
 * Attachment type enumeration
 * Defines the supported attachment file types
 */
export type AttachmentType = "image" | "audio" | "file";

/**
 * Main Attachment interface
 * Contains all attachment-related data including file metadata
 */
export interface AttachmentInterface {
  /** Unique attachment identifier (UUID) */
  id: UUID;

  /** Associated project ID (optional - can be global attachments) */
  project?: UUID;

  /** Attachment type (image/audio/file) */
  type: AttachmentType;

  /** Original file name */
  fileName: string;

  /** File storage path */
  filePath: string;

  /** Upload timestamp */
  uploadedAt: ISODateString;

  /** File size in bytes (optional) */
  size?: number;

  /** MIME type (optional) */
  mimeType?: string;
}

/**
 * Attachment creation input type
 * Used when creating new attachments
 * id and uploadedAt are auto-generated
 */
export interface AttachmentCreateInput {
  project?: UUID;
  type: AttachmentType;
  fileName: string;
  filePath: string;
  size?: number;
  mimeType?: string;
}

/**
 * Attachment update input type
 * Used when updating existing attachments
 * Only mutable fields can be updated
 */
export interface AttachmentUpdateInput {
  project?: UUID;
  type?: AttachmentType;
  fileName?: string;
  filePath?: string;
  size?: number;
  mimeType?: string;
}
