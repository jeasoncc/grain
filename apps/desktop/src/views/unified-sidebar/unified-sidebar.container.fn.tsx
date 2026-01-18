/**
 * UnifiedSidebar Container Component
 *
 * 容器组件：连接 hooks 和 stores，处理业务逻辑
 */

import { memo, useCallback } from "react"
import { useSidebarStore } from "@/state/sidebar.state"
import { UnifiedSidebarView } from "./unified-sidebar.view.fn"
import { info } from "@/io"

/**
 * UnifiedSidebarContainer - 统一侧边栏容器组件
 *
 * 纯函数式组件：
 * - 使用 memo() 包裹
 * - 连接 hooks 和 stores
 * - 处理业务逻辑和回调
 * - 将数据传递给 View 组件
 */
export const UnifiedSidebarContainer = memo(() => {
	// Connect to stores
	const { activePanel, isOpen, wasCollapsedByDrag, restoreFromCollapse } = useSidebarStore()

	// Handle restore from collapse
	const handleRestoreFromCollapse = useCallback(() => {
		info("[UnifiedSidebar] 恢复侧边栏")
		restoreFromCollapse()
	}, [restoreFromCollapse])

	return (
		<UnifiedSidebarView
			activePanel={activePanel}
			isOpen={isOpen}
			wasCollapsedByDrag={wasCollapsedByDrag}
			onRestoreFromCollapse={handleRestoreFromCollapse}
		/>
	)
})

UnifiedSidebarContainer.displayName = "UnifiedSidebarContainer"
