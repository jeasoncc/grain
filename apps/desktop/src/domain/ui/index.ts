/**
 * UI Domain - Module Entry Point
 *
 * Unified exports for UI state management.
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	RightPanelView,
	TabPosition,
	UIState,
	UIActions,
	UIConfig,
} from "./ui.interface";

export { DEFAULT_UI_CONFIG, DEFAULT_UI_STATE } from "./ui.interface";

// ==============================
// Store & Hooks
// ==============================

export {
	useUIStore,
	useUISettingsStore,
	useRightPanelView,
	useRightSidebarOpen,
	useTabPosition,
	useLocale,
	useIsPanelViewActive,
	useIsTabsAtTop,
} from "./ui.store";
