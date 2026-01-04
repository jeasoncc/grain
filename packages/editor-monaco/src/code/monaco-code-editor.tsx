/**
 * MonacoCodeEditor - Code editor component based on Monaco Editor
 * @module @grain/editor-monaco/code
 */

import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import type {
  EditorThemeColors,
  MonacoCodeEditorHandle,
  MonacoCodeEditorProps,
  MonacoLanguage,
} from "./monaco-code-editor.types";

// ==============================
// Theme Registration
// ==============================

const CUSTOM_THEME_LIGHT = "grain-custom-light";
const CUSTOM_THEME_DARK = "grain-custom-dark";

let themesRegistered = false;

/**
 * Create Monaco theme definition from theme colors
 */
const createMonacoTheme = (
  baseTheme: "vs" | "vs-dark",
  colors: EditorThemeColors
): editor.IStandaloneThemeData => {
  const rules: editor.ITokenThemeRule[] = [];
  const themeColors: Record<string, string> = {};

  if (colors.background) {
    themeColors["editor.background"] = colors.background;
  }
  if (colors.foreground) {
    themeColors["editor.foreground"] = colors.foreground;
  }
  if (colors.selection) {
    themeColors["editor.selectionBackground"] = colors.selection;
    themeColors["editor.inactiveSelectionBackground"] = `${colors.selection}80`;
  }
  if (colors.lineHighlight) {
    themeColors["editor.lineHighlightBackground"] = colors.lineHighlight;
  }
  if (colors.cursor) {
    themeColors["editorCursor.foreground"] = colors.cursor;
  }
  if (colors.lineNumber) {
    themeColors["editorLineNumber.foreground"] = colors.lineNumber;
  }
  if (colors.lineNumberActive) {
    themeColors["editorLineNumber.activeForeground"] = colors.lineNumberActive;
  }

  return {
    base: baseTheme,
    inherit: true,
    rules,
    colors: themeColors,
  };
};

/**
 * Register custom themes to Monaco
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

// ==============================
// Main Component
// ==============================

/**
 * MonacoCodeEditor - Code editor based on Monaco Editor
 */
const MonacoCodeEditorInner = forwardRef<MonacoCodeEditorHandle, MonacoCodeEditorProps>(
  function MonacoCodeEditor(
    {
      code,
      language,
      theme,
      themeColors,
      onCodeChange,
      onSave,
      readOnly = false,
      className,
      options,
    },
    ref
  ) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
    const languageRef = useRef<MonacoLanguage>(language);

    /**
     * Editor mount callback
     */
    const handleEditorMount: OnMount = useCallback(
      (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Register custom themes
        if (themeColors) {
          registerCustomThemes(monaco, themeColors);
          const customTheme = theme === "dark" ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT;
          monaco.editor.setTheme(customTheme);
        }

        // Register Ctrl+S shortcut
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          onSave();
        });

        // Focus editor
        editor.focus();
      },
      [onSave, theme, themeColors]
    );

    /**
     * Update theme when colors change
     */
    useEffect(() => {
      if (monacoRef.current && themeColors && themesRegistered) {
        registerCustomThemes(monacoRef.current, themeColors);
        const customTheme = theme === "dark" ? CUSTOM_THEME_DARK : CUSTOM_THEME_LIGHT;
        monacoRef.current.editor.setTheme(customTheme);
      }
    }, [theme, themeColors]);

    /**
     * Code change callback
     */
    const handleChange = useCallback(
      (value: string | undefined) => {
        if (value !== undefined) {
          onCodeChange(value);
        }
      },
      [onCodeChange]
    );

    /**
     * Expose imperative handle
     */
    useImperativeHandle(
      ref,
      () => ({
        getContent: () => editorRef.current?.getValue() ?? "",
        setContent: (content: string) => {
          editorRef.current?.setValue(content);
        },
        getLanguage: () => languageRef.current,
        setLanguage: (lang: MonacoLanguage) => {
          languageRef.current = lang;
          if (editorRef.current && monacoRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
              monacoRef.current.editor.setModelLanguage(model, lang);
            }
          }
        },
        formatCode: async () => {
          if (editorRef.current) {
            await editorRef.current.getAction("editor.action.formatDocument")?.run();
          }
        },
        getSelectedText: () => {
          const selection = editorRef.current?.getSelection();
          if (selection && editorRef.current) {
            return editorRef.current.getModel()?.getValueInRange(selection) ?? "";
          }
          return "";
        },
        replaceSelection: (text: string) => {
          const selection = editorRef.current?.getSelection();
          if (selection && editorRef.current) {
            editorRef.current.executeEdits("", [
              {
                range: selection,
                text,
                forceMoveMarkers: true,
              },
            ]);
          }
        },
        focus: () => {
          editorRef.current?.focus();
        },
        blur: () => {
          // Monaco doesn't have a blur method, remove focus by focusing elsewhere
          (document.activeElement as HTMLElement)?.blur?.();
        },
      }),
      []
    );

    // Determine theme to use
    const monacoTheme =
      themeColors && themesRegistered
        ? theme === "dark"
          ? CUSTOM_THEME_DARK
          : CUSTOM_THEME_LIGHT
        : theme === "dark"
          ? "vs-dark"
          : "light";

    // Default editor options
    const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: "on",
      wordWrap: "on",
      automaticLayout: true,
      scrollBeyondLastLine: false,
      readOnly,
      tabSize: 2,
      insertSpaces: false,
      renderWhitespace: "selection",
      bracketPairColorization: { enabled: true },
      inlayHints: { enabled: "off" },
      stickyScroll: { enabled: false },
      codeLens: false,
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      parameterHints: { enabled: false },
      ...options,
    };

    return (
      <div className={className} style={{ height: "100%", width: "100%" }}>
        <Editor
          height="100%"
          language={language}
          value={code}
          theme={monacoTheme}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={defaultOptions}
          loading={<div>Loading editor...</div>}
        />
      </div>
    );
  }
);

export const MonacoCodeEditor = memo(MonacoCodeEditorInner);
export default MonacoCodeEditor;
