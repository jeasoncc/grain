/**
 * Lexical Diagram Editor
 * Diagram editing with Mermaid/PlantUML preview using Lexical
 * @module @grain/editor-lexical/diagram
 */

// Main component
export { default as LexicalDiagramEditor } from "./lexical-diagram-editor";
export type {
  LexicalDiagramEditorProps,
  LexicalDiagramEditorHandle,
} from "./lexical-diagram-editor";

// Adapter
export {
  LexicalDiagramAdapter,
  createLexicalDiagramAdapter,
} from "./lexical-diagram-adapter";
export type { LexicalDiagramAdapterConfig } from "./lexical-diagram-adapter";
