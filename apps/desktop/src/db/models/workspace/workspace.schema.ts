/**
 * Workspace Zod Schema Definitions
 *
 * Defines Zod schemas for runtime validation of workspace data.
 * These schemas ensure data integrity when creating or updating workspaces.
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { UUIDSchema, ISODateTimeSchema } from "../shared";

/**
 * Full Workspace schema
 * Validates complete workspace records from the database
 */
export const WorkspaceSchema = z.object({
  /** Unique identifier for the workspace */
  id: UUIDSchema,

  /** Display title of the workspace */
  title: z.string().min(1).max(200),

  /** Author name */
  author: z.string().max(200),

  /** Project description */
  description: z.string().max(2000),

  /** Publisher information */
  publisher: z.string().max(200),

  /** Project language (e.g., "zh", "en") */
  language: z.string().max(10),

  /** Last time the workspace was opened */
  lastOpen: ISODateTimeSchema,

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateTimeSchema,

  /** Optional: Team members (user IDs) for collaborative workspaces */
  members: z.array(z.string()).optional(),

  /** Optional: Owner user ID */
  owner: UUIDSchema.optional(),
});

/**
 * Workspace creation schema
 * Used when creating new workspaces
 * id, createDate, and lastOpen are auto-generated
 */
export const WorkspaceCreateSchema = z.object({
  /** Optional id - will be auto-generated if not provided */
  id: UUIDSchema.optional(),

  /** Required display title */
  title: z.string().min(1).max(200),

  /** Optional author - defaults to empty string */
  author: z.string().max(200).optional().default(""),

  /** Optional description - defaults to empty string */
  description: z.string().max(2000).optional().default(""),

  /** Optional publisher - defaults to empty string */
  publisher: z.string().max(200).optional().default(""),

  /** Optional language - defaults to "zh" */
  language: z.string().max(10).optional().default("zh"),

  /** Optional lastOpen - will be auto-generated if not provided */
  lastOpen: ISODateTimeSchema.optional(),

  /** Optional createDate - will be auto-generated if not provided */
  createDate: ISODateTimeSchema.optional(),

  /** Optional team members */
  members: z.array(z.string()).optional(),

  /** Optional owner user ID */
  owner: UUIDSchema.optional(),
});

/**
 * Workspace update schema
 * Used when updating existing workspaces
 * All fields are optional except the implicit id used for lookup
 */
export const WorkspaceUpdateSchema = z.object({
  /** Updated title */
  title: z.string().min(1).max(200).optional(),

  /** Updated author */
  author: z.string().max(200).optional(),

  /** Updated description */
  description: z.string().max(2000).optional(),

  /** Updated publisher */
  publisher: z.string().max(200).optional(),

  /** Updated language */
  language: z.string().max(10).optional(),

  /** Updated lastOpen timestamp */
  lastOpen: ISODateTimeSchema.optional(),

  /** Updated team members */
  members: z.array(z.string()).optional(),

  /** Updated owner */
  owner: UUIDSchema.optional(),
});

/**
 * Type inference helpers
 * Use these to derive TypeScript types from Zod schemas
 */
export type WorkspaceSchemaType = z.infer<typeof WorkspaceSchema>;
export type WorkspaceCreateSchemaType = z.infer<typeof WorkspaceCreateSchema>;
export type WorkspaceUpdateSchemaType = z.infer<typeof WorkspaceUpdateSchema>;
