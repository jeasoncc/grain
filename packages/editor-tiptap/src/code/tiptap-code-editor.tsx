/**
 * TiptapCodeEditor - Code editor component using Tiptap
 * @module @grain/editor-tiptap/code
 */

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
  memo,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import type { SupportedLanguage } from "@grain/editor-core";
import type {
  TiptapCodeEditorProps,
  TiptapCodeEditorHandle,
} from "./tiptap-code-editor.types";

/**
 * TiptapCodeEditor component
 * 
 * A code editor built on Tiptap with syntax highlighting via lowlight.
 * Note: For full-featured code editing, consider using Monaco or CodeMirror.
 */
export const TiptapCodeEditor = memo(
  forwardRef<TiptapCodeEditorHandle, TiptapCodeEditorProps>(
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
      const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(language);

      // Initialize Tiptap editor with code-only extensions
      const editor = useEditor({
        extensions: [
          Document,
          Text,
          CodeBlockLowlight.configure({
            defaultLanguage: currentLanguage,
          }),
          Placeholder.configure({
            placeholder,
          }),
        ],
        content: initialContent
          ? {
              type: "doc",
              content: [
                {
                  type: "codeBlock",
                  attrs: { language: currentLanguage },
                  content: [{ type: "text", text: initialContent }],
                },
              ],
            }
          : undefined,
        editable: !readOnly,
        autofocus: autoFocus,
        onUpdate: ({ editor }) => {
          if (onChange) {
            onChange(editor.getText());
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

      // Update language when prop changes
      useEffect(() => {
        if (language !== currentLanguage) {
          setCurrentLanguage(language);
          editor?.commands.updateAttributes("codeBlock", { language });
        }
      }, [language, currentLanguage, editor]);

      // Expose imperative handle
      useImperativeHandle(
        ref,
        () => ({
          getEditor: () => editor,
          getContent: () => editor?.getText() ?? "",
          setContent: (content: string) => {
            editor?.commands.setContent({
              type: "doc",
              content: [
                {
                  type: "codeBlock",
                  attrs: { language: currentLanguage },
                  content: [{ type: "text", text: content }],
                },
              ],
            });
          },
          focus: () => {
            editor?.commands.focus();
          },
          getLanguage: () => currentLanguage,
          setLanguage: (lang: SupportedLanguage) => {
            setCurrentLanguage(lang);
            editor?.commands.updateAttributes("codeBlock", { language: lang });
          },
        }),
        [editor, currentLanguage]
      );

      if (!editor) {
        return (
          <div className={className}>
            <div className="animate-pulse bg-gray-100 h-32 rounded font-mono" />
          </div>
        );
      }

      return (
        <div className={className}>
          <EditorContent
            editor={editor}
            className="font-mono text-sm focus:outline-none"
          />
        </div>
      );
    }
  )
);

TiptapCodeEditor.displayName = "TiptapCodeEditor";

/**
 * Default export with display name
 */
export const TiptapCodeEditorDefault = TiptapCodeEditor;
