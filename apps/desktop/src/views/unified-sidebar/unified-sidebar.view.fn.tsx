/**
 * UnifiedSidebar View Component
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 */

import { PanelLeftOpen } from "lucide-react"
import { memo } from "react"
import { DrawingsPanel } from "../panels/drawings-panel"
import { FileTreePanel } from "../panels/file-tree-panel/"
import { SearchPanel } from "../panels/search-panel/"
import { TagGraphPanel } from "../panels/tag-graph-panel/"
import { Button } from "../ui/button"
import type { UnifiedSidebarViewProps } from "./unified-sidebar.types"

/**
 * UnifiedSidebarView - 统一侧边栏纯展示组件
 *
 * 纯函数式组件：
 * - 使用 memo() 包裹
 * - 所有数据通过 props 传入
 * - 无内部业务状态
 * - Props 驱动渲染
 */
export const UnifiedSidebarView = memo(
	({
		activePanel,
		isOpen,
		wasCollapsedByDrag,
		workspaceId,
		drawings,
		selectedDrawingId,
		onRestoreFromCollapse,
		onSelectDrawing,
		onCreateDrawing,
		onDeleteDrawing,
	}: UnifiedSidebarViewProps) => {
		// Show restore button when collapsed by drag
		if (!isOpen && wasCollapsedByDrag) {
			return (
				<div className="shrink-0 flex items-start pt-2 pl-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-muted-foreground hover:text-foreground"
						onClick={onRestoreFromCollapse}
						title="Restore sidebar"
					>
						<PanelLeftOpen className="h-4 w-4" />
					</Button>
				</div>
			)
		}

		if (!isOpen || !activePanel) {
			return null
		}

		return (
			<div className="flex flex-col h-full w-full overflow-hidden">
				{activePanel === "search" && <SearchPanel />}
				{activePanel === "drawings" && (
					<DrawingsPanel
						workspaceId={workspaceId}
						drawings={[...drawings]}
						selectedDrawingId={selectedDrawingId}
						onSelectDrawing={onSelectDrawing}
						onCreateDrawing={onCreateDrawing}
						onDeleteDrawing={onDeleteDrawing}
					/>
				)}
				{activePanel === "files" && <FileTreePanel />}
				{activePanel === "tags" && <TagGraphPanel />}
			</div>
		)
	},
)

UnifiedSidebarView.displayName = "UnifiedSidebarView"
