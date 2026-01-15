/**
 * @file excalidraw-editor.types.ts
 * @description ExcalidrawEditor 类型定义（从 @grain/excalidraw-editor 包重新导出 + 本地扩展）
 *
 * 此文件从 @grain/excalidraw-editor 包重新导出类型，
 * 并添加 Container 组件专用的类型定义。
 */

// 从包重新导出 View 组件相关类型
export type {
	ContainerSize,
	ExcalidrawData,
	ExcalidrawEditorViewProps,
	PerformanceConfig,
	PerformanceMetrics,
} from "@grain/excalidraw-editor"

/**
 * ExcalidrawEditorContainer Props 接口
 *
 * Container 组件专用类型，不在包中定义
 */
export interface ExcalidrawEditorContainerProps {
	/** 节点 ID */
	readonly nodeId: string
	/** 样式类名 */
	readonly className?: string
}
