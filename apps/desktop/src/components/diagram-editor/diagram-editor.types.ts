/**
 * DiagramEditor 组件类型定义
 *
 * 类型说明：
 * - DiagramType, DiagramErrorType, DiagramError 从 @/fn/diagram 导入
 * - 组件专用的 Props 接口在此定义
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

// 从 fn/diagram 导入共享类型（避免重复定义）
import type { DiagramError, DiagramErrorType, DiagramType } from "@/fn/diagram";
import type { Theme } from "@/lib/themes";

// 重新导出供外部使用
export type { DiagramError, DiagramErrorType, DiagramType };

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
	/** 主题（完整 Theme 对象，用于 Monaco 主题同步） */
	readonly theme?: Theme;
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
 * DiagramEditorContainer Props 接口
 */
export interface DiagramEditorContainerProps {
	/** 节点 ID */
	readonly nodeId: string;
	/** 图表类型 */
	readonly diagramType: DiagramType;
	/** 样式类名 */
	readonly className?: string;
}
