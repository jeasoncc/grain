import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Github, Twitter, Globe, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/settings/about")({
	component: AboutSettings,
});

function AboutSettings() {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">About</h3>
				<p className="text-sm text-muted-foreground">
					Information about the application.
				</p>
			</div>
			<Separator />

			<Card>
				<CardHeader>
					<CardTitle className="text-base flex items-center gap-2">
						<Info className="size-4 text-primary" />
						Novel Editor
					</CardTitle>
					<CardDescription>
						A modern, distraction-free writing environment.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-6">
					<div className="flex items-start gap-4">
						<div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
							<span className="text-3xl font-bold text-primary">N</span>
						</div>
						<div className="space-y-1">
							<h4 className="font-medium text-lg">Novel Editor</h4>
							<p className="text-sm text-muted-foreground">Version 0.1.0 (Beta)</p>
							<div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
								<span className="inline-flex items-center gap-1 text-green-600">
									<CheckCircle2 className="size-3" />
									Up to date
								</span>
								<span>•</span>
								<span>Build 20231215</span>
							</div>
						</div>
					</div>

					<Separator />

					<div className="space-y-4">
						<h4 className="text-sm font-medium">Links</h4>
						<div className="grid grid-cols-2 gap-4">
							<Button variant="outline" className="justify-start gap-2 h-10" asChild>
								<a href="https://github.com" target="_blank" rel="noreferrer">
									<Github className="size-4" />
									GitHub Repository
								</a>
							</Button>
							<Button variant="outline" className="justify-start gap-2 h-10" asChild>
								<a href="https://twitter.com" target="_blank" rel="noreferrer">
									<Twitter className="size-4" />
									Twitter
								</a>
							</Button>
							<Button variant="outline" className="justify-start gap-2 h-10" asChild>
								<a href="https://example.com" target="_blank" rel="noreferrer">
									<Globe className="size-4" />
									Website
								</a>
							</Button>
						</div>
					</div>

					<Separator />

					<div className="space-y-2 text-xs text-muted-foreground">
						<p>
							Built with ❤️ using React, TanStack Router, and shadcn/ui.
						</p>
						<p>
							© 2023 Novel Editor Team. All rights reserved.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
