/**
 * StoryRightSidebar - 右侧边栏
 * 
 * 当 tabPosition 设置为 "right-sidebar" 时，显示编辑器标签页列表
 */

import { useMemo } from "react";
import { X, FileText, Calendar, Palette } from "lucide-react";
import type { DrawingInterface } from "@/db/schema";
import { useUIStore } from "@/domain/ui";
import { useEditorTabsStore, type EditorTab } from "@/domain/editor-tabs";
import { useSelectionStore } from "@/domain/selection";
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
	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
	const allTabs = useEditorTabsStore((s) => s.tabs);
	// 只显示当前 workspace 的标签
	const tabs = useMemo(() => 
		allTabs.filter(t => t.workspaceId === selectedWorkspaceId),
		[allTabs, selectedWorkspaceId]
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
		<aside className="w-56 shrink-0 border-l border-border/30 bg-sidebar/50 flex flex-col h-full backdrop-blur-sm group/panel hover:animate-[breathe-shadow_3s_ease-in-out_infinite]">
			{/* Header */}
			<div className="h-11 flex items-center px-4 justify-between shrink-0 group/header">
				<span className="text-sm font-semibold text-foreground/80 tracking-wide pl-1">
					Open Tabs
				</span>
				<span className="flex items-center justify-center min-w-[1.25rem] h-4 text-[10px] font-medium rounded-full bg-primary/10 text-primary px-1">
					{tabs.length}
				</span>
			</div>

			{/* Tabs List */}
			<div className="flex-1 overflow-y-auto p-2 pb-2 space-y-0.5 custom-scrollbar">
				{tabs.map((tab) => {
					const isActive = activeTabId === tab.id;
					return (
						<Tooltip key={tab.id}>
							<TooltipTrigger asChild>
								<button
									onClick={() => setActiveTab(tab.id)}
									className={cn(
										"group w-full flex items-center gap-2.5 px-2.5 py-1 text-sm rounded-md transition-all duration-200",
										isActive
											? "bg-primary/10 text-primary font-medium shadow-sm scale-[1.02]"
											: "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60"
									)}
								>
									<div className={cn("relative flex items-center justify-center transition-opacity duration-200 group-hover/panel:opacity-100", (!isActive && "opacity-40"))}>
										{isActive && (
											<div className="absolute inset-0 bg-primary/20 blur-[2px] rounded-full" />
										)}
										<div className={cn(isActive && "animate-[icon-glow_3s_ease-in-out_infinite]")}>
											{getTabIcon(tab.type)}
										</div>
									</div>
									<span className={cn("flex-1 truncate text-left transition-opacity duration-200 group-hover/panel:opacity-100 text-sm", (!isActive && "opacity-40"))}>
										{tab.isDirty && <span className="text-primary mr-1">●</span>}
										{tab.title}
									</span>
									<div
										role="button"
										tabIndex={0}
										className={cn(
											"flex items-center justify-center size-5 rounded-full transition-all",
											"opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground",
											isActive && "text-primary/60 hover:text-primary hover:bg-primary/10"
										)}
										onClick={(e) => {
											e.stopPropagation();
											closeTab(tab.id);
										}}
									>
										<X className="size-3" />
									</div>
								</button>
							</TooltipTrigger>
							<TooltipContent side="left" className="text-xs">
								{tab.title}
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
		</aside>
	);
}
