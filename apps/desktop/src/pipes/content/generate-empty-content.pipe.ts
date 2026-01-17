/**
 * @file pipes/content/generate-empty-content.pipe.ts
 * @description 生成空内容的纯函数
 *
 * 职责：
 * - 根据节点类型生成默认内容
 * - 根据节点类型生成默认标题
 *
 * 依赖：types/
 */

import type { NodeType } from "@/types/node"

// ============================================================================
// Constants
// ============================================================================

const EXCALIDRAW_EMPTY_CONTENT = JSON.stringify({
	appState: {},
	elements: [],
	files: {},
})

const LEXICAL_EMPTY_CONTENT = (title: string): string =>
	JSON.stringify({
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: title,
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					tag: "h2",
					type: "heading",
					version: 1,
				},
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text: "",
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	})

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * 根据节点类型生成空内容
 *
 * @param type - 节点类型
 * @param title - 节点标题
 * @returns 序列化的空内容
 */
export const generateEmptyContent = (type: NodeType, title: string): string =>
	type === "drawing" ? EXCALIDRAW_EMPTY_CONTENT : LEXICAL_EMPTY_CONTENT(title)

/**
 * 根据节点类型获取默认标题
 *
 * @param type - 节点类型
 * @returns 默认标题
 */
export const getDefaultTitle = (type: NodeType): string =>
	type === "drawing" ? "New Canvas" : "New File"
