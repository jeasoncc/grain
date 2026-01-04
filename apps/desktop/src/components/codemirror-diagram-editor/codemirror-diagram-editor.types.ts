/**
 * @file codemirror-diagram-editor.types.ts
 * @description CodeMirror 图表编辑器容器组件类型定义
 */

import type { DiagramType } from "@grain/editor-core";

/**
 * CodeMirrorDiagramEditorContainer 组件 Props
 */
export interface CodeMirrorDiagramEditorContainerProps {
  /** 节点 ID */
  readonly nodeId: string;
  /** 图表类型 */
  readonly diagramType: DiagramType;
  /** 自定义样式类名 */
  readonly className?: string;
}
