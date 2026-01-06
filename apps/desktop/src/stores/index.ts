/**
 * @file stores/index.ts
 * @description 状态管理层统一导出
 *
 * @deprecated 请使用 @/state 代替
 * 此文件保留用于向后兼容
 *
 * 本目录包含所有 Zustand Store，特点：
 * - 使用 Zustand + Immer 中间件
 * - 不可变状态更新
 * - 日志记录（使用 [Store] 前缀）
 */

// Diagram Store - 图表设置状态
export * from "./diagram.store";
// Editor History Store - 编辑器历史状态
export * from "./editor-history.store";
// Editor Settings Store - 编辑器设置状态
export * from "./editor-settings.store";
// Editor Tabs Store - 编辑器标签页状态
export * from "./editor-tabs.store";
// Font Store - 字体设置状态
export * from "./font.store";
// Icon Theme Store - 图标主题状态
export * from "./icon-theme.store";
// Save Store - 保存状态
export * from "./save.store";
// Selection Store - 工作区和节点选择状态
export * from "./selection.store";
// Sidebar Store - 侧边栏状态
export * from "./sidebar.store";
// Theme Store - 主题状态
export * from "./theme.store";
// UI Store - UI 状态（右侧面板、标签页位置、语言）
export * from "./ui.store";
// Writing Store - 写作状态
export * from "./writing.store";
