/**
 * 核心编辑器组件 - 基于 Lexical Playground 实现
 *
 * 精简的插件配置，只包含必要的功能：
 * - RichTextPlugin - 富文本编辑
 * - HistoryPlugin - 撤销/重做 (每个编辑器实例独立的历史记录)
 * - MarkdownShortcutPlugin - Markdown 快捷键
 * - ListPlugin - 列表支持
 * - LinkPlugin - 链接支持
 * - MentionsPlugin - @提及 (自定义)
 * - MentionTooltipPlugin - 提及预览 (自定义)
 * - TagPickerPlugin - #标签 (自定义)
 *
 * 历史记录隔离说明 (Requirements 6.3):
 * - 每个 Editor 组件创建独立的 LexicalComposer 实例
 * - HistoryPlugin 在每个 LexicalComposer 上下文中创建独立的历史状态
 * - 这确保了每个编辑器标签页的 undo/redo 操作相互独立
 *
 * @see https://github.com/facebook/lexical/tree/main/packages/lexical-playground
 */

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import type { EditorState, SerializedEditorState } from "lexical";
import type React from "react";
import { useCallback, useRef, useState } from "react";

import { EditorNodes } from "../nodes";
import MentionsPlugin, { type MentionEntry } from "../plugins/mentions-plugin";
import MentionTooltipPlugin, { type MentionTooltipPluginProps } from "../plugins/mention-tooltip-plugin";
import TagPickerPlugin, { type TagInterface } from "../plugins/tag-picker-plugin";
import TagTransformPlugin from "../plugins/tag-transform-plugin";
import DraggableBlockPlugin from "../plugins/draggable-block-plugin";
import theme from "../themes/PlaygroundEditorTheme";
import "../themes/PlaygroundEditorTheme.css";

export interface EditorProps {
  /** 初始编辑器状态 (JSON 字符串) */
  initialState?: string | null;
  /** 内容变化回调 */
  onChange?: (state: SerializedEditorState) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否只读 */
  readOnly?: boolean;
  /** 编辑器命名空间 (用于区分多个编辑器实例) */
  namespace?: string;
  /** 提及条目列表 (用于 @ 提及) */
  mentionEntries?: MentionEntry[];
  /** @deprecated Use mentionEntries instead */
  wikiEntries?: MentionEntry[];
  /** 标签列表 (用于 #[ 标签选择) */
  tags?: TagInterface[];
  /** Wiki 悬浮预览 hook (可选) */
  useWikiHoverPreview?: MentionTooltipPluginProps["useWikiHoverPreview"];
  /** Wiki 悬浮预览组件 (可选) */
  WikiHoverPreview?: MentionTooltipPluginProps["WikiHoverPreview"];
}

/**
 * 编辑器错误处理函数
 */
function onError(error: Error): void {
  console.error("[Editor Error]", error);
}



/**
 * 核心编辑器组件
 */
export default function Editor({
  initialState,
  onChange,
  placeholder = "Start writing...",
  readOnly = false,
  namespace = "Editor",
  mentionEntries,
  wikiEntries,
  tags,
  useWikiHoverPreview,
  WikiHoverPreview,
}: EditorProps): React.ReactElement {
  // Support both new and deprecated prop names
  const entries = mentionEntries ?? wikiEntries;
  
  // Ref for draggable block plugin anchor element
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  
  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };
  
  // Handle editor state changes
  const handleChange = useCallback(
    (editorState: EditorState) => {
      if (onChange) {
        const serialized = editorState.toJSON();
        onChange(serialized);
      }
    },
    [onChange]
  );

  // Initial configuration
  const initialConfig = {
    namespace,
    theme,
    nodes: EditorNodes,
    editable: !readOnly,
    onError,
    editorState: initialState || undefined,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative flex flex-col h-full">
        {/* Editor body */}
        <div className="relative flex-1 overflow-auto" ref={onRef}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-full outline-none p-8 text-base leading-relaxed relative"
                style={{ caretColor: 'var(--primary)' }}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
            placeholder={
              <div className="absolute top-8 left-8 text-muted-foreground/50 pointer-events-none select-none text-base">
                {placeholder}
              </div>
            }
          />
          {/* Draggable Block Plugin - DISABLED due to severe performance issues */}
          {/* TODO: Reimplement with better performance approach */}
        </div>

        {/* Built-in plugins */}
        {/* 
          HistoryPlugin - Undo/Redo functionality
          Each LexicalComposer instance has independent history state,
          ensuring undo/redo operations are isolated between tabs.
          @see Requirements 6.3
        */}
        <HistoryPlugin />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <TabIndentationPlugin />

        {/* Content change listener */}
        {onChange && (
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        )}

        {/* Custom plugins */}
        <MentionsPlugin mentionEntries={entries} />
        {useWikiHoverPreview && WikiHoverPreview && (
          <MentionTooltipPlugin 
            useWikiHoverPreview={useWikiHoverPreview}
            WikiHoverPreview={WikiHoverPreview}
          />
        )}
        <TagPickerPlugin tags={tags} />
        <TagTransformPlugin />
      </div>
    </LexicalComposer>
  );
}
