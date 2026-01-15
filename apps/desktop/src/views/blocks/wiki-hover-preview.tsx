import { Loader2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

/**
 * Wiki 悬浮预览数据
 */
export interface WikiPreviewData {
	title: string
	content: string
}

/**
 * Wiki 悬浮预览组件 Props
 *
 * 纯展示组件，通过 props 接收数据获取回调
 */
interface WikiHoverPreviewProps {
	/** 条目 ID */
	entryId: string
	/** 锚点元素 */
	anchorElement: HTMLElement
	/** 关闭回调 */
	onClose: () => void
	/** 数据获取函数 */
	onFetchData: (entryId: string) => Promise<WikiPreviewData>
}

/**
 * Wiki 悬浮预览组件
 *
 * 纯展示组件，只负责 UI 渲染和位置计算
 */
export function WikiHoverPreview({
	entryId,
	anchorElement,
	onClose,
	onFetchData,
}: WikiHoverPreviewProps) {
	const [content, setContent] = useState<string | null>(null)
	const [title, setTitle] = useState<string>("")
	const [loading, setLoading] = useState(true)
	const [position, setPosition] = useState<{ top: number; left: number }>({
		top: 0,
		left: 0,
	})
	const tooltipRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		let mounted = true

		async function fetchData() {
			setLoading(true)
			try {
				const data = await onFetchData(entryId)

				if (mounted) {
					setTitle(data.title)
					setContent(data.content)
				}
			} catch {
				if (mounted) {
					setTitle("Unknown")
					setContent("Failed to load content")
				}
			} finally {
				if (mounted) setLoading(false)
			}
		}

		fetchData()

		return () => {
			mounted = false
		}
	}, [entryId, onFetchData])

	// Calculate position
	useEffect(() => {
		if (!anchorElement) return

		const rect = anchorElement.getBoundingClientRect()
		const top = rect.bottom + window.scrollY + 5
		const left = rect.left + window.scrollX

		setPosition({ top, left })
	}, [anchorElement])

	if (!anchorElement) return null

	return createPortal(
		<div
			ref={tooltipRef}
			className="fixed z-[9999] w-64 p-3 bg-popover/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200"
			style={{ top: position.top, left: position.left }}
			onMouseLeave={onClose}
			data-wiki-preview="true"
			role="tooltip"
		>
			{loading ? (
				<div className="flex items-center justify-center py-4">
					<Loader2 className="size-4 animate-spin text-muted-foreground" />
				</div>
			) : (
				<div className="space-y-2">
					<h4 className="font-medium text-sm border-b border-border/40 pb-1.5 mb-1.5">{title}</h4>
					<p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{content}</p>
				</div>
			)}
		</div>,
		document.body,
	)
}
