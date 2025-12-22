import { createFileRoute } from "@tanstack/react-router";
import { Github, Globe } from "lucide-react";
import { UpdateChecker } from "@/components/blocks/update-checker";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/about")({
	component: AboutSettings,
});

const APP_VERSION = "0.1.91";

function AboutSettings() {
	return (
		<div className="space-y-10 max-w-3xl">
			<div>
				<h3 className="text-lg font-medium">About</h3>
				<p className="text-sm text-muted-foreground">
					Information about the application.
				</p>
			</div>

			<div className="space-y-12">
				{/* App Info */}
				<div className="flex items-start gap-6">
					<div className="size-20 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
						<span className="text-4xl font-bold text-primary">G</span>
					</div>
					<div className="space-y-2 pt-1">
						<h4 className="font-medium text-2xl tracking-tight">
							Grain / 小麦
						</h4>
						<div className="space-y-1 text-muted-foreground">
							<p className="text-sm">Version {APP_VERSION}</p>
						</div>
						<p className="text-sm text-muted-foreground pt-2 max-w-md">
							A minimalist writing sanctuary for long-form content. Pure,
							elegant, and distraction-free.
						</p>
						<div className="pt-3">
							<UpdateChecker />
						</div>
					</div>
				</div>

				{/* Links */}
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Links
					</h4>
					<div className="flex flex-wrap gap-4">
						<Button variant="outline" className="gap-2 h-9" asChild>
							<a
								href="https://github.com/jeasoncc/grain"
								target="_blank"
								rel="noreferrer"
							>
								<Github className="size-4" />
								GitHub
							</a>
						</Button>
						<Button variant="outline" className="gap-2 h-9" asChild>
							<a
								href="https://grain-editor.com"
								target="_blank"
								rel="noreferrer"
							>
								<Globe className="size-4" />
								Website
							</a>
						</Button>
					</div>
				</div>

				{/* Credits */}
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Credits
					</h4>
					<div className="space-y-2 text-sm text-muted-foreground">
						<p>Built with Tauri, React, Lexical, and shadcn/ui.</p>
						<p>© 2024 Jeason. MIT License.</p>
					</div>
				</div>
			</div>
		</div>
	);
}
