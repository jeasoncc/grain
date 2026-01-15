/**
 * @file hooks/use-theme-dom.ts
 * @description 主题 DOM 操作函数 - 兼容层
 *
 * @deprecated 请直接从 @/io/dom 导入
 * 此文件保留为兼容层，重导出 io/dom/theme.dom
 */

export { applyThemeWithTransition, getSystemTheme } from "@/io/dom/theme.dom"
