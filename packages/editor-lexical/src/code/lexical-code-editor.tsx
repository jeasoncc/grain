/**
 * LexicalCodeEditor - Code editing component using Lexical
 * Uses @lexical/code for syntax highlighting
 * @module @grain/editor-lexical/code
 */

import type React from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import type { EditorState } from "lexical";

import type { SupportedLanguage } from "@grain/editor-core";

import CodeHighlightPlugin from "../plugins/code-highlight-plugin";
import PrismLanguagesPlugin from "../plugins/prism-languages-plugin";

/**
 * Props for LexicalCodeEditor component
 */
export interface LexicalCodeEditorProps {
  /** Initial code content */
  initialContent?: string;
  /** Language for syntax highlighting */
  language?: SupportedLanguage;
  /** Content change callback */
  onChange?: (content: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Editor namespace */
  namespace?: string;
}

/**
 * Ref handle for LexicalCodeEditor
 */
export interface LexicalCodeEditorHandle {
  /** Get current content */
  getContent: () => string;
  /** Set content */
  setContent: (content: string) => void;
  /** Get current language */
  getLanguage: () => SupportedLanguage;
  /** Set language */
  setLanguage: (language: SupportedLanguage) => void;
  /** Focus the editor */
  focus: () => void;
  /** Blur the editor */
  blur: () => void;
}

/**
 * Error handler for Lexical
 */
function onError(error: Error): void {
  console.error("[LexicalCodeEditor Error]", error);
}

/**
 * Theme for code editor
 */
const codeEditorTheme = {
  code: "font-mono text-sm bg-muted p-4 rounded-md overflow-auto",
  codeHighlight: {
    atrule: "text-purple-500",
    attr: "text-yellow-500",
    boolean: "text-orange-500",
    builtin: "text-cyan-500",
    cdata: "text-gray-500",
    char: "text-green-500",
    class: "text-yellow-500",
    "class-name": "text-yellow-500",
    comment: "text-gray-500 italic",
    constant: "text-orange-500",
    deleted: "text-red-500",
    doctype: "text-gray-500",
    entity: "text-red-500",
    function: "text-blue-500",
    important: "text-orange-500 font-bold",
    inserted: "text-green-500",
    keyword: "text-purple-500",
    namespace: "text-gray-500",
    number: "text-orange-500",
    operator: "text-gray-700",
    prolog: "text-gray-500",
    property: "text-blue-500",
    punctuation: "text-gray-500",
    regex: "text-red-500",
    selector: "text-green-500",
    string: "text-green-500",
    symbol: "text-orange-500",
    tag: "text-red-500",
    url: "text-cyan-500",
    variable: "text-orange-500",
  },
};

/**
 * LexicalCodeEditor component
 * 
 * A code editor built on Lexical with syntax highlighting via Prism.
 * Note: For full-featured code editing, consider using Monaco or CodeMirror.
 */
const LexicalCodeEditor = forwardRef<LexicalCodeEditorHandle, LexicalCodeEditorProps>(
  function LexicalCodeEditor(
    {
      initialContent = "",
      language = "plaintext",
      onChange,
      placeholder = "Enter code...",
      readOnly = false,
      namespace = "LexicalCodeEditor",
    },
    ref
  ): React.ReactElement {
    const latestContentRef = useRef<string>(initialContent);
    const languageRef = useRef<SupportedLanguage>(language);

    const handleChange = useCallback(
      (editorState: EditorState) => {
        editorState.read(() => {
          const { $getRoot } = require("lexical");
          const root = $getRoot();
          const content = root.getTextContent();
          latestContentRef.current = content;
          onChange?.(content);
        });
      },
      [onChange]
    );

    useImperativeHandle(
      ref,
      () => ({
        getContent: () => latestContentRef.current,
        setContent: (content: string) => {
          latestContentRef.current = content;
          console.warn("[LexicalCodeEditor] setContent requires editor remount");
        },
        getLanguage: () => languageRef.current,
        setLanguage: (lang: SupportedLanguage) => {
          languageRef.current = lang;
        },
        focus: () => {
          // Would need editor ref
        },
        blur: () => {
          // Would need editor ref
        },
      }),
      []
    );

    const initialConfig = {
      namespace,
      theme: codeEditorTheme,
      nodes: [CodeNode, CodeHighlightNode],
      editable: !readOnly,
      onError,
      editorState: initialContent
        ? () => {
            const { $getRoot, $createTextNode } = require("lexical");
            const root = $getRoot();
            const textNode = $createTextNode(initialContent);
            root.append(textNode);
          }
        : undefined,
    };

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative flex flex-col h-full font-mono">
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-full outline-none p-4 text-sm leading-relaxed font-mono bg-muted"
                style={{ caretColor: "var(--primary)" }}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
            placeholder={
              <div
                className="text-muted-foreground/50 pointer-events-none select-none text-sm font-mono"
                style={{
                  position: "absolute",
                  top: "1rem",
                  left: "1rem",
                }}
              >
                {placeholder}
              </div>
            }
          />
          <HistoryPlugin />
          {onChange && <OnChangePlugin onChange={handleChange} ignoreSelectionChange />}
          <CodeHighlightPlugin />
          <PrismLanguagesPlugin />
        </div>
      </LexicalComposer>
    );
  }
);

export default LexicalCodeEditor;
