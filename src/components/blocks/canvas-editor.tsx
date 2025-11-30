/**
 * 绘图编辑器组件 - 全屏 Excalidraw 编辑器
 * 用于 canvas 类型的场景，占据整个编辑面板
 */
import { useCallback, useRef, useState, useEffect } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Download, Save, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ExcalidrawSceneData {
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 元素类型
	elements: any[];
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw AppState 类型
	appState?: any;
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 文件类型
	files?: any;
}

interface CanvasEditorProps {
	sceneId: string;
	filePath?: string;
	initialData?: string;
	onSave?: (data: string) => void;
}

export function CanvasEditor({ sceneId, filePath, initialData, onSave }: CanvasEditorProps) {
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw API 类型复杂
	const excalidrawRef = useRef<any>(null);
	const { isDark } = useTheme();
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	// 解析初始数据
	const parsedInitialData: ExcalidrawSceneData | undefined = (() => {
		if (!initialData) return undefined;
		try {
			const parsed = JSON.parse(initialData);
			// 检查是否是有效的 Excalidraw 数据
			if (parsed && typeof parsed === "object" && Array.isArray(parsed.elements)) {
				return parsed as ExcalidrawSceneData;
			}
			return undefined;
		} catch {
			return undefined;
		}
	})();

	// 保存绘图数据
	const handleSave = useCallback(() => {
		if (!excalidrawRef.current) return;

		const elements = excalidrawRef.current.getSceneElements();
		const appState = excalidrawRef.current.getAppState();
		const files = excalidrawRef.current.getFiles();

		const dataToSave: ExcalidrawSceneData = {
			elements: [...elements],
			appState: {
				viewBackgroundColor: appState.viewBackgroundColor,
				gridSize: appState.gridSize,
			},
			files: files || {},
		};

		onSave?.(JSON.stringify(dataToSave));
		setHasChanges(false);
		toast.success("绘图已保存");
	}, [onSave]);

	// 导出为图片
	const handleExport = useCallback(async () => {
		if (!excalidrawRef.current) return;

		const elements = excalidrawRef.current.getSceneElements();
		const appState = excalidrawRef.current.getAppState();
		const files = excalidrawRef.current.getFiles();

		try {
			const blob = await exportToBlob({
				elements,
				appState: {
					...appState,
					exportWithDarkMode: isDark,
				},
				files,
				mimeType: "image/png",
			});

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `canvas-${sceneId}-${Date.now()}.png`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success("图片已导出");
		} catch (error) {
			console.error("导出图片失败:", error);
			toast.error("导出图片失败");
		}
	}, [isDark, sceneId]);

	// 处理内容变化
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型
	const handleChange = useCallback((elements: readonly any[], appState: any, files: any) => {
		setHasChanges(true);
	}, []);

	// 快捷键保存
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				handleSave();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleSave]);

	// 全屏模式
	if (isFullscreen) {
		return (
			<div className="fixed inset-0 z-50 bg-background flex flex-col">
				{/* 全屏工具栏 */}
				<div className="h-12 border-b bg-card flex items-center justify-between px-4 shrink-0">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">绘图画布</span>
						{filePath && (
							<span className="text-xs text-muted-foreground">
								{filePath}
							</span>
						)}
						{hasChanges && (
							<span className="text-xs text-orange-500">• 未保存</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleSave}
							className="gap-2"
						>
							<Save className="size-4" />
							保存
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							className="gap-2"
						>
							<Download className="size-4" />
							导出
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setIsFullscreen(false)}
							className="gap-2"
						>
							<Minimize2 className="size-4" />
							退出全屏
						</Button>
					</div>
				</div>
				{/* Excalidraw 编辑器 */}
				<div className="flex-1">
					<Excalidraw
						excalidrawAPI={(api) => {
							excalidrawRef.current = api;
						}}
						initialData={parsedInitialData}
						theme={isDark ? "dark" : "light"}
						onChange={handleChange}
						UIOptions={{
							canvasActions: {
								export: false,
								loadScene: false,
								saveToActiveFile: false,
							},
						}}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* 工具栏 */}
			<div className="h-11 flex items-center justify-between px-4 border-b bg-card shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">绘图画布</span>
					{filePath && (
						<span className="text-xs text-muted-foreground/60">
							{filePath}
						</span>
					)}
					{hasChanges && (
						<span className="text-xs text-orange-500">• 未保存</span>
					)}
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={handleSave}
						title="保存 (Ctrl+S)"
					>
						<Save className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={handleExport}
						title="导出为图片"
					>
						<Download className="size-4" />
					</Button>
					<div className="w-px h-4 bg-border mx-1" />
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => setIsFullscreen(true)}
						title="全屏编辑"
					>
						<Maximize2 className="size-4" />
					</Button>
				</div>
			</div>

			{/* Excalidraw 编辑器 */}
			<div className="flex-1 min-h-0">
				<Excalidraw
					excalidrawAPI={(api) => {
						excalidrawRef.current = api;
					}}
					initialData={parsedInitialData}
					theme={isDark ? "dark" : "light"}
					onChange={handleChange}
					UIOptions={{
						canvasActions: {
							export: false,
							loadScene: false,
							saveToActiveFile: false,
						},
					}}
				/>
			</div>
		</div>
	);
}
