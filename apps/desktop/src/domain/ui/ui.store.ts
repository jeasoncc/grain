/**
 * UI Domain - Zustand Store with Immer
 *
 * Manages UI state including right sidebar, tab position, and locale.
 * Uses Zustand + Immer for immutable state management.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
	UIState,
	UIActions,
	RightPanelView,
	TabPosition,
} from "./ui.interface";
import { DEFAULT_UI_CONFIG, DEFAULT_UI_STATE } from "./ui.interface";

// ==============================
// Store Type
// ==============================

type UIStore = UIState & UIActions;

// ==============================
// Store Implementation
// ==============================

export const useUIStore = create<UIStore>()(
	persist(
		immer((set) => ({
			// Initial State
			...DEFAULT_UI_STATE,

			// ==============================
			// Actions
			// ==============================

			setRightPanelView: (view: RightPanelView) => {
				set((state) => {
					state.rightPanelView = view;
				});
			},

			setRightSidebarOpen: (open: boolean) => {
				set((state) => {
					state.rightSidebarOpen = open;
				});
			},

			toggleRightSidebar: () => {
				set((state) => {
					state.rightSidebarOpen = !state.rightSidebarOpen;
				});
			},

			setTabPosition: (position: TabPosition) => {
				set((state) => {
					state.tabPosition = position;
				});
			},

			setLocale: (locale: string) => {
				set((state) => {
					state.locale = locale;
				});
			},
		})),
		{
			name: DEFAULT_UI_CONFIG.storageKey,
			partialize: (state) => ({
				// Only persist these fields as per requirements
				rightSidebarOpen: state.rightSidebarOpen,
				tabPosition: state.tabPosition,
				locale: state.locale,
			}),
		}
	)
);

// ==============================
// Selector Hooks
// ==============================

/**
 * Get the current right panel view.
 * Optimized to only re-render when panel view changes.
 */
export const useRightPanelView = (): RightPanelView => {
	return useUIStore((state) => state.rightPanelView);
};

/**
 * Get whether the right sidebar is open.
 * Optimized to only re-render when sidebar state changes.
 */
export const useRightSidebarOpen = (): boolean => {
	return useUIStore((state) => state.rightSidebarOpen);
};

/**
 * Get the current tab position.
 * Optimized to only re-render when tab position changes.
 */
export const useTabPosition = (): TabPosition => {
	return useUIStore((state) => state.tabPosition);
};

/**
 * Get the current locale.
 * Optimized to only re-render when locale changes.
 */
export const useLocale = (): string => {
	return useUIStore((state) => state.locale);
};

/**
 * Check if a specific panel view is active.
 */
export const useIsPanelViewActive = (view: RightPanelView): boolean => {
	return useUIStore((state) => state.rightPanelView === view);
};

/**
 * Check if tabs are positioned at the top.
 */
export const useIsTabsAtTop = (): boolean => {
	return useUIStore((state) => state.tabPosition === "top");
};

/**
 * @deprecated Use useUIStore instead. This alias is provided for backward compatibility.
 * Will be removed in a future version.
 */
export const useUISettingsStore = useUIStore;
