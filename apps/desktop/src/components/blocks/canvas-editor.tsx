/**
 * 绘图编辑器组件 - 全屏 Excalidraw 编辑器
 * 用于 canvas 类型的场景，占据整个编辑面板
 */

import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import {
	AlertTriangle,
	Download,
	Maximize2,
	Minimize2,
	RefreshCw,
	Save,
	Trash2,
} from "lucide-react";
import {
	Component,
	type ErrorInfo,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

// Error Boundary for Canvas Editor
interface ErrorBoundaryProps {
	children: ReactNode;
	onReset?: () => void;
	onClearData?: () => void;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	isCanvasError: boolean;
}

class CanvasErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null, isCanvasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		const isCanvasError =
			error.message?.includes("Canvas exceeds max size") ||
			error.name === "DOMException";
		return { hasError: true, error, isCanvasError };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("Canvas Editor Error:", error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null, isCanvasError: false });
		this.props.onReset?.();
	};

	handleClearData = () => {
		this.setState({ hasError: false, error: null, isCanvasError: false });
		this.props.onClearData?.();
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-lg p-4 gap-3">
					<AlertTriangle className="size-8 text-destructive" />
					<span className="text-sm text-muted-foreground text-center">
						{this.state.isCanvasError
							? "Drawing data error, canvas size exceeds limit"
							: "Drawing component failed to load"}
					</span>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={this.handleReset}
							className="gap-1"
						>
							<RefreshCw className="size-3" />
							Retry
						</Button>
						{this.state.isCanvasError && this.props.onClearData && (
							<Button
								variant="destructive"
								size="sm"
								onClick={this.handleClearData}
								className="gap-1"
							>
								<Trash2 className="size-3" />
								Clear & Reset
							</Button>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export interface ExcalidrawSceneData {
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 元素类型
	elements: any[];
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw AppState 类型
	appState?: any;
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 文件类型
	files?: any;
}

interface CanvasEditorProps {
	nodeId: string;
	filePath?: string;
	initialData?: string;
	onSave?: (data: string) => void;
}

export function CanvasEditor({
	nodeId,
	filePath,
	initialData,
	onSave,
}: CanvasEditorProps) {
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw API 类型复杂
	const excalidrawRef = useRef<any>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const { isDark } = useTheme();
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [containerSize, setContainerSize] = useState<{
		width: number;
		height: number;
	} | null>(null);

	// 使用 ResizeObserver 监听容器尺寸
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateSize = () => {
			const rect = container.getBoundingClientRect();
			const width = Math.floor(rect.width);
			const height = Math.floor(rect.height);
			// 确保尺寸有效且在安全范围内
			if (width >= 100 && height >= 100 && width <= 16000 && height <= 16000) {
				setContainerSize({ width, height });
			}
		};

		updateSize();

		const resizeObserver = new ResizeObserver(() => {
			updateSize();
		});

		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	// 清理 appState 以避免 Canvas exceeds max size 错误
	const sanitizeAppState = (appState: any): any => {
		if (!appState || typeof appState !== "object") {
			return {
				viewBackgroundColor: "#ffffff",
			};
		}

		// 只保留安全的属性，完全忽略可能导致问题的属性
		const sanitized: any = {
			viewBackgroundColor: "#ffffff",
		};

		// 安全地复制背景色
		if (
			appState.viewBackgroundColor &&
			typeof appState.viewBackgroundColor === "string"
		) {
			sanitized.viewBackgroundColor = appState.viewBackgroundColor;
		}

		// 安全地复制网格大小
		if (
			typeof appState.gridSize === "number" &&
			Number.isFinite(appState.gridSize) &&
			appState.gridSize > 0 &&
			appState.gridSize <= 100
		) {
			sanitized.gridSize = appState.gridSize;
		}

		// 不复制 scrollX, scrollY, zoom 等可能导致 canvas 尺寸问题的属性
		// Excalidraw 会自动计算这些值

		return sanitized;
	};

	// 清理 elements 数据
	const sanitizeElements = (elements: any[]): any[] => {
		if (!Array.isArray(elements)) return [];
		const MAX_COORD = 32000;
		const MAX_SIZE = 8000;
		return elements
			.filter((el) => {
				if (!el || typeof el !== "object") return false;
				const x = el.x ?? 0;
				const y = el.y ?? 0;
				const width = el.width ?? 0;
				const height = el.height ?? 0;
				if (!Number.isFinite(x) || Math.abs(x) > MAX_COORD) return false;
				if (!Number.isFinite(y) || Math.abs(y) > MAX_COORD) return false;
				if (!Number.isFinite(width) || width < 0 || width > MAX_SIZE)
					return false;
				if (!Number.isFinite(height) || height < 0 || height > MAX_SIZE)
					return false;
				return true;
			})
			.map((el) => {
				// 确保坐标在安全范围内
				const clampedEl = { ...el };
				if (typeof clampedEl.x === "number") {
					clampedEl.x = Math.max(-MAX_COORD, Math.min(MAX_COORD, clampedEl.x));
				}
				if (typeof clampedEl.y === "number") {
					clampedEl.y = Math.max(-MAX_COORD, Math.min(MAX_COORD, clampedEl.y));
				}
				if (typeof clampedEl.width === "number") {
					clampedEl.width = Math.min(MAX_SIZE, Math.max(0, clampedEl.width));
				}
				if (typeof clampedEl.height === "number") {
					clampedEl.height = Math.min(MAX_SIZE, Math.max(0, clampedEl.height));
				}
				return clampedEl;
			});
	};
	// 解析并清理初始数据
	const parsedInitialData: ExcalidrawSceneData | undefined = (() => {
		if (!initialData) {
			// 返回空的初始数据
			return {
				elements: [],
				appState: {
					viewBackgroundColor: "#ffffff",
				},
				files: {},
			};
		}
		try {
			const parsed = JSON.parse(initialData);
			// 检查是否是有效的 Excalidraw 数据
			if (parsed && typeof parsed === "object") {
				const elements = Array.isArray(parsed.elements)
					? sanitizeElements(parsed.elements)
					: [];

				return {
					elements,
					appState: sanitizeAppState(parsed.appState),
					files: parsed.files || {},
				};
			}
			// 返回空的初始数据
			return {
				elements: [],
				appState: {
					viewBackgroundColor: "#ffffff",
				},
				files: {},
			};
		} catch {
			// 解析失败，返回空的初始数据
			return {
				elements: [],
				appState: {
					viewBackgroundColor: "#ffffff",
				},
				files: {},
			};
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
		toast.success("Drawing saved");
	}, [onSave]);

	// Export为图片
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
			a.download = `canvas-${nodeId}-${Date.now()}.png`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Image exported");
		} catch (error) {
			console.error("Failed to export image:", error);
			toast.error("Failed to export image");
		}
	}, [isDark, nodeId]);

	// 处理内容变化
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型
	const handleChange = useCallback(
		(_elements: readonly any[], _appState: any, _files: any) => {
			setHasChanges(true);
		},
		[],
	);

	// 错误恢复 - 重试
	const handleReset = useCallback(() => {
		setContainerSize(null);
		setTimeout(() => {
			const container = containerRef.current;
			if (container) {
				const rect = container.getBoundingClientRect();
				const width = Math.floor(rect.width);
				const height = Math.floor(rect.height);
				if (width >= 100 && height >= 100) {
					setContainerSize({ width, height });
				}
			}
		}, 100);
	}, []);

	// 错误恢复 - 清空数据
	const handleClearData = useCallback(() => {
		const emptyData = JSON.stringify({ elements: [], appState: {}, files: {} });
		onSave?.(emptyData);
		setContainerSize(null);
		setTimeout(() => {
			const container = containerRef.current;
			if (container) {
				const rect = container.getBoundingClientRect();
				const width = Math.floor(rect.width);
				const height = Math.floor(rect.height);
				if (width >= 100 && height >= 100) {
					setContainerSize({ width, height });
				}
			}
		}, 100);
		toast.success("Drawing reset");
	}, [onSave]);

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
						<span className="text-sm font-medium">Drawing Canvas</span>
						{filePath && (
							<span className="text-xs text-muted-foreground">{filePath}</span>
						)}
						{hasChanges && (
							<span className="text-xs text-orange-500">• Unsaved</span>
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
							Save
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							className="gap-2"
						>
							<Download className="size-4" />
							Export
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setIsFullscreen(false)}
							className="gap-2"
						>
							<Minimize2 className="size-4" />
							Exit Fullscreen
						</Button>
					</div>
				</div>
				{/* Excalidraw 编辑器 */}
				<div className="flex-1 relative" ref={containerRef}>
					{containerSize ? (
						<div
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: containerSize.width,
								height: containerSize.height,
							}}
						>
							<CanvasErrorBoundary
								onReset={handleReset}
								onClearData={handleClearData}
							>
								<Excalidraw
									key={`excalidraw-fullscreen-${nodeId}-${containerSize.width}-${containerSize.height}`}
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
							</CanvasErrorBoundary>
						</div>
					) : (
						<div className="flex items-center justify-center h-full text-muted-foreground">
							<span>Loading...</span>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* 工具栏 */}
			<div className="h-11 flex items-center justify-between px-4 border-b bg-card shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">Drawing Canvas</span>
					{filePath && (
						<span className="text-xs text-muted-foreground/60">{filePath}</span>
					)}
					{hasChanges && (
						<span className="text-xs text-orange-500">• Unsaved</span>
					)}
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={handleSave}
						title="Save (Ctrl+S)"
					>
						<Save className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={handleExport}
						title="Export as Image"
					>
						<Download className="size-4" />
					</Button>
					<div className="w-px h-4 bg-border mx-1" />
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => setIsFullscreen(true)}
						title="Fullscreen Edit"
					>
						<Maximize2 className="size-4" />
					</Button>
				</div>
			</div>

			{/* Excalidraw 编辑器 */}
			<div
				className="flex-1 min-h-0 relative"
				ref={!isFullscreen ? containerRef : undefined}
			>
				{containerSize ? (
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: containerSize.width,
							height: containerSize.height,
						}}
					>
						<CanvasErrorBoundary
							onReset={handleReset}
							onClearData={handleClearData}
						>
							<Excalidraw
								key={`excalidraw-${nodeId}-${containerSize.width}-${containerSize.height}`}
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
						</CanvasErrorBoundary>
					</div>
				) : (
					<div className="flex items-center justify-center h-full text-muted-foreground">
						<span>Loading...</span>
					</div>
				)}
			</div>
		</div>
	);
}
