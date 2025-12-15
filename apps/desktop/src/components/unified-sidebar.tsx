import { useNavigate } from "@tanstack/react-router";
import { PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedSidebarStore } from "@/stores/unified-sidebar";
import { SearchPanel } from "./panels/search-panel";
import { DrawingsPanel } from "./panels/drawings-panel";
import { WikiPanel } from "./panels/wiki-panel";
import { FileTreePanel } from "./panels/file-tree-panel";
import { TagGraphPanel } from "./panels/tag-graph-panel";
import { Button } from "./ui/button";
import type { DrawingInterface, WikiEntryInterface } from "@/db/schema";

/**
 * UnifiedSidebarContent - The content of the sidebar without resize handling
 * Used inside react-resizable-panels Panel component
 */
export function UnifiedSidebarContent() {
	const navigate = useNavigate();
	const {
		activePanel,
		drawingsState,
		wikiState,
		setSelectedDrawingId,
		setSelectedWikiEntryId,
	} = useUnifiedSidebarStore();

	// Handle drawing selection - update store and navigate to canvas
	const handleSelectDrawing = (drawing: DrawingInterface) => {
		setSelectedDrawingId(drawing.id);
		navigate({ to: "/canvas" });
	};

	// Handle wiki entry selection - update store and navigate to wiki page
	const handleSelectWikiEntry = (entry: WikiEntryInterface) => {
		setSelectedWikiEntryId(entry.id);
		navigate({ to: "/wiki" });
	};

	return (
		<div className="flex flex-col h-full w-full overflow-hidden">
			{activePanel === "search" && <SearchPanel />}
			{activePanel === "drawings" && (
				<DrawingsPanel
					onSelectDrawing={handleSelectDrawing}
					selectedDrawingId={drawingsState.selectedDrawingId}
				/>
			)}
			{activePanel === "wiki" && (
				<WikiPanel
					onSelectEntry={handleSelectWikiEntry}
					selectedEntryId={wikiState.selectedEntryId}
				/>
			)}
			{activePanel === "files" && <FileTreePanel />}
			{activePanel === "tags" && <TagGraphPanel />}
		</div>
	);
}

/**
 * UnifiedSidebar - Legacy wrapper for backward compatibility
 * @deprecated Use UnifiedSidebarContent with react-resizable-panels instead
 */
export function UnifiedSidebar() {
	const {
		activePanel,
		isOpen,
		wasCollapsedByDrag,
		restoreFromCollapse,
	} = useUnifiedSidebarStore();

	// Show restore button when collapsed by drag
	if (!isOpen && wasCollapsedByDrag) {
		return (
			<div className="shrink-0 flex items-start pt-2 pl-1">
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-muted-foreground hover:text-foreground"
					onClick={restoreFromCollapse}
					title="Restore sidebar"
				>
					<PanelLeftOpen className="h-4 w-4" />
				</Button>
			</div>
		);
	}

	if (!isOpen || !activePanel) {
		return null;
	}

	return <UnifiedSidebarContent />;
}
