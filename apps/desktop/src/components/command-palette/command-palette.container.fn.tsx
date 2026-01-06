// 命令面板 - 快速访问所有功能（容器组件）

import { useNavigate } from "@tanstack/react-router";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import { Download, Moon, PenTool, Search, Settings, Sun } from "lucide-react";
import { memo, useMemo } from "react";
import { openFile } from "@/flows";
import { createExcalidraw } from "@/flows/templated";
import { exportDialogManager } from "@/views/export-dialog-manager";
import { useTheme } from "@/hooks/use-theme";
import type { TabType } from "@/types/editor-tab";
import type {
	CommandGroup,
	CommandPaletteContainerProps,
} from "./command-palette.types";
import { CommandPaletteView } from "./command-palette.view.fn";

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
							label: "Create Excalidraw Drawing",
							icon: <PenTool className="size-4" />,
							onSelect: () => {
								if (!selectedWorkspaceId) {
									return;
								}
								onOpenChange(false);

								// 使用 TaskEither + chain 确保时序正确性
								const task = pipe(
									// 1. 创建 Excalidraw 文件
									createExcalidraw({
										workspaceId: selectedWorkspaceId,
										templateParams: { date: new Date() },
									}),
									// 2. 成功后，打开文件
									TE.chain((result) =>
										pipe(
											openFile({
												workspaceId: selectedWorkspaceId,
												nodeId: result.node.id,
												title: result.node.title,
												type: result.node.type as TabType,
											}),
											TE.map(() => result),
										),
									),
									// 3. 成功后，导航到主工作区
									TE.tap(() => {
										navigate({ to: "/" });
										return TE.right(undefined);
									}),
									// 4. 错误处理
									TE.fold(
										(error) => {
											console.error(
												"Failed to create Excalidraw drawing:",
												error,
											);
											return TE.of(undefined as void);
										},
										() => TE.of(undefined as void),
									),
								);

								// 执行 TaskEither
								task();
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
