/**
 * StoryRightSidebar - 右侧边栏
 * 
 * 当 tabPosition 设置为 "right-sidebar" 时，显示编辑器标签页列表
 */

import { useMemo } from "react";
import { X, FileText, Calendar, Palette } from "lucide-react";
import type { DrawingInterface } from "@/db/schema";
import { useUIStore } from "@/stores/ui";
import { useEditorTabsStore, type EditorTab } from "@/stores/editor-tabs";
import { useSelectionStore } from "@/stores/selection";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface StoryRightSidebarProps {
	onSelectDrawing?: (drawing: DrawingInterface | null) => void;
	selectedDrawing?: DrawingInterface | null;
}

export function StoryRightSidebar({ 
	onSelectDrawing, 
	selectedDrawing 
}: StoryRightSidebarProps = {}) {
	const tabPosition = useUIStore((s) => s.tabPosition);
	const selectedProjectId = useSelectionStore((s) => s.selectedProjectId);
	const allTabs = useEditorTabsStore((s) => s.tabs);
	// 只显示当前 workspace 的标签
	const tabs = useMemo(() => 
		allTabs.filter(t => t.projectId === selectedProjectId),
		[allTabs, selectedProjectId]
	);
	const activeTabId = useEditorTabsStore((s) => s.activeTabId);
	const setActiveTab = useEditorTabsStore((s) => s.setActiveTab);
	const closeTab = useEditorTabsStore((s) => s.closeTab);

	// 只有当 tabPosition 为 "right-sidebar" 时才显示
	if (tabPosition !== "right-sidebar") {
		return null;
	}

	// 如果没有打开的标签页，不显示
	if (tabs.length === 0) {
		return null;
	}

	const getTabIcon = (type: EditorTab["type"]) => {
		switch (type) {
			case "diary":
				return <Calendar className="size-4 shrink-0" />;
			case "canvas":
				return <Palette className="size-4 shrink-0" />;
			default:
				return <FileText className="size-4 shrink-0" />;
		}
	};

	return (
		<aside className="w-56 shrink-0 border-l border-border/30 bg-sidebar flex flex-col h-full">
			{/* Header */}
			<div className="h-11 flex items-center px-3 border-b border-border/30">
				<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Open Tabs
				</span>
				<span className="ml-auto text-xs text-muted-foreground">
					{tabs.length}
				</span>
			</div>

			{/* Tabs List */}
			<div className="flex-1 overflow-y-auto py-1">
				{tabs.map((tab) => (
					<Tooltip key={tab.id}>
						<TooltipTrigger asChild>
							<button
								onClick={() => setActiveTab(tab.id)}
								className={cn(
									"group w-full flex items-center gap-2 px-3 py-2 text-sm",
									"hover:bg-accent/50 transition-colors",
									activeTabId === tab.id
										? "bg-accent text-accent-foreground border-l-2 border-l-primary"
										: "text-muted-foreground hover:text-foreground"
								)}
							>
								{getTabIcon(tab.type)}
								<span className="flex-1 truncate text-left text-xs">
									{tab.isDirty && <span className="text-primary mr-1">●</span>}
									{tab.title}
								</span>
								<Button
									variant="ghost"
									size="icon"
									className="size-5 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-opacity shrink-0"
									onClick={(e) => {
										e.stopPropagation();
										closeTab(tab.id);
									}}
								>
									<X className="size-3" />
								</Button>
							</button>
						</TooltipTrigger>
						<TooltipContent side="left" className="text-xs">
							{tab.title}
						</TooltipContent>
					</Tooltip>
				))}
			</div>
		</aside>
	);
}
