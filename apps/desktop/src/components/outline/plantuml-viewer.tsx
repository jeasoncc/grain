/**
 * PlantUML 图表查看器组件（使用 Kroki）
 */

import { Copy, Download, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import logger from "@/log";
import { Button } from "@/components/ui/button";
import { useDiagramSettings } from "@/lib/diagram-settings";
import { cn } from "@/lib/utils";

interface PlantUMLViewerProps {
	code: string;
	title?: string;
	className?: string;
}

export function PlantUMLViewer({
	code,
	title,
	className,
}: PlantUMLViewerProps) {
	const [svgContent, setSvgContent] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>("");
	const { krokiServerUrl } = useDiagramSettings();

	useEffect(() => {
		if (!code || !krokiServerUrl) return;

		const renderDiagram = async () => {
			setLoading(true);
			setError("");

			try {
				const url = `${krokiServerUrl}/plantuml/svg`;
				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "text/plain",
					},
					body: code,
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const svg = await response.text();
				setSvgContent(svg);
			} catch (err) {
				logger.error("PlantUML render error:", err);
				setError(err instanceof Error ? err.message : "渲染失败");
			} finally {
				setLoading(false);
			}
		};

		renderDiagram();
	}, [code, krokiServerUrl]);

	const handleCopyCode = () => {
		navigator.clipboard.writeText(code);
		toast.success("PlantUML 代码已复制");
	};

	const handleDownload = () => {
		const blob = new Blob([svgContent], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${title || "diagram"}.svg`;
		link.click();
		URL.revokeObjectURL(url);
		toast.success("图表已下载");
	};

	const handleRefresh = () => {
		// 触发重新渲染
		setSvgContent("");
		setError("");
	};

	if (!krokiServerUrl) {
		return (
			<div className="flex items-center justify-center h-64 text-muted-foreground">
				<p>请先在设置中配置 Kroki 服务器</p>
			</div>
		);
	}

	if (!code) {
		return (
			<div className="flex items-center justify-center h-64 text-muted-foreground">
				<p>暂无图表数据</p>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col", className)}>
			{/* 工具栏 */}
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/20">
				{title && (
					<span className="text-sm font-semibold text-foreground">{title}</span>
				)}
				<div className="flex items-center gap-1">
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8 hover:bg-muted"
						onClick={handleRefresh}
						title="刷新"
						disabled={loading}
					>
						<RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8 hover:bg-muted"
						onClick={handleCopyCode}
						title="复制代码"
					>
						<Copy className="size-3.5" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8 hover:bg-muted"
						onClick={handleDownload}
						title="下载图表"
						disabled={!svgContent || loading}
					>
						<Download className="size-3.5" />
					</Button>
				</div>
			</div>

			{/* 图表显示区域 */}
			<div className="flex-1 relative bg-gradient-to-br from-background to-muted/20 overflow-auto rounded-xl border border-border/40 shadow-sm">
				{loading && (
					<div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm">
						<div className="flex flex-col items-center gap-3">
							<Loader2 className="size-8 animate-spin text-primary" />
							<p className="text-sm text-muted-foreground">正在渲染图表...</p>
						</div>
					</div>
				)}

				{error && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
						<div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
							<p className="text-destructive font-medium">图表渲染失败</p>
							<p className="text-sm text-muted-foreground mt-2">{error}</p>
						</div>
						<Button size="sm" variant="outline" onClick={handleRefresh}>
							<RefreshCw className="size-4 mr-2" />
							重试
						</Button>
					</div>
				)}

				{svgContent && !loading && !error && (
					<div
						className="p-6 flex items-center justify-center min-h-[400px]"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Kroki generates safe SVG
						dangerouslySetInnerHTML={{ __html: svgContent }}
					/>
				)}
			</div>
		</div>
	);
}
