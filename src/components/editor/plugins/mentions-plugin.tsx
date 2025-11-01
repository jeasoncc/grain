import * as React from "react";
import {
  JSX,
  useCallback,
  useEffect,
  useMemo,
  useState,
  lazy,
  Suspense,
} from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  MenuOption,
  MenuTextMatch,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { TextNode } from "lexical";
import { CircleUserRoundIcon } from "lucide-react";
import { createPortal } from "react-dom";

import { $createMentionNode } from "@/components/editor/nodes/mention-node";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// 使用 React.lazy 替代 next/dynamic
const LexicalTypeaheadMenuPlugin = lazy(() =>
  import("@lexical/react/LexicalTypeaheadMenuPlugin").then((mod) => ({
    default: mod.LexicalTypeaheadMenuPlugin,
  })),
);

const PUNCTUATION =
  "\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%'\"~=<>_:;";
const NAME = "\\b[A-Z][^\\s" + PUNCTUATION + "]";

const DocumentMentionsRegex = {
  NAME,
  PUNCTUATION,
};

const PUNC = DocumentMentionsRegex.PUNCTUATION;

const TRIGGERS = ["@"].join("");

const VALID_CHARS = "[^" + TRIGGERS + PUNC + "\\s]";

const VALID_JOINS = "(?:" + "\\.[ |$]|" + " |" + "[" + PUNC + "]|" + ")";

const LENGTH_LIMIT = 75;

const AtSignMentionsRegex = new RegExp(
  "(^|\\s|\\()(" +
  "[" +
  TRIGGERS +
  "]" +
  "((?:" +
  VALID_CHARS +
  VALID_JOINS +
  "){0," +
  LENGTH_LIMIT +
  "})" +
  ")$",
);

const ALIAS_LENGTH_LIMIT = 50;

const AtSignMentionsRegexAliasRegex = new RegExp(
  "(^|\\s|\\()(" +
  "[" +
  TRIGGERS +
  "]" +
  "((?:" +
  VALID_CHARS +
  "){0," +
  ALIAS_LENGTH_LIMIT +
  "})" +
  ")$",
);

const SUGGESTION_LIST_LENGTH_LIMIT = 5;
const mentionsCache = new Map();

const dummyMentionsData = [
  "Aayla Secura",
  "Adi Gallia",
  "Admiral Dodd Rancit",
  // ... 这里可以保留你原来的全部 dummy 数据
];

const dummyLookupService = {
  search(string: string, callback: (results: Array<string>) => void): void {
    setTimeout(() => {
      const results = dummyMentionsData.filter((mention) =>
        mention.toLowerCase().includes(string.toLowerCase()),
      );
      callback(results);
    }, 500);
  },
};

function useMentionLookupService(mentionString: string | null) {
  const [results, setResults] = useState<Array<string>>([]);

  useEffect(() => {
    const cachedResults = mentionsCache.get(mentionString);

    if (mentionString == null) {
      setResults([]);
      return;
    }

    if (cachedResults === null) {
      return;
    } else if (cachedResults !== undefined) {
      setResults(cachedResults);
      return;
    }

    mentionsCache.set(mentionString, null);
    dummyLookupService.search(mentionString, (newResults) => {
      mentionsCache.set(mentionString, newResults);
      setResults(newResults);
    });
  }, [mentionString]);

  return results;
}

function checkForAtSignMentions(
  text: string,
  minMatchLength: number,
): MenuTextMatch | null {
  let match = AtSignMentionsRegex.exec(text);
  if (match === null) {
    match = AtSignMentionsRegexAliasRegex.exec(text);
  }
  if (match !== null) {
    const maybeLeadingWhitespace = match[1];
    const matchingString = match[3];
    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2],
      };
    }
  }
  return null;
}

function getPossibleQueryMatch(text: string): MenuTextMatch | null {
  return checkForAtSignMentions(text, 1);
}

class MentionTypeaheadOption extends MenuOption {
  name: string;
  picture: JSX.Element;
  constructor(name: string, picture: JSX.Element) {
    super(name);
    this.name = name;
    this.picture = picture;
  }
}

export function MentionsPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const results = useMentionLookupService(queryString);
  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  });

  const options = useMemo(
    () =>
      results
        .map(
          (result) =>
            new MentionTypeaheadOption(
              result,
              <CircleUserRoundIcon className="size-4" />,
            ),
        )
        .slice(0, SUGGESTION_LIST_LENGTH_LIMIT),
    [results],
  );

  const onSelectOption = useCallback(
    (
      selectedOption: MentionTypeaheadOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        const mentionNode = $createMentionNode(selectedOption.name);
        if (nodeToReplace) nodeToReplace.replace(mentionNode);
        mentionNode.select();
        closeMenu();
      });
    },
    [editor],
  );

  const checkForMentionMatch = useCallback(
    (text: string) => {
      const slashMatch = checkForSlashTriggerMatch(text, editor);
      if (slashMatch !== null) return null;
      return getPossibleQueryMatch(text);
    },
    [checkForSlashTriggerMatch, editor],
  );

  return (
    <Suspense fallback={null}>
      <LexicalTypeaheadMenuPlugin
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForMentionMatch}
        options={options}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
        ) => {
          return anchorElementRef.current && results.length
            ? createPortal(
              <div className="fixed z-10 w-[200px] rounded-md shadow-md">
                <Command
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex(
                        selectedIndex !== null
                          ? (selectedIndex - 1 + options.length) %
                          options.length
                          : options.length - 1,
                      );
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIndex(
                        selectedIndex !== null
                          ? (selectedIndex + 1) % options.length
                          : 0,
                      );
                    }
                  }}
                >
                  <CommandList>
                    <CommandGroup>
                      {options.map((option, index) => (
                        <CommandItem
                          key={option.key}
                          value={option.name}
                          onSelect={() => selectOptionAndCleanUp(option)}
                          className={`flex items-center gap-2 ${selectedIndex === index
                              ? "bg-accent"
                              : "!bg-transparent"
                            }`}
                        >
                          {option.picture}
                          {option.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>,
              anchorElementRef.current,
            )
            : null;
        }}
      />
    </Suspense>
  );
}
