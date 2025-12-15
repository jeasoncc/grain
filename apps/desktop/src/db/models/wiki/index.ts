/**
 * Wiki Model - Unified Exports
 *
 * Exports all wiki-related types, schemas, builder, repository, and hooks.
 *
 * @requirements 2.1
 */

// Interface exports
export type {
  WikiInterface,
  WikiCreateInput,
  WikiUpdateInput,
} from "./wiki.interface";

// Schema exports
export {
  WikiSchema,
  WikiCreateSchema,
  WikiUpdateSchema,
} from "./wiki.schema";

export type {
  WikiSchemaType,
  WikiCreateSchemaType,
  WikiUpdateSchemaType,
} from "./wiki.schema";

// Builder export
export { WikiBuilder } from "./wiki.builder";

// Repository export
export { WikiRepository } from "./wiki.repository";

// Hooks exports
export {
  useWikiByProject,
  useWiki,
  useWikiSearch,
  useWikiByTag,
  useWikiTags,
  useWikiCount,
  useWikiExists,
  useWikiByNameOrAlias,
  useRecentWiki,
} from "./wiki.hooks";
