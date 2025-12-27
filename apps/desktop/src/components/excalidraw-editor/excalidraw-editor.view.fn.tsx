/**
 * Excalidraw 编辑器组件 - View
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 * 集成 @excalidraw/excalidraw 包，支持主题切换和 onChange 回调
 *
 * @requirements 5.2
 */

import { Excalidraw } from "@excalidraw/excalidraw";
import { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ExcalidrawEditorViewProps } from "./excalidraw-editor.types";

/** 元素坐标和尺寸的安全限制 */
const MAX_COORD = 32000;
const MAX_SIZE = 8000;

/**
 * 清理 appState，只保留安全的属性
 * 避免 Canvas exceeds max size 错误
 */
// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型复杂
function sanitizeAppState(appState: any): Record<string, unknown> {
	if (!appState || typeof appState !== "object") {
		return { viewBackgroundColor: "#ffffff" };
	}

	// 只保留最基本的属性，完全不传递可能导致问题的属性
	return {
		viewBackgroundColor: appState.viewBackgroundColor || "#ffffff",
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
					appState: { viewBackgroundColor: "#ffffff" },
					files: {},
				};
			}

			return {
				elements: sanitizeElements([...(initialData.elements || [])]),
				appState: sanitizeAppState(initialData.appState),
				files: initialData.files || {},
			};
		}, [initialData]);

		return (
			<div className={cn("h-full w-full", className)}>
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
