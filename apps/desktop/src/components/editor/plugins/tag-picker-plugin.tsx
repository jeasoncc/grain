/**
 * Tag Picker Plugin - 支持 #[ 插入内联标签
 *
 * 功能：
 * - 输入 #[ 触发标签选择器
 * - 支持搜索现有标签
 * - 支持创建新标签
 * 
 * 注意：这是 #+TAGS: 的补充，用于在正文中引用标签
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $getSelection, $isRangeSelection, type TextNode } from "lexical";
import { Tag, Plus } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import * as ReactDOM from "react-dom";

import { $createTagNode } from "@/components/editor/nodes/tag-node";
import { useTagsByWorkspace, type TagInterface } from "@/services/tags";
import { useSelectionStore } from "@/stores/selection";

// 匹配 #[ 开头的输入
const TagTriggerRegex = /#\[([\u4e00-\u9fa5a-zA-Z0-9_\s]*)$/;

const SUGGESTION_LIST_LENGTH_LIMIT = 10;

/**
 * 根据标签名生成颜色
 */
function getTagColor(tagName: string): string {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 50%)`;
}

class TagTypeaheadOption extends MenuOption {
  tag: TagInterface | null;
  isCreateNew: boolean;
  createName: string;

  constructor(
    key: string,
    tag: TagInterface | null,
    isCreateNew: boolean = false,
    createName: string = ""
  ) {
    super(key);
    this.tag = tag;
    this.isCreateNew = isCreateNew;
    this.createName = createName;
  }
}

function TagTypeaheadMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: TagTypeaheadOption;
}) {
  if (option.isCreateNew) {
    const color = getTagColor(option.createName);
    return (
      <li
        key={option.key}
        tabIndex={-1}
        ref={option.setRefElement}
        role="option"
        aria-selected={isSelected}
        id={"typeahead-item-" + index}
        onMouseEnter={onMouseEnter}
        onClick={onClick}
        className={`
          flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md
          transition-colors duration-150 border-t border-border mt-1 pt-3
          ${isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}
        `}
      >
        <div 
          className="flex items-center justify-center size-8 rounded-full shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Plus className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            创建标签 "{option.createName}"
          </div>
          <div className="text-xs text-muted-foreground">
            按 Enter 创建新标签
          </div>
        </div>
      </li>
    );
  }

  const { tag } = option;
  if (!tag) return null;

  const color = getTagColor(tag.name);

  return (
    <li
      key={option.key}
      tabIndex={-1}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={"typeahead-item-" + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-md
        transition-colors duration-150
        ${isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}
      `}
    >
      <div
        className="flex items-center justify-center size-8 rounded-full shrink-0"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <Tag className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{tag.name}</div>
        <div className="text-xs text-muted-foreground">
          {tag.count} 篇文档
        </div>
      </div>
    </li>
  );
}

export type MenuTextMatch = {
  leadOffset: number;
  matchingString: string;
  replaceableString: string;
};

function checkForTagTrigger(text: string): MenuTextMatch | null {
  const match = TagTriggerRegex.exec(text);

  if (match !== null) {
    return {
      leadOffset: match.index,
      matchingString: match[1] || "",
      replaceableString: match[0],
    };
  }

  return null;
}

export default function TagPickerPlugin(): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();
  const selectedProjectId = useSelectionStore((s) => s.selectedProjectId);
  const tags = useTagsByWorkspace(selectedProjectId ?? undefined);

  const [queryString, setQueryString] = useState<string | null>(null);

  const options = useMemo(() => {
    const allTags = tags || [];
    const query = (queryString || "").toLowerCase().trim();

    let filtered: TagInterface[];

    if (!query) {
      // 没有查询时显示所有标签（按使用次数排序）
      filtered = [...allTags]
        .sort((a, b) => b.count - a.count)
        .slice(0, SUGGESTION_LIST_LENGTH_LIMIT);
    } else {
      // 过滤匹配的标签
      filtered = allTags
        .filter((tag) => tag.name.toLowerCase().includes(query))
        .slice(0, SUGGESTION_LIST_LENGTH_LIMIT - 1);
    }

    const result: TagTypeaheadOption[] = filtered.map(
      (tag) => new TagTypeaheadOption(tag.id, tag)
    );

    // 如果有查询且没有完全匹配的标签，添加"创建新标签"选项
    if (query && !allTags.some((t) => t.name.toLowerCase() === query)) {
      result.push(
        new TagTypeaheadOption(`create-${query}`, null, true, query)
      );
    }

    return result;
  }, [tags, queryString]);

  const onSelectOption = useCallback(
    async (
      selectedOption: TagTypeaheadOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void
    ) => {
      const tagName = selectedOption.isCreateNew 
        ? selectedOption.createName 
        : selectedOption.tag?.name;

      if (!tagName) {
        closeMenu();
        return;
      }

      editor.update(() => {
        if (nodeToRemove) {
          nodeToRemove.remove();
        }
        const tagNode = $createTagNode(tagName);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertNodes([tagNode]);
        }
        closeMenu();
      });
    },
    [editor]
  );

  const checkForTagMatch = useCallback((text: string) => {
    return checkForTagTrigger(text);
  }, []);

  return (
    <LexicalTypeaheadMenuPlugin<TagTypeaheadOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTagMatch}
      options={options}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
      ) => {
        if (!anchorElementRef.current || options.length === 0) {
          return null;
        }

        return ReactDOM.createPortal(
          <div className="z-[9999] bg-popover border border-border rounded-lg shadow-xl p-1.5 min-w-[280px] max-w-[360px] max-h-[320px] overflow-auto animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1 flex items-center gap-2">
              <Tag className="size-3" />
              {queryString ? `搜索 "${queryString}"` : "选择或创建标签"}
            </div>
            <ul className="space-y-0.5">
              {options.map((option, i: number) => (
                <TagTypeaheadMenuItem
                  index={i}
                  isSelected={selectedIndex === i}
                  onClick={() => {
                    setHighlightedIndex(i);
                    selectOptionAndCleanUp(option);
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(i);
                  }}
                  key={option.key}
                  option={option}
                />
              ))}
            </ul>
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1">
              ↑↓ 选择 · ↵ 确认 · Esc 取消
            </div>
          </div>,
          anchorElementRef.current
        );
      }}
    />
  );
}
