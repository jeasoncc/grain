/**
 * Drawing Workspace - Book-level drawing management and editing
 */

import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { Download, Edit3, Eye, Maximize2, Minimize2, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { saveDrawingContent, updateDrawing } from "@/services/drawings";
import type { DrawingInterface } from "@/db/schema";

interface DrawingWorkspaceProps {
	drawing: DrawingInterface;
	onDelete?: (id: string) => void;
	onRename?: (id: string, name: string) => void;
	className?: string;
}

export function DrawingWorkspace({
	drawing,
	onDelete,
	onRename,
	className,
}: DrawingWorkspaceProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [tempName, setTempName] = useState(drawing.name);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	// biome-ignore lint/suspicious/noExplicitAny: Excalidraw API 类型复杂
	const excalidrawRef = useRef<any>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const { isDark } = useTheme();

	// Parse drawing data
	const drawingData = drawing.content
		? JSON.parse(drawing.content)
		: { elements: [], appState: {}, files: {} };

	// Calculate responsive size based on container
	const [containerSize, setContainerSize] = useState({
		width: drawing.width,
		height: drawing.height,
	});

	// Update container size on resize
	useEffect(() => {
		const updateSize = () => {
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				const maxWidth = Math.max(600, rect.width - 32); // Min 600px with padding
				const maxHeight = Math.max(400, Math.min(800, window.innerHeight * 0.6)); // Responsive height
				
				setContainerSize({
					width: Math.min(drawing.width, maxWidth),
					height: Math.min(drawing.height, maxHeight),
				});
			}
		};

		updateSize();
		window.addEventListener('resize', updateSize);
		return () => window.removeEventListener('resize', updateSize);
	}, [drawing.width, drawing.height]);

	// Save drawing data
	const saveData = useCallback(
		// biome-ignore lint/suspicious/noExplicitAny: Excalidraw 类型
		async (elements: readonly any[], appState: any, files: any) => {
			const dataToSave = {
				elements: elements as any[],
				appState: {
					viewBackgroundColor: appState.viewBackgroundColor,
					gridSize: appState.gridSize,
				},
				files,
			};

			try {
				await saveDrawingContent(
					drawing.id,
					JSON.stringify(dataToSave),
					containerSize.width,
					containerSize.height,
				);
				setHasUnsavedChanges(false);
			} catch (error) {
				console.error("Failed to save drawing:", error);
				toast.error("Failed to save drawing");
			}
		},
		[drawing.id, containerSize],
	);

	// Handle rename
	const handleRename = useCallback(async () => {
		if (tempName.trim() && tempName !== drawing.name) {
			try {
				await updateDrawing(drawing.id, { name: tempName.trim() });
				onRename?.(drawing.id, tempName.trim());
				toast.success("Drawing renamed");
			} catch (error) {
				console.error("Failed to rename drawing:", error);
				toast.error("Failed to rename drawing");
			}
		}
		setIsRenaming(false);
	}, [drawing.id, drawing.name, tempName, onRename]);

	// Handle delete
	const handleDelete = useCallback(() => {
		if (window.confirm(`Are you sure you want to delete "${drawing.name}"?`)) {
			onDelete?.(drawing.id);
		}
	}, [drawing.id, drawing.name, onDelete]);

	// Export as image
	const exportAsImage = useCallback(async () => {
		if (!excalidrawRef.current) return;

		const elements = excalidrawRef.current.getSceneElements();
		const appState = excalidrawRef.current.getAppState();
		const files = excalidrawRef.current.getFiles();

		try {
			const blob = await exportToBlob({
				elements,
				appState: {
					...appState,
					exportWithDarkMode: isDark,
				},
				files,
				mimeType: "image/png",
			});

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${drawing.name}-${Date.now()}.png`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Drawing exported");
		} catch (error) {
			console.error("Export failed:", error);
			toast.error("Export failed");
		}
	}, [isDark, drawing.name]);

	// Manual save
	const handleSave = useCallback(async () => {
		if (excalidrawRef.current) {
			const elements = excalidrawRef.current.getSceneElements();
			const appState = excalidrawRef.current.getAppState();
			const files = excalidrawRef.current.getFiles();
			await saveData(elements, appState, files);
			toast.success("Drawing saved");
		}
	}, [saveData]);

	// Fullscreen mode
	useEffect(() => {
		if (isFullscreen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isFullscreen]);

	// Render preview mode
	const renderPreview = () => {
		if (drawingData.elements.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
					<Edit3 className="size-8" />
					<span>Click edit to start drawing</span>
				</div>
			);
		}

		return (
			<div className="pointer-events-none h-full">
				<Excalidraw
					initialData={drawingData}
					theme={isDark ? "dark" : "light"}
					viewModeEnabled={true}
					zenModeEnabled={true}
					UIOptions={{
						canvasActions: {
							changeViewBackgroundColor: false,
							clearCanvas: false,
							export: false,
							loadScene: false,
							saveToActiveFile: false,
							toggleTheme: false,
						},
					}}
				/>
			</div>
		);
	};

	// Render editor mode
	const renderEditor = () => (
		<Excalidraw
			excalidrawAPI={(api) => {
				excalidrawRef.current = api;
			}}
			initialData={drawingData}
			theme={isDark ? "dark" : "light"}
			onChange={(elements, appState, files) => {
				setHasUnsavedChanges(true);
				// Auto-save after 2 seconds of inactivity
				const timeoutId = setTimeout(() => {
					saveData(elements, appState, files);
				}, 2000);
				return () => clearTimeout(timeoutId);
			}}
			UIOptions={{
				canvasActions: {
					export: false,
					loadScene: false,
					saveToActiveFile: false,
				},
			}}
		/>
	);

	// Fullscreen mode
	if (isFullscreen) {
		return (
			<div className="fixed inset-0 z-50 bg-background">
				<div className="absolute top-2 right-2 z-10 flex gap-2">
					<Button
						variant="secondary"
						size="sm"
						onClick={handleSave}
						disabled={!hasUnsavedChanges}
						title="Save drawing"
					>
						<Save className="size-4 mr-1" />
						Save
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={exportAsImage}
						title="Export as image"
					>
						<Download className="size-4 mr-1" />
						Export
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							setIsFullscreen(false);
							setIsEditing(false);
						}}
						title="Exit fullscreen"
					>
						<Minimize2 className="size-4 mr-1" />
						Exit
					</Button>
				</div>
				<div className="h-full">{renderEditor()}</div>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className={cn(
				"group relative rounded-lg border overflow-hidden",
				isEditing ? "bg-background" : "bg-muted/30",
				className,
			)}
			style={{ 
				width: containerSize.width, 
				height: containerSize.height,
				minWidth: 400, // Minimum width to handle Excalidraw constraints
				minHeight: 300, // Minimum height to handle Excalidraw constraints
			}}
		>
			{/* Header with title and controls */}
			<div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
				<div className="flex items-center gap-2">
					{isRenaming ? (
						<Input
							value={tempName}
							onChange={(e) => setTempName(e.target.value)}
							onBlur={handleRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleRename();
								if (e.key === "Escape") {
									setTempName(drawing.name);
									setIsRenaming(false);
								}
							}}
							className="h-7 text-sm font-medium bg-background/90"
							autoFocus
						/>
					) : (
						<button
							onClick={() => setIsRenaming(true)}
							className="text-sm font-medium text-foreground/80 hover:text-foreground bg-background/90 px-2 py-1 rounded"
						>
							{drawing.name}
						</button>
					)}
					{hasUnsavedChanges && (
						<span className="text-xs text-orange-500 bg-background/90 px-1 rounded">
							Unsaved
						</span>
					)}
				</div>

				{/* Controls */}
				<div
					className={cn(
						"flex gap-1 transition-opacity",
						isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
					)}
				>
					{isEditing ? (
						<>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={handleSave}
								disabled={!hasUnsavedChanges}
								title="Save drawing"
							>
								<Save className="size-3.5" />
							</Button>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={() => setIsFullscreen(true)}
								title="Fullscreen edit"
							>
								<Maximize2 className="size-3.5" />
							</Button>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={exportAsImage}
								title="Export as image"
							>
								<Download className="size-3.5" />
							</Button>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={() => setIsEditing(false)}
								title="Finish editing"
							>
								<Eye className="size-3.5" />
							</Button>
						</>
					) : (
						<>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={() => setIsEditing(true)}
								title="Edit drawing"
							>
								<Edit3 className="size-3.5" />
							</Button>
							<Button
								variant="secondary"
								size="icon"
								className="size-7"
								onClick={() => setIsFullscreen(true)}
								title="Fullscreen view"
							>
								<Maximize2 className="size-3.5" />
							</Button>
						</>
					)}
					<Button
						variant="destructive"
						size="icon"
						className="size-7"
						onClick={handleDelete}
						title="Delete drawing"
					>
						<Trash2 className="size-3.5" />
					</Button>
				</div>
			</div>

			{/* Content area */}
			<div
				className="h-full pt-10" // Add padding for header
				onDoubleClick={() => !isEditing && setIsEditing(true)}
			>
				{isEditing ? renderEditor() : renderPreview()}
			</div>
		</div>
	);
}