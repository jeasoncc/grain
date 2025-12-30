/**
 * @file diagram-editor.view.fn.tsx
 * @description DiagramEditor 纯展示组件
 *
 * 纯展示组件，只通过 props 接收数据和回调函数。
 * 不直接访问 Store 或 DB，遵循函数式架构原则。
 * 使用 Monaco Editor (CodeEditorView) 提供语法高亮和 Ctrl+S 保存支持。
 * 预览区域使用 DiagramPreviewView 组件。
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.2
 */

import { Settings } from "lucide-react";
import { memo } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { CodeEditorView } from "@/components/code-editor";
import { Button } from "@/components/ui/button";

import type { DiagramEditorViewProps } from "./diagram-editor.types";
import { DiagramPreviewView } from "./diagram-preview.view.fn";

// ==============================
// 子组件
// ==============================

/**
 * Kroki 未配置提示
 */
const KrokiNotConfigured = memo(function KrokiNotConfigured({
	onOpenSettings,
}: {
	readonly onOpenSettings: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center h-full gap-4 p-8">
			<div className="flex items-center justify-center size-16 rounded-full bg-muted/50">
				<Settings className="size-8 text-muted-foreground" />
			</div>
			<div className="text-center space-y-2">
				<h3 className="text-lg font-medium">Kroki Server Not Configured</h3>
				<p className="text-sm text-muted-foreground max-w-md">
					To render diagrams, please configure a Kroki server URL in settings.
					You can use the public server or host your own.
				</p>
			</div>
			<Button onClick={onOpenSettings} className="gap-2">
				<Settings className="size-4" />
				Configure Kroki
			</Button>
		</div>
	);
});

// ==============================
// 主组件
// ==============================

/**
 * DiagramEditor 纯展示组件
 *
 * 分屏布局：左侧代码编辑区（Monaco Editor），右侧预览区
 * 只通过 props 接收数据，不直接访问 Store/DB。
 * 支持 Ctrl+S 快捷键保存。
 */
export const DiagramEditorView = memo(function DiagramEditorView({
	code,
	diagramType,
	previewSvg,
	isLoading,
	error,
	isKrokiConfigured,
	theme,
	onCodeChange,
	onSave,
	onOpenSettings,
	onRetry,
}: DiagramEditorViewProps) {
	// 如果 Kroki 未配置，显示配置提示
	if (!isKrokiConfigured) {
		return <KrokiNotConfigured onOpenSettings={onOpenSettings} />;
	}

	return (
		<PanelGroup
			direction="horizontal"
			autoSaveId="diagram-editor-layout"
			className="h-full w-full"
			data-testid="diagram-editor"
		>
			{/* 代码编辑区 - 使用 Monaco Editor */}
			<Panel
				id="code-editor"
				order={1}
				defaultSize={50}
				minSize={20}
				maxSize={80}
				className="overflow-hidden"
			>
				<CodeEditorView
					value={code}
					language={diagramType}
					theme={theme}
					onChange={onCodeChange}
					onSave={onSave}
				/>
			</Panel>

			{/* 可拖动调整大小的分隔条 */}
			<PanelResizeHandle className="w-1.5 bg-border/50 hover:bg-primary/50 active:bg-primary transition-colors cursor-col-resize" />

			{/* 预览区 - 使用 DiagramPreviewView 组件 */}
			<Panel
				id="preview"
				order={2}
				defaultSize={50}
				minSize={20}
				maxSize={80}
				className="overflow-hidden bg-background"
			>
				<DiagramPreviewView
					previewSvg={previewSvg}
					isLoading={isLoading}
					error={error}
					onRetry={onRetry}
					className="h-full"
				/>
			</Panel>
		</PanelGroup>
	);
});
