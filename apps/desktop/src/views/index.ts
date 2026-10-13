/**
 * Views - UI 视图层
 *
 * 职责：UI 渲染
 * 依赖：hooks/, types/
 */

// Backup Manager
export * from "./backup-manager"

// File Tree
export * from "./file-tree"

// Keyboard Shortcuts Help
export * from "./keyboard-shortcuts-help"

// Org filesystem workspace
export * from "./org-workspace"

// Theme Selector
export * from "./theme-selector"

// UI Components - Not re-exported to avoid naming conflicts
// Import directly from @/views/ui/* when needed

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

// Theme 配置
export * as themeView from "./theme"

// Writing 状态
export * as writingView from "./writing"
