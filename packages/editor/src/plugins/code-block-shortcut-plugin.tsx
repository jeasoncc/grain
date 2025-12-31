/**
 * CodeBlockShortcutPlugin - 代码块快捷输入插件
 *
 * 支持输入 ```lang 后按回车立即创建代码块
 * 解决 Lexical 默认 MarkdownShortcutPlugin 需要完整开始和结束标记的问题
 */

import { $createCodeNode } from "@lexical/code";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_HIGH,
	KEY_ENTER_COMMAND,
} from "lexical";
import { useEffect } from "react";

// 匹配 ```lang 格式，lang 可选
const CODE_BLOCK_REGEX = /^```(\w*)$/;

/**
 * 代码块快捷输入插件
 *
 * 在输入 ```lang 后按回车，立即创建对应语言的代码块
 */
export default function CodeBlockShortcutPlugin(): null {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerCommand(
			KEY_ENTER_COMMAND,
			(event) => {
				const selection = $getSelection();

				if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
					return false;
				}

				const anchorNode = selection.anchor.getNode();
				const textContent = anchorNode.getTextContent();
				const match = CODE_BLOCK_REGEX.exec(textContent);

				if (!match) {
					return false;
				}

				// 阻止默认回车行为
				event?.preventDefault();

				const language = match[1] || "";

				editor.update(() => {
					// 创建代码块节点
					const codeNode = $createCodeNode(language);

					// 替换当前节点
					const parent = anchorNode.getParent();
					if (parent) {
						anchorNode.remove();
						parent.append(codeNode);
						codeNode.selectEnd();
					}
				});

				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	return null;
}
