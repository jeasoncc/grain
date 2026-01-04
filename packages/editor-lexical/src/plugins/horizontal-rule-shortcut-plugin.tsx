/**
 * HorizontalRuleShortcutPlugin - 分割线快捷输入插件
 *
 * 支持输入 --- 或 *** 或 ___ 后按回车创建分割线
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_HIGH,
	KEY_ENTER_COMMAND,
} from "lexical";
import { useEffect } from "react";

// 匹配 ---, ***, ___ (至少3个字符)
const HR_REGEX = /^(-{3,}|\*{3,}|_{3,})$/;

/**
 * 分割线快捷输入插件
 */
export default function HorizontalRuleShortcutPlugin(): null {
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
				const textContent = anchorNode.getTextContent().trim();

				if (!HR_REGEX.test(textContent)) {
					return false;
				}

				// 阻止默认回车行为
				event?.preventDefault();

				editor.update(() => {
					// 创建分割线节点
					const hrNode = $createHorizontalRuleNode();

					// 替换当前节点
					const parent = anchorNode.getParent();
					if (parent) {
						anchorNode.remove();
						parent.append(hrNode);

						// 创建分割线后的段落，方便继续输入
						const afterParagraph = $createParagraphNode();
						hrNode.insertAfter(afterParagraph);
						afterParagraph.selectStart();
					}
				});

				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	return null;
}
