/**
 * Wiki 悬浮预览连接组件
 *
 * 连接层：提供数据获取逻辑，将纯展示组件连接到数据源
 */

import { useCallback } from "react";
import { getNode, getNodeContent } from "@/services/nodes";
import { WikiHoverPreview, type WikiPreviewData } from "./wiki-hover-preview";

interface WikiHoverPreviewConnectedProps {
	entryId: string;
	anchorElement: HTMLElement;
	onClose: () => void;
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
 * Wiki 悬浮预览连接组件
 *
 * 负责数据获取，将数据传递给纯展示组件
 */
export function WikiHoverPreviewConnected({
	entryId,
	anchorElement,
	onClose,
}: WikiHoverPreviewConnectedProps) {
	// 数据获取函数
	const handleFetchData = useCallback(
		async (id: string): Promise<WikiPreviewData> => {
			try {
				const [nodeContent, node] = await Promise.all([
					getNodeContent(id),
					getNode(id),
				]);

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

	return (
		<WikiHoverPreview
			entryId={entryId}
			anchorElement={anchorElement}
			onClose={onClose}
			onFetchData={handleFetchData}
		/>
	);
}
