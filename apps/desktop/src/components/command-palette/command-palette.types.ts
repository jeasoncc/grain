import type { ReactNode } from "react";

/**
 * 命令项接口
 */
export interface CommandItem {
	/** 命令标签 */
	readonly label: string;
	/** 命令图标 */
	readonly icon: ReactNode;
	/** 快捷键（可选） */
	readonly shortcut?: string;
	/** 选择命令时的回调 */
	readonly onSelect: () => void;
}

/**
 * 命令组接口
 */
export interface CommandGroup {
	/** 组名 */
	readonly group: string;
	/** 组内命令项 */
	readonly items: readonly CommandItem[];
}

/**
 * CommandPaletteView Props 接口
 *
 * 命令面板展示组件的属性定义，遵循纯展示组件原则：
 * - 所有数据通过 props 传入
 * - 不直接访问 Store 或 DB
 * - 只处理 UI 交互逻辑
 */
export interface CommandPaletteViewProps {
	/** 对话框打开状态 */
	readonly open: boolean;
	/** 对话框状态变化回调 */
	readonly onOpenChange: (open: boolean) => void;
	/** 命令组列表 */
	readonly commands: readonly CommandGroup[];
}

/**
 * CommandPaletteContainer Props 接口
 */
export interface CommandPaletteContainerProps {
	/** 对话框打开状态 */
	readonly open: boolean;
	/** 对话框状态变化回调 */
	readonly onOpenChange: (open: boolean) => void;
	/** 所有工作区列表 */
	readonly workspaces: readonly {
		readonly id: string;
		readonly title: string;
	}[];
	/** 当前选中的工作区 ID */
	readonly selectedWorkspaceId: string | null;
}
