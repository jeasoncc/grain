/**
 * File type resolver for mapping file extensions to editor types
 * @module @grain/editor-core/types/file-type
 */

import type { DiagramType } from "./diagram.interface";

/**
 * Editor types based on functionality
 */
export type EditorType = "document" | "code" | "diagram" | "drawing";

/**
 * File type mapping configuration
 */
export interface FileTypeMapping {
  /** File extensions (including the dot) */
  readonly extensions: readonly string[];
  /** The editor type to use */
  readonly editorType: EditorType;
  /** Default language for code editors */
  readonly defaultLanguage?: string;
  /** Diagram type for diagram editors */
  readonly diagramType?: DiagramType;
}

/**
 * File extension to editor type mappings
 * Defines which editor should be used for each file type
 */
export const FILE_TYPE_MAPPINGS: readonly FileTypeMapping[] = [
  // Document (富文本)
  { extensions: [".grain", ".note"], editorType: "document" },

  // Markdown (可用 Document 或 Code 模式)
  {
    extensions: [".md", ".mdx", ".markdown"],
    editorType: "document",
    defaultLanguage: "markdown",
  },

  // Code (代码文件)
  {
    extensions: [".js", ".jsx"],
    editorType: "code",
    defaultLanguage: "javascript",
  },
  {
    extensions: [".ts", ".tsx"],
    editorType: "code",
    defaultLanguage: "typescript",
  },
  { extensions: [".py"], editorType: "code", defaultLanguage: "python" },
  { extensions: [".rs"], editorType: "code", defaultLanguage: "rust" },
  { extensions: [".go"], editorType: "code", defaultLanguage: "go" },
  { extensions: [".java"], editorType: "code", defaultLanguage: "java" },
  { extensions: [".c", ".h"], editorType: "code", defaultLanguage: "c" },
  {
    extensions: [".cpp", ".hpp", ".cc", ".cxx"],
    editorType: "code",
    defaultLanguage: "cpp",
  },
  { extensions: [".cs"], editorType: "code", defaultLanguage: "csharp" },
  { extensions: [".rb"], editorType: "code", defaultLanguage: "ruby" },
  { extensions: [".php"], editorType: "code", defaultLanguage: "php" },
  {
    extensions: [".html", ".htm"],
    editorType: "code",
    defaultLanguage: "html",
  },
  { extensions: [".css"], editorType: "code", defaultLanguage: "css" },
  {
    extensions: [".scss", ".sass"],
    editorType: "code",
    defaultLanguage: "scss",
  },
  { extensions: [".json"], editorType: "code", defaultLanguage: "json" },
  {
    extensions: [".yaml", ".yml"],
    editorType: "code",
    defaultLanguage: "yaml",
  },
  { extensions: [".toml"], editorType: "code", defaultLanguage: "toml" },
  { extensions: [".sql"], editorType: "code", defaultLanguage: "sql" },
  {
    extensions: [".sh", ".bash", ".zsh"],
    editorType: "code",
    defaultLanguage: "shell",
  },
  { extensions: [".xml"], editorType: "code", defaultLanguage: "xml" },

  // Diagram (图表)
  {
    extensions: [".mermaid", ".mmd"],
    editorType: "diagram",
    diagramType: "mermaid",
  },
  {
    extensions: [".plantuml", ".puml", ".pu"],
    editorType: "diagram",
    diagramType: "plantuml",
  },

  // Drawing (绘图)
  { extensions: [".excalidraw"], editorType: "drawing" },
] as const;

/**
 * Resolve file type mapping from filename
 * @param filename - The filename to resolve (can include path)
 * @returns The matching FileTypeMapping, or null if no match
 */
export const resolveFileType = (filename: string): FileTypeMapping | null => {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return null;
  }

  const ext = filename.slice(lastDotIndex).toLowerCase();
  return (
    FILE_TYPE_MAPPINGS.find((mapping) => mapping.extensions.includes(ext)) ??
    null
  );
};

/**
 * Get the editor type for a filename
 * @param filename - The filename to check
 * @returns The editor type, defaults to 'document' if no match
 */
export const getEditorType = (filename: string): EditorType => {
  const mapping = resolveFileType(filename);
  return mapping?.editorType ?? "document";
};

/**
 * Get the default language for a filename (for code editors)
 * @param filename - The filename to check
 * @returns The default language, or undefined if not a code file
 */
export const getDefaultLanguage = (filename: string): string | undefined => {
  const mapping = resolveFileType(filename);
  return mapping?.defaultLanguage;
};

/**
 * Get the diagram type for a filename (for diagram editors)
 * @param filename - The filename to check
 * @returns The diagram type, or undefined if not a diagram file
 */
export const getDiagramType = (filename: string): DiagramType | undefined => {
  const mapping = resolveFileType(filename);
  return mapping?.diagramType;
};

/**
 * Check if a filename matches a specific editor type
 * @param filename - The filename to check
 * @param editorType - The editor type to match
 * @returns true if the file should use the specified editor type
 */
export const isEditorType = (
  filename: string,
  editorType: EditorType
): boolean => {
  return getEditorType(filename) === editorType;
};

/**
 * Get all supported extensions for an editor type
 * @param editorType - The editor type
 * @returns Array of extensions (including the dot)
 */
export const getExtensionsForEditorType = (
  editorType: EditorType
): readonly string[] => {
  return FILE_TYPE_MAPPINGS.filter(
    (mapping) => mapping.editorType === editorType
  ).flatMap((mapping) => mapping.extensions);
};
