/**
 * 极简插件配置 - 专为小说写作优化
 * 移除所有工具栏，只保留必要的编辑功能
 */
import { useState } from "react";
import {
	ELEMENT_TRANSFORMERS,
	TEXT_FORMAT_TRANSFORMERS,
	TEXT_MATCH_TRANSFORMERS,
} from "@lexical/markdown";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";

import { ContentEditable } from "@/components/editor/editor-ui/content-editable";
import { ComponentPickerMenuPlugin } from "@/components/editor/plugins/component-picker-menu-plugin";
import { ExcalidrawPlugin } from "@/components/editor/plugins/excalidraw-plugin";
import { FloatingTextFormatToolbarPlugin } from "@/components/editor/plugins/floating-text-format-plugin";
import { ExcalidrawPickerPlugin } from "@/components/editor/plugins/picker/excalidraw-picker-plugin";
import { HeadingPickerPlugin } from "@/components/editor/plugins/picker/heading-picker-plugin";
import { DividerPickerPlugin } from "@/components/editor/plugins/picker/divider-picker-plugin";
import { QuotePickerPlugin } from "@/components/editor/plugins/picker/quote-picker-plugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";

interface MinimalPluginsProps {
	placeholder?: string;
}

export function MinimalPlugins({ placeholder = "开始写作..." }: MinimalPluginsProps) {
	const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
	const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

	const onRef = (_floatingAnchorElem: HTMLDivElement) => {
		if (_floatingAnchorElem !== null) {
			setFloatingAnchorElem(_floatingAnchorElem);
		}
	};

	return (
		<div className="relative h-full">
			<AutoFocusPlugin />
			<RichTextPlugin
				contentEditable={
					<div className="h-full" ref={onRef}>
						<ContentEditable
							placeholder={placeholder}
							className="ContentEditable__root relative block h-full min-h-[500px] w-full focus:outline-none"
						/>
					</div>
				}
				ErrorBoundary={LexicalErrorBoundary}
			/>

			<HistoryPlugin />
			<ListPlugin />
			<TabIndentationPlugin />
			<HorizontalRulePlugin />

			<MarkdownShortcutPlugin
				transformers={[
					...ELEMENT_TRANSFORMERS,
					...TEXT_FORMAT_TRANSFORMERS,
					...TEXT_MATCH_TRANSFORMERS,
				]}
			/>

			{/* Excalidraw 绘图支持 */}
			<ExcalidrawPlugin />

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

			{/* 只在选中文字时显示的浮动工具栏 */}
			<FloatingTextFormatToolbarPlugin
				anchorElem={floatingAnchorElem}
				setIsLinkEditMode={setIsLinkEditMode}
			/>
		</div>
	);
}
