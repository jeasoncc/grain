import {
	ArrowRight,
	ArrowUpRightIcon,
	BookPlus,
	CalendarCheck,
	LucideFolderOpen,
	PenLine,
	Stars,
	Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
interface EmptyProjectProps {
	onCreate: () => void;
	onImport?: () => void;
	onLearnMore?: () => void;
}

export function EmptyProject({
	onCreate,
	onImport,
	onLearnMore,
}: EmptyProjectProps) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-foreground">
			<div className="w-full max-w-4xl space-y-8">
				<div className="rounded-3xl border bg-card/80 p-10 shadow-2xl ring-1 ring-border backdrop-blur">
					<div className="flex flex-col items-center gap-3 text-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-accent text-accent-foreground">
							<LucideFolderOpen className="size-7" />
						</div>
						<h1 className="text-3xl font-semibold tracking-tight text-foreground">
							Welcome to your story headquarters
						</h1>
						<p className="max-w-2xl text-base text-muted-foreground">
							Spin up a Trillium-inspired workspace for outlining arcs, capturing lore, and orchestrating your publishing pipeline. Everything stays cohesive—chapters, scenes, characters, research, and AI tools in one command center.
						</p>
					</div>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
						<Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onCreate}>
							<BookPlus className="mr-2 size-4" />
							Create a new project
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="border-border bg-card text-card-foreground hover:bg-accent"
							onClick={onImport}
						>
							<ArrowRight className="mr-2 size-4" />
							Import existing story
						</Button>
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded-2xl border bg-card p-6 shadow-lg">
						<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
							<PenLine className="size-4 text-emerald-300" />
							Narrative toolkit
						</div>
						<ul className="mt-3 space-y-2 text-sm text-muted-foreground">
							<li>• Multi-level outline tree with focus mode</li>
							<li>• Scene drafting panels & quick synopsis</li>
							<li>• Act/beat breakdown, goal vs. conflict tracking</li>
						</ul>
					</div>
					<div className="rounded-2xl border bg-card p-6 shadow-lg">
						<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
							<CalendarCheck className="size-4 text-sky-300" />
							Productivity engine
						</div>
						<ul className="mt-3 space-y-2 text-sm text-muted-foreground">
							<li>• Visual timelines, streaks, and milestone tracker</li>
							<li>• Session planner with Pomodoro cadence</li>
							<li>• Publishing pipeline checklist with Tauri packaging</li>
						</ul>
					</div>
					<div className="rounded-2xl border bg-card p-6 shadow-lg">
						<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
							<Users className="size-4 text-purple-300" />
							Knowledge vault
						</div>
						<ul className="mt-3 space-y-2 text-sm text-muted-foreground">
							<li>• Characters, locations, lore entries with cross-links</li>
							<li>• Research snippets, reference boards, inspiration feed</li>
							<li>• AI co-writing prompts and snippet curation</li>
						</ul>
					</div>
				</div>

				<div className="rounded-3xl border bg-card p-8 shadow-xl">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
								<Stars className="size-4 text-amber-300" />
								Lift-off checklist
							</div>
							<h2 className="mt-1 text-xl font-semibold text-foreground">
								Set the foundation for a cohesive universe
							</h2>
						</div>
						<Button
							variant="outline"
							className="border-border bg-card text-card-foreground hover:bg-accent"
							onClick={onLearnMore}
						>
							View full playbook
							<ArrowUpRightIcon className="ml-2 size-4" />
						</Button>
					</div>
					<div className="mt-5 grid gap-3 md:grid-cols-2">
						<div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-card-foreground">
							<p className="font-medium text-foreground">1. Define the macro plot</p>
							<p className="mt-1 text-muted-foreground">
								Draft your series bible—acts, arcs, pivotal reveals, antagonistic forces, and lore anchors.
							</p>
						</div>
						<div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-card-foreground">
							<p className="font-medium text-foreground">2. Scaffold chapters & beats</p>
							<p className="mt-1 text-muted-foreground">
								Create hierarchical outlines with beat tags, POV notes, and tonal markers for each chapter.
							</p>
						</div>
						<div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-card-foreground">
							<p className="font-medium text-foreground">3. Seed your knowledge vault</p>
							<p className="mt-1 text-muted-foreground">
								Add characters, factions, locations, and research references; link them to scenes for continuity.
							</p>
						</div>
						<div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-card-foreground">
							<p className="font-medium text-foreground">4. Plan cadence & output</p>
							<p className="mt-1 text-muted-foreground">
								Set focus sessions, AI experiments, revision stages, and publishing deliverables.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
