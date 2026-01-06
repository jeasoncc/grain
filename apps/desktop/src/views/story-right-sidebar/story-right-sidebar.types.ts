/**
 * StoryRightSidebar 类型定义
 */

import type { EditorTab } from "@/types/editor-tab";
import type { NodeInterface } from "@/types/node";

/**
 * StoryRightSidebar View Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export interface StoryRightSidebarViewProps {
	/** 标签页位置设置 */
	readonly tabPosition: "top" | "right-sidebar";
	/** 标签页数组 */
	readonly tabs: EditorTab[];
	/** 当前活动标签页 ID */
	readonly activeTabId: string | null;
	/** 设置活动标签页回调 */
	readonly onSetActiveTab: (tabId: string) => void;
	/** 关闭标签页回调 */
	readonly onCloseTab: (tabId: string) => void;
	/** 选择绘图回调（可选） */
	readonly onSelectDrawing?: (drawing: NodeInterface | null) => void;
	/** 当前选中的绘图节点（可选） */
	readonly selectedDrawing?: NodeInterface | null;
}

/**
 * StoryRightSidebar Container Props 接口
 */
export interface StoryRightSidebarContainerProps {
	/** 工作空间 ID */
	readonly workspaceId: string | null;
}
