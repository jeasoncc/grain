/**
 * UnifiedSidebar Container Component
 *
 * 容器组件：连接 hooks 和 stores，处理业务逻辑
 */

import { memo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { DrawingInterface } from "@/db/schema";
import { useDrawingsByWorkspace } from "@/hooks/use-drawing";
import { useSelectionStore } from "@/stores/selection.store";
import { useSidebarStore } from "@/stores/sidebar.store";
import logger from "@/log";
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
	const navigate = useNavigate();

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
	const drawings = useDrawingsByWorkspace(selectedWorkspaceId) ?? [];

	// Handle drawing selection - update store and navigate to canvas
	const handleSelectDrawing = useCallback(
		(drawing: DrawingInterface) => {
			logger.info("[UnifiedSidebar] 选择绘图", { drawingId: drawing.id });
			setSelectedDrawingId(drawing.id);
			navigate({ to: "/canvas" });
		},
		[setSelectedDrawingId, navigate],
	);

	// Handle drawing creation
	const handleCreateDrawing = useCallback(() => {
		logger.info("[UnifiedSidebar] 创建新绘图");
		// The DrawingsPanel handles the actual creation logic
		// This is just a pass-through callback
	}, []);

	// Handle drawing deletion
	const handleDeleteDrawing = useCallback(
		(drawingId: string, drawingName: string) => {
			logger.info("[UnifiedSidebar] 删除绘图", { drawingId, drawingName });
			// The DrawingsPanel handles the actual deletion logic
			// This is just a pass-through callback
		},
		[],
	);

	// Handle restore from collapse
	const handleRestoreFromCollapse = useCallback(() => {
		logger.info("[UnifiedSidebar] 恢复侧边栏");
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
