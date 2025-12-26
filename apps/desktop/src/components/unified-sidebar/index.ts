/**
 * UnifiedSidebar Component Exports
 */

export { UnifiedSidebarView } from "./unified-sidebar.view.fn";
export { UnifiedSidebarContainer } from "./unified-sidebar.container.fn";
export { UnifiedSidebarContainer as UnifiedSidebar } from "./unified-sidebar.container.fn";
export type {
	UnifiedSidebarViewProps,
	UnifiedSidebarContainerProps,
} from "./unified-sidebar.types";

// Legacy exports for backward compatibility
export { UnifiedSidebarView as UnifiedSidebarContent } from "./unified-sidebar.view.fn";
export type { UnifiedSidebarViewProps as UnifiedSidebarContentProps } from "./unified-sidebar.types";
