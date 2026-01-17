/**
 * @file use-global-keyboard.ts
 * @description 全局键盘快捷键 Hook（使用 react-hotkeys-hook）
 *
 * 职责：处理应用级别的键盘快捷键
 * 依赖规则：hooks/ 只能依赖 flows/, state/, types/
 *
 * 使用成熟库 react-hotkeys-hook 替代手写实现
 * - 自动处理 Mac/Windows 差异（mod = Cmd/Ctrl）
 * - 声明式 API
 * - 更好的性能和边界情况处理
 */

import { useHotkeys } from "react-hotkeys-hook"

// ============================================================================
// 类型定义
// ============================================================================

export interface GlobalKeyboardHandlers {
	readonly commandPalette: { toggle: () => void }
	readonly globalSearch: { toggle: () => void }
	readonly bufferSwitcher: { open: (direction: "forward" | "backward") => void }
	readonly toggleSidebar: () => void
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 全局键盘快捷键 Hook
 *
 * 快捷键列表：
 * - Cmd/Ctrl+K: 命令面板
 * - Cmd/Ctrl+Shift+F: 全局搜索
 * - Cmd/Ctrl+B: 切换侧边栏
 * - Ctrl+Tab: 向前切换 Buffer
 * - Ctrl+Shift+Tab: 向后切换 Buffer
 *
 * @param handlers - 快捷键处理器
 */
export function useGlobalKeyboard(handlers: GlobalKeyboardHandlers) {
	// 命令面板：Cmd/Ctrl+K
	useHotkeys(
		"mod+k",
		(e) => {
			e.preventDefault()
			handlers.commandPalette.toggle()
		},
		[handlers.commandPalette],
	)

	// 全局搜索：Cmd/Ctrl+Shift+F
	useHotkeys(
		"mod+shift+f",
		(e) => {
			e.preventDefault()
			handlers.globalSearch.toggle()
		},
		[handlers.globalSearch],
	)

	// 切换侧边栏：Cmd/Ctrl+B
	useHotkeys(
		"mod+b",
		(e) => {
			e.preventDefault()
			handlers.toggleSidebar()
		},
		[handlers.toggleSidebar],
	)

	// Buffer 切换：Ctrl+Tab（向前）
	useHotkeys(
		"ctrl+tab",
		(e) => {
			e.preventDefault()
			handlers.bufferSwitcher.open("forward")
		},
		[handlers.bufferSwitcher],
	)

	// Buffer 切换：Ctrl+Shift+Tab（向后）
	useHotkeys(
		"ctrl+shift+tab",
		(e) => {
			e.preventDefault()
			handlers.bufferSwitcher.open("backward")
		},
		[handlers.bufferSwitcher],
	)
}
