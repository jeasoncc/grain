/**
 * @grain/editor-codemirror/diagram
 * 
 * CodeMirror-based diagram editor with Mermaid/PlantUML preview.
 * 
 * @module @grain/editor-codemirror/diagram
 */

export {
  CodeMirrorDiagramEditor,
  CodeMirrorDiagramEditorDefault,
} from "./codemirror-diagram-editor";

export {
  CodeMirrorDiagramAdapter,
  createCodeMirrorDiagramAdapter,
} from "./codemirror-diagram-adapter";

export type {
  CodeMirrorDiagramEditorProps,
  CodeMirrorDiagramEditorHandle,
  CodeMirrorDiagramAdapterConfig,
} from "./codemirror-diagram-editor.types";
