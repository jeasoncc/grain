import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";

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
			<div className="space-y-2">
				<p className="text-sm">Novel Editor v0.1.0</p>
				<p className="text-sm text-muted-foreground">
					Built with ❤️ using React, TanStack Router, and shadcn/ui.
				</p>
			</div>
		</div>
	);
}
