/**
 * 编辑器标签栏组件 - Container
 * 连接 Store 和 View 组件
 */

import { memo, useCallback, useMemo } from "react";
import { useEditorTabsStore } from "@/state/editor-tabs.state";
import type { EditorTabsContainerProps } from "./editor-tabs.types";
import { EditorTabsView } from "./editor-tabs.view.fn";

export const EditorTabsContainer = memo(
	({ className, workspaceId }: EditorTabsContainerProps) => {
		// 获取所有标签和活动标签 ID
		const allTabs = useEditorTabsStore((s) => s.tabs);
		const activeTabId = useEditorTabsStore((s) => s.activeTabId);

		// 获取标签操作
		const setActiveTab = useEditorTabsStore((s) => s.setActiveTab);
		const closeTab = useEditorTabsStore((s) => s.closeTab);

		// 过滤当前工作区的标签
		const tabs = useMemo(
			() => allTabs.filter((t) => t.workspaceId === workspaceId),
			[allTabs, workspaceId],
		);

		// 处理设置活动标签
		const handleSetActiveTab = useCallback(
			(tabId: string) => {
				setActiveTab(tabId);
			},
			[setActiveTab],
		);

		// 处理关闭标签
		const handleCloseTab = useCallback(
			(tabId: string) => {
				closeTab(tabId);
			},
			[closeTab],
		);

		return (
			<EditorTabsView
				className={className}
				tabs={tabs}
				activeTabId={activeTabId}
				onSetActiveTab={handleSetActiveTab}
				onCloseTab={handleCloseTab}
			/>
		);
	},
);

EditorTabsContainer.displayName = "EditorTabsContainer";
