/**
 * @file use-global-keyboard.ts
 * @description 全局键盘快捷键 Hook
 *
 * 职责：处理应用级别的键盘快捷键
 * 依赖规则：hooks/ 只能依赖 flows/, state/, types/
 */

import { useEffect } from "react"

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
// 辅助函数
// ============================================================================

/**
 * 检测是否为 Mac 平台
 */
const isMacPlatform = () => /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent)

/**
 * 处理命令面板快捷键 (Cmd/Ctrl+K)
 */
const handleCommandPaletteShortcut = (
	e: KeyboardEvent,
	modKey: boolean,
	toggle: () => void,
): boolean => {
	if (modKey && e.key === "k") {
		e.preventDefault()
		toggle()
		return true
	}
	return false
}

/**
 * 处理全局搜索快捷键 (Cmd/Ctrl+Shift+F)
 */
const handleGlobalSearchShortcut = (
	e: KeyboardEvent,
	modKey: boolean,
	toggle: () => void,
): boolean => {
	if (modKey && e.shiftKey && e.key === "F") {
		e.preventDefault()
		toggle()
		return true
	}
	return false
}

/**
 * 处理侧边栏快捷键 (Cmd/Ctrl+B)
 */
const handleSidebarShortcut = (e: KeyboardEvent, modKey: boolean, toggle: () => void): boolean => {
	if (modKey && e.key === "b") {
		e.preventDefault()
		toggle()
		return true
	}
	return false
}

/**
 * 处理 Buffer 切换快捷键 (Ctrl+Tab / Ctrl+Shift+Tab)
 */
const handleBufferSwitcherShortcut = (
	e: KeyboardEvent,
	open: (direction: "forward" | "backward") => void,
): boolean => {
	if (e.ctrlKey && e.key === "Tab") {
		e.preventDefault()
		open(e.shiftKey ? "backward" : "forward")
		return true
	}
	return false
}

/**
 * 创建全局键盘事件处理器
 */
const createKeyboardHandler = (handlers: GlobalKeyboardHandlers) => (e: KeyboardEvent) => {
	const modKey = isMacPlatform() ? e.metaKey : e.ctrlKey

	if (handleCommandPaletteShortcut(e, modKey, handlers.commandPalette.toggle)) {
		return
	}
	if (handleGlobalSearchShortcut(e, modKey, handlers.globalSearch.toggle)) {
		return
	}
	if (handleSidebarShortcut(e, modKey, handlers.toggleSidebar)) {
		return
	}
	handleBufferSwitcherShortcut(e, handlers.bufferSwitcher.open)
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 全局键盘快捷键 Hook
 *
 * @param handlers - 快捷键处理器
 */
export function useGlobalKeyboard(handlers: GlobalKeyboardHandlers) {
	useEffect(() => {
		const handleKeyDown = createKeyboardHandler(handlers)
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [handlers])
}
