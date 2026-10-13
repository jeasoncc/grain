/**
 * TiptapDocumentEditor - Rich text editor component using Tiptap
 * @module @grain/editor-tiptap/document
 * 
 * 包含所有稳定的 Tiptap 官方扩展
 */

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback,
  memo,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";

// Core extensions - StarterKit includes most basic extensions
import { StarterKit } from "@tiptap/starter-kit";

// Text formatting extensions
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";

// Link and media extensions
import { Image } from "@tiptap/extension-image";
import { Youtube } from "@tiptap/extension-youtube";

// List extensions
import { TaskList, TaskItem } from "@tiptap/extension-list";

// Table extensions
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";

// Utility extensions
import { Placeholder, CharacterCount } from "@tiptap/extensions";

import { createJsonContent } from "@grain/editor-core";
import type { SerializedContent } from "@grain/editor-core";
import type {
  TiptapDocumentEditorProps,
  TiptapDocumentEditorHandle,
} from "./tiptap-document-editor.types";

/**
 * TiptapDocumentEditor component
 * 
 * 已安装的扩展：
 * 
 * 【文本格式化】
 * - Bold, Italic, Strike, Code (StarterKit)
 * - Underline - 下划线
 * - Subscript - 下标
 * - Superscript - 上标
 * - TextStyle + Color - 文字颜色
 * - Highlight - 高亮/背景色
 * - TextAlign - 文本对齐
 * - FontFamily - 字体
 * - Typography - 智能排版（引号、破折号等）
 * 
 * 【结构】
 * - Heading (H1-H6)
 * - Paragraph
 * - Blockquote - 引用块
 * - HorizontalRule - 分隔线
 * - HardBreak - 换行
 * 
 * 【列表】
 * - BulletList - 无序列表
 * - OrderedList - 有序列表
 * - TaskList + TaskItem - 任务列表（复选框）
 * 
 * 【表格】
 * - Table - 表格（可调整大小）
 * - TableRow - 表格行
 * - TableCell - 表格单元格
 * - TableHeader - 表格表头
 * 
 * 【媒体】
 * - Link - 链接
 * - Image - 图片
 * - Youtube - YouTube 视频嵌入
 * 
 * 【代码】
 * - Code - 行内代码
 * - CodeBlock - 代码块
 * 
 * 【工具】
 * - Placeholder - 占位符
 * - CharacterCount - 字符计数
 * - UndoRedo - 撤销/重做
 * - Dropcursor - 拖放光标
 * - Gapcursor - 间隙光标
 * - BubbleMenu - 气泡菜单
 * - FloatingMenu - 浮动菜单
 */
export const TiptapDocumentEditor = memo(
  forwardRef<TiptapDocumentEditorHandle, TiptapDocumentEditorProps>(
    (
      {
        initialContent,
        placeholder = "Start writing...",
        readOnly = false,
        autoFocus = false,
        characterLimit,
        onChange,
        onFocus,
        onBlur,
        onSave,
        onCharacterCountChange,
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

      // Initialize Tiptap editor with all stable extensions
      const editor = useEditor({
        extensions: [
          // StarterKit includes: Document, Paragraph, Text, Bold, Italic, Strike, 
          // Code, Heading, Blockquote, BulletList, OrderedList, ListItem, HardBreak, 
          // HorizontalRule, UndoRedo, Dropcursor, Gapcursor, CodeBlock, Link, Underline
          StarterKit.configure({
            heading: {
              levels: [1, 2, 3, 4, 5, 6],
            },
            link: {
              openOnClick: false,
              autolink: true,
              linkOnPaste: true,
              HTMLAttributes: {
                class: "tiptap-link",
                rel: "noopener noreferrer",
              },
            },
            // Keep v2 document structure and list keyboard behavior.
            trailingNode: false,
            listKeymap: false,
          }),

          // Text Style (required for Color and FontFamily)
          TextStyle.configure({ mergeNestedSpanStyles: false }),

          // Text Color
          Color.configure({
            types: ["textStyle"],
          }),

          // Highlight / Background Color
          Highlight.configure({
            multicolor: true,
          }),

          // Subscript
          Subscript,

          // Superscript
          Superscript,

          // Text Alignment
          TextAlign.configure({
            types: ["heading", "paragraph"],
            alignments: ["left", "center", "right", "justify"],
          }),

          // Font Family
          FontFamily.configure({
            types: ["textStyle"],
          }),

          // Typography (smart quotes, dashes, ellipsis)
          Typography,

          // Image
          Image.configure({
            inline: false,
            allowBase64: true,
            HTMLAttributes: {
              class: "tiptap-image",
            },
          }),

          // YouTube
          Youtube.configure({
            inline: false,
            nocookie: true,
            HTMLAttributes: {
              class: "tiptap-youtube",
            },
          }),

          // Task List
          TaskList.configure({
            HTMLAttributes: {
              class: "tiptap-task-list",
            },
          }),
          TaskItem.configure({
            nested: true,
            HTMLAttributes: {
              class: "tiptap-task-item",
            },
          }),

          // Table
          Table.configure({
            resizable: true,
            HTMLAttributes: {
              class: "tiptap-table",
            },
          }),
          TableRow,
          TableCell,
          TableHeader,

          // Placeholder
          Placeholder.configure({
            placeholder,
            emptyEditorClass: "is-editor-empty",
            emptyNodeClass: "is-empty",
          }),

          // Character Count
          CharacterCount.configure({
            limit: characterLimit,
          }),
        ],
        content: getInitialContent(),
        editable: !readOnly,
        autofocus: autoFocus,
        shouldRerenderOnTransaction: true,
        onUpdate: ({ editor }) => {
          if (onChange) {
            const content = createJsonContent(editor.getJSON());
            onChange(content);
          }
          if (onCharacterCountChange) {
            const count = editor.storage.characterCount;
            onCharacterCountChange({
              characters: count.characters(),
              words: count.words(),
            });
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
                editor.commands.setContent(json, { emitUpdate: false });
              } catch (e) {
                console.warn("[TiptapDocumentEditor] Failed to parse JSON:", e);
              }
            } else if (content.format === "html") {
              editor.commands.setContent(content.data, { emitUpdate: false });
            }
          },
          focus: () => {
            editor?.commands.focus();
          },
          isEmpty: () => {
            return editor?.isEmpty ?? true;
          },
          getCharacterCount: () => {
            if (!editor) return { characters: 0, words: 0 };
            const count = editor.storage.characterCount;
            return {
              characters: count.characters(),
              words: count.words(),
            };
          },
          // Text formatting commands
          toggleBold: () => editor?.chain().focus().toggleBold().run(),
          toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
          toggleStrike: () => editor?.chain().focus().toggleStrike().run(),
          toggleUnderline: () => editor?.chain().focus().toggleUnderline().run(),
          toggleSubscript: () => editor?.chain().focus().toggleSubscript().run(),
          toggleSuperscript: () => editor?.chain().focus().toggleSuperscript().run(),
          toggleCode: () => editor?.chain().focus().toggleCode().run(),
          toggleCodeBlock: () => editor?.chain().focus().toggleCodeBlock().run(),
          toggleBlockquote: () => editor?.chain().focus().toggleBlockquote().run(),
          // Heading commands
          setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => 
            editor?.chain().focus().toggleHeading({ level }).run(),
          setParagraph: () => editor?.chain().focus().setParagraph().run(),
          // List commands
          toggleBulletList: () => editor?.chain().focus().toggleBulletList().run(),
          toggleOrderedList: () => editor?.chain().focus().toggleOrderedList().run(),
          toggleTaskList: () => editor?.chain().focus().toggleTaskList().run(),
          // Alignment commands
          setTextAlign: (align: "left" | "center" | "right" | "justify") =>
            editor?.chain().focus().setTextAlign(align).run(),
          // Color commands
          setColor: (color: string) => editor?.chain().focus().setColor(color).run(),
          unsetColor: () => editor?.chain().focus().unsetColor().run(),
          setHighlight: (color: string) => 
            editor?.chain().focus().toggleHighlight({ color }).run(),
          unsetHighlight: () => editor?.chain().focus().unsetHighlight().run(),
          // Font commands
          setFontFamily: (fontFamily: string) =>
            editor?.chain().focus().setFontFamily(fontFamily).run(),
          unsetFontFamily: () => editor?.chain().focus().unsetFontFamily().run(),
          // Link commands
          setLink: (url: string) => 
            editor?.chain().focus().setLink({ href: url }).run(),
          unsetLink: () => editor?.chain().focus().unsetLink().run(),
          // Image commands
          insertImage: (src: string, alt?: string, title?: string) =>
            editor?.chain().focus().setImage({ src, alt, title }).run(),
          // YouTube commands
          insertYoutube: (src: string) =>
            editor?.chain().focus().setYoutubeVideo({ src }).run(),
          // Table commands
          insertTable: (rows = 3, cols = 3) =>
            editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(),
          addColumnBefore: () => editor?.chain().focus().addColumnBefore().run(),
          addColumnAfter: () => editor?.chain().focus().addColumnAfter().run(),
          deleteColumn: () => editor?.chain().focus().deleteColumn().run(),
          addRowBefore: () => editor?.chain().focus().addRowBefore().run(),
          addRowAfter: () => editor?.chain().focus().addRowAfter().run(),
          deleteRow: () => editor?.chain().focus().deleteRow().run(),
          deleteTable: () => editor?.chain().focus().deleteTable().run(),
          mergeCells: () => editor?.chain().focus().mergeCells().run(),
          splitCell: () => editor?.chain().focus().splitCell().run(),
          toggleHeaderRow: () => editor?.chain().focus().toggleHeaderRow().run(),
          toggleHeaderColumn: () => editor?.chain().focus().toggleHeaderColumn().run(),
          toggleHeaderCell: () => editor?.chain().focus().toggleHeaderCell().run(),
          // History commands
          undo: () => editor?.chain().focus().undo().run(),
          redo: () => editor?.chain().focus().redo().run(),
          // Horizontal rule
          insertHorizontalRule: () => editor?.chain().focus().setHorizontalRule().run(),
          // Hard break
          insertHardBreak: () => editor?.chain().focus().setHardBreak().run(),
          // Clear formatting
          clearFormatting: () => editor?.chain().focus().clearNodes().unsetAllMarks().run(),
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
          {/* Bubble Menu - appears when text is selected */}
          <BubbleMenu 
            editor={editor} 
            className="tiptap-bubble-menu"
          >
            <div className="flex gap-1 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`px-2 py-1 rounded text-sm font-bold ${editor.isActive("bold") ? "bg-gray-200 dark:bg-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`px-2 py-1 rounded text-sm italic ${editor.isActive("italic") ? "bg-gray-200 dark:bg-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                I
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`px-2 py-1 rounded text-sm underline ${editor.isActive("underline") ? "bg-gray-200 dark:bg-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                U
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`px-2 py-1 rounded text-sm line-through ${editor.isActive("strike") ? "bg-gray-200 dark:bg-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                S
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`px-2 py-1 rounded text-sm font-mono ${editor.isActive("code") ? "bg-gray-200 dark:bg-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                {"</>"}
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`px-2 py-1 rounded text-sm ${editor.isActive("highlight") ? "bg-yellow-200 dark:bg-yellow-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                H
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = window.prompt("Enter URL:");
                  if (url) {
                    editor.chain().focus().setLink({ href: url }).run();
                  }
                }}
                className={`px-2 py-1 rounded text-sm ${editor.isActive("link") ? "bg-blue-200 dark:bg-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                🔗
              </button>
            </div>
          </BubbleMenu>

          {/* Floating Menu - appears on empty lines */}
          <FloatingMenu 
            editor={editor} 
            className="tiptap-floating-menu"
          >
            <div className="flex gap-1 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Heading 3"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Bullet List"
              >
                •
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Numbered List"
              >
                1.
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Task List"
              >
                ☐
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Code Block"
              >
                {"</>"}
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Blockquote"
              >
                "
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Insert Table"
              >
                ⊞
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className="px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Horizontal Rule"
              >
                ―
              </button>
            </div>
          </FloatingMenu>

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

export const TiptapDocumentEditorDefault = TiptapDocumentEditor;
