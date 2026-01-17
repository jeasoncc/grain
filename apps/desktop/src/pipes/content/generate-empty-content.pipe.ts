/**
 * @file pipes/content/generate-empty-content.pipe.ts
 * @description 生成空内容的纯函数
 *
 * 职责：
 * - 根据节点类型生成默认内容（业务逻辑层）
 * - 根据节点类型生成默认标题
 * - 委托给技术层（editor-lexical, excalidraw-editor）生成具体格式
 *
 * 依赖：types/, @grain/editor-lexical
 */

import { createInitialDocumentState } from "@grain/editor-lexical"
import type { NodeType } from "@/types/node"

// ============================================================================
// Constants
// ============================================================================

/**
 * Excalidraw 空画布内容
 */
const EXCALIDRAW_EMPTY_CONTENT = JSON.stringify({
	appState: {},
	elements: [],
	files: {},
})

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * 根据节点类型生成初始内容
 *
 * 业务逻辑：
 * - drawing 类型 → Excalidraw 空画布
 * - 其他类型 → Lexical 文档（包含标题）
 *
 * @param type - 节点类型
 * @param title - 节点标题
 * @returns 序列化的初始内容（JSON 字符串）
 */
export const generateEmptyContent = (type: NodeType, title: string): string =>
	type === "drawing" ? EXCALIDRAW_EMPTY_CONTENT : createInitialDocumentState(title)

/**
 * 根据节点类型获取默认标题
 *
 * @param type - 节点类型
 * @returns 默认标题
 */
export const getDefaultTitle = (type: NodeType): string =>
	type === "drawing" ? "New Canvas" : "New File"
