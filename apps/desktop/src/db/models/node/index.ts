/**
 * Node Model - Unified Exports
 *
 * Exports all node-related types, schemas, builder, repository, and hooks.
 *
 * @requirements 2.1
 */

// Interface exports
export type {
  NodeInterface,
  NodeType,
  NodeCreateInput,
  NodeUpdateInput,
} from "./node.interface";

// Schema exports
export {
  NodeSchema,
  NodeCreateSchema,
  NodeUpdateSchema,
  NodeTypeSchema,
} from "./node.schema";

export type {
  NodeSchemaType,
  NodeCreateSchemaType,
  NodeUpdateSchemaType,
  NodeTypeSchemaType,
} from "./node.schema";

// Builder export
export { NodeBuilder } from "./node.builder";

// Repository export
export { NodeRepository } from "./node.repository";

// Hooks exports
export {
  useNodesByWorkspace,
  useNode,
  useChildNodes,
  useRootNodes,
  useNodesByType,
  useNodeCount,
  useNodeExists,
  useNodesByIds,
} from "./node.hooks";
