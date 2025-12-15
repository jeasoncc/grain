/**
 * Data Models - Unified Export
 *
 * Re-exports all data models from a single entry point.
 * Import from this file for access to all model types, schemas, builders, and hooks.
 *
 * @example
 * ```typescript
 * // Import everything from a single entry point
 * import {
 *   NodeBuilder,
 *   NodeRepository,
 *   useNode,
 *   ContentBuilder,
 *   ContentRepository,
 *   useContentByNodeId,
 *   WorkspaceBuilder,
 *   // ... etc
 * } from '@/db/models';
 * ```
 *
 * @requirements 2.1 - Centralized location for all data model exports
 */

// Shared types and schemas
export * from "./shared";

// Content model (independent content table for performance)
export * from "./content";

// Node model (file tree nodes without content)
export * from "./node";

// Workspace model (projects/workspaces)
export * from "./workspace";

// Wiki model (wiki entries)
export * from "./wiki";

// Drawing model (Excalidraw drawings)
export * from "./drawing";

// User model (user accounts and settings)
export * from "./user";

// Attachment model (file attachments)
export * from "./attachment";
