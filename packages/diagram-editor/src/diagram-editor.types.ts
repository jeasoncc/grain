/**
 * DiagramEditor 组件类型定义
 *
 * 独立包类型定义，不依赖 apps/desktop 的内部类型
 */

import type { EditorThemeColors } from "@grain/code-editor";

/**
 * 图表类型
 */
export type DiagramType = "mermaid" | "plantuml";

/**
 * 图表错误类型
 */
export type DiagramErrorType = "network" | "syntax" | "server" | "config" | "unknown";

/**
 * 图表错误信息
 */
export interface DiagramError {
	/** 错误类型 */
	readonly type: DiagramErrorType;
	/** 错误消息 */
	readonly message: string;
	/** 是否可重试 */
	readonly retryable: boolean;
	/** 重试次数 */
	readonly retryCount: number;
}

/**
 * DiagramEditorView Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
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
	/** 错误信息（增强版） */
	readonly error: DiagramError | null;
	/** Kroki 是否已配置 */
	readonly isKrokiConfigured: boolean;
	/** 基础主题：light 或 dark */
	readonly theme?: "light" | "dark";
	/** 自定义主题颜色（可选），透传给内部的 CodeEditor */
	readonly themeColors?: EditorThemeColors;
	/** 代码变化回调 */
	readonly onCodeChange: (code: string) => void;
	/** 手动保存回调 (Ctrl+S) */
	readonly onSave?: () => void;
	/** 打开设置回调 */
	readonly onOpenSettings: () => void;
	/** 重试回调 */
	readonly onRetry: () => void;
}

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
