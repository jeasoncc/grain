/**
 * Attachment Zod Schema Definitions
 *
 * Defines Zod schemas for runtime validation of attachment data.
 * These schemas ensure data integrity when creating or updating attachments.
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { UUIDSchema, ISODateTimeSchema } from "../shared";

/**
 * Attachment type schema
 */
export const AttachmentTypeSchema = z.enum(["image", "audio", "file"]);

/**
 * Full Attachment schema
 * Validates complete attachment records from the database
 */
export const AttachmentSchema = z.object({
  /** Unique attachment identifier */
  id: UUIDSchema,

  /** Associated project ID (optional) */
  project: UUIDSchema.optional(),

  /** Attachment type */
  type: AttachmentTypeSchema,

  /** Original file name */
  fileName: z.string().min(1).max(500),

  /** File storage path */
  filePath: z.string().min(1).max(2000),

  /** Upload timestamp */
  uploadedAt: ISODateTimeSchema,

  /** File size in bytes (optional) */
  size: z.number().int().min(0).optional(),

  /** MIME type (optional) */
  mimeType: z.string().max(200).optional(),
});

/**
 * Attachment creation schema
 * Used when creating new attachments
 * id and uploadedAt are auto-generated
 */
export const AttachmentCreateSchema = z.object({
  /** Optional id - will be auto-generated if not provided */
  id: UUIDSchema.optional(),

  /** Associated project ID (optional) */
  project: UUIDSchema.optional(),

  /** Required attachment type */
  type: AttachmentTypeSchema,

  /** Required file name */
  fileName: z.string().min(1).max(500),

  /** Required file path */
  filePath: z.string().min(1).max(2000),

  /** Optional uploadedAt - will be auto-generated if not provided */
  uploadedAt: ISODateTimeSchema.optional(),

  /** Optional file size */
  size: z.number().int().min(0).optional(),

  /** Optional MIME type */
  mimeType: z.string().max(200).optional(),
});

/**
 * Attachment update schema
 * Used when updating existing attachments
 * All fields are optional except the implicit id used for lookup
 */
export const AttachmentUpdateSchema = z.object({
  /** Updated project ID */
  project: UUIDSchema.optional(),

  /** Updated attachment type */
  type: AttachmentTypeSchema.optional(),

  /** Updated file name */
  fileName: z.string().min(1).max(500).optional(),

  /** Updated file path */
  filePath: z.string().min(1).max(2000).optional(),

  /** Updated file size */
  size: z.number().int().min(0).optional(),

  /** Updated MIME type */
  mimeType: z.string().max(200).optional(),
});

/**
 * Type inference helpers
 * Use these to derive TypeScript types from Zod schemas
 */
export type AttachmentSchemaType = z.infer<typeof AttachmentSchema>;
export type AttachmentCreateSchemaType = z.infer<typeof AttachmentCreateSchema>;
export type AttachmentUpdateSchemaType = z.infer<typeof AttachmentUpdateSchema>;
