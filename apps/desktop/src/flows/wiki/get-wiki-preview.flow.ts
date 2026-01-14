/**
 * @file get-wiki-preview.flow.ts
 * @description Wiki 预览数据获取 Flow
 *
 * 封装 Wiki 悬浮预览的数据获取逻辑
 */

import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { getContentByNodeId, getNodeById } from "@/io/api";
import type { AppError } from "@/types/error";

/**
 * Wiki 预览数据类型
 */
export interface WikiPreviewData {
	readonly title: string;
	readonly content: string;
}

/**
 * 从 Lexical JSON 提取纯文本
 */
function extractTextFromLexical(node: unknown): string {
	if (!node) return "";
	if (typeof node === "object" && node !== null) {
		const nodeObj = node as { readonly text?: string; readonly children?: ReadonlyArray<unknown> };
		if (typeof nodeObj.text === "string") return nodeObj.text;
		if (Array.isArray(nodeObj.children)) {
			return nodeObj.children.map(extractTextFromLexical).join(" ");
		}
	}
	return "";
}

/**
 * 获取 Wiki 预览数据
 *
 * @param id - 节点 ID
 * @returns TaskEither<AppError, WikiPreviewData>
 */
export const getWikiPreviewData = (
	id: string,
): TE.TaskEither<AppError, WikiPreviewData> =>
	TE.tryCatch(
		async () => {
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
		},
		(): AppError => ({
			type: "UNKNOWN_ERROR",
			message: "Failed to load wiki preview",
		}),
	);
