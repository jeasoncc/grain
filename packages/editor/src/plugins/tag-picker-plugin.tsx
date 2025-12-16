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
import { useCallback, useMemo, useState, useLayoutEffect } from "react";
import * as ReactDOM from "react-dom";

import { $createTagNode } from "../nodes/tag-node";

// 匹配 #[ 开头的输入
const TagTriggerRegex = /#\[([\u4e00-\u9fa5a-zA-Z0-9_\s]*)$/;

const SUGGESTION_LIST_LENGTH_LIMIT = 10;

// Portal component to handle positioning and body mounting
function TagMenuPortal({ 
  anchorElement, 
  children 
}: { 
  anchorElement: HTMLElement; 
  children: React.ReactNode; 
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 5,
        left: rect.left,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorElement]);

  return ReactDOM.createPortal(
    <div
      className="fixed z-[100000]"
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body
  );
}

// Type definitions for external dependencies
export interface TagInterface {
  id: string;
  name: string;
  count: number;
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
          flex items-center gap-3 px-2 py-2 cursor-pointer rounded-lg
          transition-all duration-200 mt-1
          ${isSelected ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted/50 text-muted-foreground"}
        `}
      >
        <div 
          className="flex items-center justify-center size-7 rounded-full shrink-0 transition-transform duration-200 bg-primary/10 text-primary"
        >
          <Plus className={isSelected ? "size-3.5" : "size-3"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium">
            Create tag "{option.createName}"
          </div>
        </div>
      </li>
    );
  }

  const { tag } = option;
  
  // 渲染占位符
  if (!tag) {
    return (
      <li
        key={option.key}
        className="px-4 py-3 text-xs text-muted-foreground/60 italic text-center select-none"
      >
        {option.createName}
      </li>
    );
  }

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
        flex items-center gap-2.5 px-2 py-1.5 cursor-pointer rounded-lg
        transition-all duration-200
        ${isSelected ? "bg-primary/10 text-primary shadow-sm translate-x-0.5" : "hover:bg-muted/50 text-muted-foreground"}
      `}
    >
      <div
        className={`flex items-center justify-center size-6 rounded-full shrink-0 transition-all duration-200 bg-primary/10 text-primary ${isSelected ? "scale-110" : ""}`}
      >
        <Tag className="size-3" />
      </div>
      <div className="flex-1 min-w-0 flex items-center justify-between">
        <span className="text-sm font-medium truncate">{tag.name}</span>
        <span className={`text-[10px] ${isSelected ? "text-primary/70" : "text-muted-foreground/50"}`}>
          {tag.count} docs
        </span>
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

export interface TagPickerPluginProps {
  tags?: TagInterface[];
}

export default function TagPickerPlugin({ 
  tags = [] 
}: TagPickerPluginProps): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();

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

    // 如果结果为空，添加占位符选项
    if (result.length === 0) {
      result.push(
        new TagTypeaheadOption("placeholder", null, false, "Type to search or create...")
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
      // 忽略占位符选项
      if (!selectedOption.tag && !selectedOption.isCreateNew) {
        return;
      }

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

        return (
          <TagMenuPortal anchorElement={anchorElementRef.current}>
            <div className="bg-popover/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-2xl p-1 w-72 max-h-[320px] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 border-b border-border/40 mb-1 flex items-center gap-2 shrink-0">
                <Tag className="size-3" />
                {queryString ? `Search "${queryString}"` : "Tags"}
              </div>
              <ul className="space-y-0.5 overflow-y-auto custom-scrollbar p-1 flex-1">
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
              <div className="px-3 py-2 text-[10px] text-muted-foreground/50 border-t border-border/40 mt-1 shrink-0 flex items-center justify-between">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
            </div>
          </TagMenuPortal>
        );
      }}
    />
  );
}
