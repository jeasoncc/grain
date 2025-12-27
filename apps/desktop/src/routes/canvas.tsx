/**
 * 绘图画布页面
 *
 * @deprecated 此路由已弃用。Excalidraw 绘图现在作为文件节点存储在文件树中，
 * 点击文件树中的绘图节点会在主编辑器区域打开 ExcalidrawEditorContainer。
 *
 * 此页面保留用于向后兼容，但建议通过文件树选择绘图节点来编辑。
 */
import { createFileRoute } from "@tanstack/react-router";
import { PenTool } from "lucide-react";
import { ExcalidrawEditorContainer } from "@/components/excalidraw-editor";
import { useDrawing } from "@/hooks/use-drawing";
import { useUnifiedSidebarStore } from "@/stores/sidebar.store";

export const Route = createFileRoute("/canvas")({
	component: CanvasPage,
});

function CanvasPage() {
	const { drawingsState } = useUnifiedSidebarStore();
	const selectedDrawing = useDrawing(drawingsState.selectedDrawingId);

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
									{selectedDrawing.title}
								</span>
							</>
						)}
					</div>
				</header>

				{/* 绘图内容区域 - 填满整个可用空间 */}
				<div className="flex-1 overflow-hidden relative w-full p-4">
					{selectedDrawing ? (
						<ExcalidrawEditorContainer
							nodeId={selectedDrawing.id}
							className="w-full h-full"
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
