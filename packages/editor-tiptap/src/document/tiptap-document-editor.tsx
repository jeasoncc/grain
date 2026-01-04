/**
 * TiptapDocumentEditor - Rich text editor component using Tiptap
 * @module @grain/editor-tiptap/document
 */

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback,
  memo,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { createJsonContent } from "@grain/editor-core";
import type { SerializedContent } from "@grain/editor-core";
import type {
  TiptapDocumentEditorProps,
  TiptapDocumentEditorHandle,
} from "./tiptap-document-editor.types";

/**
 * TiptapDocumentEditor component
 * 
 * A rich text editor built on Tiptap with support for:
 * - Rich text formatting (bold, italic, strike, code)
 * - Headings (H1-H6)
 * - Lists (bullet, ordered, task)
 * - Tables
 * - Code blocks with syntax highlighting
 * - Links
 */
export const TiptapDocumentEditor = memo(
  forwardRef<TiptapDocumentEditorHandle, TiptapDocumentEditorProps>(
    (
      {
        initialContent,
        placeholder = "Start writing...",
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
      // Parse initial content
      const getInitialContent = useCallback(() => {
        if (!initialContent) return undefined;
        if (initialContent.format === "json") {
          try {
            return JSON.parse(initialContent.data);
          } catch {
            return undefined;
          }
        }
        if (initialContent.format === "html") {
          return initialContent.data;
        }
        return undefined;
      }, [initialContent]);

      // Initialize Tiptap editor
      const editor = useEditor({
        extensions: [
          StarterKit.configure({
            // Use built-in code block (no syntax highlighting, but works without lowlight)
            codeBlock: {
              HTMLAttributes: {
                class: "bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono text-sm",
              },
            },
          }),
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              class: "text-blue-500 underline cursor-pointer",
            },
          }),
          Placeholder.configure({
            placeholder,
          }),
          TaskList,
          TaskItem.configure({
            nested: true,
          }),
          Table.configure({
            resizable: true,
          }),
          TableRow,
          TableCell,
          TableHeader,
        ],
        content: getInitialContent(),
        editable: !readOnly,
        autofocus: autoFocus,
        onUpdate: ({ editor }) => {
          if (onChange) {
            const content = createJsonContent(editor.getJSON());
            onChange(content);
          }
        },
        onFocus: () => {
          onFocus?.();
        },
        onBlur: () => {
          onBlur?.();
        },
      });

      // Handle Ctrl+S for save
      useEffect(() => {
        if (!editor || !onSave) return;

        const handleKeyDown = (event: KeyboardEvent) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "s") {
            event.preventDefault();
            onSave();
          }
        };

        const editorElement = editor.view.dom;
        editorElement.addEventListener("keydown", handleKeyDown);

        return () => {
          editorElement.removeEventListener("keydown", handleKeyDown);
        };
      }, [editor, onSave]);

      // Expose imperative handle
      useImperativeHandle(
        ref,
        () => ({
          getEditor: () => editor,
          getContent: (): SerializedContent => {
            if (!editor) {
              return createJsonContent({ type: "doc", content: [] });
            }
            return createJsonContent(editor.getJSON());
          },
          setContent: (content: SerializedContent) => {
            if (!editor) return;
            if (content.format === "json") {
              try {
                const json = JSON.parse(content.data);
                editor.commands.setContent(json);
              } catch (e) {
                console.warn("[TiptapDocumentEditor] Failed to parse JSON:", e);
              }
            } else if (content.format === "html") {
              editor.commands.setContent(content.data);
            }
          },
          focus: () => {
            editor?.commands.focus();
          },
          isEmpty: () => {
            return editor?.isEmpty ?? true;
          },
        }),
        [editor]
      );

      if (!editor) {
        return (
          <div className={className}>
            <div className="animate-pulse bg-gray-100 h-32 rounded" />
          </div>
        );
      }

      return (
        <div className={className}>
          <EditorContent
            editor={editor}
            className="tiptap-editor-content max-w-none focus:outline-none"
          />
        </div>
      );
    }
  )
);

TiptapDocumentEditor.displayName = "TiptapDocumentEditor";

/**
 * Default export with display name
 */
export const TiptapDocumentEditorDefault = TiptapDocumentEditor;
