/**
 * DiagramEditor 组件类型定义
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

/**
 * 图表类型
 * - mermaid: Mermaid 图表
 * - plantuml: PlantUML 图表
 */
export type DiagramType = "mermaid" | "plantuml";

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
	/** 错误信息 */
	readonly error: string | null;
	/** Kroki 是否已配置 */
	readonly isKrokiConfigured: boolean;
	/** 代码变化回调 */
	readonly onCodeChange: (code: string) => void;
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
