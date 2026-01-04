/**
 * @file diagram-editor.view.fn.tsx
 * @description DiagramEditor View 组件
 *
 * 图表编辑器的纯展示组件，包含代码编辑区和预览区的分屏布局。
 * 代码编辑使用 Monaco Editor（通过 CodeEditorView），预览使用 DiagramPreviewView。
 */

import { memo } from "react";
import {
	Panel,
	PanelGroup,
	PanelResizeHandle,
} from "react-resizable-panels";
import { cn } from "@/lib/utils";

import { CodeEditorView } from "../code-editor/code-editor.view.fn";
import type { DiagramEditorViewProps } from "./diagram-editor.types";
import { DiagramPreviewView } from "./diagram-preview.view.fn";

/**
 * 获取 Monaco 语言标识符
 */
const getMonacoLanguage = (
	diagramType: "mermaid" | "plantuml",
): "mermaid" | "plantuml" => {
	return diagramType;
};

/**
 * DiagramEditorView - 图表编辑器纯展示组件
 *
 * 特性：
 * - 左右分屏布局（代码编辑 + 预览）
 * - 可调整分屏比例
 * - 代码编辑使用 Monaco Editor
 * - 预览区显示渲染后的 SVG
 * - 支持 Ctrl+S 快捷键保存
 */
export const DiagramEditorView = memo(function DiagramEditorView({
	code,
	diagramType,
	previewSvg,
	isLoading,
	error,
	isKrokiConfigured,
	theme,
	themeColors,
	onCodeChange,
	onSave,
	onOpenSettings,
	onRetry,
}: DiagramEditorViewProps) {
	return (
		<PanelGroup
			direction="horizontal"
			className="h-full w-full"
		>
			{/* 代码编辑区 */}
			<Panel defaultSize={50} minSize={30}>
				<div className="h-full w-full">
					<CodeEditorView
						value={code}
						language={getMonacoLanguage(diagramType)}
						theme={themeColors ? { key: theme ?? "light" } as never : undefined}
						onChange={onCodeChange}
						onSave={onSave}
					/>
				</div>
			</Panel>

			<PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

			{/* 预览区 */}
			<Panel defaultSize={50} minSize={30}>
				<div
					className={cn(
						"h-full w-full overflow-auto",
						theme === "dark" ? "bg-zinc-900" : "bg-white",
					)}
				>
					<DiagramPreviewView
						previewSvg={previewSvg}
						isLoading={isLoading}
						error={error}
						diagramType={diagramType}
						isKrokiConfigured={isKrokiConfigured}
						onRetry={onRetry}
						onOpenSettings={onOpenSettings}
					/>
				</div>
			</Panel>
		</PanelGroup>
	);
});
