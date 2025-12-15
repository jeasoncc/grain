/**
 * Base Zod Schema Definitions
 *
 * Defines Zod schemas for common fields used across all data models.
 * These schemas provide runtime validation for data integrity.
 *
 * @requirements 2.2 - Zod schemas for runtime validation of all data entities
 */

import { z } from "zod";

/**
 * UUID schema - validates UUID v4 format
 * Used for all entity identifiers
 */
export const UUIDSchema = z.string().uuid("Invalid UUID format");

/**
 * ISO DateTime schema - validates ISO 8601 date strings
 * Used for all timestamp fields (createDate, lastEdit, etc.)
 */
export const ISODateTimeSchema = z.string().datetime({
  message: "Invalid ISO 8601 datetime format",
});

/**
 * Base entity schema containing common fields
 * All persistent entities should include these fields
 */
export const BaseEntitySchema = z.object({
  /** Unique identifier using UUID v4 format */
  id: UUIDSchema,

  /** Creation timestamp in ISO 8601 format */
  createDate: ISODateTimeSchema,

  /** Last modification timestamp in ISO 8601 format */
  lastEdit: ISODateTimeSchema,
});

/**
 * Schema for creating new entities
 * All fields are optional since they can be auto-generated
 */
export const BaseEntityCreateSchema = BaseEntitySchema.partial();

/**
 * Schema for updating existing entities
 * Only lastEdit can be updated (id and createDate are immutable)
 */
export const BaseEntityUpdateSchema = z.object({
  lastEdit: ISODateTimeSchema.optional(),
});

/**
 * Type inference helpers
 * Use these to derive TypeScript types from Zod schemas
 */
export type BaseEntitySchemaType = z.infer<typeof BaseEntitySchema>;
export type BaseEntityCreateSchemaType = z.infer<typeof BaseEntityCreateSchema>;
export type BaseEntityUpdateSchemaType = z.infer<typeof BaseEntityUpdateSchema>;
