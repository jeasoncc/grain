/**
 * Excalidraw 组件 - 嵌入式绘图编辑器
 */

import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { mergeRegister } from "@lexical/utils";
import {
	$getNodeByKey,
	CLICK_COMMAND,
	COMMAND_PRIORITY_LOW,
	KEY_BACKSPACE_COMMAND,
	KEY_DELETE_COMMAND,
	type NodeKey,
} from "lexical";
import {
	AlertTriangle,
	Check,
	Download,
	Edit3,
	Eye,
	Loader2,
	Maximize2,
	Minimize2,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import logger from "@/log";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import {
	$isExcalidrawNode,
	type ExcalidrawData,
} from "../nodes/excalidraw-node";

// Save status types
type SaveStatus = "idle" | "saving" | "saved";

// Auto-save debounce delay in milliseconds
const AUTO_SAVE_DELAY = 500;

// Save status indicator component (Requirements: 5.4)
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
	if (status === "idle") return null;

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200",
				"bg-background/80 backdrop-blur-sm border border-border",
				status === "saving" && "text-muted-foreground",
				status === "saved" && "text-green-600 dark:text-green-400"
			)}
		>
			{status === "saving" ? (
				<>
					<Loader2 className="size-3 animate-spin" />
					<span>保存中...</span>
				</>
			) : (
				<>
					<Check className="size-3" />
					<span>已保存</span>
				</>
			)}
		</div>
	);
}

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

class ExcalidrawErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null, isCanvasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		// 检测是否是 Canvas exceeds max size 错误
		const isCanvasError = error.message?.includes("Canvas exceeds max size") || 
			error.name === "DOMException";
		return { hasError: true, error, isCanvasError };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		logger.error("Excalidraw Error:", error, errorInfo);
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
							? "绘图数据异常，画布尺寸超出限制" 
							: "绘图组件加载失败"}
					</span>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={this.handleReset}
							className="gap-1"
						>
							<RefreshCw className="size-3" />
							重试
						</Button>
						{this.state.isCanvasError && this.props.onClearData && (
							<Button
								variant="destructive"
								size="sm"
								onClick={this.handleClearData}
								className="gap-1"
							>
								<Trash2 className="size-3" />
								清空重置
							</Button>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

interface ExcalidrawComponentProps {
	nodeKey: NodeKey;
	data: string;
	width: number;
	height: number;
}

// 清理 appState 以避免 Canvas exceeds max size 错误
// 这个错误通常是由于 Excalidraw 内部计算 canvas 尺寸时使用了无效的 zoom/scroll 值
function sanitizeAppState(appState: any): any {
	if (!appState || typeof appState !== "object") {
		return {};
	}

	// 只保留最基本的、不会影响 canvas 尺寸计算的属性
	// 不传递 zoom、scrollX、scrollY 等可能导致问题的属性
	const sanitized: any = {};

	// 只保留背景色和网格大小
	if (appState.viewBackgroundColor && typeof appState.viewBackgroundColor === "string") {
		sanitized.viewBackgroundColor = appState.viewBackgroundColor;
	}
	if (typeof appState.gridSize === "number" && Number.isFinite(appState.gridSize) && appState.gridSize > 0) {
		sanitized.gridSize = appState.gridSize;
	}

	// 不传递以下属性，让 Excalidraw 使用默认值：
	// - zoom (可能导致 canvas 尺寸计算异常)
	// - scrollX, scrollY (可能导致 canvas 尺寸计算异常)
	// - width, height (让 Excalidraw 自动计算)

	return sanitized;
}

// 清理 elements 数据，移除可能导致 canvas 尺寸异常的元素
function sanitizeElements(elements: any[]): any[] {
	if (!Array.isArray(elements)) return [];
	
	// 定义安全的坐标范围
	const MAX_COORD = 50000;
	const MAX_SIZE = 10000;
	
	return elements.filter((el) => {
		if (!el || typeof el !== "object") return false;
		
		// 检查坐标是否在安全范围内
		const x = el.x ?? 0;
		const y = el.y ?? 0;
		const width = el.width ?? 0;
		const height = el.height ?? 0;
		
		// 过滤掉坐标或尺寸异常的元素
		if (!Number.isFinite(x) || Math.abs(x) > MAX_COORD) return false;
		if (!Number.isFinite(y) || Math.abs(y) > MAX_COORD) return false;
		if (!Number.isFinite(width) || width < 0 || width > MAX_SIZE) return false;
		if (!Number.isFinite(height) || height < 0 || height > MAX_SIZE) return false;
		
		return true;
	}).map((el) => {
		// 确保坐标值是有限数字
		return {
			...el,
			x: Number.isFinite(el.x) ? el.x : 0,
			y: Number.isFinite(el.y) ? el.y : 0,
			width: Number.isFinite(el.width) ? Math.min(el.width, MAX_SIZE) : 100,
			height: Number.isFinite(el.height) ? Math.min(el.height, MAX_SIZE) : 100,
		};
	});
}

// Safe JSON parse with fallback and appState sanitization
function safeParseExcalidrawData(data: string): ExcalidrawData {
	if (!data || data.trim() === "") {
		return { elements: [], appState: {}, files: {} };
	}
	try {
		const parsed = JSON.parse(data);
		
		// 清理 elements 和 appState 以避免 Canvas 尺寸问题
		const sanitizedElements = sanitizeElements(parsed.elements);
		const sanitizedAppState = sanitizeAppState(parsed.appState);
		
		return {
			elements: sanitizedElements,
			appState: sanitizedAppState,
			files: parsed.files || {},
		};
	} catch (error) {
		logger.error("Failed to parse Excalidraw data:", error);
		return { elements: [], appState: {}, files: {} };
	}
}

// Custom hook for debounced auto-save with status tracking
function useDebouncedSave(
	saveFunction: (elements: readonly any[], appState: any, files: any) => void,
	delay: number = AUTO_SAVE_DELAY
) {
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingDataRef = useRef<{ elements: readonly any[]; appState: any; files: any } | null>(null);

	const debouncedSave = useCallback(
		(elements: readonly any[], appState: any, files: any) => {
			// Store pending data
			pendingDataRef.current = { elements, appState, files };
			
			// Set status to saving
			setSaveStatus("saving");

			// Clear existing timeout
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			// Set new timeout for debounced save
			timeoutRef.current = setTimeout(() => {
				if (pendingDataRef.current) {
					saveFunction(
						pendingDataRef.current.elements,
						pendingDataRef.current.appState,
						pendingDataRef.current.files
					);
					pendingDataRef.current = null;
					setSaveStatus("saved");

					// Reset to idle after showing "saved" status
					setTimeout(() => {
						setSaveStatus("idle");
					}, 1500);
				}
			}, delay);
		},
		[saveFunction, delay]
	);

	// Flush any pending saves immediately
	const flushSave = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		if (pendingDataRef.current) {
			saveFunction(
				pendingDataRef.current.elements,
				pendingDataRef.current.appState,
				pendingDataRef.current.files
			);
			pendingDataRef.current = null;
			setSaveStatus("saved");
			setTimeout(() => {
				setSaveStatus("idle");
			}, 1500);
		}
	}, [saveFunction]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			// Flush any pending saves on unmount
			if (pendingDataRef.current) {
				saveFunction(
					pendingDataRef.current.elements,
					pendingDataRef.current.appState,
					pendingDataRef.current.files
				);
			}
		};
	}, [saveFunction]);

	return { debouncedSave, flushSave, saveStatus };
}

// Custom hook for container dimensions
function useContainerDimensions(
	containerRef: React.RefObject<HTMLDivElement | null>,
	defaultWidth: number,
	defaultHeight: number
) {
	const [dimensions, setDimensions] = useState({
		width: Math.max(400, defaultWidth),
		height: Math.max(300, defaultHeight),
	});

	useEffect(() => {
		const updateDimensions = () => {
			// Use safe window dimensions with fallbacks
			const maxWidth = typeof window !== "undefined" ? window.innerWidth * 0.8 : 800;
			const maxHeight = typeof window !== "undefined" ? window.innerHeight * 0.6 : 600;
			
			setDimensions({
				width: Math.max(400, Math.min(defaultWidth, maxWidth)),
				height: Math.max(300, Math.min(defaultHeight, maxHeight)),
			});
		};

		updateDimensions();

		// Listen for resize events
		if (typeof window !== "undefined") {
			window.addEventListener("resize", updateDimensions);
			return () => window.removeEventListener("resize", updateDimensions);
		}
	}, [defaultWidth, defaultHeight]);

	// Also observe container size changes
	useEffect(() => {
		if (!containerRef.current || typeof ResizeObserver === "undefined") return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					setDimensions({
						width: Math.max(400, width),
						height: Math.max(300, height),
					});
				}
			}
		});

		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [containerRef]);

	return dimensions;
}

export default function ExcalidrawComponent({
	nodeKey,
	data,
	width,
	height,
}: ExcalidrawComponentProps) {
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	const [isEditing, setIsEditing] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
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

	// Use safe dimensions hook
	const dimensions = useContainerDimensions(containerRef, width, height);

	// 解析初始数据 with safe parsing - memoized to prevent unnecessary re-parses
	const initialData: ExcalidrawData = useMemo(() => safeParseExcalidrawData(data), [data]);

	// 保存数据到节点 (Requirements: 5.4)
	const saveDataToNode = useCallback(
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型
		(elements: readonly any[], appState: any, files: any) => {
			editor.update(() => {
				const node = $getNodeByKey(nodeKey);
				if ($isExcalidrawNode(node)) {
					const dataToSave: ExcalidrawData = {
						elements: elements as any[],
						appState: {
							viewBackgroundColor: appState.viewBackgroundColor,
							gridSize: appState.gridSize,
						},
						files,
					};
					node.setData(JSON.stringify(dataToSave));
				}
			});
		},
		[editor, nodeKey],
	);

	// Use debounced save with status tracking (Requirements: 5.4)
	const { debouncedSave, flushSave, saveStatus } = useDebouncedSave(saveDataToNode);

	// 删除节点
	const deleteNode = useCallback(() => {
		editor.update(() => {
			const node = $getNodeByKey(nodeKey);
			if ($isExcalidrawNode(node)) {
				node.remove();
			}
		});
	}, [editor, nodeKey]);

	// 导出为图片
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
			a.download = `excalidraw-${Date.now()}.png`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			logger.error("导出图片失败:", error);
		}
	}, [isDark]);

	// 处理点击选择
	useEffect(() => {
		return mergeRegister(
			editor.registerCommand(
				CLICK_COMMAND,
				(event: MouseEvent) => {
					if (
						containerRef.current &&
						containerRef.current.contains(event.target as Node)
					) {
						if (!event.shiftKey) {
							clearSelection();
						}
						setSelected(true);
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_DELETE_COMMAND,
				() => {
					if (isSelected) {
						deleteNode();
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(
				KEY_BACKSPACE_COMMAND,
				() => {
					if (isSelected && !isEditing) {
						deleteNode();
						return true;
					}
					return false;
				},
				COMMAND_PRIORITY_LOW,
			),
		);
	}, [editor, isSelected, isEditing, setSelected, clearSelection, deleteNode]);

	// 全屏模式处理 (Requirements: 7.1, 7.2)
	useEffect(() => {
		if (isFullscreen) {
			document.body.style.overflow = "hidden";
			// 添加全屏类以便其他组件可以响应
			document.body.classList.add("excalidraw-fullscreen-active");
		} else {
			document.body.style.overflow = "";
			document.body.classList.remove("excalidraw-fullscreen-active");
		}
		return () => {
			document.body.style.overflow = "";
			document.body.classList.remove("excalidraw-fullscreen-active");
		};
	}, [isFullscreen]);

	// 全屏模式键盘快捷键 (Escape 退出)
	useEffect(() => {
		if (!isFullscreen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				// Flush any pending saves before exiting fullscreen (Requirements: 7.4)
				flushSave();
				setIsFullscreen(false);
				setIsEditing(false);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isFullscreen, flushSave]);

	// Reset error state - used by error boundary
	const handleReset = useCallback(() => {
		// Force re-render by toggling editing state
		setIsEditing(false);
	}, []);

	// 清空绘图数据 - 用于 Canvas exceeds max size 错误恢复
	const handleClearData = useCallback(() => {
		editor.update(() => {
			const node = $getNodeByKey(nodeKey);
			if ($isExcalidrawNode(node)) {
				// 重置为空白数据
				const emptyData: ExcalidrawData = {
					elements: [],
					appState: {},
					files: {},
				};
				node.setData(JSON.stringify(emptyData));
			}
		});
		// 强制重新渲染
		setIsEditing(false);
		setIsReady(false);
		setTimeout(() => setIsReady(true), 100);
	}, [editor, nodeKey]);

	// UIOptions 配置 - 移除"在外部打开"相关功能 (Requirements: 6.2)
	// 禁用所有外部操作按钮，保持绘图完全嵌入式
	const baseUIOptions = {
		canvasActions: {
			changeViewBackgroundColor: false,
			clearCanvas: false,
			export: false as const,  // 禁用导出到外部
			loadScene: false,        // 禁用加载外部场景
			saveToActiveFile: false, // 禁用保存到外部文件
			toggleTheme: false,      // 禁用主题切换（由编辑器控制）
		},
	};

	const editUIOptions = {
		canvasActions: {
			changeViewBackgroundColor: true, // 编辑模式允许更改背景色
			clearCanvas: true,               // 编辑模式允许清空画布
			export: false as const,          // 禁用导出到外部
			loadScene: false,                // 禁用加载外部场景
			saveToActiveFile: false,         // 禁用保存到外部文件
			toggleTheme: false,              // 禁用主题切换（由编辑器控制）
		},
	};

	// 获取安全的初始数据，确保 appState 中不包含可能导致 Canvas 尺寸问题的值
	const getSafeInitialData = useCallback(() => {
		// 不在 appState 中设置 width/height/zoom/scroll，让 Excalidraw 自动计算
		// 这样可以避免 "Canvas exceeds max size" 错误
		return {
			...initialData,
			appState: {
				// 只保留安全的属性
				viewBackgroundColor: initialData.appState?.viewBackgroundColor,
				gridSize: initialData.appState?.gridSize,
				// 不设置 zoom、scrollX、scrollY、width、height
			},
		};
	}, [initialData]);

	// 渲染预览模式（静态图片）
	const renderPreview = () => {
		if (initialData.elements.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
					<Edit3 className="size-8" />
					<span>点击编辑开始绘图</span>
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

		// 显示 Excalidraw 但禁用交互 (Requirements: 6.4)
		// 使用容器包装以确保有明确的尺寸约束
		return (
			<ExcalidrawErrorBoundary onReset={handleReset} onClearData={handleClearData}>
				<div 
					className="pointer-events-none h-full w-full"
					style={{
						position: "relative",
						overflow: "hidden",
						// 设置明确的最大尺寸
						maxWidth: "100%",
						maxHeight: "100%",
					}}
				>
					<Excalidraw
						initialData={getSafeInitialData()}
						theme={isDark ? "dark" : "light"}
						viewModeEnabled={true}
						zenModeEnabled={true}
						UIOptions={baseUIOptions}
					/>
				</div>
			</ExcalidrawErrorBoundary>
		);
	};

	// 渲染编辑模式 with auto-save (Requirements: 5.4)
	// 使用容器包装以确保 Excalidraw 有明确的尺寸约束
	const renderEditor = (isFullscreenMode = false) => {
		// 等待容器准备好再渲染 Excalidraw
		if (!isReady) {
			return (
				<div className="flex items-center justify-center h-full text-muted-foreground">
					<span>Loading...</span>
				</div>
			);
		}

		return (
			<ExcalidrawErrorBoundary onReset={handleReset} onClearData={handleClearData}>
				<div 
					className="w-full h-full" 
					style={{ 
						// 确保容器有明确的尺寸，避免 Canvas exceeds max size 错误
						position: "relative",
						overflow: "hidden",
						// 设置明确的最大尺寸
						maxWidth: "100%",
						maxHeight: "100%",
					}}
				>
					<Excalidraw
						// 使用 key 强制在全屏模式切换时重新挂载组件
						key={`excalidraw-${nodeKey}-${isFullscreenMode ? "fullscreen" : "normal"}`}
						excalidrawAPI={(api) => {
							excalidrawRef.current = api;
						}}
						initialData={getSafeInitialData()}
						theme={isDark ? "dark" : "light"}
						onChange={(elements, appState, files) => {
							// Use debounced save to avoid excessive updates
							debouncedSave(elements, appState, files);
						}}
						UIOptions={editUIOptions}
					/>
				</div>
			</ExcalidrawErrorBoundary>
		);
	};

	// 手动保存功能 (Requirements: 7.3)
	const handleManualSave = useCallback(() => {
		if (!excalidrawRef.current) return;
		
		const elements = excalidrawRef.current.getSceneElements();
		const appState = excalidrawRef.current.getAppState();
		const files = excalidrawRef.current.getFiles();
		
		// 直接保存，不使用防抖
		saveDataToNode(elements, appState, files);
	}, [saveDataToNode]);

	// 全屏模式 - 使用与编辑器一致的主题样式 (Requirements: 6.1, 7.1, 7.2, 7.3, 7.4)
	if (isFullscreen) {
		// 工具栏高度常量
		const TOOLBAR_HEIGHT = 56; // 56px = py-3 (12px * 2) + content height
		
		return (
			<div className={cn(
				"fixed inset-0 z-50",
				// 使用与编辑器一致的背景色
				"bg-background",
				// 添加边框以区分全屏区域
				"border-t border-border"
			)}>
				{/* 全屏顶部工具栏 - 与编辑器风格一致 (Requirements: 7.2, 7.3) */}
				<div 
					className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border"
					style={{ height: TOOLBAR_HEIGHT }}
				>
					{/* 左侧：标题和状态 */}
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2">
							<Edit3 className="size-5 text-muted-foreground" />
							<span className="font-medium text-sm">全屏编辑模式</span>
						</div>
						{/* Save status indicator in fullscreen (Requirements: 5.4) */}
						<SaveStatusIndicator status={saveStatus} />
					</div>
					
					{/* 右侧：操作按钮 (Requirements: 7.3) */}
					<div className="flex items-center gap-2">
						{/* 保存按钮 */}
						<Button
							variant="outline"
							size="sm"
							onClick={handleManualSave}
							title="保存 (自动保存已启用)"
							className="bg-background/80 backdrop-blur-sm"
						>
							<Check className="size-4 mr-1.5" />
							保存
						</Button>
						{/* 导出按钮 */}
						<Button
							variant="outline"
							size="sm"
							onClick={exportAsImage}
							title="导出为图片"
							className="bg-background/80 backdrop-blur-sm"
						>
							<Download className="size-4 mr-1.5" />
							导出
						</Button>
						{/* 分隔线 */}
						<div className="w-px h-6 bg-border mx-1" />
						{/* 退出按钮 (Requirements: 7.4) */}
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								// Flush any pending saves before exiting fullscreen (Requirements: 7.4)
								flushSave();
								setIsFullscreen(false);
								setIsEditing(false);
							}}
							title="退出全屏 (Esc)"
							className="bg-background/80 backdrop-blur-sm"
						>
							<Minimize2 className="size-4 mr-1.5" />
							退出
						</Button>
					</div>
				</div>
				
				{/* 绘图区域 - 使用明确的高度计算避免 Canvas 超出最大尺寸 */}
				<div 
					className="w-full overflow-hidden"
					style={{ 
						height: `calc(100vh - ${TOOLBAR_HEIGHT}px)`,
						marginTop: TOOLBAR_HEIGHT,
						// 限制最大尺寸以避免 Canvas exceeds max size 错误
						maxWidth: '100vw',
						maxHeight: `calc(100vh - ${TOOLBAR_HEIGHT}px)`,
					}}
				>
					{renderEditor(true)}
				</div>
				
				{/* 底部提示 */}
				<div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
					<div className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border text-xs text-muted-foreground">
						按 <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">Esc</kbd> 退出全屏
					</div>
				</div>
			</div>
		);
	}

	// 最小尺寸常量 (Requirements: 6.3)
	const MIN_WIDTH = 400;
	const MIN_HEIGHT = 300;

	return (
		<div
			ref={containerRef}
			className={cn(
				// 基础样式 - 与编辑器一致的圆角和边框 (Requirements: 6.1)
				"group relative rounded-lg overflow-hidden my-4 transition-all duration-200",
				// 边框样式 - 使用编辑器一致的边框颜色
				"border border-border",
				// 选中状态
				isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
				// 背景样式 - 编辑模式使用背景色，预览模式使用轻微的灰色背景
				isEditing ? "bg-background" : "bg-muted/20",
				// 悬停效果
				!isEditing && "hover:border-primary/50",
			)}
			style={{ 
				width: Math.max(MIN_WIDTH, dimensions.width), 
				height: Math.max(MIN_HEIGHT, dimensions.height),
				minWidth: MIN_WIDTH, // 确保最小宽度 (Requirements: 6.3)
				minHeight: MIN_HEIGHT, // 确保最小高度 (Requirements: 6.3)
			}}
		>
			{/* 工具栏 - 悬停时显示，与编辑器风格一致 (Requirements: 6.1) */}
			<div
				className={cn(
					"absolute top-2 right-2 z-10 flex items-center gap-1.5 transition-all duration-200",
					isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
				)}
			>
				{isEditing ? (
					<>
						{/* Save status indicator (Requirements: 5.4) */}
						<SaveStatusIndicator status={saveStatus} />
						<Button
							variant="outline"
							size="icon"
							className="size-7 bg-background/80 backdrop-blur-sm hover:bg-background"
							onClick={() => setIsFullscreen(true)}
							title="全屏编辑"
						>
							<Maximize2 className="size-3.5" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="size-7 bg-background/80 backdrop-blur-sm hover:bg-background"
							onClick={exportAsImage}
							title="导出为图片"
						>
							<Download className="size-3.5" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="size-7 bg-background/80 backdrop-blur-sm hover:bg-background"
							onClick={() => {
								// Flush any pending saves before exiting edit mode
								flushSave();
								setIsEditing(false);
							}}
							title="完成编辑"
						>
							<Eye className="size-3.5" />
						</Button>
					</>
				) : (
					<>
						<Button
							variant="outline"
							size="icon"
							className="size-7 bg-background/80 backdrop-blur-sm hover:bg-background"
							onClick={() => setIsEditing(true)}
							title="编辑绘图"
						>
							<Edit3 className="size-3.5" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="size-7 bg-background/80 backdrop-blur-sm hover:bg-background"
							onClick={() => setIsFullscreen(true)}
							title="全屏查看"
						>
							<Maximize2 className="size-3.5" />
						</Button>
					</>
				)}
				<Button
					variant="destructive"
					size="icon"
					className="size-7"
					onClick={deleteNode}
					title="删除"
				>
					<Trash2 className="size-3.5" />
				</Button>
			</div>

			{/* 内容区域 */}
			<div
				className="h-full"
				onDoubleClick={() => !isEditing && setIsEditing(true)}
			>
				{isEditing ? renderEditor(false) : renderPreview()}
			</div>
		</div>
	);
}
