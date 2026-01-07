/**
 * @file app-layout.view.fn.tsx
 * @description 应用主布局组件
 *
 * 负责组织整个应用的布局结构：
 * - ActivityBar（左侧窄栏）
 * - UnifiedSidebar（文件树等）
 * - 主内容区域（children）
 *
 * 这是一个纯展示组件，只负责布局，不包含业务逻辑。
 */

import type { ReactNode } from "react";
import { ActivityBar } from "@/views/activity-bar";
import { UnifiedSidebar } from "@/views/unified-sidebar";
import type { WorkspaceInterface } from "@/types/workspace";

export interface AppLayoutProps {
	/** 工作区列表 */
	readonly workspaces: WorkspaceInterface[];
	/** 主内容区域 */
	readonly children: ReactNode;
}

/**
 * 应用主布局组件
 *
 * 布局结构：
 * ```
 * ┌──────────────────────────────────────┐
 * │ ActivityBar │ Sidebar │   Content   │
 * │   (48px)    │ (auto)  │   (flex-1)  │
 * └──────────────────────────────────────┘
 * ```
 */
export function AppLayout({ workspaces, children }: AppLayoutProps) {
	return (
		<div className="flex h-screen w-screen overflow-hidden">
			{/* 左侧：ActivityBar（窄栏，固定宽度） */}
			<ActivityBar workspaces={workspaces} />

			{/* 左侧：UnifiedSidebar（文件树等） */}
			<UnifiedSidebar />

			{/* 主内容区域（flex-1，占据剩余空间） */}
			<div className="flex-1 overflow-hidden">{children}</div>
		</div>
	);
}
