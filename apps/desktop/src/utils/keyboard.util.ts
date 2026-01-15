/**
 * @file utils/keyboard.util.ts
 * @description 键盘快捷键工具函数
 *
 * 纯函数层，不应有 IO 操作
 */

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcutHandler {
	registerShortcut(key: string, handler: () => void): void;
	unregisterShortcut(key: string): void;
}

export interface ShortcutConfig {
	readonly key: string;
	readonly ctrlKey?: boolean;
	readonly metaKey?: boolean;
	readonly shiftKey?: boolean;
	readonly altKey?: boolean;
}

// ============================================================================
// Pure Functions
// ============================================================================

export const isSaveShortcut = (event: KeyboardEvent): boolean => {
	return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
};

export const getShortcutKey = (event: KeyboardEvent): string => {
	const parts: readonly string[] = [
		...(event.ctrlKey ? ["ctrl"] : []),
		...(event.metaKey ? ["meta"] : []),
		...(event.shiftKey ? ["shift"] : []),
		...(event.altKey ? ["alt"] : []),
		event.key.toLowerCase(),
	];

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

interface KeyboardShortcutState {
	readonly shortcuts: ReadonlyMap<string, () => void>;
	readonly isListening: boolean;
}

class KeyboardShortcutManager implements KeyboardShortcutHandler {
	private state: KeyboardShortcutState = {
		shortcuts: new Map(),
		isListening: false,
	};

	constructor() {
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}

	registerShortcut(key: string, handler: () => void): void {
		const newShortcuts = new Map([...this.state.shortcuts, [key, handler]]);
		
		if (!this.state.isListening) {
			window.addEventListener("keydown", this.handleKeyDown);
			this.state = {
				shortcuts: newShortcuts,
				isListening: true,
			};
		} else {
			this.state = {
				...this.state,
				shortcuts: newShortcuts,
			};
		}
	}

	unregisterShortcut(key: string): void {
		const newShortcuts = new Map([...this.state.shortcuts].filter(([k]) => k !== key));

		if (newShortcuts.size === 0 && this.state.isListening) {
			window.removeEventListener("keydown", this.handleKeyDown);
			this.state = {
				shortcuts: newShortcuts,
				isListening: false,
			};
		} else {
			this.state = {
				...this.state,
				shortcuts: newShortcuts,
			};
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
		const handler = this.state.shortcuts.get(shortcutKey);

		if (handler) {
			event.preventDefault();
			handler();
		}
	}

	destroy(): void {
		if (this.state.isListening) {
			window.removeEventListener("keydown", this.handleKeyDown);
		}
		this.state = {
			shortcuts: new Map(),
			isListening: false,
		};
	}

	get shortcutCount(): number {
		return this.state.shortcuts.size;
	}

	get listening(): boolean {
		return this.state.isListening;
	}
}

export const keyboardShortcutManager = new KeyboardShortcutManager();
