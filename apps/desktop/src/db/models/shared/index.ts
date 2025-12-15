/**
 * Shared Types and Schemas - Unified Export
 *
 * Re-exports all shared types, interfaces, and Zod schemas
 * for use across all data models.
 *
 * @requirements 2.1 - Centralized location for shared type definitions
 */

// Base interface types
export type {
  UUID,
  ISODateString,
  BaseEntity,
  BaseEntityCreate,
  BaseEntityUpdate,
} from "./base.interface";

// Zod schemas for validation
export {
  UUIDSchema,
  ISODateTimeSchema,
  BaseEntitySchema,
  BaseEntityCreateSchema,
  BaseEntityUpdateSchema,
} from "./base.schema";

// Zod schema type inference
export type {
  BaseEntitySchemaType,
  BaseEntityCreateSchemaType,
  BaseEntityUpdateSchemaType,
} from "./base.schema";
