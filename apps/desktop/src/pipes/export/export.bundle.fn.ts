/**
 * @file fn/export/export.bundle.fn.ts
 * @description 数据包导出纯函数
 *
 * 功能说明：
 * - 创建导出数据包
 * - 生成 ZIP 压缩包
 * - 导出为 Markdown 格式
 *
 * 这些函数处理数据转换，不直接访问数据库。
 */

import { orderBy } from "es-toolkit"
import * as E from "fp-ts/Either"
import { extractText } from "@/pipes/content/content.extract.fn"
import type { AttachmentData, ContentData } from "@/pipes/import/import.json.fn"
import type { NodeInterface } from "@/types/node"
import type { WorkspaceInterface } from "@/types/workspace"

// ==============================
// Types
// ==============================

/**
 * 导出数据包结构
 */
export interface ExportBundle {
	readonly version: number
	readonly projects: readonly WorkspaceInterface[]
	readonly nodes: readonly NodeInterface[]
	readonly contents: readonly ContentData[]
	readonly attachments: readonly AttachmentData[]
}

/**
 * 导出数据输入
 */
export interface ExportDataInput {
	readonly workspaces: readonly WorkspaceInterface[]
	readonly nodes: readonly NodeInterface[]
	readonly contents: readonly ContentData[]
	readonly attachments: readonly AttachmentData[]
}

// ==============================
// Pure Functions
// ==============================

/**
 * 创建导出数据包
 *
 * @param data - 导出数据输入
 * @returns 导出数据包
 */
export function createExportBundle(data: ExportDataInput): ExportBundle {
	return {
		attachments: data.attachments,
		contents: data.contents,
		nodes: data.nodes,
		projects: data.workspaces,
		version: 4, // 当前版本
	}
}

/**
 * 将导出数据包序列化为 JSON 字符串
 *
 * @param bundle - 导出数据包
 * @returns JSON 字符串
 */
export function serializeBundle(bundle: ExportBundle): string {
	return JSON.stringify(bundle, null, 2)
}

/**
 * 创建 ZIP 压缩包
 *
 * @param jsonData - JSON 数据字符串
 * @returns Promise<Blob>
 */
export async function createZipBundle(jsonData: string): Promise<Blob> {
	const JSZip = (await import("jszip")).default
	const zip = new JSZip()
	zip.file("data.json", jsonData)
	return await zip.generateAsync({ type: "blob" })
}

/**
 * 将工作区导出为 Markdown 格式
 *
 * @param workspace - 工作区
 * @param nodes - 节点数组
 * @param contentMap - 节点 ID 到内容的映射
 * @returns Markdown 字符串
 */
export function exportWorkspaceToMarkdown(
	workspace: WorkspaceInterface,
	nodes: readonly NodeInterface[],
	contentMap: ReadonlyMap<string, string>,
): string {
	const sortedNodes = orderBy(nodes, [(node) => node.order], ["asc"])

	// 添加标题
	const titleLines = [
		`# ${workspace.title || "Untitled"}`,
		...(workspace.author ? [`Author: ${workspace.author}`] : []),
		...(workspace.description ? ["", workspace.description] : []),
		"",
	]

	// 递归输出节点
	function outputNode(node: NodeInterface, depth: number): readonly string[] {
		const prefix = "#".repeat(Math.min(depth + 2, 6))
		const headerLines = ["", `${prefix} ${node.title || "Untitled"}`]

		const content = contentMap.get(node.id)
		const contentLines = content
			? (() => {
					const parseResult = E.tryCatch(
						() => {
							const parsed = JSON.parse(content)
							return extractText(parsed.root)
						},
						() => content,
					)

					const text = E.getOrElse(() => content)(parseResult)
					return text.trim() ? ["", text] : []
				})()
			: []

		const children = sortedNodes.filter((n) => n.parent === node.id)
		const childLines = children.flatMap((child) => outputNode(child, depth + 1))

		return [...headerLines, ...contentLines, ...childLines]
	}

	// 输出根节点
	const rootNodes = sortedNodes.filter((n) => !n.parent)
	const contentLines = rootNodes.flatMap((node) => outputNode(node, 0))

	return [...titleLines, ...contentLines].join("\n")
}
