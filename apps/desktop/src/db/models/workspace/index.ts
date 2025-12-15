/**
 * Workspace Model - Unified Exports
 *
 * Exports all workspace-related types, schemas, builder, repository, and hooks.
 *
 * @requirements 2.1
 */

// Interface exports
export type {
  WorkspaceInterface,
  WorkspaceCreateInput,
  WorkspaceUpdateInput,
} from "./workspace.interface";

// Schema exports
export {
  WorkspaceSchema,
  WorkspaceCreateSchema,
  WorkspaceUpdateSchema,
} from "./workspace.schema";

export type {
  WorkspaceSchemaType,
  WorkspaceCreateSchemaType,
  WorkspaceUpdateSchemaType,
} from "./workspace.schema";

// Builder export
export { WorkspaceBuilder } from "./workspace.builder";

// Repository export
export { WorkspaceRepository } from "./workspace.repository";

// Hooks exports
export {
  useAllWorkspaces,
  useWorkspace,
  useWorkspacesByOwner,
  useRecentWorkspaces,
  useWorkspaceCount,
  useWorkspaceExists,
  useWorkspaceSearch,
} from "./workspace.hooks";
