/**
 * Content Zod Schema Definitions
 *
 * Defines Zod schemas for runtime validation of content data.
 * These schemas ensure data integrity when creating or updating content.
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { UUIDSchema, ISODateTimeSchema } from "../shared";

/**
 * Content type schema
 * Validates that contentType is one of the allowed values
 */
export const ContentTypeSchema = z.enum(["lexical", "excalidraw", "text"]);

/**
 * Full Content schema
 * Validates complete content records from the database
 */
export const ContentSchema = z.object({
  /** Unique identifier for the content record */
  id: UUIDSchema,

  /** Reference to the parent node */
  nodeId: UUIDSchema,

  /** The actual content (Lexical JSON, Excalidraw JSON, or plain text) */
  content: z.string(),

  /** Type of content stored */
  contentType: ContentTypeSchema,

  /** Last modification timestamp in ISO 8601 format */
  lastEdit: ISODateTimeSchema,
});

/**
 * Content creation schema
 * Used when creating new content records
 * id and lastEdit are auto-generated, so they're optional
 */
export const ContentCreateSchema = z.object({
  /** Optional id - will be auto-generated if not provided */
  id: UUIDSchema.optional(),

  /** Required reference to the parent node */
  nodeId: UUIDSchema,

  /** Optional content - defaults to empty string */
  content: z.string().optional().default(""),

  /** Optional content type - defaults to "lexical" */
  contentType: ContentTypeSchema.optional().default("lexical"),

  /** Optional lastEdit - will be auto-generated if not provided */
  lastEdit: ISODateTimeSchema.optional(),
});

/**
 * Content update schema
 * Used when updating existing content records
 * All fields are optional except the implicit id used for lookup
 */
export const ContentUpdateSchema = z.object({
  /** Updated content */
  content: z.string().optional(),

  /** Updated content type */
  contentType: ContentTypeSchema.optional(),

  /** Updated lastEdit - typically auto-generated */
  lastEdit: ISODateTimeSchema.optional(),
});

/**
 * Type inference helpers
 * Use these to derive TypeScript types from Zod schemas
 */
export type ContentSchemaType = z.infer<typeof ContentSchema>;
export type ContentCreateSchemaType = z.infer<typeof ContentCreateSchema>;
export type ContentUpdateSchemaType = z.infer<typeof ContentUpdateSchema>;
export type ContentTypeSchemaType = z.infer<typeof ContentTypeSchema>;
