/**
 * Tag Codec - 标签类型转换
 *
 * 负责 Rust 后端 TagResponse 与前端 TagInterface 之间的转换。
 *
 * 架构位置：
 * ```
 * Repository Layer (返回 TagInterface)
 *       │
 *       ▼
 * Codec Layer (类型转换) ← 你在这里
 *       │
 *       ▼
 * rust-api.fn.ts (返回 TagResponse)
 * ```
 */

import type {
	CreateTagRequest,
	TagGraphData as RustTagGraphData,
	TagResponse,
	UpdateTagRequest,
} from "@/types/rust-api";
import type { TagCreateInput, TagInterface, TagUpdateInput } from "@/types/tag";

// ============================================
// 解码函数 (Rust → 前端)
// ============================================

/**
 * 解码单个标签
 * Rust TagResponse → 前端 TagInterface
 */
export const decodeTag = (response: TagResponse): TagInterface => ({
	id: response.id,
	name: response.name,
	workspace: response.workspaceId,
	count: response.count,
	lastUsed: new Date(response.lastUsed).toISOString(),
	createDate: new Date(response.createdAt).toISOString(),
});

/**
 * 解码标签数组
 */
export const decodeTags = (
	responses: readonly TagResponse[],
): readonly TagInterface[] => responses.map(decodeTag);

/**
 * 解码可选标签
 */
export const decodeTagOptional = (
	response: TagResponse | null,
): TagInterface | null => (response ? decodeTag(response) : null);

/**
 * 标签图形数据（前端类型）
 */
export interface TagGraphData {
	readonly nodes: ReadonlyArray<{
		readonly id: string;
		readonly name: string;
		readonly count: number;
	}>;
	readonly edges: ReadonlyArray<{
		readonly source: string;
		readonly target: string;
		readonly weight: number;
	}>;
}

/**
 * 解码标签图形数据
 * Rust TagGraphData → 前端 TagGraphData
 */
export const decodeTagGraphData = (data: RustTagGraphData): TagGraphData => ({
	nodes: data.nodes.map((node) => ({
		id: node.id,
		name: node.name,
		count: node.count,
	})),
	edges: data.edges.map((edge) => ({
		source: edge.source,
		target: edge.target,
		weight: edge.weight,
	})),
});

// ============================================
// 编码函数 (前端 → Rust)
// ============================================

/**
 * 编码创建标签请求
 * 前端 TagCreateInput → Rust CreateTagRequest
 */
export const encodeCreateTag = (input: TagCreateInput): CreateTagRequest => ({
	name: input.name,
	workspaceId: input.workspace,
});

/**
 * 编码更新标签请求
 * 前端 TagUpdateInput → Rust UpdateTagRequest
 */
export const encodeUpdateTag = (input: TagUpdateInput): UpdateTagRequest => ({
	name: input.name,
	count: input.count,
	lastUsed: input.lastUsed ? new Date(input.lastUsed).getTime() : undefined,
});
