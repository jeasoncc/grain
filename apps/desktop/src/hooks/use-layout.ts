/**
 * @file hooks/use-layout.ts
 * @description Layout hook
 *
 * 职责：封装布局状态和操作的 React hook
 * 依赖：state/, flows/, types/
 */

import { useCallback, useEffect } from "react";
import { initLayoutFlow } from "@/flows/layout";
import {
	useActivePanel,
	useIsSidebarOpen,
	useLayoutActions,
	useLayoutStore,
	useSidebarWidth,
	useWasCollapsedByDrag,
} from "@/state";
import type { SidebarPanel } from "@/types/sidebar";

// ============================================================================
// Layout Hook
// ============================================================================

/**
 * Hook for accessing layout state and actions
 *
 * @returns Layout state and actions
 */
export function useLayout() {
	// Selectors
	const isSidebarOpen = useIsSidebarOpen();
	const activePanel = useActivePanel();
	const wasCollapsedByDrag = useWasCollapsedByDrag();
	const sidebarWidth = useSidebarWidth();

	// Actions
	const actions = useLayoutActions();

	// Wrapped actions with useCallback for stability
	const setActivePanel = useCallback(
		(panel: SidebarPanel) => {
			actions.setActivePanel(panel);
		},
		[actions],
	);

	const toggleSidebar = useCallback(() => {
		actions.toggleSidebar();
	}, [actions]);

	const setSidebarCollapsedByDrag = useCallback(
		(collapsed: boolean) => {
			actions.setSidebarCollapsedByDrag(collapsed);
		},
		[actions],
	);

	const restoreFromCollapse = useCallback(() => {
		actions.restoreFromCollapse();
	}, [actions]);

	const setSidebarWidth = useCallback(
		(width: number) => {
			actions.setSidebarWidth(width);
		},
		[actions],
	);

	return {
		// State
		isSidebarOpen,
		activePanel,
		wasCollapsedByDrag,
		sidebarWidth,

		// Actions
		setActivePanel,
		toggleSidebar,
		setSidebarCollapsedByDrag,
		restoreFromCollapse,
		setSidebarWidth,
	};
}

/**
 * Hook for initializing layout on mount
 *
 * @returns Layout state
 */
export function useLayoutInit() {
	useEffect(() => {
		// Initialize layout from localStorage
		initLayoutFlow();
	}, []);

	return useLayout();
}

/**
 * Hook for accessing layout store directly
 * Use sparingly - prefer useLayout() for most cases
 *
 * @returns Layout store
 */
export function useLayoutStore_Direct() {
	return useLayoutStore();
}
