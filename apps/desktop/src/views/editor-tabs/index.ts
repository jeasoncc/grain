/**
 * @file views/editor-tabs/index.ts
 * @description Editor Tab 模块导出
 *
 * 纯函数已移动到 pipes/editor-tab/
 * 此文件保留用于向后兼容
 */

// Re-export from pipes for backward compatibility
export * from "@/pipes/editor-tab";

// Export components
export { EditorTabsContainer as EditorTabs } from "./editor-tabs.container.fn";
export { EditorTabsView } from "./editor-tabs.view.fn";
