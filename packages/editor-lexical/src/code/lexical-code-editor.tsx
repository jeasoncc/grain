/**
 * LexicalCodeEditor - Code editing component using Lexical
 * Uses @lexical/code-prism for syntax highlighting
 * @module @grain/editor-lexical/code
 */

import type React from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { CodePrismExtension } from "@lexical/code-prism";
import { $createTextNode, $getRoot, defineExtension, type EditorState, type LexicalEditor } from "lexical";

import type { SupportedLanguage } from "@grain/editor-core";

import EditorLifecyclePlugin from "../components/EditorLifecyclePlugin";
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
    const editorRef = useRef<LexicalEditor | null>(null);

    const handleChange = useCallback(
      (editorState: EditorState) => {
        editorState.read(() => {
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
          editorRef.current?.update(() => {
            const root = $getRoot();
            root.clear();
            root.append($createCodeNode(languageRef.current).append($createTextNode(content)));
          }, { discrete: true });
          latestContentRef.current = content;
        },
        getLanguage: () => languageRef.current,
        setLanguage: (lang: SupportedLanguage) => {
          editorRef.current?.update(() => {
            for (const node of $getRoot().getChildren()) {
              if ($isCodeNode(node)) node.setLanguage(lang);
            }
          }, { discrete: true });
          languageRef.current = lang;
        },
        focus: () => editorRef.current?.focus(),
        blur: () => editorRef.current?.blur(),
      }),
      []
    );

    const [extension] = useState(() => defineExtension({
      name: "@grain/editor-lexical/code",
      namespace,
      theme: codeEditorTheme,
      dependencies: [CodePrismExtension],
      editable: !readOnly,
      onError,
      $initialEditorState: () => {
        $getRoot().append($createCodeNode(language).append($createTextNode(initialContent)));
      },
    }));

    return (
      <LexicalExtensionComposer extension={extension} contentEditable={null}>
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
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
          <EditorLifecyclePlugin editorRef={editorRef} readOnly={readOnly} />
          <PrismLanguagesPlugin />
        </div>
      </LexicalExtensionComposer>
    );
  }
);

export default LexicalCodeEditor;
