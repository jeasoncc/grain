/**
 * UnifiedSidebar Container Component
 *
 * 容器组件：连接 hooks 和 stores，处理业务逻辑
 */

import { memo, useCallback } from "react";
import { useDrawingNodes } from "@/hooks/use-drawing";
import { useSelectionStore } from "@/state/selection.state";
import { useSidebarStore } from "@/state/sidebar.state";
import type { NodeInterface } from "@/types/node";
import { UnifiedSidebarView } from "./unified-sidebar.view.fn";

/**
 * UnifiedSidebarContainer - 统一侧边栏容器组件
 *
 * 纯函数式组件：
 * - 使用 memo() 包裹
 * - 连接 hooks 和 stores
 * - 处理业务逻辑和回调
 * - 将数据传递给 View 组件
 */
export const UnifiedSidebarContainer = memo(() => {
	// Connect to stores
	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
	const {
		activePanel,
		isOpen,
		wasCollapsedByDrag,
		drawingsState,
		restoreFromCollapse,
		setSelectedDrawingId,
	} = useSidebarStore();

	// Fetch drawings for current workspace
	const drawings = useDrawingNodes(selectedWorkspaceId) ?? [];

	// Handle drawing selection - update store and navigate to workspace
	const handleSelectDrawing = useCallback(
		(drawing: NodeInterface) => {
			console.log("[UnifiedSidebar] 选择绘图", { drawingId: drawing.id });
			setSelectedDrawingId(drawing.id);
			// 绘图节点通过 selection store 选中，在主编辑器区域打开
			// 不需要导航，StoryWorkspace 会根据选中的节点渲染对应的编辑器
		},
		[setSelectedDrawingId],
	);

	// Handle drawing creation
	const handleCreateDrawing = useCallback(() => {
		console.log("[UnifiedSidebar] 创建新绘图");
		// The DrawingsPanel handles the actual creation logic
		// This is just a pass-through callback
	}, []);

	// Handle drawing deletion
	const handleDeleteDrawing = useCallback(
		(drawingId: string, drawingName: string) => {
			console.log("[UnifiedSidebar] 删除绘图", { drawingId, drawingName });
			// The DrawingsPanel handles the actual deletion logic
			// This is just a pass-through callback
		},
		[],
	);

	// Handle restore from collapse
	const handleRestoreFromCollapse = useCallback(() => {
		console.log("[UnifiedSidebar] 恢复侧边栏");
		restoreFromCollapse();
	}, [restoreFromCollapse]);

	return (
		<UnifiedSidebarView
			activePanel={activePanel}
			isOpen={isOpen}
			wasCollapsedByDrag={wasCollapsedByDrag}
			workspaceId={selectedWorkspaceId}
			drawings={drawings}
			selectedDrawingId={drawingsState.selectedDrawingId}
			onRestoreFromCollapse={handleRestoreFromCollapse}
			onSelectDrawing={handleSelectDrawing}
			onCreateDrawing={handleCreateDrawing}
			onDeleteDrawing={handleDeleteDrawing}
		/>
	);
});

UnifiedSidebarContainer.displayName = "UnifiedSidebarContainer";
