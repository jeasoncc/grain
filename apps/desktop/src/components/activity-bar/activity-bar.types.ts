/**
 * @file activity-bar.types.ts
 * @description ActivityBar 组件类型定义
 *
 * 定义 ActivityBar 纯展示组件的 Props 接口。
 * 遵循函数式架构：组件只接收 props，不直接访问 Store/DB。
 */

import type { IconTheme } from "@/types/icon-theme";
import type { SidebarPanel } from "@/types/sidebar";
import type { WorkspaceInterface } from "@/types/workspace";

/**
 * ActivityBar 主组件 Props
 */
export interface ActivityBarProps {
	/** 所有工作区列表 */
	readonly workspaces: WorkspaceInterface[];
	/** 当前选中的工作区 ID */
	readonly selectedWorkspaceId: string | null;
	/** 当前激活的侧边栏面板 */
	readonly activePanel: SidebarPanel;
	/** 侧边栏是否打开 */
	readonly isSidebarOpen: boolean;
	/** 当前图标主题 */
	readonly iconTheme: IconTheme;
	/** 当前路由路径 */
	readonly currentPath: string;

	// ==============================
	// 回调函数
	// ==============================

	/** 选择工作区 */
	readonly onSelectWorkspace: (workspaceId: string) => void;
	/** 创建新工作区 */
	readonly onCreateWorkspace: (name: string) => Promise<void>;
	/** 设置激活面板 */
	readonly onSetActivePanel: (panel: SidebarPanel) => void;
	/** 切换侧边栏 */
	readonly onToggleSidebar: () => void;
	/** 创建日记 */
	readonly onCreateDiary: () => void;
	/** 创建 Wiki */
	readonly onCreateWiki: () => void;
	/** 创建记账 */
	readonly onCreateLedger: () => void;
	/** 导入文件 */
	readonly onImportFile: (file: File) => Promise<void>;
	/** 打开导出对话框 */
	readonly onOpenExportDialog: () => void;
	/** 删除所有数据 */
	readonly onDeleteAllData: () => Promise<void>;
	/** 导航到路径 */
	readonly onNavigate: (path: string) => void;
}

/**
 * 工作区列表项 Props
 */
export interface WorkspaceItemProps {
	/** 工作区数据 */
	readonly workspace: WorkspaceInterface;
	/** 是否选中 */
	readonly isSelected: boolean;
	/** 文件夹图标组件 */
	readonly FolderIcon: React.ComponentType<{ className?: string }>;
	/** 点击回调 */
	readonly onClick: () => void;
}

/**
 * 操作按钮 Props
 */
export interface ActionButtonProps {
	/** 图标 */
	readonly icon: React.ReactNode;
	/** 标签文本 */
	readonly label: string;
	/** 点击回调 */
	readonly onClick: () => void;
	/** 是否激活 */
	readonly active?: boolean;
}

/**
 * 导航项 Props
 */
export interface NavItemProps {
	/** 目标路径 */
	readonly to: string;
	/** 图标 */
	readonly icon: React.ReactNode;
	/** 标签文本 */
	readonly label: string;
	/** 是否激活 */
	readonly active: boolean;
}

/**
 * Toggle 导航项 Props
 */
export interface ToggleNavItemProps {
	/** 目标路径 */
	readonly to: string;
	/** 图标 */
	readonly icon: React.ReactNode;
	/** 标签文本 */
	readonly label: string;
	/** 是否激活 */
	readonly active: boolean;
	/** 导航回调 */
	readonly onNavigate: (path: string) => void;
}
