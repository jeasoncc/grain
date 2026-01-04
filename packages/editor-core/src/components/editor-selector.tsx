/**
 * EditorSelector component for dynamic editor loading
 * @module @grain/editor-core/components/editor-selector
 */

import {
  type ReactNode,
  type ComponentType,
  Suspense,
  lazy,
  useMemo,
  memo,
} from "react";
import type { EditorType } from "../types/file-type.interface";
import type {
  DocumentEditorType,
  CodeEditorType,
  DiagramEditorType,
} from "../types/config.interface";
import { useEditorConfigSafe } from "./editor-provider";

/**
 * Props for document editor components
 */
export interface DocumentEditorProps {
  readonly nodeId: string;
  readonly initialContent?: string;
  readonly onChange?: (content: string) => void;
  readonly onSave?: () => void;
  readonly readOnly?: boolean;
}

/**
 * Props for code editor components
 */
export interface CodeEditorProps {
  readonly nodeId: string;
  readonly initialContent?: string;
  readonly language?: string;
  readonly onChange?: (content: string) => void;
  readonly onSave?: () => void;
  readonly readOnly?: boolean;
}

/**
 * Props for diagram editor components
 */
export interface DiagramEditorProps {
  readonly nodeId: string;
  readonly initialContent?: string;
  readonly diagramType?: "mermaid" | "plantuml";
  readonly onChange?: (content: string) => void;
  readonly onSave?: () => void;
  readonly readOnly?: boolean;
}

/**
 * Editor component registry type
 */
export interface EditorComponentRegistry {
  document: Partial<
    Record<DocumentEditorType, ComponentType<DocumentEditorProps>>
  >;
  code: Partial<Record<CodeEditorType, ComponentType<CodeEditorProps>>>;
  diagram: Partial<Record<DiagramEditorType, ComponentType<DiagramEditorProps>>>;
}

/**
 * Lazy loader registry for editor components
 */
export interface LazyEditorRegistry {
  document: Partial<
    Record<DocumentEditorType, () => Promise<{ default: ComponentType<DocumentEditorProps> }>>
  >;
  code: Partial<
    Record<CodeEditorType, () => Promise<{ default: ComponentType<CodeEditorProps> }>>
  >;
  diagram: Partial<
    Record<DiagramEditorType, () => Promise<{ default: ComponentType<DiagramEditorProps> }>>
  >;
}

/**
 * Create a lazy editor registry with dynamic imports
 * This allows for code splitting and lazy loading of editor implementations
 *
 * @example
 * ```tsx
 * const registry = createLazyEditorRegistry({
 *   document: {
 *     lexical: () => import('@grain/editor-lexical/document').then(m => ({ default: m.LexicalDocumentEditor })),
 *     tiptap: () => import('@grain/editor-tiptap/document').then(m => ({ default: m.TiptapDocumentEditor })),
 *   },
 *   code: {
 *     monaco: () => import('@grain/editor-monaco/code').then(m => ({ default: m.MonacoCodeEditor })),
 *   },
 *   diagram: {
 *     monaco: () => import('@grain/editor-monaco/diagram').then(m => ({ default: m.MonacoDiagramEditor })),
 *   },
 * });
 * ```
 */
export const createLazyEditorRegistry = (
  registry: LazyEditorRegistry
): LazyEditorRegistry => registry;

/**
 * Default loading component
 */
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="animate-pulse text-muted-foreground">Loading editor...</div>
  </div>
);

/**
 * Default error component
 */
const DefaultErrorFallback = ({ error }: { error: Error }) => (
  <div className="flex items-center justify-center h-full w-full text-destructive">
    <div>Failed to load editor: {error.message}</div>
  </div>
);

/**
 * Props for EditorSelector component
 */
export interface EditorSelectorProps {
  /** The type of editor to render (document, code, diagram) */
  readonly editorType: EditorType;
  /** The lazy editor registry */
  readonly registry: LazyEditorRegistry;
  /** Props to pass to the editor component */
  readonly editorProps: DocumentEditorProps | CodeEditorProps | DiagramEditorProps;
  /** Loading fallback component */
  readonly loadingFallback?: ReactNode;
  /** Error fallback component */
  readonly errorFallback?: ComponentType<{ error: Error }>;
}

/**
 * EditorSelector component
 * Dynamically loads and renders the appropriate editor based on configuration
 *
 * @example
 * ```tsx
 * <EditorSelector
 *   editorType="document"
 *   registry={lazyRegistry}
 *   editorProps={{ nodeId: '123', onChange: handleChange }}
 * />
 * ```
 */
export const EditorSelector = memo(function EditorSelector({
  editorType,
  registry,
  editorProps,
  loadingFallback = <DefaultLoadingFallback />,
  errorFallback: ErrorFallback = DefaultErrorFallback,
}: EditorSelectorProps) {
  const config = useEditorConfigSafe();

  // Get the appropriate editor type from config
  const selectedEditorType = useMemo(() => {
    switch (editorType) {
      case "document":
        return config.documentEditor;
      case "code":
        return config.codeEditor;
      case "diagram":
        return config.diagramEditor;
      default:
        return config.documentEditor;
    }
  }, [editorType, config]);

  // Get the lazy loader for the selected editor
  const LazyEditor = useMemo(() => {
    const registrySection = registry[editorType as keyof LazyEditorRegistry];
    const loader = registrySection?.[selectedEditorType as keyof typeof registrySection];

    if (!loader) {
      // Return a component that shows an error
      const ErrorComponent = () => (
        <ErrorFallback
          error={new Error(`Editor not found: ${editorType}/${selectedEditorType}`)}
        />
      );
      return ErrorComponent;
    }

    // Create lazy component with proper typing
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic component type for lazy loading
    return lazy(loader as () => Promise<{ default: ComponentType<any> }>);
  }, [editorType, selectedEditorType, registry, ErrorFallback]);

  return (
    <Suspense fallback={loadingFallback}>
      {/* biome-ignore lint/suspicious/noExplicitAny: Dynamic props for lazy-loaded editor */}
      <LazyEditor {...(editorProps as any)} />
    </Suspense>
  );
});

/**
 * Hook to get the lazy editor component for a specific editor type
 * Useful when you need more control over the rendering
 *
 * @param editorType - The type of editor (document, code, diagram)
 * @param registry - The lazy editor registry
 * @returns The lazy-loaded editor component
 */
export const useLazyEditor = <T extends EditorType>(
  editorType: T,
  registry: LazyEditorRegistry
): ComponentType<
  T extends "document"
    ? DocumentEditorProps
    : T extends "code"
      ? CodeEditorProps
      : DiagramEditorProps
> | null => {
  const config = useEditorConfigSafe();

  return useMemo(() => {
    const selectedEditorType = (() => {
      switch (editorType) {
        case "document":
          return config.documentEditor;
        case "code":
          return config.codeEditor;
        case "diagram":
          return config.diagramEditor;
        default:
          return config.documentEditor;
      }
    })();

    const registrySection = registry[editorType as keyof LazyEditorRegistry];
    const loader = registrySection?.[selectedEditorType as keyof typeof registrySection];

    if (!loader) {
      return null;
    }

    // biome-ignore lint/suspicious/noExplicitAny: Dynamic component type
    return lazy(loader as () => Promise<{ default: ComponentType<any> }>);
  }, [editorType, config, registry]);
};
