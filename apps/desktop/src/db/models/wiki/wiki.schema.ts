/**
 * Wiki Zod Schema Definitions
 *
 * Defines Zod schemas for runtime validation of wiki entry data.
 * These schemas ensure data integrity when creating or updating wiki entries.
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { UUIDSchema, ISODateTimeSchema } from "../shared";

/**
 * Full Wiki schema
 * Validates complete wiki entry records from the database
 */
export const WikiSchema = z.object({
  /** Unique identifier for the wiki entry */
  id: UUIDSchema,

  /** Project/workspace ID this entry belongs to */
  project: UUIDSchema,

  /** Entry name/title */
  name: z.string().min(1).max(200),

  /** Alternative names/aliases for the entry */
  alias: z.array(z.string().max(200)),

  /** Custom tags for categorization */
  tags: z.array(z.string().max(100)),

  /** Rich text content (Lexical JSON serialized state) */
  content: z.string(),

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateTimeSchema,

  /** Last update timestamp in ISO 8601 format */
  updatedAt: ISODateTimeSchema,
});

/**
 * Wiki creation schema
 * Used when creating new wiki entries
 * id, createDate, and updatedAt are auto-generated
 */
export const WikiCreateSchema = z.object({
  /** Optional id - will be auto-generated if not provided */
  id: UUIDSchema.optional(),

  /** Required project/workspace ID */
  project: UUIDSchema,

  /** Required entry name */
  name: z.string().min(1).max(200),

  /** Optional aliases - defaults to empty array */
  alias: z.array(z.string().max(200)).optional().default([]),

  /** Optional tags - defaults to empty array */
  tags: z.array(z.string().max(100)).optional().default([]),

  /** Optional content - defaults to empty string */
  content: z.string().optional().default(""),

  /** Optional createDate - will be auto-generated if not provided */
  createDate: ISODateTimeSchema.optional(),

  /** Optional updatedAt - will be auto-generated if not provided */
  updatedAt: ISODateTimeSchema.optional(),
});

/**
 * Wiki update schema
 * Used when updating existing wiki entries
 * All fields are optional except the implicit id used for lookup
 */
export const WikiUpdateSchema = z.object({
  /** Updated name */
  name: z.string().min(1).max(200).optional(),

  /** Updated aliases */
  alias: z.array(z.string().max(200)).optional(),

  /** Updated tags */
  tags: z.array(z.string().max(100)).optional(),

  /** Updated content */
  content: z.string().optional(),

  /** Updated timestamp */
  updatedAt: ISODateTimeSchema.optional(),
});

/**
 * Type inference helpers
 * Use these to derive TypeScript types from Zod schemas
 */
export type WikiSchemaType = z.infer<typeof WikiSchema>;
export type WikiCreateSchemaType = z.infer<typeof WikiCreateSchema>;
export type WikiUpdateSchemaType = z.infer<typeof WikiUpdateSchema>;
