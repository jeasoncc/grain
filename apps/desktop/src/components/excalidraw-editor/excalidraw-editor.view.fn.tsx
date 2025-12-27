/**
 * Excalidraw 编辑器组件 - View
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 * 集成 @excalidraw/excalidraw 包，支持主题切换和 onChange 回调
 *
 * 修复 Canvas exceeds max size 错误：
 * - 使用 excalidrawAPI 在挂载后重置视图
 * - 延迟渲染直到容器有有效尺寸
 *
 * @requirements 5.2
 */

import { Excalidraw } from "@excalidraw/excalidraw";
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import logger from "@/log";
import type { ExcalidrawEditorViewProps } from "./excalidraw-editor.types";

/** 元素坐标和尺寸的安全限制 */
const MAX_COORD = 10000;
const MAX_SIZE = 5000;

/**
 * 创建安全的 appState
 * 强制设置 scrollX=0, scrollY=0, zoom=1 避免 canvas 尺寸计算异常
 */
// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型复杂
function createSafeAppState(appState: any): Record<string, unknown> {
	return {
		viewBackgroundColor: appState?.viewBackgroundColor || "#ffffff",
		// 强制重置这些值，防止异常
		scrollX: 0,
		scrollY: 0,
		zoom: { value: 1 },
	};
}

/**
 * 清理 elements，过滤掉无效的元素
 * 确保所有坐标和尺寸在安全范围内
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

			// 检查坐标是否有效
			if (!Number.isFinite(x) || Math.abs(x) > MAX_COORD) return false;
			if (!Number.isFinite(y) || Math.abs(y) > MAX_COORD) return false;

			// 检查尺寸是否有效
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
}

export const ExcalidrawEditorView = memo(
	({
		initialData,
		theme,
		onChange,
		viewModeEnabled = false,
		className,
	}: ExcalidrawEditorViewProps) => {
		const containerRef = useRef<HTMLDivElement>(null);
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw API 类型复杂
		const excalidrawAPIRef = useRef<any>(null);
		const [containerReady, setContainerReady] = useState(false);
		const [dimensions, setDimensions] = useState<{
			width: number;
			height: number;
		} | null>(null);

		// 等待容器有有效尺寸后再渲染
		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;

			const checkSize = () => {
				const rect = container.getBoundingClientRect();
				logger.debug("[ExcalidrawView] 容器尺寸:", rect.width, "x", rect.height);

				if (rect.width > 100 && rect.height > 100) {
					// 限制最大尺寸为 2000px，确保安全
					const safeWidth = Math.min(rect.width, 2000);
					const safeHeight = Math.min(rect.height, 2000);
					setDimensions({ width: safeWidth, height: safeHeight });
					setContainerReady(true);
				}
			};

			// 延迟检查，确保布局完成
			const timer = setTimeout(checkSize, 200);

			const resizeObserver = new ResizeObserver(() => {
				checkSize();
			});
			resizeObserver.observe(container);

			return () => {
				clearTimeout(timer);
				resizeObserver.disconnect();
			};
		}, []);

		// 包装 onChange 回调以适配 Excalidraw 的类型
		const handleChange = useCallback(
			// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型复杂
			(elements: readonly any[], appState: any, files: any) => {
				onChange?.(elements, appState, files);
			},
			[onChange],
		);

		// 处理 Excalidraw API
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw API 类型复杂
		const handleExcalidrawAPI = useCallback((api: any) => {
			excalidrawAPIRef.current = api;
			logger.debug("[ExcalidrawView] API 已获取");

			// 在 API 可用后，尝试重置视图到安全状态
			if (api) {
				try {
					api.scrollToContent(undefined, {
						fitToContent: true,
						animate: false,
					});
				} catch (e) {
					logger.warn("[ExcalidrawView] scrollToContent 失败:", e);
				}
			}
		}, []);

		// 清理并转换为 Excalidraw 期望的格式
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型复杂
		const excalidrawInitialData: any = useMemo(() => {
			if (!initialData) {
				return {
					elements: [],
					appState: createSafeAppState(null),
					files: {},
				};
			}

			return {
				elements: sanitizeElements([...(initialData.elements || [])]),
				appState: createSafeAppState(initialData.appState),
				files: initialData.files || {},
			};
		}, [initialData]);

		return (
			<div
				ref={containerRef}
				className={cn("h-full w-full", className)}
				style={{
					position: "relative",
					overflow: "hidden",
				}}
			>
				{containerReady && dimensions ? (
					<div
						style={{
							width: dimensions.width,
							height: dimensions.height,
							position: "absolute",
							top: 0,
							left: 0,
						}}
					>
						<Excalidraw
							excalidrawAPI={handleExcalidrawAPI}
							initialData={excalidrawInitialData}
							theme={theme}
							viewModeEnabled={viewModeEnabled}
							onChange={handleChange}
							UIOptions={{
								canvasActions: {
									loadScene: false,
									saveToActiveFile: false,
								},
							}}
						/>
					</div>
				) : (
					<div className="flex items-center justify-center h-full text-muted-foreground">
						<span>Initializing canvas...</span>
					</div>
				)}
			</div>
		);
	},
);

ExcalidrawEditorView.displayName = "ExcalidrawEditorView";
