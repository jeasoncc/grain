/**
 * CodeMirrorCodeEditor - Code editor component using CodeMirror
 * @module @grain/editor-codemirror/code
 */

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  useState,
  memo,
} from "react";
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { sql } from "@codemirror/lang-sql";
import { markdown } from "@codemirror/lang-markdown";
import type { Extension } from "@codemirror/state";
import type { SupportedLanguage } from "@grain/editor-core";
import type {
  CodeMirrorCodeEditorProps,
  CodeMirrorCodeEditorHandle,
} from "./codemirror-code-editor.types";

/**
 * Get CodeMirror language extension for a given language
 */
const getLanguageExtension = (language: SupportedLanguage): Extension => {
  switch (language) {
    case "javascript":
      return javascript();
    case "typescript":
      return javascript({ typescript: true });
    case "python":
      return python();
    case "rust":
      return rust();
    case "json":
      return json();
    case "html":
      return html();
    case "css":
    case "scss":
      return css();
    case "sql":
      return sql();
    case "markdown":
      return markdown();
    default:
      return [];
  }
};

/**
 * CodeMirrorCodeEditor component
 * 
 * A code editor built on CodeMirror with syntax highlighting.
 */
export const CodeMirrorCodeEditor = memo(
  forwardRef<CodeMirrorCodeEditorHandle, CodeMirrorCodeEditorProps>(
    (
      {
        initialContent = "",
        language = "plaintext",
        placeholder = "Enter code...",
        readOnly = false,
        autoFocus = false,
        onChange,
        onFocus,
        onBlur,
        onSave,
        className,
      },
      ref
    ) => {
      const containerRef = useRef<HTMLDivElement>(null);
      const viewRef = useRef<EditorView | null>(null);
      const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(language);

      // Initialize CodeMirror
      useEffect(() => {
        if (!containerRef.current) return;

        const updateListener = EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange?.(update.state.doc.toString());
          }
        });

        const focusListener = EditorView.focusChangeEffect.of((_state, focusing) => {
          if (focusing) {
            onFocus?.();
          } else {
            onBlur?.();
          }
          return null;
        });

        const saveKeymap = keymap.of([
          {
            key: "Mod-s",
            run: () => {
              onSave?.();
              return true;
            },
          },
        ]);

        const state = EditorState.create({
          doc: initialContent,
          extensions: [
            getLanguageExtension(currentLanguage),
            history(),
            keymap.of([...defaultKeymap, ...historyKeymap]),
            saveKeymap,
            updateListener,
            focusListener,
            placeholderExt(placeholder),
            EditorView.editable.of(!readOnly),
            EditorView.lineWrapping,
          ],
        });

        const view = new EditorView({
          state,
          parent: containerRef.current,
        });

        viewRef.current = view;

        if (autoFocus) {
          view.focus();
        }

        return () => {
          view.destroy();
          viewRef.current = null;
        };
      }, [currentLanguage]);

      // Expose imperative handle
      useImperativeHandle(
        ref,
        () => ({
          getView: () => viewRef.current,
          getContent: () => viewRef.current?.state.doc.toString() ?? "",
          setContent: (content: string) => {
            viewRef.current?.dispatch({
              changes: {
                from: 0,
                to: viewRef.current.state.doc.length,
                insert: content,
              },
            });
          },
          focus: () => {
            viewRef.current?.focus();
          },
          getLanguage: () => currentLanguage,
          setLanguage: (lang: SupportedLanguage) => {
            setCurrentLanguage(lang);
          },
        }),
        [currentLanguage]
      );

      return (
        <div
          ref={containerRef}
          className={`font-mono text-sm border rounded overflow-auto ${className ?? ""}`}
        />
      );
    }
  )
);

CodeMirrorCodeEditor.displayName = "CodeMirrorCodeEditor";

/**
 * Default export with display name
 */
export const CodeMirrorCodeEditorDefault = CodeMirrorCodeEditor;
