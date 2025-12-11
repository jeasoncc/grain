import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/world")({
	component: WorldPage,
});

function WorldPage() {
	return (
		<div className="container max-w-4xl py-6">
			<div className="space-y-6">
				<div className="text-center space-y-4">
					<div className="flex justify-center">
						<BookOpen className="size-16 text-muted-foreground" />
					</div>
					<div>
						<h1 className="text-3xl font-bold">世界观</h1>
						<p className="text-muted-foreground mt-2">
							管理你的小说世界观设定
						</p>
					</div>
				</div>
				
				<div className="text-center py-8">
					<p className="text-sm text-muted-foreground">
						世界观功能正在开发中...
					</p>
				</div>
			</div>
		</div>
	);
}