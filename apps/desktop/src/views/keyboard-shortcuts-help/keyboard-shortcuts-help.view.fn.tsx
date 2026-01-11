/**
 * 快捷键帮助面板
 */

import { Keyboard } from "lucide-react";
import { memo } from "react";
import { Button } from "@/views/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/views/ui/popover";
import type { KeyboardShortcutsHelpViewProps } from "./keyboard-shortcuts-help.types";

const shortcuts = [
	{ keys: ["Ctrl", "K"], description: "Command Palette", category: "Global" },
	{
		keys: ["Ctrl", "Shift", "F"],
		description: "Search Panel",
		category: "Global",
	},
	{ keys: ["Ctrl", "B"], description: "File Panel", category: "Global" },
	{ keys: ["Ctrl", "Tab"], description: "Next Tab", category: "Navigation" },
	{
		keys: ["Ctrl", "Shift", "Tab"],
		description: "Previous Tab",
		category: "Navigation",
	},
	{ keys: ["Ctrl", "S"], description: "Save", category: "Edit" },
	{ keys: ["Ctrl", "B"], description: "Bold", category: "Format" },
	{ keys: ["Ctrl", "I"], description: "Italic", category: "Format" },
	{ keys: ["Ctrl", "U"], description: "Underline", category: "Format" },
	{ keys: ["Ctrl", "Z"], description: "Undo", category: "Edit" },
	{ keys: ["Ctrl", "Shift", "Z"], description: "Redo", category: "Edit" },
];

export const KeyboardShortcutsHelpView = memo(
	({}: KeyboardShortcutsHelpViewProps) => {
		// 按分类分组
		const categories = shortcuts.reduce(
			(acc, shortcut) => {
				const category = shortcut.category;
				if (!acc[category]) {
					acc[category] = [];
				}
				acc[category].push(shortcut);
				return acc;
			},
			{} as Record<string, typeof shortcuts>,
		);

		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="icon" className="size-7">
						<Keyboard className="size-3.5" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="end"
					className="w-80 p-0 shadow-2xl border border-border/40 bg-popover/95 backdrop-blur-xl rounded-xl"
				>
					<div className="flex flex-col py-1">
						<div className="px-3 py-2 border-b border-border/40">
							<h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground/80">
								Keyboard Shortcuts
							</h4>
						</div>
						<div className="max-h-[400px] overflow-y-auto p-2 space-y-3 custom-scrollbar">
							{Object.entries(categories).map(([category, items]) => (
								<div key={category}>
									<div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 px-1">
										{category}
									</div>
									<div className="space-y-0.5">
										{items.map((shortcut) => (
											<div
												key={`${shortcut.category}-${shortcut.description}`}
												className="flex items-center justify-between text-sm px-2 py-1.5 hover:bg-muted/50 rounded-md transition-colors"
											>
												<span className="text-muted-foreground text-xs">
													{shortcut.description}
												</span>
												<div className="flex items-center gap-1">
													{shortcut.keys.map((key) => (
														<kbd
															key={`${shortcut.description}-${key}`}
															className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border"
														>
															{key}
														</kbd>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				</PopoverContent>
			</Popover>
		);
	},
);

KeyboardShortcutsHelpView.displayName = "KeyboardShortcutsHelpView";
