/**
 * Buffer Switcher View - Emacs 风格的标签切换器展示组件
 */

import { Calendar, FileText, Palette } from "lucide-react";
import { memo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EditorTab } from "@/types/editor-tab";
import type { BufferSwitcherViewProps } from "./buffer-switcher.types";

/**
 * 获取标签页图标
 */
const getTabIcon = (type: EditorTab["type"]) => {
	switch (type) {
		case "diary":
			return <Calendar className="size-4" />;
		case "canvas":
			return <Palette className="size-4" />;
		default:
			return <FileText className="size-4" />;
	}
};

/**
 * Buffer Switcher 纯展示组件
 */
export const BufferSwitcherView = memo(
	({
		open,
		onOpenChange,
		tabs,
		selectedIndex,
		onTabClick,
	}: BufferSwitcherViewProps) => {
		if (tabs.length === 0) return null;

		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className="max-w-md p-2"
					onPointerDownOutside={(e) => e.preventDefault()}
				>
					<div className="space-y-1">
						{tabs.map((tab, index) => (
							<button
								type="button"
								key={tab.id}
								className={cn(
									"w-full flex items-center gap-3 px-3 py-2 rounded-md text-left",
									"hover:bg-accent transition-colors",
									index === selectedIndex && "bg-accent",
								)}
								onClick={() => onTabClick(tab.id)}
							>
								{getTabIcon(tab.type)}
								<span className="flex-1 truncate text-sm">{tab.title}</span>
								{tab.isDirty && <span className="text-primary text-xs">●</span>}
							</button>
						))}
					</div>
					<p className="text-xs text-muted-foreground text-center mt-2">
						按住 Ctrl + Tab 切换，释放 Ctrl 确认
					</p>
				</DialogContent>
			</Dialog>
		);
	},
);

BufferSwitcherView.displayName = "BufferSwitcherView";
