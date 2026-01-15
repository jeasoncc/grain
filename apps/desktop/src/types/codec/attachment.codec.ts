/**
 * Attachment Codec - 附件类型转换
 *
 * 负责 Rust 后端 AttachmentResponse 与前端 AttachmentInterface 之间的转换。
 *
 * 架构位置：
 * ```
 * Repository Layer (返回 AttachmentInterface)
 *       │
 *       ▼
 * Codec Layer (类型转换) ← 你在这里
 *       │
 *       ▼
 * rust-api.fn.ts (返回 AttachmentResponse)
 * ```
 */

import type {
	AttachmentCreateInput,
	AttachmentInterface,
	AttachmentType,
	AttachmentUpdateInput,
} from "@/types/attachment"
import type {
	AttachmentResponse,
	CreateAttachmentRequest,
	AttachmentType as RustAttachmentType,
	UpdateAttachmentRequest,
} from "@/types/rust-api"

// ============================================
// 解码函数 (Rust → 前端)
// ============================================

/**
 * 解码附件类型
 */
const decodeAttachmentType = (type: RustAttachmentType): AttachmentType => type

/**
 * 解码单个附件
 * Rust AttachmentResponse → 前端 AttachmentInterface
 */
export const decodeAttachment = (response: AttachmentResponse): AttachmentInterface => ({
	fileName: response.fileName,
	filePath: response.filePath,
	id: response.id,
	mimeType: response.mimeType ?? undefined,
	project: response.projectId ?? undefined,
	size: response.size ?? undefined,
	type: decodeAttachmentType(response.attachmentType),
	uploadedAt: new Date(response.uploadedAt).toISOString(),
})

/**
 * 解码附件数组
 */
export const decodeAttachments = (
	responses: readonly AttachmentResponse[],
): readonly AttachmentInterface[] => responses.map(decodeAttachment)

/**
 * 解码可选附件
 */
export const decodeAttachmentOptional = (
	response: AttachmentResponse | null,
): AttachmentInterface | null => (response ? decodeAttachment(response) : null)

// ============================================
// 编码函数 (前端 → Rust)
// ============================================

/**
 * 编码附件类型
 */
const encodeAttachmentType = (type: AttachmentType): RustAttachmentType => type

/**
 * 编码创建附件请求
 * 前端 AttachmentCreateInput → Rust CreateAttachmentRequest
 */
export const encodeCreateAttachment = (input: AttachmentCreateInput): CreateAttachmentRequest => ({
	attachmentType: encodeAttachmentType(input.type),
	fileName: input.fileName,
	filePath: input.filePath,
	mimeType: input.mimeType,
	projectId: input.project,
	size: input.size,
})

/**
 * 编码更新附件请求
 * 前端 AttachmentUpdateInput → Rust UpdateAttachmentRequest
 */
export const encodeUpdateAttachment = (input: AttachmentUpdateInput): UpdateAttachmentRequest => ({
	fileName: input.fileName,
	filePath: input.filePath,
	mimeType: input.mimeType !== undefined ? input.mimeType : undefined,
	size: input.size !== undefined ? input.size : undefined,
})
