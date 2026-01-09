/**
 * @file app-layout.view.fn.tsx
 * @description 应用主布局组件
 *
 * 负责组织整个应用的布局结构：
 * - ActivityBar（左侧窄栏）
 * - UnifiedSidebar（文件树等，可调整大小）
 * - 主内容区域（children）
 *
 * 使用 react-resizable-panels 实现可拖拽调整的布局。
 * 布局状态通过 layout.state.ts 管理并持久化。
 *
 * 依赖规则：views/ 只能依赖 hooks/, types/
 */

import type { ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLayout } from "@/hooks/use-layout";
import { ActivityBar } from "@/views/activity-bar";
import { UnifiedSidebar } from "@/views/unified-sidebar";

export interface AppLayoutProps {
	/** 主内容区域 */
	readonly children: ReactNode;
}

/**
 * 应用主布局组件
 *
 * 布局结构：
 * ```
 * ┌──────────────────────────────────────────────────┐
 * │ ActivityBar │ Sidebar (resizable) │   Content   │
 * │   (48px)    │      (20-40%)       │   (flex-1)  │
 * └──────────────────────────────────────────────────┘
 * ```
 *
 * 特性：
 * - 侧边栏可拖拽调整宽度（20%-40%）
 * - 拖拽到最小宽度时自动折叠
 * - 布局状态自动持久化到 localStorage
 * - 支持条件渲染侧边栏（根据 activePanel）
 */
export function AppLayout({ children }: AppLayoutProps) {
	const {
		isSidebarOpen,
		sidebarWidth,
		setSidebarWidth,
		setSidebarCollapsedByDrag,
		restoreFromCollapse,
	} = useLayout();

	/**
	 * Handle panel resize
	 * Updates sidebar width in state
	 */
	const handleResize = (sizes: number[]) => {
		// sizes[0] is sidebar percentage
		const newWidth = sizes[0];
		if (newWidth !== undefined) {
			setSidebarWidth(newWidth);
		}
	};

	/**
	 * Handle panel collapse
	 * Detects when sidebar is collapsed by drag
	 */
	const handleCollapse = () => {
		setSidebarCollapsedByDrag(true);
	};

	/**
	 * Handle panel expand
	 * Restores sidebar from drag collapse
	 */
	const handleExpand = () => {
		restoreFromCollapse();
	};

	return (
		<div className="flex h-screen w-screen overflow-hidden">
			{/* 左侧：ActivityBar（窄栏，固定宽度） */}
			<ActivityBar />

			{/* 主布局区域：Sidebar + Content（可调整大小） */}
			<PanelGroup
				direction="horizontal"
				autoSaveId="grain-main-layout"
				onLayout={handleResize}
			>
				{/* 左侧：UnifiedSidebar（可调整大小） */}
				{isSidebarOpen && (
					<>
						<Panel
							id="sidebar"
							defaultSize={sidebarWidth}
							minSize={15}
							maxSize={40}
							collapsible
							onCollapse={handleCollapse}
							onExpand={handleExpand}
						>
							<UnifiedSidebar />
						</Panel>

						{/* 调整手柄 */}
						<PanelResizeHandle className="w-1 bg-border hover:bg-accent transition-colors" />
					</>
				)}

				{/* 主内容区域 */}
				<Panel id="content" minSize={30}>
					<div className="h-full overflow-hidden">{children}</div>
				</Panel>
			</PanelGroup>
		</div>
	);
}
