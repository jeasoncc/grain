/**
 * @file diagram-editor.types.ts
 * @description DiagramEditor 类型定义（从 @grain/diagram-editor 包重新导出 + 本地扩展）
 *
 * 此文件从 @grain/diagram-editor 包重新导出类型，
 * 并添加 Container 组件专用的类型定义。
 */

// 从包重新导出 View 组件相关类型
export type {
	DiagramEditorViewProps,
	DiagramError,
	DiagramErrorType,
	DiagramType,
} from "@grain/diagram-editor";

/**
 * DiagramEditorContainer Props 接口
 *
 * Container 组件专用类型，不在包中定义
 */
export interface DiagramEditorContainerProps {
	/** 节点 ID */
	readonly nodeId: string;
	/** 图表类型 */
	readonly diagramType: "mermaid" | "plantuml";
	/** 样式类名 */
	readonly className?: string;
}
