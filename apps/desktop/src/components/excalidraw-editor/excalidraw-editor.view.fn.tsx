/**
 * Excalidraw 编辑器组件 - View
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 * 集成 @excalidraw/excalidraw 包，支持主题切换和 onChange 回调
 *
 * @requirements 5.2
 */

import { Excalidraw } from "@excalidraw/excalidraw";
import { memo, useCallback } from "react";
import type { ExcalidrawEditorViewProps } from "./excalidraw-editor.types";

export const ExcalidrawEditorView = memo(
	({
		initialData,
		theme,
		onChange,
		viewModeEnabled = false,
		containerSize,
	}: ExcalidrawEditorViewProps) => {
		// 如果没有初始数据，显示加载状态
		if (!initialData) {
			return (
				<div className="flex items-center justify-center h-full text-muted-foreground">
					<span>Loading...</span>
				</div>
			);
		}

		// 包装 onChange 回调以适配 Excalidraw 的类型
		const handleChange = useCallback(
			// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型复杂
			(elements: readonly any[], appState: any, files: any) => {
				onChange?.(elements, appState, files);
			},
			[onChange],
		);

		// 转换为 Excalidraw 期望的格式
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型复杂
		const excalidrawInitialData: any = {
			elements: initialData.elements || [],
			appState: {
				...initialData.appState,
				viewBackgroundColor: initialData.appState?.viewBackgroundColor || (theme === "dark" ? "#1e1e1e" : "#ffffff"),
			},
			files: initialData.files || {},
		};

		return (
			<div
				className="excalidraw-wrapper"
				style={{
					width: `${containerSize.width}px`,
					height: `${containerSize.height}px`,
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
