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
	Trophy,
	Sparkles,
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
import { db } from "@/db/curd";
import {
	countWords,
	estimateReadingTime,
	extractTextFromSerialized,
} from "@/lib/statistics";
import { cn } from "@/lib/utils";

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

		const chapterStats = projectChapters.map((chapter) => {
			const chapterScenes = projectScenes
				.filter((s) => s.chapter === chapter.id)
				.sort((a, b) => a.order - b.order);
			let chapterWords = 0;

			const scenesData = chapterScenes.map((scene) => {
				let text = "";
				try {
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

		// Find max chapter words for relative progress bars
		const maxChapterWords = Math.max(...chapterStats.map((c) => c.words), 1);

		return {
			project,
			totalChapters: projectChapters.length,
			totalScenes: projectScenes.length,
			totalWords,
			readingTime: estimateReadingTime(totalWords),
			chapters: chapterStats,
			maxChapterWords,
		};
	}, [projects, chapters, scenes, selectedProjectId]);

	if (!projects.length) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="text-center space-y-4 animate-in fade-in duration-500">
					<div className="size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
						<BarChart3 className="size-8 text-primary" />
					</div>
					<h2 className="text-xl font-semibold">No Projects Found</h2>
					<p className="text-muted-foreground">
						Create a project to view statistics.
					</p>
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-primary hover:underline"
					>
						<ArrowLeft className="size-4" />
						Go to Editor
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header with gradient */}
			<header className="sticky top-0 z-20 w-full border-b border-border/40 bg-gradient-to-r from-background via-background to-muted/30 backdrop-blur-xl">
				<div className="container flex h-16 max-w-screen-2xl items-center justify-between px-6">
					<div className="flex items-center gap-4">
						<Link
							to="/"
							className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
						>
							<ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
							Back
						</Link>
						<div className="h-5 w-px bg-border/60" />
						<div className="flex items-center gap-3">
							<div className="size-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
								<TrendingUp className="size-4 text-primary" />
							</div>
							<div>
								<h1 className="font-semibold text-base">Statistics</h1>
								<p className="text-xs text-muted-foreground">
									Track your writing progress
								</p>
							</div>
						</div>
					</div>

					<Select
						value={selectedProjectId || ""}
						onValueChange={setSelectedProjectId}
					>
						<SelectTrigger className="w-[220px] h-9 bg-background/60 border-border/60 hover:bg-background/80 transition-colors">
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
			</header>

			<main className="flex-1 container max-w-screen-2xl py-8 px-6 space-y-8">
				{stats && (
					<>
						{/* Overview Cards with staggered animation */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<StatCard
								title="Total Words"
								value={stats.totalWords.toLocaleString()}
								description="Across all chapters"
								icon={FileText}
								gradient="from-blue-500/10 to-cyan-500/10"
								iconBg="bg-blue-500/10"
								iconColor="text-blue-500"
								delay={0}
							/>
							<StatCard
								title="Reading Time"
								value={`${stats.readingTime} min`}
								description="Based on ~300 words/min"
								icon={Clock}
								gradient="from-amber-500/10 to-orange-500/10"
								iconBg="bg-amber-500/10"
								iconColor="text-amber-500"
								delay={1}
							/>
							<StatCard
								title="Chapters"
								value={stats.totalChapters.toString()}
								description="Active chapters"
								icon={BookOpen}
								gradient="from-emerald-500/10 to-green-500/10"
								iconBg="bg-emerald-500/10"
								iconColor="text-emerald-500"
								delay={2}
							/>
							<StatCard
								title="Scenes"
								value={stats.totalScenes.toString()}
								description="Total scene segments"
								icon={Layers}
								gradient="from-purple-500/10 to-pink-500/10"
								iconBg="bg-purple-500/10"
								iconColor="text-purple-500"
								delay={3}
							/>
						</div>

						{/* Detailed Breakdown */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Chapter Breakdown */}
							<Card
								className="lg:col-span-2 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
								style={{ animationDelay: "200ms", animationFillMode: "both" }}
							>
								<CardHeader className="bg-gradient-to-r from-muted/50 to-transparent pb-4">
									<div className="flex items-center gap-3">
										<div className="size-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
											<BarChart3 className="size-5 text-primary" />
										</div>
										<div>
											<CardTitle className="text-lg">
												Chapter Breakdown
											</CardTitle>
											<CardDescription>
												Word count distribution per chapter
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="pt-6">
									<div className="space-y-5">
										{stats.chapters.map((chapter, index) => (
											<ChapterProgressItem
												key={chapter.id}
												title={chapter.title}
												words={chapter.words}
												maxWords={stats.maxChapterWords}
												index={index}
											/>
										))}
										{stats.chapters.length === 0 && (
											<div className="text-center py-12 text-muted-foreground">
												<Sparkles className="size-8 mx-auto mb-3 opacity-50" />
												<p>No chapters found. Start writing!</p>
											</div>
										)}
									</div>
								</CardContent>
							</Card>

							{/* Scene Details */}
							<Card
								className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
								style={{ animationDelay: "300ms", animationFillMode: "both" }}
							>
								<CardHeader className="bg-gradient-to-r from-muted/50 to-transparent pb-4">
									<div className="flex items-center gap-3">
										<div className="size-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
											<Trophy className="size-5 text-amber-500" />
										</div>
										<div>
											<CardTitle className="text-lg">Top Scenes</CardTitle>
											<CardDescription>
												Longest scenes in the project
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="pt-6">
									<div className="space-y-3">
										{stats.chapters
											.flatMap((c) => c.scenes)
											.sort((a, b) => b.words - a.words)
											.slice(0, 8)
											.map((scene, i) => (
												<SceneRankItem
													key={scene.id}
													rank={i + 1}
													title={scene.title}
													chapterTitle={
														stats.chapters.find((c) => c.id === scene.chapter)
															?.title || ""
													}
													words={scene.words}
												/>
											))}
										{stats.totalScenes === 0 && (
											<div className="text-center py-12 text-muted-foreground">
												<Layers className="size-8 mx-auto mb-3 opacity-50" />
												<p>No scenes found. Start writing!</p>
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

// Stat Card Component
interface StatCardProps {
	title: string;
	value: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	gradient: string;
	iconBg: string;
	iconColor: string;
	delay: number;
}

function StatCard({
	title,
	value,
	description,
	icon: Icon,
	gradient,
	iconBg,
	iconColor,
	delay,
}: StatCardProps) {
	return (
		<Card
			className={cn(
				"relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
				"animate-in fade-in slide-in-from-bottom-4 duration-500",
			)}
			style={{
				animationDelay: `${delay * 75}ms`,
				animationFillMode: "both",
			}}
		>
			{/* Gradient background */}
			<div
				className={cn(
					"absolute inset-0 bg-gradient-to-br opacity-50",
					gradient,
				)}
			/>
			<CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
				<div className={cn("size-9 rounded-xl flex items-center justify-center", iconBg)}>
					<Icon className={cn("size-4", iconColor)} />
				</div>
			</CardHeader>
			<CardContent className="relative">
				<div className="text-3xl font-bold tracking-tight">{value}</div>
				<p className="text-xs text-muted-foreground mt-1">{description}</p>
			</CardContent>
		</Card>
	);
}

// Chapter Progress Item Component
interface ChapterProgressItemProps {
	title: string;
	words: number;
	maxWords: number;
	index: number;
}

function ChapterProgressItem({
	title,
	words,
	maxWords,
	index,
}: ChapterProgressItemProps) {
	const percentage = Math.min(100, (words / maxWords) * 100);

	return (
		<div
			className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-500"
			style={{
				animationDelay: `${300 + index * 50}ms`,
				animationFillMode: "both",
			}}
		>
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium truncate max-w-[250px]">{title}</span>
				<span className="text-muted-foreground tabular-nums">
					{words.toLocaleString()} words
				</span>
			</div>
			<div className="h-2.5 w-full bg-secondary/50 rounded-full overflow-hidden">
				<div
					className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-700 ease-out"
					style={{
						width: `${percentage}%`,
						transitionDelay: `${400 + index * 50}ms`,
					}}
				/>
			</div>
		</div>
	);
}

// Scene Rank Item Component
interface SceneRankItemProps {
	rank: number;
	title: string;
	chapterTitle: string;
	words: number;
}

function SceneRankItem({ rank, title, chapterTitle, words }: SceneRankItemProps) {
	const getRankStyle = (rank: number) => {
		switch (rank) {
			case 1:
				return "bg-gradient-to-br from-amber-400 to-amber-600 text-white";
			case 2:
				return "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800";
			case 3:
				return "bg-gradient-to-br from-amber-600 to-amber-800 text-white";
			default:
				return "bg-muted text-muted-foreground";
		}
	};

	return (
		<div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
			<div
				className={cn(
					"size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
					getRankStyle(rank),
				)}
			>
				{rank}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
					{title}
				</p>
				<p className="text-xs text-muted-foreground truncate">
					{chapterTitle}
				</p>
			</div>
			<div className="text-sm font-semibold tabular-nums text-muted-foreground">
				{words.toLocaleString()}
			</div>
		</div>
	);
}
