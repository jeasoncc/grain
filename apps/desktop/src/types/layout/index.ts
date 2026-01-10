/**
 * Layout Domain - Public Exports
 */

export type {
	LayoutState,
	LayoutActions,
	LayoutConfig,
} from "./layout.interface";

export { DEFAULT_LAYOUT_STATE, DEFAULT_LAYOUT_CONFIG } from "./layout.interface";

// Re-export SidebarPanel for convenience
export type { SidebarPanel } from "../sidebar/sidebar.interface";
export { SIDEBAR_PANELS } from "../sidebar/sidebar.interface";
