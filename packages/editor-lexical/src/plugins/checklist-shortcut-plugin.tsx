/**
 * ChecklistShortcutPlugin - 复选框列表快捷输入插件
 *
 * 解决 Lexical 默认行为：输入 "- " 会先转换为无序列表，
 * 导致无法继续输入 "[ ]" 来创建复选框。
 *
 * 本插件监听列表项内的输入，当检测到 "[ ] " 或 "[x] " 时，
 * 将当前列表项转换为复选框列表项。
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$isListItemNode,
	$isListNode,
} from "@lexical/list";
import {
	TextNode,
} from "lexical";
import { useEffect } from "react";

// 匹配 [ ] 或 [x] 开头
const CHECKLIST_REGEX = /^\[([ x])\]\s?/;

/**
 * 复选框快捷输入插件
 *
 * 在列表项中输入 "[ ] " 或 "[x] " 时，转换为复选框
 */
export default function ChecklistShortcutPlugin(): null {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		// 监听文本节点变化
		const removeTextTransform = editor.registerNodeTransform(
			TextNode,
			(textNode: TextNode) => {
				const textContent = textNode.getTextContent();
				const match = CHECKLIST_REGEX.exec(textContent);

				if (!match) return;

				const parent = textNode.getParent();
				if (!$isListItemNode(parent)) return;

				const grandParent = parent.getParent();
				if (!$isListNode(grandParent)) return;

				// 检查是否已经是 checklist
				if (grandParent.getListType() === "check") return;

				const isChecked = match[1] === "x";

				// 移除 [ ] 或 [x] 前缀
				const newText = textContent.replace(CHECKLIST_REGEX, "");

				editor.update(() => {
					// 设置列表类型为 check
					grandParent.setListType("check");

					// 设置选中状态
					parent.setChecked(isChecked);

					// 更新文本内容
					if (newText) {
						textNode.setTextContent(newText);
					} else {
						textNode.remove();
					}
				});
			},
		);

		return () => {
			removeTextTransform();
		};
	}, [editor]);

	return null;
}
