/**
 * @file diagram-editor.view.fn.tsx
 * @description DiagramEditor 纯展示组件
 *
 * 纯展示组件，只通过 props 接收数据和回调函数。
 * 不直接访问 Store 或 DB，遵循函数式架构原则。
 * 使用 Monaco Editor (CodeEditorView) 提供语法高亮和 Ctrl+S 保存支持。
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 7.2
 */

import {
	AlertCircle,
	Code2,
	RefreshCw,
	ServerCrash,
	Settings,
	WifiOff,
} from "lucide-react";
import { memo } from "react";

import { CodeEditorView } from "@/components/code-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { ScrollArea } from "@/components/ui/scroll-area";

import type {
	DiagramEditorViewProps,
	DiagramError,
	DiagramErrorType,
} from "./diagram-editor.types";

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
 * 根据错误类型获取图标
 */
const getErrorIcon = (type: DiagramErrorType) => {
	switch (type) {
		case "network":
			return WifiOff;
		case "syntax":
			return Code2;
		case "server":
			return ServerCrash;
		default:
			return AlertCircle;
	}
};

/**
 * 根据错误类型获取标题
 */
const getErrorTitle = (type: DiagramErrorType): string => {
	switch (type) {
		case "network":
			return "Network Error";
		case "syntax":
			return "Syntax Error";
		case "server":
			return "Server Error";
		default:
			return "Render Error";
	}
};

/**
 * 根据错误类型获取提示信息
 */
const getErrorHint = (type: DiagramErrorType): string | null => {
	switch (type) {
		case "network":
			return "Please check your internet connection and Kroki server availability.";
		case "syntax":
			return "Please check your diagram code for syntax errors.";
		case "server":
			return "The Kroki server encountered an error. Try again later.";
		default:
			return null;
	}
};

/**
 * 错误显示组件
 */
const ErrorDisplay = memo(function ErrorDisplay({
	error,
	onRetry,
}: {
	readonly error: DiagramError;
	readonly onRetry: () => void;
}) {
	const Icon = getErrorIcon(error.type);
	const title = getErrorTitle(error.type);
	const hint = getErrorHint(error.type);

	return (
		<div className="flex flex-col items-center justify-center h-full gap-4 p-4">
			<Alert variant="destructive" className="max-w-md">
				<Icon className="size-4" />
				<AlertTitle>{title}</AlertTitle>
				<AlertDescription className="mt-2 space-y-2">
					<p className="text-sm break-words">{error.message}</p>
					{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
					{error.retryCount > 0 && (
						<p className="text-xs text-muted-foreground">
							Retry attempts: {error.retryCount}
						</p>
					)}
				</AlertDescription>
			</Alert>
			{error.retryable && (
				<Button variant="outline" onClick={onRetry} className="gap-2">
					<RefreshCw className="size-4" />
					Retry
				</Button>
			)}
			{!error.retryable && error.type === "syntax" && (
				<p className="text-sm text-muted-foreground">
					Fix the syntax error in your code to see the preview.
				</p>
			)}
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
	readonly error: DiagramError | null;
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
	theme = "light",
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
		<div className="flex h-full w-full" data-testid="diagram-editor">
			{/* 代码编辑区 - 使用 Monaco Editor */}
			<div className="flex-1 border-r border-border/50 overflow-hidden">
				<CodeEditorView
					value={code}
					language={diagramType}
					theme={theme}
					onChange={onCodeChange}
					onSave={onSave}
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
