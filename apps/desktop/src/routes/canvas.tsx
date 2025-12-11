/**
 * 绘图画布页面 - 集成的绘图管理系统
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { DrawingList } from "@/components/drawing/drawing-list";
import { DrawingWorkspace } from "@/components/drawing/drawing-workspace";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/stores/selection";
import { type SelectionState } from "@/stores/selection";
import type { DrawingInterface } from "@/db/schema";

export const Route = createFileRoute("/canvas")({
	component: CanvasPage,
});

function CanvasPage() {
	const selectedProjectId = useSelectionStore(
		(s: SelectionState) => s.selectedProjectId,
	);
	const [selectedDrawing, setSelectedDrawing] = useState<DrawingInterface | null>(null);
	const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

	const handleSelectDrawing = (drawing: DrawingInterface) => {
		setSelectedDrawing(drawing);
	};

	const handleDeleteDrawing = (drawingId: string) => {
		if (selectedDrawing?.id === drawingId) {
			setSelectedDrawing(null);
		}
	};

	const handleRenameDrawing = (drawingId: string, newName: string) => {
		if (selectedDrawing?.id === drawingId) {
			setSelectedDrawing(prev => prev ? { ...prev, name: newName } : null);
		}
	};

	return (
		<div className="flex h-screen bg-background text-foreground">
			{/* 主绘图工作区 - 位于activity bar和右侧边栏之间 */}
			<main className="flex-1 flex flex-col overflow-hidden">
				{/* 顶部工具栏 */}
				<header className="h-11 border-b bg-background flex items-center justify-between px-6 shrink-0 z-10">
					<div className="flex items-center gap-2 text-sm">
						<span className="text-foreground font-medium">绘图工作台</span>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							className="size-7"
							onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
							title={rightSidebarOpen ? "隐藏侧边栏" : "显示侧边栏"}
						>
							{rightSidebarOpen ? (
								<PanelRightClose className="size-3.5" />
							) : (
								<PanelRightOpen className="size-3.5" />
							)}
						</Button>
					</div>
				</header>

				{/* 绘图内容区域 */}
				<div className="flex-1 overflow-hidden relative w-full mx-auto">
					<div className="h-full w-full overflow-y-auto scroll-smooth scrollbar-thin">
						<article className="min-h-[calc(100vh-10rem)] w-full max-w-4xl mx-auto px-16 py-12">
							{selectedDrawing ? (
								<DrawingWorkspace
									drawing={selectedDrawing}
									onDelete={handleDeleteDrawing}
									onRename={handleRenameDrawing}
									className="w-full"
								/>
							) : (
								<div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground">
									<div className="text-center">
										<h3 className="text-lg font-medium mb-2">选择一个绘图开始编辑</h3>
										<p className="text-sm">
											从右侧边栏选择一个绘图，或创建一个新的绘图来开始。
										</p>
									</div>
								</div>
							)}
						</article>
					</div>
				</div>
			</main>

			{/* 右侧绘图列表侧边栏 */}
			{rightSidebarOpen && (
				<aside className="w-80 border-l bg-muted/30 flex flex-col">
					<DrawingList
						projectId={selectedProjectId}
						onSelectDrawing={handleSelectDrawing}
						selectedDrawingId={selectedDrawing?.id}
					/>
				</aside>
			)}
		</div>
	);
}
