/**
 * NewNodeDialog Component
 * Dialog for creating new folders or files in the file tree.
 *
 * Requirements: 1.1, 1.2
 */

import { FileText, Folder, PenTool } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NodeType } from "@/db/schema";
import { cn } from "@/lib/utils";

export interface NewNodeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	parentId: string | null;
	onCreateNode: (
		parentId: string | null,
		type: NodeType,
		title: string,
	) => void;
	defaultType?: NodeType;
}

type CreatableNodeType = "folder" | "file" | "canvas" | "diary";

const nodeTypeConfig: Record<
	CreatableNodeType,
	{ icon: typeof Folder; label: string; description: string }
> = {
	folder: {
		icon: Folder,
		label: "Folder",
		description: "Create a folder to organize files",
	},
	file: {
		icon: FileText,
		label: "Text File",
		description: "Create a text document",
	},
	canvas: {
		icon: PenTool,
		label: "Canvas",
		description: "Create a drawing canvas",
	},
	diary: {
		icon: FileText,
		label: "Diary",
		description: "Create a diary entry",
	},
};

export function NewNodeDialog({
	open,
	onOpenChange,
	parentId,
	onCreateNode,
	defaultType = "file",
}: NewNodeDialogProps) {
	const [title, setTitle] = useState("");
	const [selectedType, setSelectedType] =
		useState<CreatableNodeType>(defaultType);
	const [error, setError] = useState<string | null>(null);

	// Reset state when dialog opens
	useEffect(() => {
		if (open) {
			setTitle("");
			setSelectedType(defaultType);
			setError(null);
		}
	}, [open, defaultType]);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();

			const trimmedTitle = title.trim();
			if (!trimmedTitle) {
				setError("Title cannot be empty");
				return;
			}

			onCreateNode(parentId, selectedType, trimmedTitle);
			onOpenChange(false);
		},
		[title, selectedType, parentId, onCreateNode, onOpenChange],
	);

	const handleTitleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setTitle(e.target.value);
			if (error) setError(null);
		},
		[error],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							Create New {nodeTypeConfig[selectedType].label}
						</DialogTitle>
						<DialogDescription>
							{parentId
								? "Create inside the selected folder"
								: "Create at root level"}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Type Selection */}
						<div className="space-y-2">
							<Label>Type</Label>
							<div className="grid grid-cols-3 gap-2">
								{(Object.keys(nodeTypeConfig) as CreatableNodeType[]).map(
									(type) => {
										const config = nodeTypeConfig[type];
										const Icon = config.icon;
										return (
											<button
												key={type}
												type="button"
												onClick={() => setSelectedType(type)}
												className={cn(
													"flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors",
													selectedType === type
														? "border-primary bg-primary/10 text-primary"
														: "border-border hover:border-primary/50 hover:bg-muted/50",
												)}
											>
												<Icon className="size-5" />
												<span className="text-xs font-medium">
													{config.label}
												</span>
											</button>
										);
									},
								)}
							</div>
						</div>

						{/* Title Input */}
						<div className="space-y-2">
							<Label htmlFor="node-title">Title</Label>
							<Input
								id="node-title"
								value={title}
								onChange={handleTitleChange}
								placeholder={`Enter ${nodeTypeConfig[selectedType].label.toLowerCase()} name...`}
								autoFocus
								aria-invalid={!!error}
							/>
							{error && <p className="text-sm text-destructive">{error}</p>}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!title.trim()}>
							Create
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
