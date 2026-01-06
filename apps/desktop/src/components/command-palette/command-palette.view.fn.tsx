// 命令面板 - 快速访问所有功能（展示组件）

import { memo, useEffect, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/views/ui/command";
import type { CommandPaletteViewProps } from "./command-palette.types";

/**
 * CommandPaletteView - 纯展示组件
 *
 * 职责：
 * - 渲染命令面板 UI
 * - 管理搜索输入状态（UI 状态）
 * - 处理命令选择
 *
 * 不包含：
 * - 业务逻辑
 * - Store/Hook 访问
 * - 路由导航
 */
export const CommandPaletteView = memo(
	({ open, onOpenChange, commands }: CommandPaletteViewProps) => {
		// UI 状态：搜索输入
		const [search, setSearch] = useState("");

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
									{item.shortcut && (
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
	},
);

CommandPaletteView.displayName = "CommandPaletteView";
