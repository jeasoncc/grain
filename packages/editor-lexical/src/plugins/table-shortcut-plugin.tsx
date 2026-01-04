/**
 * TableShortcutPlugin - 表格快捷输入插件
 *
 * 支持 Markdown 风格的表格创建：
 * - 输入 |col1|col2|col3| + 回车 → 创建 3 列表格
 * - 输入 ||| + 回车 → 创建 3 列表格
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$createTableCellNode,
	$createTableNode,
	$createTableRowNode,
	TableCellHeaderStates,
} from "@lexical/table";
import {
	$createParagraphNode,
	$createTextNode,
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_HIGH,
	KEY_ENTER_COMMAND,
} from "lexical";
import { useEffect } from "react";

// 匹配 |col1|col2|...| 格式，至少 2 列
const TABLE_REGEX = /^\|(.+\|)+$/;

/**
 * 解析表格列内容
 */
const parseTableColumns = (text: string): string[] => {
	// 移除首尾的 |，然后按 | 分割
	const content = text.slice(1, -1);
	return content.split("|").map((col) => col.trim());
};

/**
 * 表格快捷输入插件
 */
export default function TableShortcutPlugin(): null {
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

				if (!TABLE_REGEX.test(textContent)) {
					return false;
				}

				// 阻止默认回车行为
				event?.preventDefault();

				const columns = parseTableColumns(textContent);
				const columnCount = columns.length;

				if (columnCount < 2) {
					return false;
				}

				editor.update(() => {
					// 创建表格
					const tableNode = $createTableNode();

					// 创建表头行
					const headerRow = $createTableRowNode();
					for (const colText of columns) {
						const cell = $createTableCellNode(TableCellHeaderStates.ROW);
						const paragraph = $createParagraphNode();
						if (colText) {
							paragraph.append($createTextNode(colText));
						}
						cell.append(paragraph);
						headerRow.append(cell);
					}
					tableNode.append(headerRow);

					// 创建一个空数据行
					const dataRow = $createTableRowNode();
					for (let i = 0; i < columnCount; i++) {
						const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
						const paragraph = $createParagraphNode();
						cell.append(paragraph);
						dataRow.append(cell);
					}
					tableNode.append(dataRow);

					// 替换当前节点
					const parent = anchorNode.getParent();
					if (parent) {
						anchorNode.remove();
						parent.append(tableNode);

						// 创建表格后的段落，方便继续输入
						const afterParagraph = $createParagraphNode();
						tableNode.insertAfter(afterParagraph);

						// 选中第一个数据单元格
						dataRow.selectStart();
					}
				});

				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);
	}, [editor]);

	return null;
}
