/**
 * Drawing Zod Schema Definitions
 *
 * Defines Zod schemas for runtime validation of drawing data.
 * These schemas ensure data integrity when creating or updating drawings.
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { UUIDSchema, ISODateTimeSchema } from "../shared";

/**
 * Default drawing dimensions
 */
export const DEFAULT_DRAWING_WIDTH = 800;
export const DEFAULT_DRAWING_HEIGHT = 600;

/**
 * Full Drawing schema
 * Validates complete drawing records from the database
 */
export const DrawingSchema = z.object({
  /** Unique identifier for the drawing */
  id: UUIDSchema,

  /** Project/workspace ID this drawing belongs to */
  project: UUIDSchema,

  /** Drawing name/title */
  name: z.string().min(1).max(200),

  /** Excalidraw data as JSON string */
  content: z.string(),

  /** Drawing canvas width in pixels */
  width: z.number().int().positive(),

  /** Drawing canvas height in pixels */
  height: z.number().int().positive(),

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateTimeSchema,

  /** Last update timestamp in ISO 8601 format */
  updatedAt: ISODateTimeSchema,
});

/**
 * Drawing creation schema
 * Used when creating new drawings
 * id, createDate, and updatedAt are auto-generated
 */
export const DrawingCreateSchema = z.object({
  /** Optional id - will be auto-generated if not provided */
  id: UUIDSchema.optional(),

  /** Required project/workspace ID */
  project: UUIDSchema,

  /** Required drawing name */
  name: z.string().min(1).max(200),

  /** Optional content - defaults to empty string */
  content: z.string().optional().default(""),

  /** Optional width - defaults to DEFAULT_DRAWING_WIDTH */
  width: z.number().int().positive().optional().default(DEFAULT_DRAWING_WIDTH),

  /** Optional height - defaults to DEFAULT_DRAWING_HEIGHT */
  height: z.number().int().positive().optional().default(DEFAULT_DRAWING_HEIGHT),

  /** Optional createDate - will be auto-generated if not provided */
  createDate: ISODateTimeSchema.optional(),

  /** Optional updatedAt - will be auto-generated if not provided */
  updatedAt: ISODateTimeSchema.optional(),
});

/**
 * Drawing update schema
 * Used when updating existing drawings
 * All fields are optional except the implicit id used for lookup
 */
export const DrawingUpdateSchema = z.object({
  /** Updated name */
  name: z.string().min(1).max(200).optional(),

  /** Updated content */
  content: z.string().optional(),

  /** Updated width */
  width: z.number().int().positive().optional(),

  /** Updated height */
  height: z.number().int().positive().optional(),

  /** Updated timestamp */
  updatedAt: ISODateTimeSchema.optional(),
});

/**
 * Type inference helpers
 * Use these to derive TypeScript types from Zod schemas
 */
export type DrawingSchemaType = z.infer<typeof DrawingSchema>;
export type DrawingCreateSchemaType = z.infer<typeof DrawingCreateSchema>;
export type DrawingUpdateSchemaType = z.infer<typeof DrawingUpdateSchema>;
