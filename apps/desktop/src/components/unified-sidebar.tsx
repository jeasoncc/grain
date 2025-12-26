/**
 * UnifiedSidebar - 统一侧边栏组件
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 */

import { PanelLeftOpen } from "lucide-react";
import type { DrawingInterface } from "@/db/schema";
import type { SidebarPanel } from "@/types/sidebar";
import { DrawingsPanel } from "./panels/drawings-panel";
import { FileTreePanel } from "./panels/file-tree-panel/";
import { SearchPanel } from "./panels/search-panel/";
import type { TagGraphData } from "./panels/tag-graph-panel";
import { TagGraphPanel } from "./panels/tag-graph-panel";
import { Button } from "./ui/button";

/**
 * UnifiedSidebarContent Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export interface UnifiedSidebarContentProps {
	/** 当前活动面板 */
	readonly activePanel: SidebarPanel;
	/** 当前工作区 ID */
	readonly workspaceId: string | null;
	/** 工作区的所有绘图 */
	readonly drawings: DrawingInterface[];
	/** 选中的绘图 ID */
	readonly selectedDrawingId: string | null;
	/** 选择绘图回调 */
	readonly onSelectDrawing: (drawing: DrawingInterface) => void;
	/** 创建绘图回调 */
	readonly onCreateDrawing: () => void;
	/** 删除绘图回调 */
	readonly onDeleteDrawing: (drawingId: string, drawingName: string) => void;
	/** 标签图谱数据 */
	readonly tagGraphData: TagGraphData | null;
}

/**
 * UnifiedSidebarContent - The content of the sidebar without resize handling
 * Used inside react-resizable-panels Panel component
 *
 * 纯展示组件：所有数据通过 props 传入
 */
export function UnifiedSidebarContent({
	activePanel,
	workspaceId,
	drawings,
	selectedDrawingId,
	onSelectDrawing,
	onCreateDrawing,
	onDeleteDrawing,
	tagGraphData,
}: UnifiedSidebarContentProps) {
	return (
		<div className="flex flex-col h-full w-full overflow-hidden">
			{activePanel === "search" && <SearchPanel />}
			{activePanel === "drawings" && (
				<DrawingsPanel
					workspaceId={workspaceId}
					drawings={drawings}
					selectedDrawingId={selectedDrawingId}
					onSelectDrawing={onSelectDrawing}
					onCreateDrawing={onCreateDrawing}
					onDeleteDrawing={onDeleteDrawing}
				/>
			)}
			{activePanel === "files" && <FileTreePanel />}
			{activePanel === "tags" && (
				<TagGraphPanel workspaceId={workspaceId} graphData={tagGraphData} />
			)}
		</div>
	);
}

/**
 * UnifiedSidebar Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export interface UnifiedSidebarProps {
	/** 当前活动面板 */
	readonly activePanel: SidebarPanel;
	/** 侧边栏是否打开 */
	readonly isOpen: boolean;
	/** 是否被拖拽折叠 */
	readonly wasCollapsedByDrag: boolean;
	/** 当前工作区 ID */
	readonly workspaceId: string | null;
	/** 工作区的所有绘图 */
	readonly drawings: DrawingInterface[];
	/** 选中的绘图 ID */
	readonly selectedDrawingId: string | null;
	/** 恢复折叠回调 */
	readonly onRestoreFromCollapse: () => void;
	/** 选择绘图回调 */
	readonly onSelectDrawing: (drawing: DrawingInterface) => void;
	/** 创建绘图回调 */
	readonly onCreateDrawing: () => void;
	/** 删除绘图回调 */
	readonly onDeleteDrawing: (drawingId: string, drawingName: string) => void;
	/** 标签图谱数据 */
	readonly tagGraphData: TagGraphData | null;
}

/**
 * UnifiedSidebar - Legacy wrapper for backward compatibility
 *
 * 纯展示组件：所有数据通过 props 传入
 *
 * @deprecated Use UnifiedSidebarContent with react-resizable-panels instead
 */
export function UnifiedSidebar({
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
	tagGraphData,
}: UnifiedSidebarProps) {
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
		);
	}

	if (!isOpen || !activePanel) {
		return null;
	}

	return (
		<UnifiedSidebarContent
			activePanel={activePanel}
			workspaceId={workspaceId}
			drawings={drawings}
			selectedDrawingId={selectedDrawingId}
			onSelectDrawing={onSelectDrawing}
			onCreateDrawing={onCreateDrawing}
			onDeleteDrawing={onDeleteDrawing}
			tagGraphData={tagGraphData}
		/>
	);
}
