/**
 * Drawing Workspace - Book-level drawing management and editing
 */

import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import {
	AlertTriangle,
	Download,
	Edit3,
	Eye,
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
import { Input } from "@/components/ui/input";
import { updateDrawingContent } from "@/db/drawing.db.fn";
import type { DrawingInterface } from "@/db/schema";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import logger from "@/log";
import {
	deleteDrawing,
	renameDrawing,
	saveDrawingContent,
} from "@/actions";

// Error Boundary for Excalidraw component
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

class DrawingErrorBoundary extends Component<
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
		logger.error("Drawing Workspace Error:", error, errorInfo);
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
							? "Drawing data error, canvas size exceeded"
							: "Failed to load drawing component"}
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

interface DrawingWorkspaceProps {
	drawing: DrawingInterface;
	onDelete?: (id: string) => void;
	onRename?: (id: string, name: string) => void;
	className?: string;
	fillContainer?: boolean; // 是否填满容器
}

export function DrawingWorkspace({
	drawing,
	onDelete,
	onRename,
	className,
	fillContainer = false,
}: DrawingWorkspaceProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [tempName, setTempName] = useState(drawing.name);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [isReady, setIsReady] = useState(false); // 延迟渲染 Excalidraw
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw API 类型复杂
	const excalidrawRef = useRef<any>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const { isDark } = useTheme();

	// 延迟渲染 Excalidraw，确保容器尺寸已经确定
	useEffect(() => {
		const timer = setTimeout(() => {
			setIsReady(true);
		}, 100);
		return () => clearTimeout(timer);
	}, []);

	// 清理 appState 以避免 Canvas exceeds max size 错误
	const sanitizeAppState = (appState: any): any => {
		if (!appState || typeof appState !== "object") {
			return {};
		}
		// 只保留安全的属性，不传递可能导致 canvas 尺寸异常的值
		const sanitized: any = {};
		if (
			appState.viewBackgroundColor &&
			typeof appState.viewBackgroundColor === "string"
		) {
			sanitized.viewBackgroundColor = appState.viewBackgroundColor;
		}
		if (
			typeof appState.gridSize === "number" &&
			Number.isFinite(appState.gridSize) &&
			appState.gridSize > 0
		) {
			sanitized.gridSize = appState.gridSize;
		}
		return sanitized;
	};

	// 清理 elements 数据，移除可能导致 canvas 尺寸异常的元素
	const sanitizeElements = (elements: any[]): any[] => {
		if (!Array.isArray(elements)) return [];
		const MAX_COORD = 50000;
		const MAX_SIZE = 10000;
		return elements.filter((el) => {
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
		});
	};

	// Parse and sanitize drawing data
	const drawingData = (() => {
		if (!drawing.content) {
			return { elements: [], appState: {}, files: {} };
		}
		try {
			const parsed = JSON.parse(drawing.content);
			const sanitizedElements = sanitizeElements(parsed.elements || []);
			const sanitizedAppState = sanitizeAppState(parsed.appState);

			// 额外检查：如果元素数量过多或有异常，返回空数据
			if (sanitizedElements.length > 10000) {
				logger.warn("Too many elements, resetting drawing data");
				return { elements: [], appState: {}, files: {} };
			}

			return {
				elements: sanitizedElements,
				appState: sanitizedAppState,
				files: parsed.files || {},
			};
		} catch (error) {
			logger.error("Failed to parse drawing data:", error);
			return { elements: [], appState: {}, files: {} };
		}
	})();

	// Calculate responsive size based on container
	const [containerSize, setContainerSize] = useState({
		width: drawing.width,
		height: drawing.height,
	});

	// Update container size on resize
	// 限制最大尺寸以避免 Canvas exceeds max size 错误
	// 浏览器 Canvas 有最大尺寸限制（通常是 16384x16384 或更小）
	// Excalidraw 内部会根据 devicePixelRatio 放大，所以我们需要更保守的限制
	// 考虑到 devicePixelRatio 可能是 2-3，我们需要更小的限制
	const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
	const MAX_CANVAS_SIZE = Math.floor(4096 / dpr); // 根据 DPR 动态计算安全尺寸

	useEffect(() => {
		const updateSize = () => {
			if (fillContainer && containerRef.current?.parentElement) {
				// 填满父容器模式，但限制最大尺寸
				const parentRect =
					containerRef.current.parentElement.getBoundingClientRect();
				setContainerSize({
					width: Math.min(MAX_CANVAS_SIZE, Math.max(400, parentRect.width - 8)),
					height: Math.min(
						MAX_CANVAS_SIZE,
						Math.max(300, parentRect.height - 8),
					),
				});
			} else if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				const maxWidth = Math.min(
					MAX_CANVAS_SIZE,
					Math.max(600, rect.width - 32),
				);
				const maxHeight = Math.min(
					MAX_CANVAS_SIZE,
					Math.max(400, Math.min(800, window.innerHeight * 0.6)),
				);

				setContainerSize({
					width: Math.min(drawing.width, maxWidth),
					height: Math.min(drawing.height, maxHeight),
				});
			}
		};

		updateSize();
		window.addEventListener("resize", updateSize);
		return () => window.removeEventListener("resize", updateSize);
	}, [drawing.width, drawing.height, fillContainer]);

	// Save drawing data
	const saveData = useCallback(
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型
		async (elements: readonly any[], appState: any, files: any) => {
			const dataToSave = {
				elements: elements as any[],
				appState: {
					viewBackgroundColor: appState.viewBackgroundColor,
					gridSize: appState.gridSize,
				},
				files,
			};

			try {
				const result = await saveDrawingContent({
					drawingId: drawing.id,
					content: JSON.stringify(dataToSave),
					width: containerSize.width,
					height: containerSize.height,
				})();

				if (result._tag === "Right") {
					setHasUnsavedChanges(false);
				} else {
					logger.error("Failed to save drawing:", result.left);
					toast.error("Failed to save drawing");
				}
			} catch (error) {
				logger.error("Failed to save drawing:", error);
				toast.error("Failed to save drawing");
			}
		},
		[drawing.id, containerSize],
	);

	// Handle rename
	const handleRename = useCallback(async () => {
		if (tempName.trim() && tempName !== drawing.name) {
			try {
				const result = await renameDrawing(drawing.id, tempName.trim())();

				if (result._tag === "Right") {
					onRename?.(drawing.id, tempName.trim());
					toast.success("Drawing renamed");
				} else {
					logger.error("Failed to rename drawing:", result.left);
					toast.error("Failed to rename drawing");
				}
			} catch (error) {
				logger.error("Failed to rename drawing:", error);
				toast.error("Failed to rename drawing");
			}
		}
		setIsRenaming(false);
	}, [drawing.id, drawing.name, tempName, onRename]);

	// Handle delete
	const handleDelete = useCallback(async () => {
		if (window.confirm(`Are you sure you want to delete "${drawing.name}"?`)) {
			try {
				const result = await deleteDrawing(drawing.id)();

				if (result._tag === "Right") {
					onDelete?.(drawing.id);
				} else {
					logger.error("Failed to delete drawing:", result.left);
					toast.error("Failed to delete drawing");
				}
			} catch (error) {
				logger.error("Failed to delete drawing:", error);
				toast.error("Failed to delete drawing");
			}
		}
	}, [drawing.id, drawing.name, onDelete]);

	// Export as image
	const exportAsImage = useCallback(async () => {
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
			a.download = `${drawing.name}-${Date.now()}.png`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Drawing exported");
		} catch (error) {
			logger.error("Export failed:", error);
			toast.error("Export failed");
		}
	}, [isDark, drawing.name]);

	// Manual save
	const handleSave = useCallback(async () => {
		if (excalidrawRef.current) {
			const elements = excalidrawRef.current.getSceneElements();
			const appState = excalidrawRef.current.getAppState();
			const files = excalidrawRef.current.getFiles();
			await saveData(elements, appState, files);
			toast.success("Drawing saved");
		}
	}, [saveData]);

	// Fullscreen mode
	useEffect(() => {
		if (isFullscreen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isFullscreen]);

	// 错误恢复 - 重试
	const handleReset = useCallback(() => {
		setIsEditing(false);
		setIsReady(false);
		setTimeout(() => setIsReady(true), 100);
	}, []);

	// 错误恢复 - 清空数据
	const handleClearData = useCallback(async () => {
		try {
			const EMPTY_DRAWING_CONTENT = JSON.stringify({
				elements: [],
				appState: {},
				files: {},
			});
			const result = await updateDrawingContent(
				drawing.id,
				EMPTY_DRAWING_CONTENT,
			)();

			if (result._tag === "Right") {
				setIsEditing(false);
				setIsReady(false);
				setTimeout(() => setIsReady(true), 100);
				toast.success("Drawing reset");
			} else {
				logger.error("Failed to reset drawing:", result.left);
				toast.error("Failed to reset drawing");
			}
		} catch (error) {
			logger.error("Failed to reset drawing:", error);
			toast.error("Failed to reset drawing");
		}
	}, [drawing.id]);

	// Render preview mode
	const renderPreview = () => {
		if (drawingData.elements.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
					<Edit3 className="size-8" />
					<span>Click edit to start drawing</span>
				</div>
			);
		}

		// 等待容器准备好再渲染 Excalidraw
		if (!isReady) {
			return (
				<div className="flex items-center justify-center h-full text-muted-foreground">
					<span>Loading...</span>
				</div>
			);
		}

		return (
			<DrawingErrorBoundary onReset={handleReset} onClearData={handleClearData}>
				<div
					className="pointer-events-none h-full"
					style={{
						maxWidth: MAX_CANVAS_SIZE,
						maxHeight: MAX_CANVAS_SIZE,
						overflow: "hidden",
					}}
				>
					<Excalidraw
						initialData={drawingData}
						theme={isDark ? "dark" : "light"}
						viewModeEnabled={true}
						zenModeEnabled={true}
						UIOptions={{
							canvasActions: {
								changeViewBackgroundColor: false,
								clearCanvas: false,
								export: false,
								loadScene: false,
								saveToActiveFile: false,
								toggleTheme: false,
							},
						}}
					/>
				</div>
			</DrawingErrorBoundary>
		);
	};

	// Render editor mode
	const renderEditor = () => {
		// 等待容器准备好再渲染 Excalidraw
		if (!isReady) {
			return (
				<div className="flex items-center justify-center h-full text-muted-foreground">
					<span>Loading...</span>
				</div>
			);
		}

		return (
			<DrawingErrorBoundary onReset={handleReset} onClearData={handleClearData}>
				<div
					className="h-full"
					style={{
						maxWidth: MAX_CANVAS_SIZE,
						maxHeight: MAX_CANVAS_SIZE,
						overflow: "hidden",
					}}
				>
					<Excalidraw
						excalidrawAPI={(api) => {
							excalidrawRef.current = api;
						}}
						initialData={drawingData}
						theme={isDark ? "dark" : "light"}
						onChange={(elements, appState, files) => {
							setHasUnsavedChanges(true);
							// Auto-save after 2 seconds of inactivity
							const timeoutId = setTimeout(() => {
								saveData(elements, appState, files);
							}, 2000);
							return () => clearTimeout(timeoutId);
						}}
						UIOptions={{
							canvasActions: {
								export: false,
								loadScene: false,
								saveToActiveFile: false,
							},
						}}
					/>
				</div>
			</DrawingErrorBoundary>
		);
	};

	// Fullscreen mode
	if (isFullscreen) {
		return (
			<div className="fixed inset-0 z-50 bg-background">
				<div className="absolute top-2 right-2 z-10 flex gap-2">
					<Button
						variant="secondary"
						size="sm"
						onClick={handleSave}
						disabled={!hasUnsavedChanges}
						title="Save drawing"
					>
						<Save className="size-4 mr-1" />
						Save
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={exportAsImage}
						title="Export as image"
					>
						<Download className="size-4 mr-1" />
						Export
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							setIsFullscreen(false);
							setIsEditing(false);
						}}
						title="Exit fullscreen"
					>
						<Minimize2 className="size-4 mr-1" />
						Exit
					</Button>
				</div>
				<div className="h-full">{renderEditor()}</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={cn(
				"group relative rounded-lg border overflow-hidden",
				isEditing ? "bg-background" : "bg-muted/30",
				fillContainer && "w-full h-full",
				className,
			)}
			style={
				fillContainer
					? {
							minWidth: 400,
							minHeight: 300,
						}
					: {
							width: containerSize.width,
							height: containerSize.height,
							minWidth: 400,
							minHeight: 300,
						}
			}
		>
			{/* Header with title and controls */}
			<div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
				<div className="flex items-center gap-2">
					{isRenaming ? (
						<Input
							value={tempName}
							onChange={(e) => setTempName(e.target.value)}
							onBlur={handleRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleRename();
								if (e.key === "Escape") {
									setTempName(drawing.name);
									setIsRenaming(false);
								}
							}}
							className="h-7 text-sm font-medium bg-background/90"
							autoFocus
						/>
					) : (
						<button
							onClick={() => setIsRenaming(true)}
							className="text-sm font-medium text-foreground/80 hover:text-foreground bg-background/90 px-2 py-1 rounded"
						>
							{drawing.name}
						</button>
					)}
					{hasUnsavedChanges && (
						<span className="text-xs text-orange-500 bg-background/90 px-1 rounded">
							Unsaved
						</span>
					)}
				</div>

				{/* Controls */}
				<div
					className={cn(
						"flex gap-1 transition-opacity",
						isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
					)}
				>
					{isEditing ? (
						<>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={handleSave}
								disabled={!hasUnsavedChanges}
								title="Save drawing"
							>
								<Save className="size-3.5" />
							</Button>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={() => setIsFullscreen(true)}
								title="Fullscreen edit"
							>
								<Maximize2 className="size-3.5" />
							</Button>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={exportAsImage}
								title="Export as image"
							>
								<Download className="size-3.5" />
							</Button>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={() => setIsEditing(false)}
								title="Finish editing"
							>
								<Eye className="size-3.5" />
							</Button>
						</>
					) : (
						<>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={() => setIsEditing(true)}
								title="Edit drawing"
							>
								<Edit3 className="size-3.5" />
							</Button>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={() => setIsFullscreen(true)}
								title="Fullscreen view"
							>
								<Maximize2 className="size-3.5" />
							</Button>
						</>
					)}
					<Button
						variant="destructive"
						size="icon"
						className="size-7"
						onClick={handleDelete}
						title="Delete drawing"
					>
						<Trash2 className="size-3.5" />
					</Button>
				</div>
			</div>

			{/* Content area */}
			<div
				className="h-full pt-10" // Add padding for header
				onDoubleClick={() => !isEditing && setIsEditing(true)}
			>
				{isEditing ? renderEditor() : renderPreview()}
			</div>
		</div>
	);
}
