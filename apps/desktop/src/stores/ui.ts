/**
 * Unified UI State Store
 * 
 * Consolidates all UI-related state into a single store:
 * - Right sidebar state (open/closed, panel view)
 * - UI settings (tab position)
 * 
 * This follows the data architecture principle of keeping UI state
 * in Zustand while persistent data goes to Dexie.
 * 
 * Requirements: 4.3
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RightPanelView = "outline" | "characters" | "drawings" | null;
export type TabPosition = "top" | "right-sidebar";

interface UIState {
	// Right sidebar state
	rightPanelView: RightPanelView;
	setRightPanelView: (view: RightPanelView) => void;
	rightSidebarOpen: boolean;
	setRightSidebarOpen: (open: boolean) => void;
	toggleRightSidebar: () => void;
	
	// UI Settings (merged from ui-settings.ts)
	/** Tab position: "top" displays tabs above editor, "right-sidebar" displays in right panel */
	tabPosition: TabPosition;
	setTabPosition: (position: TabPosition) => void;
	
	// Language settings
	/** Application locale - defaults to English ("en") */
	locale: string;
	setLocale: (locale: string) => void;
}

export const useUIStore = create<UIState>()(
	persist(
		(set) => ({
			// Right sidebar state
			rightPanelView: null,
			setRightPanelView: (view) => set({ rightPanelView: view }),
			rightSidebarOpen: true,
			setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
			toggleRightSidebar: () =>
				set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
			
			// UI Settings - default to "right-sidebar" as per requirements
			tabPosition: "right-sidebar",
			setTabPosition: (position) => set({ tabPosition: position }),
			
			// Language settings - default to English
			locale: "en",
			setLocale: (locale) => set({ locale }),
		}),
		{
			name: "grain-ui",
			partialize: (state) => ({
				rightSidebarOpen: state.rightSidebarOpen,
				tabPosition: state.tabPosition,
				locale: state.locale,
			}),
		},
	),
);

/**
 * @deprecated Use useUIStore instead. This alias is provided for backward compatibility.
 * Will be removed in a future version.
 */
export const useUISettingsStore = useUIStore;
