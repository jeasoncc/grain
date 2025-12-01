import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import {
	ArrowLeft,
	BarChart3,
	BookOpen,
	Clock,
	FileText,
	Layers,
	TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { db } from "@/db/curd";
import {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";
import {
	countWords,
	estimateReadingTime,
	extractTextFromSerialized,
} from "@/lib/statistics";

export const Route = createFileRoute("/statistics")({
	component: StatisticsPage,
});

function StatisticsPage() {
	const projects = useLiveQuery(() => db.getAllProjects(), []) || [];
	const chapters = useLiveQuery(() => db.getAllChapters(), []) || [];
	const scenes = useLiveQuery(() => db.getAllScenes(), []) || [];

	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
		null,
	);

	// Default to first project if none selected
	if (!selectedProjectId && projects.length > 0) {
		setSelectedProjectId(projects[0].id);
	}

	const stats = useMemo(() => {
		if (!selectedProjectId) return null;

		const project = projects.find((p) => p.id === selectedProjectId);
		const projectChapters = chapters
			.filter((c) => c.project === selectedProjectId)
			.sort((a, b) => a.order - b.order);
		const projectScenes = scenes.filter((s) => s.project === selectedProjectId);

		let totalWords = 0;
		const totalChars = 0; // Placeholder if we distinguish later

		const chapterStats = projectChapters.map((chapter) => {
			const chapterScenes = projectScenes
				.filter((s) => s.chapter === chapter.id)
				.sort((a, b) => a.order - b.order);
			let chapterWords = 0;

			const scenesData = chapterScenes.map((scene) => {
				let text = "";
				try {
					// Handle both stringified JSON and plain string
					if (
						typeof scene.content === "string" &&
						scene.content.startsWith("{")
					) {
						text = extractTextFromSerialized(JSON.parse(scene.content));
					} else {
						text =
							extractTextFromSerialized(scene.content) ||
							(typeof scene.content === "string" ? scene.content : "");
					}
				} catch (e) {
					text = "";
				}

				const words = countWords(text);
				chapterWords += words;
				return {
					...scene,
					words,
				};
			});

			totalWords += chapterWords;

			return {
				...chapter,
				words: chapterWords,
				scenes: scenesData,
			};
		});

		return {
			project,
			totalChapters: projectChapters.length,
			totalScenes: projectScenes.length,
			totalWords,
			readingTime: estimateReadingTime(totalWords),
			chapters: chapterStats,
		};
	}, [projects, chapters, scenes, selectedProjectId]);

	if (!projects.length) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center space-y-4">
					<BarChart3 className="size-12 text-muted-foreground mx-auto" />
					<h2 className="text-xl font-semibold">No Projects Found</h2>
					<p className="text-muted-foreground">
						Create a project to view statistics.
					</p>
					<Link to="/" className="text-primary hover:underline">
						Go to Editor
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header */}
			<header className="sticky top-0 z-20 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
				<div className="container flex h-14 max-w-screen-2xl items-center justify-between">
					<div className="flex items-center gap-4">
						<Link
							to="/"
							className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowLeft className="size-4" />
							Back
						</Link>
						<div className="h-4 w-px bg-border" />
						<h1 className="font-semibold text-sm flex items-center gap-2">
							<TrendingUp className="size-4" />
							Statistics
						</h1>
					</div>

					<div className="w-[200px]">
						<Select
							value={selectedProjectId || ""}
							onValueChange={setSelectedProjectId}
						>
							<SelectTrigger className="h-8">
								<SelectValue placeholder="Select Project" />
							</SelectTrigger>
							<SelectContent>
								{projects.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</header>

			<main className="flex-1 container max-w-screen-2xl py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
				{stats && (
					<>
						{/* Overview Cards */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">
										Total Words
									</CardTitle>
									<FileText className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{stats.totalWords.toLocaleString()}
									</div>
									<p className="text-xs text-muted-foreground">
										Across all chapters
									</p>
								</CardContent>
							</Card>
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">
										Est. Reading Time
									</CardTitle>
									<Clock className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{stats.readingTime} min
									</div>
									<p className="text-xs text-muted-foreground">
										Based on ~300 words/min
									</p>
								</CardContent>
							</Card>
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">
										Chapters
									</CardTitle>
									<BookOpen className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">
										{stats.totalChapters}
									</div>
									<p className="text-xs text-muted-foreground">
										Active chapters
									</p>
								</CardContent>
							</Card>
							<Card>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<CardTitle className="text-sm font-medium">Scenes</CardTitle>
									<Layers className="h-4 w-4 text-muted-foreground" />
								</CardHeader>
								<CardContent>
									<div className="text-2xl font-bold">{stats.totalScenes}</div>
									<p className="text-xs text-muted-foreground">
										Total scene segments
									</p>
								</CardContent>
							</Card>
						</div>

						{/* Detailed Breakdown */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
							{/* Chapter Breakdown Chart (Simple Visual) */}
							<Card className="lg:col-span-2">
								<CardHeader>
									<CardTitle>Chapter Breakdown</CardTitle>
									<CardDescription>
										Word count distribution per chapter.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{stats.chapters.map((chapter) => (
											<div key={chapter.id} className="space-y-1">
												<div className="flex items-center justify-between text-sm">
													<span className="font-medium truncate max-w-[200px]">
														{chapter.title}
													</span>
													<span className="text-muted-foreground">
														{chapter.words.toLocaleString()} words
													</span>
												</div>
												<div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
													<div
														className="h-full bg-primary transition-all"
														style={{
															width: `${Math.min(100, (chapter.words / (stats.totalWords || 1)) * 100 * (stats.chapters.length * 0.8))}%`,
														}}
													/>
													{/* Note: The width calc is a heuristic to make bars visible relative to total. 
                                                A better way is relative to the max chapter length. */}
												</div>
											</div>
										))}
										{stats.chapters.length === 0 && (
											<div className="text-center py-8 text-muted-foreground">
												No chapters found.
											</div>
										)}
									</div>
								</CardContent>
							</Card>

							{/* Scene Distribution */}
							<Card>
								<CardHeader>
									<CardTitle>Scene Details</CardTitle>
									<CardDescription>
										Longest scenes in the project.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{stats.chapters
											.flatMap((c) => c.scenes)
											.sort((a, b) => b.words - a.words)
											.slice(0, 8)
											.map((scene, i) => (
												<div key={scene.id} className="flex items-center gap-3">
													<div className="size-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
														{i + 1}
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium truncate">
															{scene.title}
														</p>
														<p className="text-xs text-muted-foreground truncate">
															Chapter:{" "}
															{
																stats.chapters.find(
																	(c) => c.id === scene.chapter,
																)?.title
															}
														</p>
													</div>
													<div className="text-sm font-medium tabular-nums">
														{scene.words}
													</div>
												</div>
											))}
										{stats.totalScenes === 0 && (
											<div className="text-center py-8 text-muted-foreground">
												No scenes found.
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</div>
					</>
				)}
			</main>
		</div>
	);
}
