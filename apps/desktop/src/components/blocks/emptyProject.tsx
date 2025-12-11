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

export function EmptyProject({ onCreate, onImport }: EmptyProjectProps) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
			<div className="w-full max-w-2xl space-y-6">
				{/* 主卡片 */}
				<div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
					<div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
						<LucideFolderOpen className="size-6" />
					</div>
					<h1 className="text-2xl font-semibold mb-2">Welcome to Novel Editor</h1>
					<p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
						Start writing your story, manage chapters, scenes and Wiki
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Button size="lg" onClick={onCreate}>
							<BookPlus className="mr-2 size-4" />
							Create New Project
						</Button>
						<Button size="lg" variant="outline" onClick={onImport}>
							<ArrowRight className="mr-2 size-4" />
							Import Project
						</Button>
					</div>
				</div>

				{/* Feature Cards */}
				<div className="grid gap-4 md:grid-cols-3">
					<div className="group rounded-lg border border-border bg-card p-5 text-center hover:shadow-md transition-all duration-200">
						<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
							<PenLine className="size-5" />
						</div>
						<h3 className="text-sm font-medium mb-1">Outline Management</h3>
						<p className="text-xs text-muted-foreground">
							Tree structure for chapters and scenes
						</p>
					</div>
					<div className="group rounded-lg border border-border bg-card p-5 text-center hover:shadow-md transition-all duration-200">
						<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 mb-3 group-hover:scale-110 transition-transform">
							<Users className="size-5" />
						</div>
						<h3 className="text-sm font-medium mb-1">Wiki Knowledge Base</h3>
						<p className="text-xs text-muted-foreground">Manage characters, locations, items</p>
					</div>
					<div className="group rounded-lg border border-border bg-card p-5 text-center hover:shadow-md transition-all duration-200">
						<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 mb-3 group-hover:scale-110 transition-transform">
							<Stars className="size-5" />
						</div>
						<h3 className="text-sm font-medium mb-1">Drawing Canvas</h3>
						<p className="text-xs text-muted-foreground">Visual creation and mind maps</p>
					</div>
				</div>

				{/* Quick Start Tip */}
				<div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
					<p className="text-xs text-muted-foreground">
						💡 Tip: After creating a project, press{" "}
						<kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-xs mx-1">
							Ctrl+K
						</kbd>{" "}
						to open the command palette for quick navigation
					</p>
				</div>
			</div>
		</div>
	);
}
