/**
 * 表格操作插件
 * 
 * 功能：
 * - Tab 在最后一个单元格时自动新增行，光标移到新行第一格
 * - Ctrl+Enter / Cmd+Enter 跳出表格，在下方新建段落
 * - Ctrl+Shift+Enter 在下方插入行
 * - Ctrl+Shift+\ 在右侧插入列
 * - Ctrl+Shift+Backspace 删除当前行
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableRow__EXPERIMENTAL,
  $insertTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL,
  $isTableCellNode,
  $isTableRowNode,
  TableCellNode,
  TableNode,
} from "@lexical/table";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  $createRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_TAB_COMMAND,
  KEY_ENTER_COMMAND,
} from "lexical";
import { useEffect } from "react";

/**
 * 检查是否在表格最后一个单元格
 */
function isLastCellInTable(tableCellNode: TableCellNode): boolean {
  const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
  const rows = tableNode.getChildren();
  if (rows.length === 0) return false;
  
  const lastRow = rows[rows.length - 1];
  if (!$isTableRowNode(lastRow)) return false;
  
  const cells = lastRow.getChildren();
  if (cells.length === 0) return false;
  
  const lastCell = cells[cells.length - 1];
  return lastCell.getKey() === tableCellNode.getKey();
}

/**
 * 获取新行的第一个单元格
 */
function getFirstCellOfLastRow(tableNode: TableNode): TableCellNode | null {
  const rows = tableNode.getChildren();
  if (rows.length === 0) return null;
  
  const lastRow = rows[rows.length - 1];
  if (!$isTableRowNode(lastRow)) return null;
  
  const cells = lastRow.getChildren();
  if (cells.length === 0) return null;
  
  const firstCell = cells[0];
  return $isTableCellNode(firstCell) ? firstCell : null;
}

export default function TableActionsPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Tab 键处理：在最后一个单元格时新增行，光标移到第一格
    const removeTabListener = editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const anchorNode = selection.anchor.getNode();
        const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);
        
        if (!tableCellNode || !$isTableCellNode(tableCellNode)) {
          return false;
        }

        // Shift+Tab 不处理，让默认行为执行
        if (event.shiftKey) {
          return false;
        }

        // 检查是否在最后一个单元格
        if (isLastCellInTable(tableCellNode)) {
          event.preventDefault();
          
          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          
          // 在下方插入新行
          $insertTableRow__EXPERIMENTAL(false);
          
          // 获取新行的第一个单元格并移动光标
          const firstCell = getFirstCellOfLastRow(tableNode);
          if (firstCell) {
            const paragraph = firstCell.getFirstChild();
            if (paragraph) {
              const newSelection = $createRangeSelection();
              newSelection.anchor.set(paragraph.getKey(), 0, "element");
              newSelection.focus.set(paragraph.getKey(), 0, "element");
              $setSelection(newSelection);
            }
          }
          
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH
    );

    // Ctrl+Enter / Cmd+Enter: 跳出表格
    const removeEnterListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!event || !(event.ctrlKey || event.metaKey)) return false;
        if (event.shiftKey) return false; // Ctrl+Shift+Enter 用于插入行

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        const anchorNode = selection.anchor.getNode();
        const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);
        
        if (!tableCellNode || !$isTableCellNode(tableCellNode)) {
          return false;
        }

        event.preventDefault();
        
        // 获取表格节点，在其后插入新段落
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const paragraph = $createParagraphNode();
        tableNode.insertAfter(paragraph);
        paragraph.select();
        
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    // 键盘快捷键处理
    const removeKeydownListener = editor.registerRootListener(
      (rootElement, prevRootElement) => {
        const handleKeydown = (event: KeyboardEvent) => {
          // Ctrl+Shift+Enter: 在下方插入行
          if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              
              const anchorNode = selection.anchor.getNode();
              const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);
              
              if (tableCellNode && $isTableCellNode(tableCellNode)) {
                event.preventDefault();
                $insertTableRow__EXPERIMENTAL(false);
              }
            });
          }

          // Ctrl+Shift+\: 在右侧插入列
          if (event.ctrlKey && event.shiftKey && event.key === "\\") {
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              
              const anchorNode = selection.anchor.getNode();
              const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);
              
              if (tableCellNode && $isTableCellNode(tableCellNode)) {
                event.preventDefault();
                $insertTableColumn__EXPERIMENTAL(false);
              }
            });
          }

          // Ctrl+Shift+Backspace: 删除当前行
          if (event.ctrlKey && event.shiftKey && event.key === "Backspace") {
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              
              const anchorNode = selection.anchor.getNode();
              const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);
              
              if (tableCellNode && $isTableCellNode(tableCellNode)) {
                event.preventDefault();
                $deleteTableRow__EXPERIMENTAL();
              }
            });
          }

          // Ctrl+Alt+Backspace: 删除当前列
          if (event.ctrlKey && event.altKey && event.key === "Backspace") {
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              
              const anchorNode = selection.anchor.getNode();
              const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);
              
              if (tableCellNode && $isTableCellNode(tableCellNode)) {
                event.preventDefault();
                $deleteTableColumn__EXPERIMENTAL();
              }
            });
          }
        };

        if (rootElement) {
          rootElement.addEventListener("keydown", handleKeydown);
        }
        if (prevRootElement) {
          prevRootElement.removeEventListener("keydown", handleKeydown);
        }
      }
    );

    return () => {
      removeTabListener();
      removeEnterListener();
      removeKeydownListener();
    };
  }, [editor]);

  return null;
}
