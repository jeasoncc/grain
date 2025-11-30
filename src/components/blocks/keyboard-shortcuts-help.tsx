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
			<PopoverContent align="end" className="w-72">
				<div className="space-y-3">
					<h4 className="font-medium text-sm">快捷键</h4>
					<div className="space-y-2">
						{shortcuts.map((shortcut, index) => (
							<div
								key={index}
								className="flex items-center justify-between text-sm"
							>
								<span className="text-muted-foreground">
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
