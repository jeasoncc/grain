/**
 * UnifiedSidebar Component Types
 *
 * 类型定义：组件的 Props 接口
 */

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
	/** 恢复折叠回调 */
	readonly onRestoreFromCollapse: () => void
}

/**
 * UnifiedSidebarContainer Props 接口
 *
 * 容器组件通常不需要 props，因为它直接连接 stores
 */
export type UnifiedSidebarContainerProps = Record<string, never>
