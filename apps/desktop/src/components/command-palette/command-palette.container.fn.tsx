// 命令面板 - 快速访问所有功能（容器组件）

import { useNavigate } from "@tanstack/react-router";
import { Download, Moon, Search, Settings, Sun } from "lucide-react";
import { memo, useMemo } from "react";
import { exportDialogManager } from "@/components/export-dialog-manager";
import { useTheme } from "@/hooks/use-theme";
import { CommandPaletteView } from "./command-palette.view.fn";
import type {
	CommandGroup,
	CommandPaletteContainerProps,
} from "./command-palette.types";

/**
 * CommandPaletteContainer - 容器组件
 *
 * 职责：
 * - 连接 hooks（useNavigate, useTheme）
 * - 构建命令列表
 * - 处理命令执行逻辑
 * - 传递数据给 View 组件
 */
export const CommandPaletteContainer = memo(
	({
		open,
		onOpenChange,
		workspaces,
		selectedWorkspaceId,
	}: CommandPaletteContainerProps) => {
		const navigate = useNavigate();
		const { theme, setTheme } = useTheme();

		const currentWorkspace = workspaces.find(
			(w) => w.id === selectedWorkspaceId,
		);

		// 构建命令列表
		const commands = useMemo<readonly CommandGroup[]>(
			() => [
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
								theme === "dark"
									? "Switch to Light Theme"
									: "Switch to Dark Theme",
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
			],
			[
				theme,
				setTheme,
				navigate,
				onOpenChange,
				selectedWorkspaceId,
				currentWorkspace?.title,
			],
		);

		return (
			<CommandPaletteView
				open={open}
				onOpenChange={onOpenChange}
				commands={commands}
			/>
		);
	},
);

CommandPaletteContainer.displayName = "CommandPaletteContainer";
