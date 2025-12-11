import { Copy, Download } from "lucide-react";
import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import logger from "@/log";
import { Button } from "@/components/ui/button";

interface MermaidViewerProps {
	code: string;
	title?: string;
}

export function MermaidViewer({ code, title }: MermaidViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [svg, setSvg] = useState<string>("");
	const [error, setError] = useState<string>("");

	useEffect(() => {
		// 检测当前主题
		const isDark = document.documentElement.classList.contains("dark");

		// 初始化 Mermaid
		mermaid.initialize({
			startOnLoad: false,
			theme: isDark ? "dark" : "default",
			securityLevel: "loose",
			fontFamily: "ui-sans-serif, system-ui, sans-serif",
			// 禁用 Mermaid 的错误提示，我们自己处理
			suppressErrorRendering: true,
		});
	}, []);

	useEffect(() => {
		if (!code) return;

		const renderDiagram = async () => {
			try {
				setError("");
				const id = `mermaid-${Date.now()}`;
				const { svg: renderedSvg } = await mermaid.render(id, code);
				setSvg(renderedSvg);
			} catch (err) {
				logger.error("Mermaid render error:", err);
				setError(err instanceof Error ? err.message : "渲染失败");
			}
		};

		renderDiagram();
	}, [code]);

	const handleCopyCode = () => {
		navigator.clipboard.writeText(code);
		toast.success("已复制 Mermaid 代码");
	};

	const handleDownloadSVG = () => {
		const blob = new Blob([svg], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${title || "diagram"}.svg`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("已下载 SVG 文件");
	};

	const handleDownloadPNG = async () => {
		try {
			// 创建临时 canvas
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			// 创建图片
			const img = new Image();
			const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
			const url = URL.createObjectURL(svgBlob);

			img.onload = () => {
				// 设置高分辨率
				const scale = 2;
				canvas.width = img.width * scale;
				canvas.height = img.height * scale;
				ctx.scale(scale, scale);

				// 绘制白色背景
				ctx.fillStyle = "white";
				ctx.fillRect(0, 0, img.width, img.height);

				// 绘制图片
				ctx.drawImage(img, 0, 0);

				// 导出 PNG
				canvas.toBlob((blob) => {
					if (blob) {
						const pngUrl = URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.href = pngUrl;
						a.download = `${title || "diagram"}.png`;
						a.click();
						URL.revokeObjectURL(pngUrl);
						toast.success("已下载 PNG 文件");
					}
				}, "image/png");

				URL.revokeObjectURL(url);
			};

			img.src = url;
		} catch (error) {
			logger.error("PNG export error:", error);
			toast.error("PNG 导出失败");
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between pb-3 border-b border-border/50">
				{title && (
					<h3 className="text-base font-semibold text-foreground">{title}</h3>
				)}
				<div className="flex gap-1.5">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCopyCode}
						className="h-8 px-3"
					>
						<Copy className="h-3.5 w-3.5 mr-1.5" />
						<span className="text-xs">复制代码</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleDownloadSVG}
						disabled={!svg}
						className="h-8 px-3"
					>
						<Download className="h-3.5 w-3.5 mr-1.5" />
						<span className="text-xs">SVG</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleDownloadPNG}
						disabled={!svg}
						className="h-8 px-3"
					>
						<Download className="h-3.5 w-3.5 mr-1.5" />
						<span className="text-xs">PNG</span>
					</Button>
				</div>
			</div>

			{error ? (
				<div className="p-6 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-200/50 dark:border-red-900/30">
					<p className="text-sm font-medium text-red-600 dark:text-red-400">
						渲染错误：{error}
					</p>
					<pre className="mt-3 text-xs text-red-500 dark:text-red-400 overflow-auto p-3 bg-red-100/50 dark:bg-red-900/20 rounded-lg">
						{code}
					</pre>
				</div>
			) : (
				<div
					ref={containerRef}
					className="rounded-xl p-6 bg-gradient-to-br from-background to-muted/20 overflow-auto shadow-sm border border-border/40"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Mermaid generates safe SVG
					dangerouslySetInnerHTML={{ __html: svg }}
				/>
			)}
		</div>
	);
}
