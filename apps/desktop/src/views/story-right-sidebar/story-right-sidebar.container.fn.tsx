/**
 * StoryRightSidebarContainer - 右侧边栏容器组件
 *
 * 连接 stores 和 hooks，将数据传递给 View 组件
 */

import { memo, useMemo } from "react";
import { useEditorTabsStore } from "@/state/editor-tabs.state";
import { useUIStore } from "@/state/ui.state";
import type { StoryRightSidebarContainerProps } from "./story-right-sidebar.types";
import { StoryRightSidebarView } from "./story-right-sidebar.view.fn";

export const StoryRightSidebarContainer = memo(
	({ workspaceId }: StoryRightSidebarContainerProps) => {
		// 从 stores 获取数据
		const tabPosition = useUIStore((s) => s.tabPosition);
		const allTabs = useEditorTabsStore((s) => s.tabs);
		const activeTabId = useEditorTabsStore((s) => s.activeTabId);
		const setActiveTab = useEditorTabsStore((s) => s.setActiveTab);
		const closeTab = useEditorTabsStore((s) => s.closeTab);

		// 过滤当前工作空间的标签页
		const tabs = useMemo(
			() => allTabs.filter((t) => t.workspaceId === workspaceId),
			[allTabs, workspaceId],
		);

		return (
			<StoryRightSidebarView
				tabPosition={tabPosition}
				tabs={tabs}
				activeTabId={activeTabId}
				onSetActiveTab={setActiveTab}
				onCloseTab={closeTab}
			/>
		);
	},
);

StoryRightSidebarContainer.displayName = "StoryRightSidebarContainer";
