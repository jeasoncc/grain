import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useUnifiedSidebarStore } from "@/stores/unified-sidebar";
import { BooksPanel } from "./panels/books-panel";
import { SearchPanel } from "./panels/search-panel";
import { DrawingsPanel } from "./panels/drawings-panel";
import { WikiPanel } from "./panels/wiki-panel";
import { ChaptersPanel } from "./panels/chapters-panel";
import type { DrawingInterface, WikiEntryInterface } from "@/db/schema";

export function UnifiedSidebar() {
	const navigate = useNavigate();
	const {
		activePanel,
		isOpen,
		width,
		drawingsState,
		wikiState,
		setSelectedDrawingId,
		setSelectedWikiEntryId,
	} = useUnifiedSidebarStore();

	if (!isOpen || !activePanel) {
		return null;
	}

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
		<div
			className={cn(
				"shrink-0 bg-sidebar border-r border-sidebar-border/30 transition-all duration-200",
				"flex flex-col h-full",
			)}
			style={{ width: `${width}px` }}
		>
			{activePanel === "search" && <SearchPanel />}
			{activePanel === "books" && <BooksPanel />}
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
			{activePanel === "chapters" && <ChaptersPanel />}
		</div>
	);
}
