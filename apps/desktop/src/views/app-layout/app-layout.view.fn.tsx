/**
 * @file app-layout.view.fn.tsx
 * @description 应用主布局组件（纯声明式）
 *
 * 负责组织整个应用的布局结构：
 * - ActivityBar（左侧窄栏）
 * - UnifiedSidebar（文件树等，可调整大小）
 * - 主内容区域（children）
 *
 * 使用 react-resizable-panels 实现可拖拽调整的布局。
 * 所有逻辑封装在 use-app-layout.ts hook 中。
 *
 * 依赖规则：views/ 只能依赖 hooks/, types/
 */

import type { ReactNode } from "react"
import { Panel, Group, Separator } from "react-resizable-panels"
import { useAppLayout } from "@/hooks/use-app-layout"
import { ActivityBar } from "@/views/activity-bar"
import { UnifiedSidebar } from "@/views/unified-sidebar"

export interface AppLayoutProps {
	/** 主内容区域 */
	readonly children: ReactNode
}

/**
 * 应用主布局组件（纯声明式）
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
 * - 侧边栏可拖拽调整宽度（15%-40%）
 * - 拖拽到最小宽度时自动折叠
 * - 布局状态自动持久化到 localStorage
 * - 响应式布局：窗口宽度 < 768px 时自动折叠侧边栏
 */
export function AppLayout({ children }: AppLayoutProps) {
	const { isSidebarOpen, sidebarWidth, handleLayoutChanged } = useAppLayout()

	return (
		<div className="flex h-screen w-screen overflow-hidden">
			<ActivityBar />

			<Group 
				orientation="horizontal" 
				id="grain-main-layout"
				onLayoutChanged={handleLayoutChanged}
			>
				{isSidebarOpen && (
					<>
						<Panel
							id="sidebar"
							defaultSize={sidebarWidth}
							minSize={170}
							maxSize={500}
							collapsible
						>
							<UnifiedSidebar />
						</Panel>

						<Separator className="w-1 bg-border hover:bg-accent transition-colors" />
					</>
				)}

				<Panel id="content" minSize={30}>
					<div className="h-full overflow-hidden">{children}</div>
				</Panel>
			</Group>
		</div>
	)
}
