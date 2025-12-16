import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Github, Twitter, Globe, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/settings/about")({
	component: AboutSettings,
});

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
						<span className="text-4xl font-bold text-primary">N</span>
					</div>
					<div className="space-y-2 pt-1">
						<h4 className="font-medium text-2xl tracking-tight">Novel Editor</h4>
						<div className="space-y-1 text-muted-foreground">
							<p className="text-sm">Version 0.1.0 (Beta)</p>
							<div className="flex items-center gap-2 text-xs pt-1">
								<span className="inline-flex items-center gap-1 text-green-600 font-medium">
									<CheckCircle2 className="size-3" />
									Up to date
								</span>
								<span>•</span>
								<span>Build 20231215</span>
							</div>
						</div>
						<p className="text-sm text-muted-foreground pt-2 max-w-md">
							A modern, distraction-free writing environment designed to help you focus on your story.
						</p>
					</div>
				</div>

				{/* Links */}
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Links</h4>
					<div className="flex flex-wrap gap-4">
						<Button variant="outline" className="gap-2 h-9" asChild>
							<a href="https://github.com" target="_blank" rel="noreferrer">
								<Github className="size-4" />
								GitHub Repository
							</a>
						</Button>
						<Button variant="outline" className="gap-2 h-9" asChild>
							<a href="https://twitter.com" target="_blank" rel="noreferrer">
								<Twitter className="size-4" />
								Twitter
							</a>
						</Button>
						<Button variant="outline" className="gap-2 h-9" asChild>
							<a href="https://example.com" target="_blank" rel="noreferrer">
								<Globe className="size-4" />
								Website
							</a>
						</Button>
					</div>
				</div>

				{/* Credits */}
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Credits</h4>
					<div className="space-y-2 text-sm text-muted-foreground">
						<p>
							Built with ❤️ using React, TanStack Router, and shadcn/ui.
						</p>
						<p>
							© 2023 Novel Editor Team. All rights reserved.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
