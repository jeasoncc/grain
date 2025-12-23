/**
 * 绘图画布页面 - 集成的绘图管理系统
 * 使用 Unified Sidebar 中的 DrawingsPanel 进行绘图管理
 */
import { createFileRoute } from "@tanstack/react-router";
import { PenTool } from "lucide-react";
import { useCallback } from "react";
import { DrawingWorkspace } from "@/components/drawing/drawing-workspace";
import { useUnifiedSidebarStore } from "@/stores/sidebar.store";
import { useDrawingById } from "@/services/drawings";

export const Route = createFileRoute("/canvas")({
	component: CanvasPage,
});

function CanvasPage() {
	const { drawingsState, setSelectedDrawingId } = useUnifiedSidebarStore();
	const selectedDrawing = useDrawingById(drawingsState.selectedDrawingId);

	const handleDeleteDrawing = useCallback(
		(drawingId: string) => {
			if (drawingsState.selectedDrawingId === drawingId) {
				setSelectedDrawingId(null);
			}
		},
		[drawingsState.selectedDrawingId, setSelectedDrawingId],
	);

	const handleRenameDrawing = useCallback(
		(_drawingId: string, _newName: string) => {
			// Drawing name is updated in the database, the live query will automatically update
		},
		[],
	);

	return (
		<div className="flex h-screen bg-background text-foreground">
			{/* 主绘图工作区 */}
			<main className="flex-1 flex flex-col overflow-hidden">
				{/* 顶部工具栏 */}
				<header className="h-11 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10">
					<div className="flex items-center gap-2 text-sm">
						<PenTool className="size-4 text-muted-foreground" />
						<span className="text-foreground font-medium">绘图工作台</span>
						{selectedDrawing && (
							<>
								<span className="text-muted-foreground">/</span>
								<span className="text-muted-foreground">
									{selectedDrawing.name}
								</span>
							</>
						)}
					</div>
				</header>

				{/* 绘图内容区域 - 填满整个可用空间 */}
				<div className="flex-1 overflow-hidden relative w-full p-4">
					{selectedDrawing ? (
						<DrawingWorkspace
							drawing={selectedDrawing}
							onDelete={handleDeleteDrawing}
							onRename={handleRenameDrawing}
							className="w-full h-full"
							fillContainer={true}
						/>
					) : (
						<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
							<div className="text-center">
								<PenTool className="size-12 mx-auto mb-4 opacity-30" />
								<h3 className="text-lg font-medium mb-2">
									选择一个绘图开始编辑
								</h3>
								<p className="text-sm">
									从左侧边栏选择一个绘图，或创建一个新的绘图来开始。
								</p>
							</div>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
