/**
 * @file use-wiki-preview.ts
 * @description Wiki 预览数据获取 Hook
 *
 * 封装 Wiki 悬浮预览的数据获取逻辑，
 * 使 views 层不直接依赖 io/api
 */

import * as E from "fp-ts/Either";
import { useCallback } from "react";
import { getContentByNodeId, getNodeById } from "@/io/api";

/**
 * Wiki 预览数据类型
 */
export interface WikiPreviewData {
	title: string;
	content: string;
}

/**
 * 从 Lexical JSON 提取纯文本
 */
function extractTextFromLexical(node: unknown): string {
	if (!node) return "";
	if (typeof node === "object" && node !== null) {
		const nodeObj = node as { text?: string; children?: unknown[] };
		if (typeof nodeObj.text === "string") return nodeObj.text;
		if (Array.isArray(nodeObj.children)) {
			return nodeObj.children.map(extractTextFromLexical).join(" ");
		}
	}
	return "";
}

/**
 * Wiki 预览数据获取 Hook
 *
 * @returns 数据获取函数
 */
export function useWikiPreviewFetcher() {
	const fetchWikiPreview = useCallback(
		async (id: string): Promise<WikiPreviewData> => {
			try {
				const [contentResult, nodeResult] = await Promise.all([
					getContentByNodeId(id)(),
					getNodeById(id)(),
				]);

				const nodeContent =
					E.isRight(contentResult) && contentResult.right
						? contentResult.right.content
						: undefined;
				const node = E.isRight(nodeResult) ? nodeResult.right : undefined;

				const title = node?.title || "Unknown";

				// 提取纯文本预览
				let content = "No content";
				if (nodeContent) {
					try {
						const parsed = JSON.parse(nodeContent);
						const text = extractTextFromLexical(parsed.root);
						content = text.slice(0, 150) + (text.length > 150 ? "..." : "");
					} catch {
						content = "Preview not available";
					}
				}

				return { title, content };
			} catch (_error) {
				return {
					title: "Unknown",
					content: "Failed to load content",
				};
			}
		},
		[],
	);

	return { fetchWikiPreview };
}
