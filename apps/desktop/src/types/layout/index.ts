/**
 * Layout Domain - Public Exports
 */

// Re-export SidebarPanel for convenience
export type { SidebarPanel } from "../sidebar/sidebar.interface"
export { SIDEBAR_PANELS } from "../sidebar/sidebar.interface"
export type {
	LayoutActions,
	LayoutConfig,
	LayoutState,
} from "./layout.interface"
export {
	DEFAULT_LAYOUT_CONFIG,
	DEFAULT_LAYOUT_STATE,
} from "./layout.interface"
