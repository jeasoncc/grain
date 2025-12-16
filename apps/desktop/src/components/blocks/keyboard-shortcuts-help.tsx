/**
 * 快捷键帮助面板
 */
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

const shortcuts = [
	{ keys: ["F11"], description: "进入专注模式" },
	{ keys: ["Ctrl", "Enter"], description: "进入专注模式" },
	{ keys: ["Esc"], description: "退出专注模式" },
	{ keys: ["Ctrl", "T"], description: "打字机模式" },
	{ keys: ["Ctrl", "B"], description: "加粗" },
	{ keys: ["Ctrl", "I"], description: "斜体" },
	{ keys: ["Ctrl", "U"], description: "下划线" },
	{ keys: ["Ctrl", "Z"], description: "撤销" },
	{ keys: ["Ctrl", "Shift", "Z"], description: "重做" },
];

export function KeyboardShortcutsHelp() {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="size-7">
					<Keyboard className="size-3.5" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 p-0 shadow-2xl border border-border/40 bg-popover/95 backdrop-blur-xl rounded-xl">
				<div className="flex flex-col py-1">
					<div className="px-3 py-2 border-b border-border/40">
						<h4 className="font-medium text-xs uppercase tracking-wider text-muted-foreground/80">Shortcuts</h4>
					</div>
					<div className="max-h-[300px] overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
						{shortcuts.map((shortcut, index) => (
							<div
								key={index}
								className="flex items-center justify-between text-sm px-2 py-1.5 hover:bg-muted/50 rounded-md transition-colors"
							>
								<span className="text-muted-foreground text-xs">
									{shortcut.description}
								</span>
								<div className="flex items-center gap-1">
									{shortcut.keys.map((key, keyIndex) => (
										<kbd
											key={keyIndex}
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
			</PopoverContent>
		</Popover>
	);
}
