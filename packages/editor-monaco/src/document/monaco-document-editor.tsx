/**
 * MonacoDocumentEditor - Markdown editor with live preview
 * @module @grain/editor-monaco/document
 */

import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

import type { EditorThemeColors } from "../code/monaco-code-editor.types";
import type {
  MonacoDocumentEditorHandle,
  MonacoDocumentEditorProps,
  PreviewPosition,
} from "./monaco-document-editor.types";

// Theme constants
const CUSTOM_THEME_LIGHT = "grain-doc-light";
const CUSTOM_THEME_DARK = "grain-doc-dark";

let themesRegistered = false;

/**
 * Create Monaco theme definition
 */
const createMonacoTheme = (
  baseTheme: "vs" | "vs-dark",
  colors: EditorThemeColors
): editor.IStandaloneThemeData => {
  const themeColors: Record<string, string> = {};

  if (colors.background) themeColors["editor.background"] = colors.background;
  if (colors.foreground) themeColors["editor.foreground"] = colors.foreground;
  if (colors.selection) {
    themeColors["editor.selectionBackground"] = colors.selection;
    themeColors["editor.inactiveSelectionBackground"] = `${colors.selection}80`;
  }
  if (colors.lineHighlight) themeColors["editor.lineHighlightBackground"] = colors.lineHighlight;
  if (colors.cursor) themeColors["editorCursor.foreground"] = colors.cursor;
  if (colors.lineNumber) themeColors["editorLineNumber.foreground"] = colors.lineNumber;
  if (colors.lineNumberActive) themeColors["editorLineNumber.activeForeground"] = colors.lineNumberActive;

  return { base: baseTheme, inherit: true, rules: [], colors: themeColors };
};

/**
 * Register custom themes
 */
const registerCustomThemes = (
  monaco: typeof import("monaco-editor"),
  themeColors?: EditorThemeColors
) => {
  if (!themeColors) return;
  monaco.editor.defineTheme(CUSTOM_THEME_LIGHT, createMonacoTheme("vs", themeColors));
  monaco.editor.defineTheme(CUSTOM_THEME_DARK, createMonacoTheme("vs-dark", themeColors));
  themesRegistered = true;
};

/**
 * Simple Markdown to HTML converter
 */
const markdownToHtml = (markdown: string): string => {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/gim, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/gim, "<pre><code class=\"language-$1\">$2</code></pre>")
    // Inline code
    .replace(/`(.*?)`/gim, "<code>$1</code>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, "<a href=\"$2\">$1</a>")
    // Line breaks
    .replace(/\n/gim, "<br>");

  return html;
};

/**
 * MonacoDocumentEditor - Markdown editor with live preview
 */
const MonacoDocumentEditorInner = forwardRef<MonacoDocumentEditorHandle, MonacoDocumentEditorProps>(
  function MonacoDocumentEditor(
    {
      content,
      theme,
      themeColors,
      onChange,
      onSave,
      readOnly = false,
      showPreview: initialShowPreview = true,
      previewPosition: initialPreviewPosition = "right",
      syncScroll: initialSyncScroll = true,
      className,
      options,
    },
    ref
  ) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const [showPreview, setShowPreview] = useState(initialShowPreview);
    const [previewPosition, setPreviewPosition] = useState<PreviewPosition>(initialPreviewPosition);
    const [syncScroll, setSyncScroll] = useState(initialSyncScroll);
    const [previewHtml, setPreviewHtml] = useState(() => markdownToHtml(content));

    // Update preview when content changes
    useEffect(() => {
      setPreviewHtml(markdownToHtml(content));
    }, [content]);

    const handleEditorMount: OnMount = useCallback(
      (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        if (themeColors) {
          registerCustomThemes(monaco, themeColors);
          const customTheme = theme === "dark" ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT;
          monaco.editor.setTheme(customTheme);
        }

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          onSave();
        });

        // Sync scroll
        if (syncScroll) {
          editor.onDidScrollChange((e) => {
            if (previewRef.current && e.scrollTop !== undefined) {
              const scrollRatio = e.scrollTop / (editor.getScrollHeight() - editor.getLayoutInfo().height);
              const previewScrollHeight = previewRef.current.scrollHeight - previewRef.current.clientHeight;
              previewRef.current.scrollTop = scrollRatio * previewScrollHeight;
            }
          });
        }

        editor.focus();
      },
      [onSave, theme, themeColors, syncScroll]
    );

    useEffect(() => {
      if (monacoRef.current && themeColors && themesRegistered) {
        registerCustomThemes(monacoRef.current, themeColors);
        const customTheme = theme === "dark" ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT;
        monacoRef.current.editor.setTheme(customTheme);
      }
    }, [theme, themeColors]);

    const handleChange = useCallback(
      (value: string | undefined) => {
        if (value !== undefined) {
          onChange(value);
        }
      },
      [onChange]
    );

    useImperativeHandle(
      ref,
      () => ({
        getContent: () => editorRef.current?.getValue() ?? "",
        setContent: (newContent: string) => {
          editorRef.current?.setValue(newContent);
        },
        togglePreview: () => setShowPreview((prev) => !prev),
        isPreviewVisible: () => showPreview,
        setPreviewPosition: (position: PreviewPosition) => setPreviewPosition(position),
        enableSyncScroll: (enabled: boolean) => setSyncScroll(enabled),
        focus: () => editorRef.current?.focus(),
        blur: () => (document.activeElement as HTMLElement)?.blur?.(),
      }),
      [showPreview]
    );

    const monacoTheme =
      themeColors && themesRegistered
        ? theme === "dark" ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT
        : theme === "dark" ? "vs-dark" : "light";

    const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: "on",
      wordWrap: "on",
      automaticLayout: true,
      scrollBeyondLastLine: false,
      readOnly,
      tabSize: 2,
      ...options,
    };

    const isHorizontal = previewPosition === "right";

    return (
      <div
        className={className}
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: isHorizontal ? "row" : "column",
        }}
      >
        {/* Editor Panel */}
        <div style={{ flex: showPreview ? 1 : "1 1 100%", minWidth: 0, minHeight: 0 }}>
          <Editor
            height="100%"
            language="markdown"
            value={content}
            theme={monacoTheme}
            onChange={handleChange}
            onMount={handleEditorMount}
            options={defaultOptions}
            loading={<div>Loading editor...</div>}
          />
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div
            ref={previewRef}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              overflow: "auto",
              padding: "1rem",
              borderLeft: isHorizontal ? "1px solid var(--border)" : undefined,
              borderTop: !isHorizontal ? "1px solid var(--border)" : undefined,
              backgroundColor: "var(--background)",
            }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown preview
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}
      </div>
    );
  }
);

export const MonacoDocumentEditor = memo(MonacoDocumentEditorInner);
export default MonacoDocumentEditor;
