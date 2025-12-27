/**
 * Excalidraw 编辑器组件 - View
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 * 集成 @excalidraw/excalidraw 包，支持主题切换和 onChange 回调
 *
 * 修复 Canvas exceeds max size 错误：
 * - 强制设置安全的初始 appState（scrollX=0, scrollY=0, zoom=1）
 * - 限制 devicePixelRatio 为最大 1（最保守的方案）
 * - 使用固定像素尺寸的容器
 *
 * @requirements 5.2
 */

import { Excalidraw } from "@excalidraw/excalidraw";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
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
		viewBackgroundColor:
			appState?.viewBackgroundColor || "#ffffff",
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
		const originalDPRRef = useRef<number | null>(null);

		// 在组件挂载时强制限制 devicePixelRatio 为 1
		useEffect(() => {
			// 保存原始值
			originalDPRRef.current = window.devicePixelRatio;

			// 强制设置为 1，这是最保守的方案
			Object.defineProperty(window, "devicePixelRatio", {
				get: () => 1,
				configurable: true,
			});

			return () => {
				// 恢复原始值
				if (originalDPRRef.current !== null) {
					Object.defineProperty(window, "devicePixelRatio", {
						get: () => originalDPRRef.current,
						configurable: true,
					});
				}
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
					// 确保容器不会超出视口
					maxWidth: "100vw",
					maxHeight: "100vh",
					overflow: "hidden",
				}}
			>
				<Excalidraw
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
		);
	},
);

ExcalidrawEditorView.displayName = "ExcalidrawEditorView";
