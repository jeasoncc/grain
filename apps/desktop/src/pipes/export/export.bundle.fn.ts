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

import { extractText } from "@/pipes/content/content.extract.fn";
import type { AttachmentData, ContentData } from "@/pipes/import/import.json.fn";
import type { NodeInterface } from "@/types/node";
import type { WorkspaceInterface } from "@/types/workspace";

// ==============================
// Types
// ==============================

/**
 * 导出数据包结构
 */
export interface ExportBundle {
	readonly version: number;
	readonly projects: readonly WorkspaceInterface[];
	readonly nodes: readonly NodeInterface[];
	readonly contents: readonly ContentData[];
	readonly attachments: readonly AttachmentData[];
}

/**
 * 导出数据输入
 */
export interface ExportDataInput {
	readonly workspaces: readonly WorkspaceInterface[];
	readonly nodes: readonly NodeInterface[];
	readonly contents: readonly ContentData[];
	readonly attachments: readonly AttachmentData[];
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
		version: 4, // 当前版本
		projects: data.workspaces,
		nodes: data.nodes,
		contents: data.contents,
		attachments: data.attachments,
	};
}

/**
 * 将导出数据包序列化为 JSON 字符串
 *
 * @param bundle - 导出数据包
 * @returns JSON 字符串
 */
export function serializeBundle(bundle: ExportBundle): string {
	return JSON.stringify(bundle, null, 2);
}

/**
 * 创建 ZIP 压缩包
 *
 * @param jsonData - JSON 数据字符串
 * @returns Promise<Blob>
 */
export async function createZipBundle(jsonData: string): Promise<Blob> {
	const JSZip = (await import("jszip")).default;
	const zip = new JSZip();
	zip.file("data.json", jsonData);
	return await zip.generateAsync({ type: "blob" });
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
	const sortedNodes = [...nodes].sort((a, b) => a.order - b.order);
	const lines: string[] = [];

	// 添加标题
	lines.push(`# ${workspace.title || "Untitled"}`);
	if (workspace.author) lines.push(`Author: ${workspace.author}`);
	if (workspace.description) {
		lines.push("");
		lines.push(workspace.description);
	}
	lines.push("");

	// 递归输出节点
	function outputNode(node: NodeInterface, depth: number) {
		const prefix = "#".repeat(Math.min(depth + 2, 6));
		lines.push("");
		lines.push(`${prefix} ${node.title || "Untitled"}`);

		const content = contentMap.get(node.id);
		if (content) {
			try {
				const parsed = JSON.parse(content);
				const text = extractText(parsed.root);
				if (text.trim()) {
					lines.push("");
					lines.push(text);
				}
			} catch {
				lines.push("");
				lines.push(content);
			}
		}

		const children = sortedNodes.filter((n) => n.parent === node.id);
		for (const child of children) {
			outputNode(child, depth + 1);
		}
	}

	// 输出根节点
	const rootNodes = sortedNodes.filter((n) => !n.parent);
	for (const node of rootNodes) {
		outputNode(node, 0);
	}

	return lines.join("\n");
}
