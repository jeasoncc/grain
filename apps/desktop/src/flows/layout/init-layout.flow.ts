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

import logger from "@/io/log";
import { loadLayoutState } from "@/io/storage";
import { useLayoutStore } from "@/state";
import type { LayoutState } from "@/types/layout";

// ============================================================================
// Layout Initialization Flow
// ============================================================================

/**
 * Initialize layout state from localStorage
 *
 * Flow:
 * 1. Load layout state from localStorage
 * 2. Validate loaded state (handled by loadLayoutState)
 * 3. Apply state to store
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
		logger.info("[Layout Flow] Initializing layout...");

		// Load state from localStorage (with validation)
		const loadedState = loadLayoutState();

		// Apply to store
		const store = useLayoutStore.getState();

		// Update each property individually to trigger proper state updates
		if (loadedState.activePanel !== store.activePanel) {
			store.setActivePanel(loadedState.activePanel);
		}

		if (loadedState.isSidebarOpen !== store.isSidebarOpen) {
			store.toggleSidebar();
		}

		if (loadedState.wasCollapsedByDrag !== store.wasCollapsedByDrag) {
			store.setSidebarCollapsedByDrag(loadedState.wasCollapsedByDrag);
		}

		if (loadedState.sidebarWidth !== store.sidebarWidth) {
			store.setSidebarWidth(loadedState.sidebarWidth);
		}

		logger.info("[Layout Flow] Layout initialized successfully", loadedState);

		return loadedState;
	} catch (error) {
		logger.error("[Layout Flow] Failed to initialize layout:", error);

		// Return current store state as fallback
		return useLayoutStore.getState();
	}
}

/**
 * Reset layout to default state
 *
 * @returns Default layout state
 */
export function resetLayoutFlow(): LayoutState {
	try {
		logger.info("[Layout Flow] Resetting layout to default...");

		const store = useLayoutStore.getState();

		// Reset to default values
		store.setActivePanel("files");
		store.setSidebarWidth(20);

		if (!store.isSidebarOpen) {
			store.toggleSidebar();
		}

		if (store.wasCollapsedByDrag) {
			store.setSidebarCollapsedByDrag(false);
		}

		const currentState = useLayoutStore.getState();
		logger.info("[Layout Flow] Layout reset successfully", currentState);

		return currentState;
	} catch (error) {
		logger.error("[Layout Flow] Failed to reset layout:", error);
		return useLayoutStore.getState();
	}
}
