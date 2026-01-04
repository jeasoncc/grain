/**
 * LexicalDocumentEditor - Wrapper component for Lexical rich text editor
 * Provides a unified interface compatible with @grain/editor-core
 * @module @grain/editor-lexical/document
 */

import type { SerializedEditorState } from "lexical";
import type React from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import type { SerializedContent } from "@grain/editor-core";
import { createJsonContent } from "@grain/editor-core";

import Editor, { type EditorProps } from "../components/Editor";

/**
 * Props for LexicalDocumentEditor component
 */
export interface LexicalDocumentEditorProps {
  /** Initial content in SerializedContent format */
  initialContent?: SerializedContent | null;
  /** Content change callback */
  onChange?: (content: SerializedContent) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Editor namespace for multiple instances */
  namespace?: string;
  /** Mention entries for @ mentions */
  mentionEntries?: EditorProps["mentionEntries"];
  /** Wiki hover preview hook */
  useWikiHoverPreview?: EditorProps["useWikiHoverPreview"];
  /** Wiki hover preview component */
  WikiHoverPreview?: EditorProps["WikiHoverPreview"];
  /** Heading fold icon style */
  foldIconStyle?: EditorProps["foldIconStyle"];
}

/**
 * Ref handle for LexicalDocumentEditor
 */
export interface LexicalDocumentEditorHandle {
  /** Get current content as SerializedContent */
  getContent: () => SerializedContent;
  /** Set content from SerializedContent */
  setContent: (content: SerializedContent) => void;
  /** Focus the editor */
  focus: () => void;
  /** Blur the editor */
  blur: () => void;
}

/**
 * Convert SerializedContent to Lexical initial state string
 */
const toInitialState = (content: SerializedContent | null | undefined): string | null => {
  if (!content) return null;
  
  if (content.format === "json") {
    return content.data;
  }
  
  // For markdown/html, we'd need conversion - for now return null
  // TODO: Implement markdown/html to Lexical conversion
  console.warn(`[LexicalDocumentEditor] Unsupported content format: ${content.format}`);
  return null;
};

/**
 * LexicalDocumentEditor component
 * 
 * A wrapper around the Lexical Editor that provides a unified interface
 * compatible with the @grain/editor-core DocumentEditorAdapter.
 */
const LexicalDocumentEditor = forwardRef<LexicalDocumentEditorHandle, LexicalDocumentEditorProps>(
  function LexicalDocumentEditor(
    {
      initialContent,
      onChange,
      placeholder,
      readOnly = false,
      namespace = "LexicalDocumentEditor",
      mentionEntries,
      useWikiHoverPreview,
      WikiHoverPreview,
      foldIconStyle,
    },
    ref
  ): React.ReactElement {
    // Store the latest content for getContent()
    const latestContentRef = useRef<SerializedContent | null>(
      initialContent ?? null
    );

    // Handle content changes from Lexical
    const handleChange = useCallback(
      (state: SerializedEditorState) => {
        const content = createJsonContent(state);
        latestContentRef.current = content;
        onChange?.(content);
      },
      [onChange]
    );

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        getContent: () => {
          return latestContentRef.current ?? createJsonContent({ root: { children: [] } });
        },
        setContent: (content: SerializedContent) => {
          latestContentRef.current = content;
          // Note: Lexical doesn't support dynamic content updates easily
          // This would require re-mounting the editor or using editor.update()
          console.warn("[LexicalDocumentEditor] setContent requires editor remount");
        },
        focus: () => {
          // Focus is handled by AutoFocusPlugin
          // For manual focus, we'd need editor ref
        },
        blur: () => {
          // Blur would need editor ref
        },
      }),
      []
    );

    const initialState = toInitialState(initialContent);

    return (
      <Editor
        initialState={initialState}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        namespace={namespace}
        mentionEntries={mentionEntries}
        useWikiHoverPreview={useWikiHoverPreview}
        WikiHoverPreview={WikiHoverPreview}
        foldIconStyle={foldIconStyle}
      />
    );
  }
);

export default LexicalDocumentEditor;
