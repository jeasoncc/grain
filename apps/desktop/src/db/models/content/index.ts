/**
 * Content Model - Unified Export
 *
 * Re-exports all content-related types, schemas, builder, repository, and hooks.
 * Import from '@/db/models/content' to access all content functionality.
 *
 * @requirements 2.1
 */

// Interface types
export type {
  ContentInterface,
  ContentType,
  ContentCreateInput,
  ContentUpdateInput,
} from "./content.interface";

// Zod schemas for validation
export {
  ContentSchema,
  ContentCreateSchema,
  ContentUpdateSchema,
  ContentTypeSchema,
} from "./content.schema";

// Zod schema type inference
export type {
  ContentSchemaType,
  ContentCreateSchemaType,
  ContentUpdateSchemaType,
  ContentTypeSchemaType,
} from "./content.schema";

// Builder for creating content objects
export { ContentBuilder } from "./content.builder";

// Repository for CRUD operations
export { ContentRepository } from "./content.repository";

// React hooks for data access
export {
  useContentByNodeId,
  useContentById,
  useContentsByNodeIds,
  useContentExists,
} from "./content.hooks";
