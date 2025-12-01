/**
 * 小说专用编辑器 - 简洁、专注的写作体验
 */

import {
	ELEMENT_TRANSFORMERS,
	TEXT_FORMAT_TRANSFORMERS,
	TEXT_MATCH_TRANSFORMERS,
} from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import {
	type InitialConfigType,
	LexicalComposer,
} from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import type { SerializedEditorState } from "lexical";
import { useEffect, useRef } from "react";
import { ContentEditable } from "@/components/editor/editor-ui/content-editable";
import { ComponentPickerMenuPlugin } from "@/components/editor/plugins/component-picker-menu-plugin";
import { ExcalidrawPlugin } from "@/components/editor/plugins/excalidraw-plugin";
import { FloatingTextFormatToolbarPlugin } from "@/components/editor/plugins/floating-text-format-plugin";
import { DividerPickerPlugin } from "@/components/editor/plugins/picker/divider-picker-plugin";
import { ExcalidrawPickerPlugin } from "@/components/editor/plugins/picker/excalidraw-picker-plugin";
import { HeadingPickerPlugin } from "@/components/editor/plugins/picker/heading-picker-plugin";
import { QuotePickerPlugin } from "@/components/editor/plugins/picker/quote-picker-plugin";
import { editorTheme } from "@/components/editor/themes/editor-theme";
import { cn } from "@/lib/utils";
import { useWritingStore } from "@/stores/writing";
import { nodes } from "./nodes";

const editorConfig: InitialConfigType = {
	namespace: "NovelEditor",
	theme: editorTheme,
	nodes,
	onError: (error: Error) => {
		console.error(error);
	},
};

interface NovelEditorProps {
	editorSerializedState?: SerializedEditorState;
	onSerializedChange?: (state: SerializedEditorState) => void;
	placeholder?: string;
}

export function NovelEditor({
	editorSerializedState,
	onSerializedChange,
	placeholder = "开始写作...",
}: NovelEditorProps) {
	const typewriterMode = useWritingStore((s) => s.typewriterMode);

	return (
		<LexicalComposer
			initialConfig={{
				...editorConfig,
				...(editorSerializedState
					? { editorState: JSON.stringify(editorSerializedState) }
					: {}),
			}}
		>
			<div className="editor-container relative h-full">
				<RichTextPlugin
					contentEditable={
						<div className="h-full">
							<ContentEditable
								placeholder={placeholder}
								className={cn(
									"novel-editor-content",
									"relative block h-full min-h-[500px] w-full",
									"px-4 py-8 md:px-8 lg:px-16",
									"text-lg leading-relaxed",
									"focus:outline-none",
									"font-serif",
									typewriterMode && "typewriter-mode",
								)}
							/>
						</div>
					}
					ErrorBoundary={LexicalErrorBoundary}
				/>

				<HistoryPlugin />
				<AutoFocusPlugin />
				<ListPlugin />
				<TabIndentationPlugin />

				<MarkdownShortcutPlugin
					transformers={[
						...ELEMENT_TRANSFORMERS,
						...TEXT_FORMAT_TRANSFORMERS,
						...TEXT_MATCH_TRANSFORMERS,
					]}
				/>

				<FloatingTextFormatToolbarPlugin
					anchorElem={null}
					setIsLinkEditMode={() => {}}
				/>

				<ExcalidrawPlugin />
				<HorizontalRulePlugin />

				{/* / 命令菜单 */}
				<ComponentPickerMenuPlugin
					baseOptions={[
						HeadingPickerPlugin({ n: 1 }),
						HeadingPickerPlugin({ n: 2 }),
						HeadingPickerPlugin({ n: 3 }),
						QuotePickerPlugin(),
						DividerPickerPlugin(),
						ExcalidrawPickerPlugin(),
					]}
				/>

				<OnChangePlugin
					ignoreSelectionChange={true}
					onChange={(editorState) => {
						onSerializedChange?.(editorState.toJSON());
					}}
				/>

				{typewriterMode && <TypewriterPlugin />}
			</div>
		</LexicalComposer>
	);
}

/**
 * 打字机模式插件 - 保持当前行居中
 */
function TypewriterPlugin() {
	const [editor] = useLexicalComposerContext();
	const lastScrollRef = useRef<number>(0);

	useEffect(() => {
		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				const selection = window.getSelection();
				if (!selection || selection.rangeCount === 0) return;

				const range = selection.getRangeAt(0);
				const rect = range.getBoundingClientRect();

				if (rect.top === 0 && rect.bottom === 0) return;

				const editorElement = editor.getRootElement();
				if (!editorElement) return;

				const container = editorElement.closest(".novel-editor-content");
				if (!container) return;

				const containerRect = container.getBoundingClientRect();
				const targetY = containerRect.height / 2;
				const currentY = rect.top - containerRect.top;
				const scrollDelta = currentY - targetY;

				// 平滑滚动
				if (Math.abs(scrollDelta - lastScrollRef.current) > 20) {
					container.scrollBy({
						top: scrollDelta,
						behavior: "smooth",
					});
					lastScrollRef.current = scrollDelta;
				}
			});
		});
	}, [editor]);

	return null;
}
