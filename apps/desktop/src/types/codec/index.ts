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

// Attachment Codec
export {
	decodeAttachment,
	decodeAttachmentOptional,
	decodeAttachments,
	encodeCreateAttachment,
	encodeUpdateAttachment,
} from "./attachment.codec"
// Content Codec
export {
	decodeContent,
	decodeContentOptional,
	encodeContentToSaveRequest,
	encodeCreateContent,
	encodeUpdateContent,
} from "./content.codec"
// Node Codec
export {
	decodeNode,
	decodeNodes,
	encodeCreateNode,
	encodeNodeToCreateRequest,
	encodeNodeToUpdateRequest,
	encodeUpdateNode,
} from "./node.codec"
// Tag Codec
export {
	decodeTag,
	decodeTagGraphData,
	decodeTagOptional,
	decodeTags,
	encodeCreateTag,
	encodeUpdateTag,
	type TagGraphData,
} from "./tag.codec"
// User Codec
export {
	decodeUser,
	decodeUserOptional,
	decodeUsers,
	encodeCreateUser,
	encodeUpdateUser,
} from "./user.codec"
// Workspace Codec
export {
	decodeWorkspace,
	decodeWorkspaces,
	encodeCreateWorkspace,
	encodeUpdateWorkspace,
	encodeWorkspaceToCreateRequest,
	encodeWorkspaceToUpdateRequest,
} from "./workspace.codec"
