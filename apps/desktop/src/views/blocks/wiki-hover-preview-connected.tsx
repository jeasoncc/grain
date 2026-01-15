/**
 * Wiki 悬浮预览连接组件
 *
 * 连接层：提供数据获取逻辑，将纯展示组件连接到数据源
 */

import { useWikiPreviewFetcher } from "@/hooks/use-wiki-preview"
import { WikiHoverPreview } from "./wiki-hover-preview"

interface WikiHoverPreviewConnectedProps {
	readonly entryId: string
	readonly anchorElement: HTMLElement
	readonly onClose: () => void
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
	const { fetchWikiPreview } = useWikiPreviewFetcher()

	return (
		<WikiHoverPreview
			entryId={entryId}
			anchorElement={anchorElement}
			onClose={onClose}
			onFetchData={fetchWikiPreview}
		/>
	)
}
