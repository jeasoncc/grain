// 命令面板 - 快速访问所有功能

import { useNavigate } from "@tanstack/react-router";
import { Download, Moon, Search, Settings, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { exportDialogManager } from "@/components/export/export-dialog-manager";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { useTheme } from "@/hooks/use-theme";
import type { WorkspaceInterface } from "@/types/workspace";

/**
 * CommandPalette Props 接口
 *
 * 命令面板组件的属性定义，遵循纯展示组件原则：
 * - 所有数据通过 props 传入
 * - 不直接访问 Store 或 DB
 * - 只处理 UI 交互逻辑
 */
interface CommandPaletteProps {
	/** 对话框打开状态 */
	readonly open: boolean;
	/** 对话框状态变化回调 */
	readonly onOpenChange: (open: boolean) => void;
	/** 所有工作区列表 */
	readonly workspaces: WorkspaceInterface[];
	/** 当前选中的工作区 ID */
	readonly selectedWorkspaceId: string | null;
}

export function CommandPalette({
	open,
	onOpenChange,
	workspaces,
	selectedWorkspaceId,
}: CommandPaletteProps) {
	const navigate = useNavigate();
	const { theme, setTheme } = useTheme();
	const [search, setSearch] = useState("");

	const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

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
						exportDialogManager.open(
							selectedWorkspaceId || undefined,
							currentWorkspace?.title,
						);
					},
				},
			],
		},
		{
			group: "Settings",
			items: [
				{
					label:
						theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme",
					icon:
						theme === "dark" ? (
							<Sun className="size-4" />
						) : (
							<Moon className="size-4" />
						),
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
