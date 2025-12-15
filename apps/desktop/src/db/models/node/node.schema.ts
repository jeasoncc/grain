/**
 * Node Zod Schema Definitions
 *
 * Defines Zod schemas for runtime validation of node data.
 * These schemas ensure data integrity when creating or updating nodes.
 *
 * @requirements 2.2
 */

import { z } from "zod";
import { UUIDSchema, ISODateTimeSchema } from "../shared";

/**
 * Node type schema
 * Validates that type is one of the allowed values
 */
export const NodeTypeSchema = z.enum(["folder", "file", "canvas", "diary"]);

/**
 * Full Node schema
 * Validates complete node records from the database
 */
export const NodeSchema = z.object({
  /** Unique identifier for the node */
  id: UUIDSchema,

  /** Reference to the parent workspace/project */
  workspace: UUIDSchema,

  /** Parent node ID, null for root-level nodes */
  parent: UUIDSchema.nullable(),

  /** Type of node (folder, file, canvas, diary) */
  type: NodeTypeSchema,

  /** Display title of the node */
  title: z.string().min(1).max(500),

  /** Sort order among siblings (0-based) */
  order: z.number().int().min(0),

  /** Whether folder is collapsed in the tree view */
  collapsed: z.boolean().optional(),

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateTimeSchema,

  /** Last modification timestamp in ISO 8601 format */
  lastEdit: ISODateTimeSchema,
});

/**
 * Node creation schema
 * Used when creating new nodes
 * id, createDate, and lastEdit are auto-generated
 */
export const NodeCreateSchema = z.object({
  /** Optional id - will be auto-generated if not provided */
  id: UUIDSchema.optional(),

  /** Required reference to the parent workspace */
  workspace: UUIDSchema,

  /** Optional parent node ID - null for root-level nodes */
  parent: UUIDSchema.nullable().optional().default(null),

  /** Optional type - defaults to "file" */
  type: NodeTypeSchema.optional().default("file"),

  /** Required display title */
  title: z.string().min(1).max(500),

  /** Optional order - defaults to 0 */
  order: z.number().int().min(0).optional().default(0),

  /** Optional collapsed state - defaults to true for folders */
  collapsed: z.boolean().optional(),

  /** Optional createDate - will be auto-generated if not provided */
  createDate: ISODateTimeSchema.optional(),

  /** Optional lastEdit - will be auto-generated if not provided */
  lastEdit: ISODateTimeSchema.optional(),
});

/**
 * Node update schema
 * Used when updating existing nodes
 * All fields are optional except the implicit id used for lookup
 */
export const NodeUpdateSchema = z.object({
  /** Updated parent node ID */
  parent: UUIDSchema.nullable().optional(),

  /** Updated type */
  type: NodeTypeSchema.optional(),

  /** Updated title */
  title: z.string().min(1).max(500).optional(),

  /** Updated order */
  order: z.number().int().min(0).optional(),

  /** Updated collapsed state */
  collapsed: z.boolean().optional(),

  /** Updated lastEdit - typically auto-generated */
  lastEdit: ISODateTimeSchema.optional(),
});

/**
 * Type inference helpers
 * Use these to derive TypeScript types from Zod schemas
 */
export type NodeSchemaType = z.infer<typeof NodeSchema>;
export type NodeCreateSchemaType = z.infer<typeof NodeCreateSchema>;
export type NodeUpdateSchemaType = z.infer<typeof NodeUpdateSchema>;
export type NodeTypeSchemaType = z.infer<typeof NodeTypeSchema>;
