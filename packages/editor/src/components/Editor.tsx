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
import { useCallback } from "react";

import { EditorNodes } from "../nodes";
import MentionsPlugin from "../plugins/mentions-plugin";
import MentionTooltipPlugin from "../plugins/mention-tooltip-plugin";
import TagPickerPlugin from "../plugins/tag-picker-plugin";
import TagTransformPlugin from "../plugins/tag-transform-plugin";
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
}

/**
 * 编辑器错误处理函数
 */
function onError(error: Error): void {
  console.error("[Editor Error]", error);
}

/**
 * 占位符组件
 */
function Placeholder({ text }: { text: string }): React.ReactElement {
  return (
    <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none select-none">
      {text}
    </div>
  );
}

/**
 * 核心编辑器组件
 */
export default function Editor({
  initialState,
  onChange,
  placeholder = "开始写作...",
  readOnly = false,
  namespace = "Editor",
}: EditorProps): React.ReactElement {
  // 处理编辑器状态变化
  const handleChange = useCallback(
    (editorState: EditorState) => {
      if (onChange) {
        const serialized = editorState.toJSON();
        onChange(serialized);
      }
    },
    [onChange]
  );

  // 初始配置
  const initialConfig = {
    namespace,
    theme,
    nodes: EditorNodes,
    editable: !readOnly,
    onError,
    // 如果有初始状态，解析它
    editorState: initialState || undefined,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative flex flex-col h-full">
        {/* 编辑器主体 */}
        <div className="relative flex-1 overflow-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-full outline-none px-4 py-4 prose prose-sm dark:prose-invert max-w-none"
                aria-placeholder={placeholder}
                placeholder={<Placeholder text={placeholder} />}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        {/* 内置插件 */}
        {/* 
          HistoryPlugin - 撤销/重做功能
          每个 LexicalComposer 实例都有独立的历史状态，
          确保不同标签页的 undo/redo 操作相互隔离。
          @see Requirements 6.3
        */}
        <HistoryPlugin />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <TabIndentationPlugin />

        {/* 内容变化监听 */}
        {onChange && (
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        )}

        {/* 自定义插件 */}
        <MentionsPlugin />
        {/* MentionTooltipPlugin requires external dependencies from consuming app */}
        {/* <MentionTooltipPlugin /> */}
        <TagPickerPlugin />
        <TagTransformPlugin />
      </div>
    </LexicalComposer>
  );
}
