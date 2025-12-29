/**
 * @file diagram-preview.view.fn.tsx
 * @description DiagramPreview 纯展示组件
 *
 * 从 DiagramEditorView 中提取的预览相关组件。
 * 负责渲染 SVG 预览、加载状态和错误状态。
 *
 * @requirements 4.3, 4.4
 */

import {
	AlertCircle,
	Code2,
	RefreshCw,
	ServerCrash,
	WifiOff,
} from "lucide-react";
import { memo } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { DiagramError, DiagramErrorType } from "./diagram-editor.types";

// ==============================
// Types
// ==============================

/**
 * DiagramPreviewView Props 接口
 */
export interface DiagramPreviewViewProps {
	/** 预览 SVG 内容 */
	readonly previewSvg: string | null;
	/** 是否正在加载 */
	readonly isLoading: boolean;
	/** 错误信息 */
	readonly error: DiagramError | null;
	/** 重试回调 */
	readonly onRetry: () => void;
	/** 空状态提示文本 */
	readonly emptyText?: string;
	/** 样式类名 */
	readonly className?: string;
}

// ==============================
// Helper Functions
// ==============================

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

// ==============================
// Sub Components
// ==============================

/**
 * 加载状态组件
 */
export const DiagramLoadingState = memo(function DiagramLoadingState() {
	return (
		<div className="flex flex-col items-center justify-center h-full gap-3">
			<Spinner size={8} color="text-primary" />
			<p className="text-sm text-muted-foreground">Rendering diagram...</p>
		</div>
	);
});

/**
 * 错误显示组件
 */
export const DiagramErrorDisplay = memo(function DiagramErrorDisplay({
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
 * 空状态组件
 */
export const DiagramEmptyState = memo(function DiagramEmptyState({
	text = "Enter diagram code to see preview",
}: {
	readonly text?: string;
}) {
	return (
		<div className="flex items-center justify-center h-full text-muted-foreground">
			<p className="text-sm">{text}</p>
		</div>
	);
});

/**
 * SVG 内容渲染组件
 */
export const DiagramSvgContent = memo(function DiagramSvgContent({
	svg,
}: {
	readonly svg: string;
}) {
	return (
		<ScrollArea className="h-full">
			<div
				className="p-4 flex items-center justify-center min-h-full"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from Kroki service
				dangerouslySetInnerHTML={{ __html: svg }}
			/>
		</ScrollArea>
	);
});

// ==============================
// Main Component
// ==============================

/**
 * DiagramPreview 纯展示组件
 *
 * 根据状态渲染不同的内容：
 * - 加载中：显示加载动画
 * - 错误：显示错误信息和重试按钮
 * - 有内容：显示 SVG 预览
 * - 空状态：显示提示文本
 */
export const DiagramPreviewView = memo(function DiagramPreviewView({
	previewSvg,
	isLoading,
	error,
	onRetry,
	emptyText,
	className,
}: DiagramPreviewViewProps) {
	// 加载中
	if (isLoading) {
		return (
			<div className={className}>
				<DiagramLoadingState />
			</div>
		);
	}

	// 错误状态
	if (error) {
		return (
			<div className={className}>
				<DiagramErrorDisplay error={error} onRetry={onRetry} />
			</div>
		);
	}

	// 有预览内容
	if (previewSvg) {
		return (
			<div className={className}>
				<DiagramSvgContent svg={previewSvg} />
			</div>
		);
	}

	// 空状态
	return (
		<div className={className}>
			<DiagramEmptyState text={emptyText} />
		</div>
	);
});
