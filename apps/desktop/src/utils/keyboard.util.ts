/**
 * @file utils/keyboard.util.ts
 * @description 键盘快捷键工具函数
 */

import logger from "@/log";

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcutHandler {
	registerShortcut(key: string, handler: () => void): void;
	unregisterShortcut(key: string): void;
}

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

export const isSaveShortcut = (event: KeyboardEvent): boolean => {
	return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
};

export const getShortcutKey = (event: KeyboardEvent): string => {
	const parts: string[] = [];

	if (event.ctrlKey) parts.push("ctrl");
	if (event.metaKey) parts.push("meta");
	if (event.shiftKey) parts.push("shift");
	if (event.altKey) parts.push("alt");

	parts.push(event.key.toLowerCase());

	return parts.join("+");
};

export const isEditableElement = (target: HTMLElement): boolean => {
	return (
		target.isContentEditable ||
		target.tagName === "INPUT" ||
		target.tagName === "TEXTAREA"
	);
};

// ============================================================================
// Keyboard Shortcut Manager
// ============================================================================

class KeyboardShortcutManager implements KeyboardShortcutHandler {
	private shortcuts = new Map<string, () => void>();
	private isListening = false;

	constructor() {
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	registerShortcut(key: string, handler: () => void): void {
		logger.debug("[Keyboard] 注册快捷键:", key);
		this.shortcuts.set(key, handler);

		if (!this.isListening) {
			window.addEventListener("keydown", this.handleKeyDown);
			this.isListening = true;
			logger.debug("[Keyboard] 开始监听键盘事件");
		}
	}

	unregisterShortcut(key: string): void {
		logger.debug("[Keyboard] 注销快捷键:", key);
		this.shortcuts.delete(key);

		if (this.shortcuts.size === 0 && this.isListening) {
			window.removeEventListener("keydown", this.handleKeyDown);
			this.isListening = false;
			logger.debug("[Keyboard] 停止监听键盘事件");
		}
	}

	private handleKeyDown(event: KeyboardEvent): void {
		const target = event.target as HTMLElement;

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

	destroy(): void {
		if (this.isListening) {
			window.removeEventListener("keydown", this.handleKeyDown);
			this.isListening = false;
		}
		this.shortcuts.clear();
		logger.debug("[Keyboard] 管理器已销毁");
	}

	get shortcutCount(): number {
		return this.shortcuts.size;
	}

	get listening(): boolean {
		return this.isListening;
	}
}

export const keyboardShortcutManager = new KeyboardShortcutManager();
