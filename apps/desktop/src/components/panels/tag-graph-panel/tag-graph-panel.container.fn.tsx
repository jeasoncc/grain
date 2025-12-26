/**
 * Tag Graph Panel Container - 标签关系图谱面板容器组件
 *
 * 连接数据层和展示层
 */

import { memo } from "react";
import { useTagGraph } from "@/hooks";
import { useSelectionStore } from "@/stores/selection.store";
import { TagGraphPanelView } from "./tag-graph-panel.view.fn";

/**
 * TagGraphPanelContainer - 标签图谱面板容器组件
 *
 * 负责：
 * - 获取当前工作区 ID
 * - 调用 useTagGraph hook 获取标签图谱数据
 * - 将数据传递给 View 组件
 */
export const TagGraphPanelContainer = memo(() => {
	// 获取当前工作区 ID
	const workspaceId = useSelectionStore((s) => s.selectedWorkspaceId);

	// 获取标签图谱数据
	const graphData = useTagGraph(workspaceId ?? undefined) ?? {
		nodes: [],
		edges: [],
	};

	return (
		<TagGraphPanelView workspaceId={workspaceId} graphData={graphData} />
	);
});

TagGraphPanelContainer.displayName = "TagGraphPanelContainer";
