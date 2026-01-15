/**
 * @file flows/layout/init-layout.flow.ts
 * @description 布局初始化流程
 *
 * 职责：加载和恢复布局状态
 * 依赖：io/storage/, state/, types/
 *
 * 设计原则：
 * - 入口窄：严格校验加载的数据
 * - 出口宽：失败时降级到默认状态
 * - 错误处理：记录错误但不阻塞应用启动
 */

import { info } from "@/io/log/logger.api"
import { loadLayoutState } from "@/io/storage"
import { useLayoutStore } from "@/state"
import { DEFAULT_LAYOUT_STATE, type LayoutState } from "@/types/layout"

// ============================================================================
// Layout Initialization Flow
// ============================================================================

/**
 * Initialize layout state from localStorage
 *
 * Flow:
 * 1. Load layout state from localStorage
 * 2. Validate loaded state (handled by loadLayoutState)
 * 3. Apply state to store (batch update)
 * 4. Log result
 *
 * Error handling:
 * - If load fails, loadLayoutState returns default state
 * - If apply fails, log error but don't throw
 *
 * @returns Loaded layout state
 */
export function initLayoutFlow(): LayoutState {
	try {
		info("[Layout Flow] Initializing layout...")

		// Load state from localStorage (with validation)
		const loadedState = loadLayoutState()

		// Apply to store using batch update (避免多次触发状态更新)
		useLayoutStore.setState({
			isSidebarOpen: loadedState.isSidebarOpen,
			activePanel: loadedState.activePanel,
			wasCollapsedByDrag: loadedState.wasCollapsedByDrag,
			sidebarWidth: loadedState.sidebarWidth,
		})

		info("[Layout Flow] Layout initialized successfully", { loadedState }, "init-layout")

		return loadedState
	} catch (error) {
		error("[Layout Flow] Failed to initialize layout", { error }, "init-layout.flow")

		// Return current store state as fallback
		return useLayoutStore.getState()
	}
}

/**
 * Reset layout to default state
 *
 * @returns Default layout state
 */
export function resetLayoutFlow(): LayoutState {
	try {
		info("[Layout Flow] Resetting layout to default...")

		// Reset to default values using batch update
		useLayoutStore.setState({
			...DEFAULT_LAYOUT_STATE,
		})

		const currentState = useLayoutStore.getState()
		info("[Layout Flow] Layout reset successfully", { currentState }, "init-layout")

		return currentState
	} catch (error) {
		error("[Layout Flow] Failed to reset layout", { error }, "init-layout.flow")
		return useLayoutStore.getState()
	}
}
