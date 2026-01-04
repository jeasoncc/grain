/**
 * @file diagram-preview.view.fn.tsx
 * @description DiagramPreview View 组件
 *
 * 提供图表预览相关的纯展示组件，包括：
 * - DiagramPreviewView: 主预览组件
 * - DiagramSvgContent: SVG 内容渲染
 * - DiagramLoadingState: 加载状态
 * - DiagramErrorDisplay: 错误显示
 * - DiagramEmptyState: 空状态
 */

import { AlertCircle, Loader2, RefreshCw, Settings } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { DiagramError, DiagramType } from "./diagram-editor.types";

// ==============================
// Types
// ==============================

/**
 * DiagramPreviewView Props
 */
export interface DiagramPreviewViewProps {
	/** 预览 SVG 内容 */
	readonly previewSvg: string | null;
	/** 是否正在加载 */
	readonly isLoading: boolean;
	/** 错误信息 */
	readonly error: DiagramError | null;
	/** 图表类型 */
	readonly diagramType: DiagramType;
	/** Kroki 是否已配置 */
	readonly isKrokiConfigured: boolean;
	/** 重试回调 */
	readonly onRetry?: () => void;
	/** 打开设置回调 */
	readonly onOpenSettings?: () => void;
	/** 自定义类名 */
	readonly className?: string;
}

// ==============================
// Sub-components
// ==============================

/**
 * SVG 内容渲染组件
 */
export const DiagramSvgContent = memo(function DiagramSvgContent({
	svg,
	className,
}: {
	readonly svg: string;
	readonly className?: string;
}) {
	return (
		<div
			className={cn(
				"flex h-full w-full items-center justify-center overflow-auto p-4",
				className,
			)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: SVG content from trusted Kroki/Mermaid source
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
});

/**
 * 加载状态组件
 */
export const DiagramLoadingState = memo(function DiagramLoadingState({
	className,
}: {
	readonly className?: string;
}) {
	return (
		<div
			className={cn(
				"flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground",
				className,
			)}
		>
			<Loader2 className="size-8 animate-spin" />
			<span className="text-sm">渲染预览中...</span>
		</div>
	);
});

/**
 * 错误显示组件
 */
export const DiagramErrorDisplay = memo(function DiagramErrorDisplay({
	error,
	onRetry,
	className,
}: {
	readonly error: DiagramError;
	readonly onRetry?: () => void;
	readonly className?: string;
}) {
	return (
		<div
			className={cn(
				"flex h-full w-full flex-col items-center justify-center gap-4 p-4 text-center",
				className,
			)}
		>
			<AlertCircle className="size-12 text-destructive" />
			<div className="space-y-2">
				<p className="font-medium text-destructive">渲染失败</p>
				<p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
				{error.details && (
					<p className="max-w-md text-xs text-muted-foreground/70">
						{error.details}
					</p>
				)}
				{error.retryCount !== undefined && error.retryCount > 0 && (
					<p className="text-xs text-muted-foreground">
						已重试 {error.retryCount} 次
					</p>
				)}
			</div>
			{onRetry && (
				<Button variant="outline" size="sm" onClick={onRetry}>
					<RefreshCw className="mr-2 size-4" />
					重试
				</Button>
			)}
		</div>
	);
});

/**
 * 空状态组件
 */
export const DiagramEmptyState = memo(function DiagramEmptyState({
	diagramType,
	isKrokiConfigured,
	onOpenSettings,
	className,
}: {
	readonly diagramType: DiagramType;
	readonly isKrokiConfigured: boolean;
	readonly onOpenSettings?: () => void;
	readonly className?: string;
}) {
	// PlantUML 需要 Kroki 配置
	if (diagramType === "plantuml" && !isKrokiConfigured) {
		return (
			<div
				className={cn(
					"flex h-full w-full flex-col items-center justify-center gap-4 p-4 text-center",
					className,
				)}
			>
				<Settings className="size-12 text-muted-foreground" />
				<div className="space-y-2">
					<p className="font-medium">需要配置 Kroki 服务器</p>
					<p className="max-w-md text-sm text-muted-foreground">
						PlantUML 图表需要 Kroki 服务器进行渲染。请在设置中配置 Kroki 服务器地址。
					</p>
				</div>
				{onOpenSettings && (
					<Button variant="outline" size="sm" onClick={onOpenSettings}>
						<Settings className="mr-2 size-4" />
						打开设置
					</Button>
				)}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground",
				className,
			)}
		>
			<p className="text-sm">在左侧编辑器中输入 {diagramType.toUpperCase()} 代码</p>
			<p className="text-xs">保存后将自动渲染预览</p>
		</div>
	);
});

// ==============================
// Main Component
// ==============================

/**
 * DiagramPreviewView - 图表预览主组件
 *
 * 根据状态显示不同的内容：
 * - 加载中：显示加载动画
 * - 错误：显示错误信息和重试按钮
 * - 空状态：显示提示信息
 * - 正常：显示 SVG 预览
 */
export const DiagramPreviewView = memo(function DiagramPreviewView({
	previewSvg,
	isLoading,
	error,
	diagramType,
	isKrokiConfigured,
	onRetry,
	onOpenSettings,
	className,
}: DiagramPreviewViewProps) {
	// 加载状态
	if (isLoading) {
		return <DiagramLoadingState className={className} />;
	}

	// 错误状态
	if (error) {
		return (
			<DiagramErrorDisplay
				error={error}
				onRetry={onRetry}
				className={className}
			/>
		);
	}

	// 有预览内容
	if (previewSvg) {
		return <DiagramSvgContent svg={previewSvg} className={className} />;
	}

	// 空状态
	return (
		<DiagramEmptyState
			diagramType={diagramType}
			isKrokiConfigured={isKrokiConfigured}
			onOpenSettings={onOpenSettings}
			className={className}
		/>
	);
});
