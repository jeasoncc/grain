/**
 * EditorProvider component for editor configuration context
 * @module @grain/editor-core/components/editor-provider
 */

import { createContext, useContext, type ReactNode } from "react";
import type { EditorConfig } from "../types/config.interface";
import { DEFAULT_EDITOR_CONFIG } from "../types/config.interface";

/**
 * Props for the EditorProvider component
 */
export interface EditorProviderProps {
  /** Editor configuration */
  readonly config?: EditorConfig;
  /** Child components */
  readonly children: ReactNode;
}

/**
 * Context for editor configuration
 */
const EditorConfigContext = createContext<EditorConfig | null>(null);

/**
 * EditorProvider component
 * Provides editor configuration to child components via context
 *
 * @example
 * ```tsx
 * <EditorProvider config={{ documentEditor: 'tiptap', codeEditor: 'monaco', diagramEditor: 'monaco' }}>
 *   <App />
 * </EditorProvider>
 * ```
 */
export const EditorProvider = ({
  config = DEFAULT_EDITOR_CONFIG,
  children,
}: EditorProviderProps) => {
  return (
    <EditorConfigContext.Provider value={config}>
      {children}
    </EditorConfigContext.Provider>
  );
};

/**
 * Hook to access the editor configuration
 * Must be used within an EditorProvider
 *
 * @throws Error if used outside of EditorProvider
 * @returns The current EditorConfig
 *
 * @example
 * ```tsx
 * const config = useEditorConfig();
 * console.log(config.documentEditor); // 'lexical'
 * ```
 */
export const useEditorConfig = (): EditorConfig => {
  const config = useContext(EditorConfigContext);
  if (!config) {
    throw new Error("useEditorConfig must be used within an EditorProvider");
  }
  return config;
};

/**
 * Hook to access the editor configuration with a fallback
 * Returns the default config if used outside of EditorProvider
 *
 * @returns The current EditorConfig or default config
 *
 * @example
 * ```tsx
 * const config = useEditorConfigSafe();
 * // Always returns a valid config, even outside provider
 * ```
 */
export const useEditorConfigSafe = (): EditorConfig => {
  const config = useContext(EditorConfigContext);
  return config ?? DEFAULT_EDITOR_CONFIG;
};

/**
 * Hook to get the document editor type
 * @returns The configured document editor type
 */
export const useDocumentEditorType = () => {
  const config = useEditorConfigSafe();
  return config.documentEditor;
};

/**
 * Hook to get the code editor type
 * @returns The configured code editor type
 */
export const useCodeEditorType = () => {
  const config = useEditorConfigSafe();
  return config.codeEditor;
};

/**
 * Hook to get the diagram editor type
 * @returns The configured diagram editor type
 */
export const useDiagramEditorType = () => {
  const config = useEditorConfigSafe();
  return config.diagramEditor;
};
