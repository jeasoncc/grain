import {
	BookMarked,
	BookOpen,
	CalendarRange,
	ChartLine,
	CheckCircle2,
	Compass,
	Feather,
	Flame,
	Lightbulb,
	ListTree,
	ScrollText,
	Settings,
	Users,
} from "lucide-react";
import type * as React from "react";

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";

const navigation = [
	{
		label: "Workspace Overview",
		description: "Monitor the heart of your novel project",
		items: [
			{ icon: Compass, label: "Dashboard", note: "Project summary & stats" },
			{ icon: ChartLine, label: "Progress Analytics", note: "Word count trends" },
			{ icon: CalendarRange, label: "Writing Schedule", note: "Session planner" },
		],
	},
	{
		label: "Story Building",
		description: "Outline plotlines and manage narrative structure",
		items: [
			{ icon: ListTree, label: "Chapters & Scenes", note: "Hierarchy & beats" },
			{ icon: ScrollText, label: "Story Beats", note: "Acts, arcs, and pacing" },
			{ icon: BookMarked, label: "Story Bible", note: "Lore & continuity" },
		],
	},
	{
		label: "Creative Resources",
		description: "Keep research, references, and inspiration in reach",
		items: [
			{ icon: Users, label: "Characters", note: "Profiles & relationships" },
			{ icon: BookOpen, label: "World Atlas", note: "Locations & cultures" },
			{ icon: Lightbulb, label: "Inspiration Vault", note: "Prompts & snippets" },
		],
	},
	{
		label: "Productivity",
		description: "Stay consistent and celebrate milestones",
		items: [
			{ icon: Feather, label: "Daily Goals", note: "Word target & streak" },
			{ icon: Flame, label: "Focus Sessions", note: "Pomodoro & timers" },
			{ icon: CheckCircle2, label: "Milestones", note: "Draft checkpoints" },
		],
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar {...props}>
			<SidebarContent>
				{navigation.map((section) => (
					<SidebarGroup key={section.label}>
						<SidebarGroupLabel>{section.label}</SidebarGroupLabel>
						<SidebarGroupContent>
							<p className="px-2 pb-2 text-xs text-muted-foreground">
								{section.description}
							</p>
							<SidebarMenu>
								{section.items.map((item) => (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton tooltip={item.label}>
											<item.icon className="size-4" />
											<div className="flex flex-col items-start">
												<span className="text-sm font-medium">{item.label}</span>
												<span className="text-xs text-muted-foreground">
													{item.note}
												</span>
											</div>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
				<SidebarGroup>
					<SidebarGroupLabel>Workspace Settings</SidebarGroupLabel>
					<SidebarGroupContent>
						<div className="space-y-3 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
							<div className="flex items-center gap-2">
								<Settings className="size-4" />
								Global preferences, themes, autosave
							</div>
							<div className="rounded-lg border bg-background px-3 py-2">
								<p className="font-medium text-foreground">Tips</p>
								<ul className="mt-1 space-y-1">
									<li>• Use templates to jumpstart series planning.</li>
									<li>• Pin favorite notes for quick access.</li>
									<li>• Configure sync & backup providers.</li>
								</ul>
							</div>
						</div>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
