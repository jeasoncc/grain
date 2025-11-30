/**
 * 绘图画布页面 - 使用 Excalidraw 在线版本
 */
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

export const Route = createFileRoute("/canvas")({
	component: CanvasPage,
});

function CanvasPage() {
	const navigate = useNavigate();

	// 返回
	const handleBack = useCallback(() => {
		navigate({ to: "/" });
	}, [navigate]);

	// 在新窗口打开
	const handleOpenExternal = useCallback(() => {
		window.open("https://excalidraw.com", "_blank");
	}, []);

	return (
		<div className="fixed inset-0 bg-background flex flex-col">
			{/* 顶部工具栏 */}
			<div className="h-14 border-b bg-card flex items-center justify-between px-4 z-10">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleBack}
						className="gap-2"
					>
						<ArrowLeft className="size-4" />
						返回
					</Button>
					<div className="h-6 w-px bg-border" />
					<h1 className="text-lg font-semibold">绘图画布</h1>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleOpenExternal}
						className="gap-2"
					>
						<ExternalLink className="size-4" />
						在新窗口打开
					</Button>
				</div>
			</div>

			{/* Excalidraw iframe */}
			<div className="flex-1 overflow-hidden">
				<iframe
					src="https://excalidraw.com"
					className="w-full h-full border-0"
					title="Excalidraw"
					allow="clipboard-read; clipboard-write"
				/>
			</div>
		</div>
	);
}
