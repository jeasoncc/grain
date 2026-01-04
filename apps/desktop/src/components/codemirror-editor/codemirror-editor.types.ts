/**
 * @file codemirror-editor.types.ts
 * @description CodeMirror 编辑器组件类型定义
 */

/**
 * CodeMirrorEditorContainer 组件 Props
 */
export interface CodeMirrorEditorContainerProps {
  /** 节点 ID */
  readonly nodeId: string;
  /** 额外的 CSS 类名 */
  readonly className?: string;
}
