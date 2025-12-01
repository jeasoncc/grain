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
					<h1 className="text-2xl font-semibold mb-2">欢迎使用小说编辑器</h1>
					<p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
						开始创作你的故事，管理章节、场景、角色和世界观
					</p>
					<div className="flex flex-col sm:flex-row gap-3 justify-center">
						<Button size="lg" onClick={onCreate}>
							<BookPlus className="mr-2 size-4" />
							创建新项目
						</Button>
						<Button size="lg" variant="outline" onClick={onImport}>
							<ArrowRight className="mr-2 size-4" />
							导入已有项目
						</Button>
					</div>
				</div>

				{/* 功能卡片 */}
				<div className="grid gap-4 md:grid-cols-3">
					<div className="group rounded-lg border border-border bg-card p-5 text-center hover:shadow-md transition-all duration-200">
						<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 mb-3 group-hover:scale-110 transition-transform">
							<PenLine className="size-5" />
						</div>
						<h3 className="text-sm font-medium mb-1">大纲管理</h3>
						<p className="text-xs text-muted-foreground">
							树形结构管理章节和场景
						</p>
					</div>
					<div className="group rounded-lg border border-border bg-card p-5 text-center hover:shadow-md transition-all duration-200">
						<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 mb-3 group-hover:scale-110 transition-transform">
							<Users className="size-5" />
						</div>
						<h3 className="text-sm font-medium mb-1">角色设定</h3>
						<p className="text-xs text-muted-foreground">管理角色信息和关系</p>
					</div>
					<div className="group rounded-lg border border-border bg-card p-5 text-center hover:shadow-md transition-all duration-200">
						<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 mb-3 group-hover:scale-110 transition-transform">
							<Stars className="size-5" />
						</div>
						<h3 className="text-sm font-medium mb-1">世界观</h3>
						<p className="text-xs text-muted-foreground">构建完整的故事世界</p>
					</div>
				</div>

				{/* 快速开始提示 */}
				<div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
					<p className="text-xs text-muted-foreground">
						💡 提示：创建项目后，可以按{" "}
						<kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-xs mx-1">
							Ctrl+K
						</kbd>{" "}
						打开命令面板快速导航
					</p>
				</div>
			</div>
		</div>
	);
}
