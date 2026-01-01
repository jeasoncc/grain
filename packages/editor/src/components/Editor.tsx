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
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { TRANSFORMERS, CHECK_LIST } from "@lexical/markdown";
import type { EditorState, SerializedEditorState } from "lexical";
import type React from "react";
import { useCallback } from "react";

import { EditorNodes } from "../nodes";
import MentionsPlugin, { type MentionEntry } from "../plugins/mentions-plugin";
import MentionTooltipPlugin, { type MentionTooltipPluginProps } from "../plugins/mention-tooltip-plugin";
import TagTransformPlugin from "../plugins/tag-transform-plugin";
import CodeHighlightPlugin from "../plugins/code-highlight-plugin";
import CodeBlockShortcutPlugin from "../plugins/code-block-shortcut-plugin";
import PrismLanguagesPlugin from "../plugins/prism-languages-plugin";
import ChecklistShortcutPlugin from "../plugins/checklist-shortcut-plugin";
import TableShortcutPlugin from "../plugins/table-shortcut-plugin";
import HorizontalRuleShortcutPlugin from "../plugins/horizontal-rule-shortcut-plugin";
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
 * URL 匹配正则表达式
 * 用于 AutoLinkPlugin 自动识别链接
 */
const URL_REGEX =
	/((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_REGEX =
	/(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

/**
 * AutoLink 匹配器配置
 */
const MATCHERS = [
	(text: string) => {
		const match = URL_REGEX.exec(text);
		if (match === null) return null;
		const fullMatch = match[0];
		return {
			index: match.index,
			length: fullMatch.length,
			text: fullMatch,
			url: fullMatch.startsWith("http") ? fullMatch : `https://${fullMatch}`,
		};
	},
	(text: string) => {
		const match = EMAIL_REGEX.exec(text);
		if (match === null) return null;
		const fullMatch = match[0];
		return {
			index: match.index,
			length: fullMatch.length,
			text: fullMatch,
			url: `mailto:${fullMatch}`,
		};
	},
];



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
  useWikiHoverPreview,
  WikiHoverPreview,
}: EditorProps): React.ReactElement {
  // Support both new and deprecated prop names
  const entries = mentionEntries ?? wikiEntries;
  
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
        <div className="relative flex-1 overflow-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="pl-8 pr-8 min-h-full outline-none px-8 py-4 text-base leading-relaxed relative"
                style={{ caretColor: 'var(--primary)' }}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
            placeholder={
              <div 
                className="text-muted-foreground/50 pointer-events-none select-none text-base"
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '2rem'
                }}
              >
                {placeholder}
              </div>
            }
          />
        </div>

        {/* Built-in plugins */}
        {/* 
          HistoryPlugin - Undo/Redo functionality
          Each LexicalComposer instance has independent history state,
          ensuring undo/redo operations are isolated between tabs.
          @see Requirements 6.3
        */}
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <ClickableLinkPlugin />
        <AutoLinkPlugin matchers={MATCHERS} />
        <HorizontalRulePlugin />
        <TablePlugin />
        <ClearEditorPlugin />
        <MarkdownShortcutPlugin transformers={[...TRANSFORMERS, CHECK_LIST]} />
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
        <TagTransformPlugin />
        <CodeHighlightPlugin />
        <CodeBlockShortcutPlugin />
        <PrismLanguagesPlugin />
        <ChecklistShortcutPlugin />
        <TableShortcutPlugin />
        <HorizontalRuleShortcutPlugin />
      </div>
    </LexicalComposer>
  );
}
