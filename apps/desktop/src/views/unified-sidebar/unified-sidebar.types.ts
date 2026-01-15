/**
 * UnifiedSidebar Component Types
 *
 * 类型定义：组件的 Props 接口
 */

import type { NodeInterface } from "@/types/node"
import type { SidebarPanel } from "@/types/sidebar"

/**
 * UnifiedSidebarView Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export interface UnifiedSidebarViewProps {
	/** 当前活动面板 */
	readonly activePanel: SidebarPanel
	/** 侧边栏是否打开 */
	readonly isOpen: boolean
	/** 是否被拖拽折叠 */
	readonly wasCollapsedByDrag: boolean
	/** 当前工作区 ID */
	readonly workspaceId: string | null
	/** 工作区的所有绘图节点 */
	readonly drawings: readonly NodeInterface[]
	/** 选中的绘图 ID */
	readonly selectedDrawingId: string | null
	/** 恢复折叠回调 */
	readonly onRestoreFromCollapse: () => void
	/** 选择绘图回调 */
	readonly onSelectDrawing: (drawing: NodeInterface) => void
	/** 创建绘图回调 */
	readonly onCreateDrawing: () => void
	/** 删除绘图回调 */
	readonly onDeleteDrawing: (drawingId: string, drawingName: string) => void
}

/**
 * UnifiedSidebarContainer Props 接口
 *
 * 容器组件通常不需要 props，因为它直接连接 stores
 */
export type UnifiedSidebarContainerProps = {}
