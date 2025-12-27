/**
 * Excalidraw 编辑器组件 - View
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 * 集成 @excalidraw/excalidraw 包，支持主题切换和 onChange 回调
 *
 * @requirements 5.2
 */

import {
	Component,
	type ErrorInfo,
	type ReactNode,
	Suspense,
	lazy,
	memo,
	useCallback,
	useMemo,
	useRef,
} from "react";
import logger from "@/log";
import type { ExcalidrawEditorViewProps } from "./excalidraw-editor.types";

// 动态导入 Excalidraw
const Excalidraw = lazy(() =>
	import("@excalidraw/excalidraw").then((mod) => ({
		default: mod.Excalidraw,
	})),
);

/** 元素坐标和尺寸的安全限制 */
const MAX_COORD = 10000;
const MAX_SIZE = 5000;

/** 错误边界 Props */
interface ErrorBoundaryProps {
	children: ReactNode;
	fallback: ReactNode;
	onError?: (error: Error) => void;
}

/** 错误边界 State */
interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

/** Excalidraw 专用错误边界 */
class ExcalidrawErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		logger.error("[ExcalidrawView] 渲染错误:", error, errorInfo);
		this.props.onError?.(error);
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback;
		}
		return this.props.children;
	}
}

/**
 * 清理 elements
 */
// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型复杂
function sanitizeElements(elements: any[]): any[] {
	if (!Array.isArray(elements)) return [];

	return elements
		.filter((el) => {
			if (!el || typeof el !== "object") return false;
			const x = el.x ?? 0;
			const y = el.y ?? 0;
			const width = el.width ?? 0;
			const height = el.height ?? 0;
			if (!Number.isFinite(x) || Math.abs(x) > MAX_COORD) return false;
			if (!Number.isFinite(y) || Math.abs(y) > MAX_COORD) return false;
			if (!Number.isFinite(width) || width < 0 || width > MAX_SIZE) return false;
			if (!Number.isFinite(height) || height < 0 || height > MAX_SIZE)
				return false;
			return true;
		})
		.map((el) => ({
			...el,
			x: Math.max(-MAX_COORD, Math.min(MAX_COORD, el.x ?? 0)),
			y: Math.max(-MAX_COORD, Math.min(MAX_COORD, el.y ?? 0)),
			width: Math.min(MAX_SIZE, Math.max(0, el.width ?? 0)),
			height: Math.min(MAX_SIZE, Math.max(0, el.height ?? 0)),
		}));
}

/** 错误回退 UI */
const ErrorFallback = memo(() => (
	<div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-lg p-4 gap-3">
		<span className="text-sm text-muted-foreground text-center">
			Drawing canvas failed to load. Please try refreshing the page.
		</span>
	</div>
));
ErrorFallback.displayName = "ErrorFallback";

/** 加载中 UI */
const LoadingFallback = memo(() => (
	<div className="flex items-center justify-center h-full text-muted-foreground">
		<span>Loading canvas...</span>
	</div>
));
LoadingFallback.displayName = "LoadingFallback";

export const ExcalidrawEditorView = memo(
	({
		initialData,
		theme,
		onChange,
		viewModeEnabled = false,
		containerSize,
	}: ExcalidrawEditorViewProps) => {
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw API 类型
		const excalidrawAPIRef = useRef<any>(null);

		// 包装 onChange 回调
		const handleChange = useCallback(
			// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型复杂
			(elements: readonly any[], appState: any, files: any) => {
				onChange?.(elements, appState, files);
			},
			[onChange],
		);

		// 清理初始数据
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型复杂
		const excalidrawInitialData: any = useMemo(() => {
			const safeAppState = {
				viewBackgroundColor: theme === "dark" ? "#1e1e1e" : "#ffffff",
				scrollX: 0,
				scrollY: 0,
				zoom: { value: 1 },
			};

			if (!initialData) {
				return {
					elements: [],
					appState: safeAppState,
				};
			}

			return {
				elements: sanitizeElements([...(initialData.elements || [])]),
				appState: {
					...safeAppState,
					viewBackgroundColor: initialData.appState?.viewBackgroundColor || safeAppState.viewBackgroundColor,
				},
				files: initialData.files || {},
			};
		}, [initialData, theme]);

		// 处理错误
		const handleError = useCallback((error: Error) => {
			logger.error("[ExcalidrawView] 捕获错误:", error.message);
		}, []);

		return (
			<div
				className="excalidraw-wrapper"
				style={{
					width: containerSize.width,
					height: containerSize.height,
				}}
			>
				<ExcalidrawErrorBoundary fallback={<ErrorFallback />} onError={handleError}>
					<Suspense fallback={<LoadingFallback />}>
						<Excalidraw
							excalidrawAPI={(api) => {
								excalidrawAPIRef.current = api;
							}}
							initialData={excalidrawInitialData}
							theme={theme}
							viewModeEnabled={viewModeEnabled}
							onChange={handleChange}
						/>
					</Suspense>
				</ExcalidrawErrorBoundary>
			</div>
		);
	},
);

ExcalidrawEditorView.displayName = "ExcalidrawEditorView";
