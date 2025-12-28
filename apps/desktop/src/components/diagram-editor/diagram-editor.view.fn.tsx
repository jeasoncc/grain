/**
 * @file diagram-editor.view.fn.tsx
 * @description DiagramEditor 纯展示组件
 *
 * 纯展示组件，只通过 props 接收数据和回调函数。
 * 不直接访问 Store 或 DB，遵循函数式架构原则。
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { AlertCircle, RefreshCw, Settings } from "lucide-react";
import { memo } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

import type { DiagramEditorViewProps } from "./diagram-editor.types";

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

/**
 * 错误显示组件
 */
const ErrorDisplay = memo(function ErrorDisplay({
	error,
	onRetry,
}: {
	readonly error: string;
	readonly onRetry: () => void;
}) {
	return (
		<div className="flex flex-col items-center justify-center h-full gap-4 p-4">
			<Alert variant="destructive" className="max-w-md">
				<AlertCircle className="size-4" />
				<AlertTitle>Render Error</AlertTitle>
				<AlertDescription className="mt-2">
					<p className="text-sm break-words">{error}</p>
				</AlertDescription>
			</Alert>
			<Button variant="outline" onClick={onRetry} className="gap-2">
				<RefreshCw className="size-4" />
				Retry
			</Button>
		</div>
	);
});

/**
 * 加载状态组件
 */
const LoadingState = memo(function LoadingState() {
	return (
		<div className="flex flex-col items-center justify-center h-full gap-3">
			<Spinner size={8} color="text-primary" />
			<p className="text-sm text-muted-foreground">Rendering diagram...</p>
		</div>
	);
});

/**
 * 预览区域组件
 */
const PreviewArea = memo(function PreviewArea({
	previewSvg,
	isLoading,
	error,
	onRetry,
}: {
	readonly previewSvg: string | null;
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly onRetry: () => void;
}) {
	// 加载中
	if (isLoading) {
		return <LoadingState />;
	}

	// 错误状态
	if (error) {
		return <ErrorDisplay error={error} onRetry={onRetry} />;
	}

	// 有预览内容
	if (previewSvg) {
		return (
			<ScrollArea className="h-full">
				<div
					className="p-4 flex items-center justify-center min-h-full"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from Kroki service
					dangerouslySetInnerHTML={{ __html: previewSvg }}
				/>
			</ScrollArea>
		);
	}

	// 空状态
	return (
		<div className="flex items-center justify-center h-full text-muted-foreground">
			<p className="text-sm">Enter diagram code to see preview</p>
		</div>
	);
});

/**
 * 代码编辑区组件
 */
const CodeEditor = memo(function CodeEditor({
	code,
	diagramType,
	onCodeChange,
}: {
	readonly code: string;
	readonly diagramType: "mermaid" | "plantuml";
	readonly onCodeChange: (code: string) => void;
}) {
	const placeholder =
		diagramType === "mermaid"
			? "Enter Mermaid diagram code...\n\nExample:\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action]\n    B -->|No| D[End]"
			: "Enter PlantUML diagram code...\n\nExample:\n@startuml\nAlice -> Bob: Hello\nBob --> Alice: Hi\n@enduml";

	return (
		<textarea
			value={code}
			onChange={(e) => onCodeChange(e.target.value)}
			className={cn(
				"w-full h-full p-4 resize-none",
				"font-mono text-sm leading-relaxed",
				"bg-muted/30 border-none outline-none",
				"placeholder:text-muted-foreground/50",
				"focus:bg-muted/50 transition-colors",
			)}
			placeholder={placeholder}
			spellCheck={false}
		/>
	);
});

// ==============================
// 主组件
// ==============================

/**
 * DiagramEditor 纯展示组件
 *
 * 分屏布局：左侧代码编辑区，右侧预览区
 * 只通过 props 接收数据，不直接访问 Store/DB。
 */
export const DiagramEditorView = memo(function DiagramEditorView({
	code,
	diagramType,
	previewSvg,
	isLoading,
	error,
	isKrokiConfigured,
	onCodeChange,
	onOpenSettings,
	onRetry,
}: DiagramEditorViewProps) {
	// 如果 Kroki 未配置，显示配置提示
	if (!isKrokiConfigured) {
		return <KrokiNotConfigured onOpenSettings={onOpenSettings} />;
	}

	return (
		<div className="flex h-full w-full" data-testid="diagram-editor">
			{/* 代码编辑区 */}
			<div className="flex-1 border-r border-border/50 overflow-hidden">
				<CodeEditor
					code={code}
					diagramType={diagramType}
					onCodeChange={onCodeChange}
				/>
			</div>

			{/* 预览区 */}
			<div className="flex-1 overflow-hidden bg-background">
				<PreviewArea
					previewSvg={previewSvg}
					isLoading={isLoading}
					error={error}
					onRetry={onRetry}
				/>
			</div>
		</div>
	);
});
