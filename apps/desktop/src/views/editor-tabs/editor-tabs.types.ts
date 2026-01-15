/**
 * EditorTabs 组件类型定义
 */

import type { EditorTab } from "@/types/editor-tab"

/**
 * EditorTabsView Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export interface EditorTabsViewProps {
	/** 样式类名 */
	readonly className?: string
	/** 标签页数组 */
	readonly tabs: readonly EditorTab[]
	/** 当前活动标签页 ID */
	readonly activeTabId: string | null
	/** 设置活动标签页回调 */
	readonly onSetActiveTab: (tabId: string) => void
	/** 关闭标签页回调 */
	readonly onCloseTab: (tabId: string) => void
}

/**
 * EditorTabsContainer Props 接口
 */
export interface EditorTabsContainerProps {
	/** 样式类名 */
	readonly className?: string
	/** 工作区 ID（用于过滤标签） */
	readonly workspaceId: string | null
}
