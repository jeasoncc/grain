"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	LexicalTypeaheadMenuPlugin,
	MenuOption,
	type TypeaheadMenuPluginProps,
	useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import {
	$createTextNode,
	$getSelection,
	$isRangeSelection,
	type TextNode,
} from "lexical";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { JSX, RefObject } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/components/ui/command";

class EmojiOption extends MenuOption {
	title: string;
	emoji: string;
	keywords: Array<string>;

	constructor(
		title: string,
		emoji: string,
		options: {
			keywords?: Array<string>;
		},
	) {
		super(title);
		this.title = title;
		this.emoji = emoji;
		this.keywords = options.keywords || [];
	}
}

type Emoji = {
	emoji: string;
	description: string;
	category: string;
	aliases: Array<string>;
	tags: Array<string>;
	unicode_version: string;
	ios_version: string;
	skin_tones?: boolean;
};

const MAX_EMOJI_SUGGESTION_COUNT = 10;

export function EmojiPickerPlugin(): JSX.Element {
	const [editor] = useLexicalComposerContext();
	const [queryString, setQueryString] = useState<string | null>(null);
	const [emojis, setEmojis] = useState<Array<Emoji>>([]);
	useEffect(() => {
		import("../utils/emoji-list").then((file) => setEmojis(file.default));
	}, []);

	const emojiOptions = useMemo(
		() =>
			emojis != null
				? emojis.map(
						({ emoji, aliases, tags }) =>
							new EmojiOption(aliases[0], emoji, {
								keywords: [...aliases, ...tags],
							}),
					)
				: [],
		[emojis],
	);

	const checkForTriggerMatch = useBasicTypeaheadTriggerMatch(":", {
		minLength: 0,
	});

	const options: Array<EmojiOption> = useMemo(() => {
		return emojiOptions
			.filter((option: EmojiOption) => {
				if (!queryString) return emojiOptions;
				const regex = new RegExp(queryString, "gi");
				return (
					regex.exec(option.title) ||
					option.keywords?.some((keyword) => regex.exec(keyword))
				);
			})
			.slice(0, MAX_EMOJI_SUGGESTION_COUNT);
	}, [emojiOptions, queryString]);

	const menuRenderFn: TypeaheadMenuPluginProps<EmojiOption>["menuRenderFn"] = (
		anchorElementRef,
		{ selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
	) => {
		if (!anchorElementRef.current || options.length === 0) {
			return null;
		}

		return createPortal(
			<div className="fixed z-10 w-[200px] rounded-md shadow-md">
				<Command
					onKeyDown={(event) => {
						if (event.key === "ArrowUp") {
							event.preventDefault();
							setHighlightedIndex(
								selectedIndex !== null
									? (selectedIndex - 1 + options.length) % options.length
									: options.length - 1,
							);
						} else if (event.key === "ArrowDown") {
							event.preventDefault();
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
									value={option.title}
									onSelect={() => {
										setHighlightedIndex(index);
										selectOptionAndCleanUp(option);
									}}
								>
									<div className="flex items-center gap-2">
										<span className="text-lg">{option.emoji}</span>
										<div className="flex flex-col">
											<span>{option.title}</span>
											<span className="text-xs text-muted-foreground">
												{option.keywords.join(", ")}
											</span>
										</div>
									</div>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</div>,
			anchorElementRef.current,
		);
	};

	const onSelectOption = useCallback(
		(
			selectedOption: EmojiOption,
			nodeToRemove: TextNode | null,
			closeMenu: () => void,
		) => {
			editor.update(() => {
				const selection = $getSelection();

				if (!$isRangeSelection(selection) || selectedOption == null) {
					return;
				}

				if (nodeToRemove) {
					nodeToRemove.remove();
				}

				selection.insertNodes([$createTextNode(selectedOption.emoji)]);

				closeMenu();
			});
		},
		[editor],
	);

	return (
		<LexicalTypeaheadMenuPlugin
			onQueryChange={setQueryString}
			onSelectOption={onSelectOption}
			triggerFn={checkForTriggerMatch}
			options={options}
			menuRenderFn={menuRenderFn}
		/>
	);
}
