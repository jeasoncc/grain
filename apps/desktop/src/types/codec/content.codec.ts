/**
 * Content Codec - 内容类型转换
 *
 * 负责 Rust 后端类型 (ContentResponse) 与前端类型 (ContentInterface) 之间的转换。
 * 这是类型边界层，确保前后端类型解耦。
 */

import type {
  ContentInterface,
  ContentCreateInput,
  ContentType,
} from "@/types/content";
import type { ContentResponse, SaveContentRequest } from "@/types/rust-api";

// ============================================
// 解码：Rust 类型 → 前端类型
// ============================================

/**
 * 从内容字符串推断内容类型
 * 根据内容格式判断是 lexical、excalidraw 还是 text
 */
const inferContentType = (content: string): ContentType => {
  try {
    const parsed = JSON.parse(content);
    // Excalidraw 内容有 type: "excalidraw" 或 elements 数组
    if (parsed.type === "excalidraw" || Array.isArray(parsed.elements)) {
      return "excalidraw";
    }
    // Lexical 内容有 root 节点
    if (parsed.root) {
      return "lexical";
    }
    return "text";
  } catch {
    return "text";
  }
};

/**
 * 解码单个内容：ContentResponse → ContentInterface
 *
 * 将 Rust 后端返回的内容数据转换为前端使用的接口类型
 */
export const decodeContent = (response: ContentResponse): ContentInterface => ({
  id: response.id,
  nodeId: response.nodeId,
  content: response.content,
  contentType: inferContentType(response.content),
  lastEdit: new Date(response.updatedAt).toISOString(),
});

/**
 * 解码可选内容：ContentResponse | null → ContentInterface | null
 */
export const decodeContentOptional = (
  response: ContentResponse | null
): ContentInterface | null => (response ? decodeContent(response) : null);

// ============================================
// 编码：前端类型 → Rust 请求类型
// ============================================

/**
 * 编码保存内容请求：ContentCreateInput → SaveContentRequest
 */
export const encodeCreateContent = (
  input: ContentCreateInput
): SaveContentRequest => ({
  nodeId: input.nodeId,
  content: input.content ?? "",
});

/**
 * 编码更新内容请求
 */
export const encodeUpdateContent = (
  nodeId: string,
  content: string,
  expectedVersion?: number
): SaveContentRequest => ({
  nodeId,
  content,
  expectedVersion,
});

/**
 * 从 ContentInterface 编码保存请求
 */
export const encodeContentToSaveRequest = (
  content: Partial<ContentInterface>,
  expectedVersion?: number
): SaveContentRequest => ({
  nodeId: content.nodeId!,
  content: content.content ?? "",
  expectedVersion,
});
