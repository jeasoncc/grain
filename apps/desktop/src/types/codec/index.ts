/**
 * Codec 层 - 类型转换边界
 *
 * 负责 Rust 后端类型与前端类型之间的转换。
 * 所有类型转换都在这一层完成，确保前后端类型解耦。
 *
 * 架构位置：
 * ```
 * Repository Layer (返回前端类型)
 *       │
 *       ▼
 * Codec Layer (类型转换) ← 你在这里
 *       │
 *       ▼
 * rust-api.fn.ts (返回 Rust 类型)
 * ```
 */

// Node Codec
export {
  decodeNode,
  decodeNodes,
  encodeCreateNode,
  encodeUpdateNode,
  encodeNodeToCreateRequest,
  encodeNodeToUpdateRequest,
} from "./node.codec";

// Workspace Codec
export {
  decodeWorkspace,
  decodeWorkspaces,
  encodeCreateWorkspace,
  encodeUpdateWorkspace,
  encodeWorkspaceToCreateRequest,
  encodeWorkspaceToUpdateRequest,
} from "./workspace.codec";

// Content Codec
export {
  decodeContent,
  decodeContentOptional,
  encodeCreateContent,
  encodeUpdateContent,
  encodeContentToSaveRequest,
} from "./content.codec";
