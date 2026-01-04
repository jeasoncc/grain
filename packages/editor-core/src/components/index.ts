/**
 * Editor core components
 * @module @grain/editor-core/components
 */

export {
  EditorProvider,
  useEditorConfig,
  useEditorConfigSafe,
  useDocumentEditorType,
  useCodeEditorType,
  useDiagramEditorType,
} from "./editor-provider";

export type { EditorProviderProps } from "./editor-provider";

export {
  EditorSelector,
  createLazyEditorRegistry,
  useLazyEditor,
} from "./editor-selector";

export type {
  DocumentEditorProps,
  CodeEditorProps,
  DiagramEditorProps,
  EditorComponentRegistry,
  LazyEditorRegistry,
  EditorSelectorProps,
} from "./editor-selector";
