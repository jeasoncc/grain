/**
 * @file codemirror-code-editor.types.ts
 * @description CodeMirror 代码编辑器容器组件类型定义
 */

/**
 * CodeMirrorCodeEditorContainer 组件 Props
 */
export interface CodeMirrorCodeEditorContainerProps {
  /** 节点 ID */
  readonly nodeId: string;
  /** 自定义样式类名 */
  readonly className?: string;
}
