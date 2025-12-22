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
	UIActions,
	UIConfig,
	UIState,
} from "./ui.interface";

export { DEFAULT_UI_CONFIG, DEFAULT_UI_STATE } from "./ui.interface";

// ==============================
// Store & Hooks
// ==============================

export {
	useIsPanelViewActive,
	useIsTabsAtTop,
	useLocale,
	useRightPanelView,
	useRightSidebarOpen,
	useTabPosition,
	useUISettingsStore,
	useUIStore,
} from "./ui.store";
