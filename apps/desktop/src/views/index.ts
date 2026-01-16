/**
 * Views - UI 视图层
 *
 * 职责：UI 渲染
 * 依赖：hooks/, types/
 */

// Activity Bar
export * from "./activity-bar"

// Backup Manager
export * from "./backup-manager"

// Blocks
export * from "./blocks"

// Buffer Switcher
export * from "./buffer-switcher"

// Command Palette
export * from "./command-palette"

// Editor Tabs
export * from "./editor-tabs"

// Excalidraw Editor
export * from "./excalidraw-editor"

// Export Button
export * from "./export-button"

// Export Dialog
export * from "./export-dialog"

// Export Dialog Manager
export * from "./export-dialog-manager"

// File Tree
export * from "./file-tree"

// Global Search
export * from "./global-search"

// Keyboard Shortcuts Help
export * from "./keyboard-shortcuts-help"

// Panels
export * from "./panels"

// Save Status Indicator
export * from "./save-status-indicator"

// Story Right Sidebar
export * from "./story-right-sidebar"

// Story Workspace
export * from "./story-workspace"

// Theme Selector
export * from "./theme-selector"

// UI Components - Not re-exported to avoid naming conflicts
// Import directly from @/views/ui/* when needed

// Unified Sidebar
export * from "./unified-sidebar"

// Update Checker
export * from "./update-checker"

// Utils
export * from "./utils"

// Word Count Badge
export * from "./word-count-badge"

// ==============================
// 从 fn/ 迁移的 UI 相关模块
// ==============================

// Diagram 渲染
export * as diagramView from "./diagram"

// Drawing 工具
export * as drawingView from "./drawing"

// Editor History
export * as editorHistoryView from "./editor-history"

// Theme 配置
export * as themeView from "./theme"

// Writing 状态
export * as writingView from "./writing"
