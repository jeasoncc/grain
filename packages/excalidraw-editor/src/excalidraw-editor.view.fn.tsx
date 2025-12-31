/**
 * Excalidraw 编辑器组件 - View
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 * 集成 @excalidraw/excalidraw 包，支持主题切换和 onChange 回调
 * 支持 Ctrl+S 快捷键保存
 *
 * 性能优化：
 * - 使用优化的 UIOptions 减少不必要的 UI 元素
 * - 配置最优渲染设置以适配 Tauri WebView
 */

// 必须导入 Excalidraw CSS（0.18.0+ 版本）
import "@excalidraw/excalidraw/index.css";

import { Excalidraw } from "@excalidraw/excalidraw";
import { memo, useCallback, useEffect } from "react";
import {
	EXCALIDRAW_RENDER_CONFIG,
	EXCALIDRAW_UI_OPTIONS,
} from "./excalidraw-editor.config";
import type { ExcalidrawEditorViewProps } from "./excalidraw-editor.types";

export const ExcalidrawEditorView = memo(
	({
		initialData,
		theme,
		onChange,
		onSave,
		viewModeEnabled = false,
		containerSize,
	}: ExcalidrawEditorViewProps) => {
		/**
		 * 注册 Ctrl+S 快捷键
		 * 阻止浏览器默认保存对话框，调用 onSave 回调
		 */
		useEffect(() => {
			const handleKeyDown = (event: KeyboardEvent) => {
				// 检查是否为 Ctrl+S 或 Cmd+S
				if (
					(event.ctrlKey || event.metaKey) &&
					event.key.toLowerCase() === "s"
				) {
					event.preventDefault();
					event.stopPropagation();
					onSave?.();
				}
			};

			window.addEventListener("keydown", handleKeyDown);
			return () => {
				window.removeEventListener("keydown", handleKeyDown);
			};
		}, [onSave]);

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
				viewBackgroundColor:
					initialData.appState?.viewBackgroundColor ||
					(theme === "dark" ? "#1e1e1e" : "#ffffff"),
			},
			files: initialData.files || {},
		};

		return (
			<div
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
					UIOptions={EXCALIDRAW_UI_OPTIONS}
					detectScroll={EXCALIDRAW_RENDER_CONFIG.detectScroll}
					handleKeyboardGlobally={
						EXCALIDRAW_RENDER_CONFIG.handleKeyboardGlobally
					}
					autoFocus={EXCALIDRAW_RENDER_CONFIG.autoFocus}
				/>
			</div>
		);
	},
);

ExcalidrawEditorView.displayName = "ExcalidrawEditorView";
