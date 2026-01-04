/**
 * @file diagram-editor.types.ts
 * @description DiagramEditor 类型定义
 *
 * 定义图表编辑器相关的类型，包括 View 和 Container 组件的 Props。
 */

import type { Theme } from "@/lib/themes";

/**
 * 图表类型
 */
export type DiagramType = "mermaid" | "plantuml";

/**
 * 图表错误类型
 */
export type DiagramErrorType =
	| "syntax"
	| "network"
	| "server"
	| "config"
	| "render"
	| "timeout"
	| "unknown";

/**
 * 图表错误信息
 */
export interface DiagramError {
	/** 错误类型 */
	readonly type: DiagramErrorType;
	/** 错误消息 */
	readonly message: string;
	/** 是否可重试 */
	readonly retryable?: boolean;
	/** 详细信息（可选） */
	readonly details?: string;
	/** 重试次数（可选） */
	readonly retryCount?: number;
}

/**
 * 主题颜色配置
 */
export interface ThemeColors {
	/** 背景色 */
	readonly background: string;
	/** 前景色 */
	readonly foreground: string;
	/** 选中文本背景色 */
	readonly selection?: string;
	/** 当前行高亮背景色 */
	readonly lineHighlight?: string;
	/** 光标颜色 */
	readonly cursor?: string;
	/** 行号颜色 */
	readonly lineNumber?: string;
	/** 活动行号颜色 */
	readonly lineNumberActive?: string;
}

/**
 * DiagramEditorView Props 接口
 */
export interface DiagramEditorViewProps {
	/** 图表代码 */
	readonly code: string;
	/** 图表类型 */
	readonly diagramType: DiagramType;
	/** 预览 SVG 内容 */
	readonly previewSvg: string | null;
	/** 是否正在加载预览 */
	readonly isLoading: boolean;
	/** 错误信息 */
	readonly error: DiagramError | null;
	/** Kroki 是否已配置 */
	readonly isKrokiConfigured: boolean;
	/** 主题 */
	readonly theme?: "light" | "dark";
	/** 主题颜色 */
	readonly themeColors?: ThemeColors;
	/** 代码变化回调 */
	readonly onCodeChange: (code: string) => void;
	/** 保存回调 */
	readonly onSave?: () => void;
	/** 打开设置回调 */
	readonly onOpenSettings: () => void;
	/** 重试回调 */
	readonly onRetry: () => void;
}

/**
 * DiagramEditorContainer Props 接口
 *
 * Container 组件专用类型
 */
export interface DiagramEditorContainerProps {
	/** 节点 ID */
	readonly nodeId: string;
	/** 图表类型 */
	readonly diagramType: "mermaid" | "plantuml";
	/** 样式类名 */
	readonly className?: string;
}
