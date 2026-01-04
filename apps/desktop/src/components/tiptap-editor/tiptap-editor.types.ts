/**
 * @file tiptap-editor.types.ts
 * @description Tiptap 编辑器组件类型定义
 */

/**
 * TiptapEditorContainer 组件 Props
 */
export interface TiptapEditorContainerProps {
  /** 节点 ID */
  readonly nodeId: string;
  /** 额外的 CSS 类名 */
  readonly className?: string;
}
