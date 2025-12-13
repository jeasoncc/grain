import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedSidebarStore, SIDEBAR_DEFAULT_WIDTH } from "@/stores/unified-sidebar";
import { BooksPanel } from "./panels/books-panel";
import { SearchPanel } from "./panels/search-panel";
import { DrawingsPanel } from "./panels/drawings-panel";
import { WikiPanel } from "./panels/wiki-panel";
import { ChaptersPanel } from "./panels/chapters-panel";
import { DiaryPanel } from "./panels/diary-panel";
import { ResizeHandle } from "./ui/resize-handle";
import { Button } from "./ui/button";
import type { DrawingInterface, WikiEntryInterface } from "@/db/schema";

export function UnifiedSidebar() {
	const navigate = useNavigate();
	const {
		activePanel,
		isOpen,
		width,
		wasCollapsedByDrag,
		drawingsState,
		wikiState,
		setSelectedDrawingId,
		setSelectedWikiEntryId,
		resizeSidebar,
		restoreFromCollapse,
	} = useUnifiedSidebarStore();

	// Track drag start width for delta calculations
	const [dragStartWidth, setDragStartWidth] = useState(width);
	const [isResizing, setIsResizing] = useState(false);

	const handleResizeStart = useCallback(() => {
		setDragStartWidth(width);
		setIsResizing(true);
	}, [width]);

	const handleResize = useCallback(
		(deltaX: number) => {
			const newWidth = dragStartWidth + deltaX;
			resizeSidebar(newWidth);
		},
		[dragStartWidth, resizeSidebar]
	);

	const handleResizeEnd = useCallback(() => {
		setIsResizing(false);
	}, []);

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
				"shrink-0 bg-sidebar border-r border-sidebar-border/30 relative",
				"flex flex-col h-full",
				// Only animate when not actively resizing
				!isResizing && "transition-[width] duration-200 ease-out",
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
			{activePanel === "diary" && <DiaryPanel />}

			{/* Resize handle on right edge */}
			<ResizeHandle
				position="right"
				onResizeStart={handleResizeStart}
				onResize={handleResize}
				onResizeEnd={handleResizeEnd}
			/>
		</div>
	);
}
