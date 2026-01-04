/**
 * CodeMirrorDocumentEditor - Markdown editor component using CodeMirror
 * @module @grain/editor-codemirror/document
 */

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { createMarkdownContent } from "@grain/editor-core";
import type { SerializedContent } from "@grain/editor-core";
import type {
  CodeMirrorDocumentEditorProps,
  CodeMirrorDocumentEditorHandle,
} from "./codemirror-document-editor.types";

/**
 * CodeMirrorDocumentEditor component
 * 
 * A Markdown editor built on CodeMirror with optional live preview.
 */
export const CodeMirrorDocumentEditor = memo(
  forwardRef<CodeMirrorDocumentEditorHandle, CodeMirrorDocumentEditorProps>(
    (
      {
        initialContent,
        placeholder = "Start writing...",
        readOnly = false,
        autoFocus = false,
        showPreview = true,
        previewPosition = "right",
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
      const [previewVisible, setPreviewVisible] = useState(showPreview);
      const [previewHtml, setPreviewHtml] = useState("");

      // Parse initial content
      const getInitialDoc = useCallback(() => {
        if (!initialContent) return "";
        if (initialContent.format === "markdown") {
          return initialContent.data;
        }
        return "";
      }, [initialContent]);

      // Render markdown to HTML (simple implementation)
      const renderMarkdown = useCallback((markdown: string) => {
        // Simple markdown to HTML conversion
        // In production, use a proper markdown parser like marked or remark
        let html = markdown
          .replace(/^### (.*$)/gim, "<h3>$1</h3>")
          .replace(/^## (.*$)/gim, "<h2>$1</h2>")
          .replace(/^# (.*$)/gim, "<h1>$1</h1>")
          .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
          .replace(/\*(.*)\*/gim, "<em>$1</em>")
          .replace(/~~(.*)~~/gim, "<del>$1</del>")
          .replace(/`([^`]+)`/gim, "<code>$1</code>")
          .replace(/\n/gim, "<br>");
        setPreviewHtml(html);
      }, []);

      // Initialize CodeMirror
      useEffect(() => {
        if (!containerRef.current) return;

        const updateListener = EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            onChange?.(createMarkdownContent(content));
            if (previewVisible) {
              renderMarkdown(content);
            }
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
          doc: getInitialDoc(),
          extensions: [
            markdown(),
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

        // Initial preview render
        if (previewVisible) {
          renderMarkdown(getInitialDoc());
        }

        return () => {
          view.destroy();
          viewRef.current = null;
        };
      }, []);

      // Update preview when visibility changes
      useEffect(() => {
        if (previewVisible && viewRef.current) {
          renderMarkdown(viewRef.current.state.doc.toString());
        }
      }, [previewVisible, renderMarkdown]);

      // Expose imperative handle
      useImperativeHandle(
        ref,
        () => ({
          getView: () => viewRef.current,
          getContent: (): SerializedContent => {
            if (!viewRef.current) {
              return createMarkdownContent("");
            }
            return createMarkdownContent(viewRef.current.state.doc.toString());
          },
          setContent: (content: SerializedContent) => {
            if (!viewRef.current) return;
            if (content.format === "markdown") {
              viewRef.current.dispatch({
                changes: {
                  from: 0,
                  to: viewRef.current.state.doc.length,
                  insert: content.data,
                },
              });
            }
          },
          focus: () => {
            viewRef.current?.focus();
          },
          isEmpty: () => {
            return viewRef.current?.state.doc.length === 0;
          },
          togglePreview: () => {
            setPreviewVisible((prev) => !prev);
          },
          isPreviewVisible: () => previewVisible,
        }),
        [previewVisible]
      );

      const isHorizontal = previewPosition === "right";

      return (
        <div
          className={`flex ${isHorizontal ? "flex-row" : "flex-col"} gap-4 h-full ${className ?? ""}`}
        >
          {/* Editor */}
          <div
            ref={containerRef}
            className={`${previewVisible ? "flex-1" : "w-full"} border rounded overflow-auto`}
          />

          {/* Preview */}
          {previewVisible && (
            <div className="flex-1 border rounded overflow-auto p-4">
              <div className="prose prose-sm max-w-none">
                {previewHtml ? (
                  <div
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown preview
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <p className="text-gray-400">Preview will appear here...</p>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
  )
);

CodeMirrorDocumentEditor.displayName = "CodeMirrorDocumentEditor";

/**
 * Default export with display name
 */
export const CodeMirrorDocumentEditorDefault = CodeMirrorDocumentEditor;
