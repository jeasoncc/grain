/**
 * @file hooks/use-app-layout.ts
 * @description App layout hook
 *
 * 职责：封装 AppLayout 组件的所有逻辑
 * - 响应式布局（小屏自动折叠）
 * - 面板调整大小处理
 * - 面板折叠/展开处理
 *
 * 依赖：hooks/, state/, types/
 */

import { useCallback, useEffect } from "react"
import { useLayout } from "./use-layout"

// ============================================================================
// Types
// ============================================================================

export interface UseAppLayoutReturn {
	/** 侧边栏是否打开 */
	readonly isSidebarOpen: boolean
	/** 侧边栏宽度百分比 */
	readonly sidebarWidth: number
	/** 处理布局变化（v4 API: onLayoutChanged） */
	readonly handleLayoutChanged: (layout: readonly number[]) => void
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for AppLayout component logic
 *
 * 封装所有布局逻辑：
 * - 响应式布局（窗口 < 768px 自动折叠侧边栏）
 * - 面板调整大小（使用 v4 API）
 *
 * @returns Layout state and handlers
 */
export function useAppLayout(): UseAppLayoutReturn {
	const {
		isSidebarOpen,
		sidebarWidth,
		setSidebarWidth,
		toggleSidebar,
	} = useLayout()

	/**
	 * Handle layout changed (v4 API: onLayoutChanged)
	 * Called after the Group's layout has been changed
	 * 
	 * @param layout - Array of panel sizes [sidebar%, content%]
	 */
	const handleLayoutChanged = useCallback((layout: readonly number[]) => {
		// layout[0] is sidebar percentage
		const newWidth = layout[0]
		if (newWidth !== undefined && newWidth !== sidebarWidth) {
			setSidebarWidth(newWidth)
		}
	}, [sidebarWidth, setSidebarWidth])

	/**
	 * Responsive layout: Auto-collapse sidebar on small screens
	 * Threshold: 768px (tablet breakpoint)
	 */
	useEffect(() => {
		const handleWindowResize = () => {
			const isSmallScreen = window.innerWidth < 768

			// Auto-collapse on small screens
			if (isSmallScreen && isSidebarOpen) {
				toggleSidebar()
			}
		}

		// Check on mount
		handleWindowResize()

		// Listen to window resize
		window.addEventListener("resize", handleWindowResize)
		return () => window.removeEventListener("resize", handleWindowResize)
	}, [isSidebarOpen, toggleSidebar])

	return {
		isSidebarOpen,
		sidebarWidth,
		handleLayoutChanged,
	}
}
