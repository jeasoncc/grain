/**
 * 键盘快捷键管理器
 */
export interface KeyboardShortcutHandler {
	registerShortcut(key: string, handler: () => void): void;
	unregisterShortcut(key: string): void;
}

interface ShortcutConfig {
	key: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
}

class KeyboardShortcutManager implements KeyboardShortcutHandler {
	private shortcuts = new Map<string, () => void>();
	private isListening = false;

	constructor() {
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	registerShortcut(key: string, handler: () => void): void {
		this.shortcuts.set(key, handler);

		if (!this.isListening) {
			window.addEventListener("keydown", this.handleKeyDown);
			this.isListening = true;
		}
	}

	unregisterShortcut(key: string): void {
		this.shortcuts.delete(key);

		if (this.shortcuts.size === 0 && this.isListening) {
			window.removeEventListener("keydown", this.handleKeyDown);
			this.isListening = false;
		}
	}

	private handleKeyDown(event: KeyboardEvent): void {
		// 忽略在输入框中的快捷键
		const target = event.target as HTMLElement;
		if (
			target.isContentEditable ||
			target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA"
		) {
			// 只允许保存快捷键在编辑器中工作
			if (!this.isSaveShortcut(event)) {
				return;
			}
		}

		const shortcutKey = this.getShortcutKey(event);
		const handler = this.shortcuts.get(shortcutKey);

		if (handler) {
			event.preventDefault();
			handler();
		}
	}

	private isSaveShortcut(event: KeyboardEvent): boolean {
		return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
	}

	private getShortcutKey(event: KeyboardEvent): string {
		const parts: string[] = [];

		if (event.ctrlKey) parts.push("ctrl");
		if (event.metaKey) parts.push("meta");
		if (event.shiftKey) parts.push("shift");
		if (event.altKey) parts.push("alt");

		parts.push(event.key.toLowerCase());

		return parts.join("+");
	}

	destroy(): void {
		if (this.isListening) {
			window.removeEventListener("keydown", this.handleKeyDown);
			this.isListening = false;
		}
		this.shortcuts.clear();
	}
}

// 单例实例
export const keyboardShortcutManager = new KeyboardShortcutManager();
