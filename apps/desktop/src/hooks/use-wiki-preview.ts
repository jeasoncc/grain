/**
 * @file use-wiki-preview.ts
 * @description Wiki 预览数据获取 Hook
 *
 * 封装 Wiki 悬浮预览的数据获取逻辑，
 * 使 views 层不直接依赖 io/api
 */

import * as E from "fp-ts/Either";
import { useCallback } from "react";
import { getWikiPreviewData, type WikiPreviewData } from "@/flows/wiki";

export type { WikiPreviewData };

/**
 * Wiki 预览数据获取 Hook
 *
 * @returns 数据获取函数
 */
export function useWikiPreviewFetcher() {
	const fetchWikiPreview = useCallback(
		async (id: string): Promise<WikiPreviewData> => {
			const result = await getWikiPreviewData(id)();
			if (E.isRight(result)) {
				return result.right;
			}
			return {
				title: "Unknown",
				content: "Failed to load content",
			};
		},
		[],
	);

	return { fetchWikiPreview };
}
