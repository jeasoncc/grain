/**
 * @file fn/keyboard/keyboard.shortcut.fn.ts
 * @description 键盘快捷键管理器
 *
 * 提供键盘快捷键的注册、注销和事件处理功能。
 * 支持组合键（Ctrl、Meta、Shift、Alt）。
 *
 * @requirements 3.3
 */

import logger from "@/log";

// ============================================================================
// Types
// ============================================================================

/**
 * 键盘快捷键处理器接口
 */
export interface KeyboardShortcutHandler {
	registerShortcut(key: string, handler: () => void): void;
	unregisterShortcut(key: string): void;
}

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
	key: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * 检查是否为保存快捷键
 *
 * @param event - 键盘事件
 * @returns 是否为保存快捷键
 */
export const isSaveShortcut = (event: KeyboardEvent): boolean => {
	return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
};

/**
 * 从键盘事件生成快捷键字符串
 *
 * @param event - 键盘事件
 * @returns 快捷键字符串，如 "ctrl+s"
 */
export const getShortcutKey = (event: KeyboardEvent): string => {
	const parts: string[] = [];

	if (event.ctrlKey) parts.push("ctrl");
	if (event.metaKey) parts.push("meta");
	if (event.shiftKey) parts.push("shift");
	if (event.altKey) parts.push("alt");

	parts.push(event.key.toLowerCase());

	return parts.join("+");
};

/**
 * 检查目标元素是否为可编辑元素
 *
 * @param target - 目标元素
 * @returns 是否为可编辑元素
 */
export const isEditableElement = (target: HTMLElement): boolean => {
	return (
		target.isContentEditable ||
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA"
	);
};

// ============================================================================
// Keyboard Shortcut Manager Class
// ============================================================================

/**
 * 键盘快捷键管理器
 *
 * 管理全局键盘快捷键的注册和触发。
 * 使用单例模式确保全局只有一个实例。
 */
class KeyboardShortcutManager implements KeyboardShortcutHandler {
	private shortcuts = new Map<string, () => void>();
	private isListening = false;

	constructor() {
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	/**
	 * 注册快捷键
	 *
	 * @param key - 快捷键字符串，如 "ctrl+s"
	 * @param handler - 快捷键触发时的回调函数
	 */
	registerShortcut(key: string, handler: () => void): void {
		logger.debug("[Keyboard] 注册快捷键:", key);
		this.shortcuts.set(key, handler);

		if (!this.isListening) {
			window.addEventListener("keydown", this.handleKeyDown);
			this.isListening = true;
			logger.debug("[Keyboard] 开始监听键盘事件");
		}
	}

	/**
	 * 注销快捷键
	 *
	 * @param key - 快捷键字符串
	 */
	unregisterShortcut(key: string): void {
		logger.debug("[Keyboard] 注销快捷键:", key);
		this.shortcuts.delete(key);

		if (this.shortcuts.size === 0 && this.isListening) {
			window.removeEventListener("keydown", this.handleKeyDown);
			this.isListening = false;
			logger.debug("[Keyboard] 停止监听键盘事件");
		}
	}

	/**
	 * 处理键盘按下事件
	 */
	private handleKeyDown(event: KeyboardEvent): void {
		const target = event.target as HTMLElement;

		// 忽略在输入框中的快捷键，但允许保存快捷键
		if (isEditableElement(target)) {
			if (!isSaveShortcut(event)) {
				return;
			}
		}

		const shortcutKey = getShortcutKey(event);
		const handler = this.shortcuts.get(shortcutKey);

		if (handler) {
			event.preventDefault();
			logger.debug("[Keyboard] 触发快捷键:", shortcutKey);
			handler();
		}
	}

	/**
	 * 销毁管理器，清理所有资源
	 */
	destroy(): void {
		if (this.isListening) {
			window.removeEventListener("keydown", this.handleKeyDown);
			this.isListening = false;
		}
		this.shortcuts.clear();
		logger.debug("[Keyboard] 管理器已销毁");
	}

	/**
	 * 获取已注册的快捷键数量
	 */
	get shortcutCount(): number {
		return this.shortcuts.size;
	}

	/**
	 * 检查是否正在监听
	 */
	get listening(): boolean {
		return this.isListening;
	}
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * 键盘快捷键管理器单例
 */
export const keyboardShortcutManager = new KeyboardShortcutManager();
