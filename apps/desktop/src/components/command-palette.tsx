// 命令面板 - 快速访问所有功能

import { useNavigate } from "@tanstack/react-router";
import {
	Download,
	Moon,
	Search,
	Settings,
	Sun,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { useTheme } from "@/hooks/use-theme";
import { useSelectionStore } from "@/stores/selection";
import { exportDialogManager } from "@/components/export/export-dialog-manager";
import { useAllWorkspaces } from "@/db/models";

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const navigate = useNavigate();
	const { theme, setTheme } = useTheme();
	const [search, setSearch] = useState("");

	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
	const workspaces = useAllWorkspaces() ?? [];
	const currentWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);

	// Command actions
	const commands = [
		{
			group: "Actions",
			items: [
				{
					label: "Global Search",
					icon: <Search className="size-4" />,
					shortcut: "Ctrl+Shift+F",
					onSelect: () => {
						onOpenChange(false);
						window.dispatchEvent(new CustomEvent("open-global-search"));
					},
				},
				{
					label: "Export Workspace",
					icon: <Download className="size-4" />,
					onSelect: () => {
						onOpenChange(false);
						exportDialogManager.open(selectedWorkspaceId || undefined, currentWorkspace?.title);
					},
				},
			],
		},
		{
			group: "Settings",
			items: [
				{
					label: theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme",
					icon: theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />,
					onSelect: () => {
						setTheme(theme === "dark" ? "light" : "dark");
						onOpenChange(false);
					},
				},
				{
					label: "Open Settings",
					icon: <Settings className="size-4" />,
					onSelect: () => {
						navigate({ to: "/settings/design" });
						onOpenChange(false);
					},
				},
			],
		},
	];

	// 重置搜索
	useEffect(() => {
		if (!open) {
			setSearch("");
		}
	}, [open]);

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput
				placeholder="Search commands..."
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList>
				<CommandEmpty>No results found</CommandEmpty>

				{commands.map((group) => (
					<CommandGroup key={group.group} heading={group.group}>
						{group.items.map((item) => (
							<CommandItem
								key={item.label}
								onSelect={item.onSelect}
								className="flex items-center gap-2"
							>
								{item.icon}
								<span className="flex-1">{item.label}</span>
								{"shortcut" in item && item.shortcut && (
									<kbd className="text-xs text-muted-foreground">
										{item.shortcut}
									</kbd>
								)}
							</CommandItem>
						))}
					</CommandGroup>
				))}
			</CommandList>
		</CommandDialog>
	);
}
