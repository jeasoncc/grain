/**
 * @grain/editor-tiptap/diagram
 * 
 * Tiptap-based diagram editor with Mermaid/PlantUML preview.
 * 
 * @module @grain/editor-tiptap/diagram
 */

export {
  TiptapDiagramEditor,
  TiptapDiagramEditorDefault,
} from "./tiptap-diagram-editor";

export {
  TiptapDiagramAdapter,
  createTiptapDiagramAdapter,
} from "./tiptap-diagram-adapter";

export type {
  TiptapDiagramEditorProps,
  TiptapDiagramEditorHandle,
  TiptapDiagramAdapterConfig,
} from "./tiptap-diagram-editor.types";
