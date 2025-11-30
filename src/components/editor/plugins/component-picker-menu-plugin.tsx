import type { JSX, RefObject } from "react"
import { useCallback, useMemo, useState } from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  LexicalTypeaheadMenuPlugin,
  type TypeaheadMenuPluginProps,
} from "@lexical/react/LexicalTypeaheadMenuPlugin"
import { useBasicTypeaheadTriggerMatch } from "@lexical/react/LexicalTypeaheadMenuPlugin"
import { TextNode } from "lexical"
import { createPortal } from "react-dom"

import { useEditorModal } from "@/components/editor/editor-hooks/use-modal"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { ComponentPickerOption } from "./picker/component-picker-option"

export function ComponentPickerMenuPlugin({
  baseOptions = [],
  dynamicOptionsFn,
}: {
  baseOptions?: Array<ComponentPickerOption>
  dynamicOptionsFn?: ({
    queryString,
  }: {
    queryString: string
  }) => Array<ComponentPickerOption>
}): JSX.Element {
  const [editor] = useLexicalComposerContext()
  const [modal, showModal] = useEditorModal()
  const [queryString, setQueryString] = useState<string | null>(null)

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  })

  const options = useMemo(() => {
    // 没有查询字符串或为空时，显示所有选项
    if (queryString === null || queryString === "") {
      return baseOptions
    }

    const regex = new RegExp(queryString, "i")

    return [
      ...(dynamicOptionsFn?.({ queryString }) || []),
      ...baseOptions.filter(
        (option) =>
          regex.test(option.title) ||
          option.keywords.some((keyword) => regex.test(keyword))
      ),
    ]
  }, [baseOptions, dynamicOptionsFn, queryString])

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string
    ) => {
      editor.update(() => {
        nodeToRemove?.remove()
        selectedOption.onSelect(matchingString, editor, showModal)
        closeMenu()
      })
    },
    [editor, showModal]
  )

  const menuRenderFn: TypeaheadMenuPluginProps<ComponentPickerOption>["menuRenderFn"] = (
    anchorElementRef,
    { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
  ) => {
    if (!anchorElementRef.current || options.length === 0) {
      return null
    }

    return createPortal(
      <div className="fixed z-50 w-[250px] rounded-md border bg-popover shadow-md">
        <Command
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault()
              setHighlightedIndex(
                selectedIndex !== null
                  ? (selectedIndex - 1 + options.length) % options.length
                  : options.length - 1
              )
            } else if (event.key === "ArrowDown") {
              event.preventDefault()
              setHighlightedIndex(
                selectedIndex !== null
                  ? (selectedIndex + 1) % options.length
                  : 0
              )
            }
          }}
        >
          <CommandList>
            <CommandGroup>
              {options.map((option, index) => (
                <CommandItem
                  key={option.key}
                  value={option.title}
                  onSelect={() => {
                    setHighlightedIndex(index)
                    selectOptionAndCleanUp(option)
                  }}
                >
                  <div className="flex flex-col">
                    <span>{option.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.keywords.join(", ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>,
      anchorElementRef.current
    )
  }

  return (
    <>
      {modal}
      <LexicalTypeaheadMenuPlugin
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForTriggerMatch}
        options={options}
        menuRenderFn={menuRenderFn}
      />
    </>
  )
}
