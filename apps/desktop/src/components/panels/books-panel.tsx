/**
 * 书籍管理面板 - 统一侧边栏中的书籍管理功能
 */

import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
	BookMarked,
	LibraryBig,
	Plus,
} from "lucide-react";
import type * as React from "react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ScrollArea } from "@/components/ui/scroll-area";

import { db } from "@/db/curd";
import type {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";
import {
	createBook,
	importFromJson,
	readFileAsText,
} from "@/services/projects";

export function BooksPanel() {
	const projects = useLiveQuery<ProjectInterface[]>(
		() => db.getAllProjects(),
		[],
	);
	const chapters = useLiveQuery<ChapterInterface[]>(
		() => db.getAllChapters(),
		[],
	);
	const scenes = useLiveQuery<SceneInterface[]>(() => db.getAllScenes(), []);

	const projectList = projects ?? [];
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newBookData, setNewBookData] = useState({
		title: "",
		author: "",
		description: "",
	});

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleImportFile = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			try {
				const text = await readFileAsText(file);
				await importFromJson(text, { keepIds: false });
				toast.success("Library imported successfully");
			} catch (err) {
				toast.error("Import failed");
			} finally {
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[],
	);

	const handleCreateBook = async () => {
		if (!newBookData.title.trim()) {
			toast.error("Book title is required");
			return;
		}
		try {
			await createBook({
				title: newBookData.title,
				author: newBookData.author || "Me",
				description: newBookData.description,
			});
			setIsCreateOpen(false);
			setNewBookData({ title: "", author: "", description: "" });
		} catch (e) {
			// createBook handles toast
		}
	};

	return (
		<div className="flex h-full flex-col">
			{/* 头部 */}
			<div className="h-12 flex items-center px-4 border-b border-sidebar-border/20">
				<div className="flex items-center gap-2 font-semibold text-foreground/80">
					<LibraryBig className="size-5" />
					<span>My Library</span>
				</div>
			</div>

			{/* 内容区域 */}
			<ScrollArea className="flex-1">
				<div className="px-2 py-4">
					<div className="space-y-4">
						{/* 书籍列表标题 */}
						<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
							Books ({projectList.length})
						</div>

						{/* 书籍列表 */}
						<div className="space-y-1">
							{projectList.map((project) => {
								const chapterCount = (chapters ?? []).filter(
									(c) => c.project === project.id,
								).length;
								const sceneCount = (scenes ?? []).filter(
									(s) => s.project === project.id,
								).length;
								return (
									<Link
										key={project.id}
										to="/projects/$projectId"
										params={{ projectId: project.id }}
										className="flex items-start gap-3 h-auto py-3 px-3 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all group"
									>
										<div className="shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
											<BookMarked className="size-4" />
										</div>
										<div className="flex flex-col items-start gap-0.5 overflow-hidden">
											<span className="text-sm font-medium leading-tight truncate w-full">
												{project.title}
											</span>
											<span className="text-xs text-muted-foreground/70 truncate w-full font-light">
												{chapterCount} ch · {sceneCount} scenes
											</span>
										</div>
									</Link>
								);
							})}

							{/* 创建新书按钮 */}
							<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
								<DialogTrigger asChild>
									<button
										className="w-full mt-2 text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 justify-center group py-3 px-3 rounded-md flex items-center gap-2 transition-all"
										data-tour="create-book"
									>
										<Plus className="size-4 group-hover:scale-110 transition-transform" />
										<span>Create New Book</span>
									</button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Create New Book</DialogTitle>
									</DialogHeader>
									<div className="grid gap-4 py-4">
										<div className="grid gap-2">
											<Label htmlFor="title">Book Title</Label>
											<Input
												id="title"
												value={newBookData.title}
												onChange={(e) =>
													setNewBookData({
														...newBookData,
														title: e.target.value,
													})
												}
												placeholder="e.g. The Lost Kingdom"
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="author">Author</Label>
											<Input
												id="author"
												value={newBookData.author}
												onChange={(e) =>
													setNewBookData({
														...newBookData,
														author: e.target.value,
													})
												}
												placeholder="Me"
											/>
										</div>
										<div className="grid gap-2">
											<Label htmlFor="desc">Description (Optional)</Label>
											<Input
												id="desc"
												value={newBookData.description}
												onChange={(e) =>
													setNewBookData({
														...newBookData,
														description: e.target.value,
													})
												}
												placeholder="A short summary..."
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() => setIsCreateOpen(false)}
										>
											Cancel
										</Button>
										<Button onClick={handleCreateBook}>Create Book</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</div>
					</div>
				</div>
			</ScrollArea>

			{/* Hidden file input for import functionality */}
			<input
				type="file"
				ref={fileInputRef}
				className="hidden"
				accept=".json"
				onChange={handleImportFile}
			/>
		</div>
	);
}
