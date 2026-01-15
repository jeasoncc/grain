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
	readonly registerShortcut: (key: string, handler: () => void) => void
	readonly unregisterShortcut: (key: string) => void
}

export interface ShortcutConfig {
	readonly key: string
	readonly ctrlKey?: boolean
	readonly metaKey?: boolean
	readonly shiftKey?: boolean
	readonly altKey?: boolean
}

interface KeyboardShortcutState {
	readonly shortcuts: ReadonlyMap<string, () => void>
	readonly isListening: boolean
}

// ============================================================================
// Pure Functions
// ============================================================================

export const isSaveShortcut = (event: KeyboardEvent): boolean => {
	return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s"
}

export const getShortcutKey = (event: KeyboardEvent): string => {
	const parts: readonly string[] = [
		...(event.ctrlKey ? ["ctrl"] : []),
		...(event.metaKey ? ["meta"] : []),
		...(event.shiftKey ? ["shift"] : []),
		...(event.altKey ? ["alt"] : []),
		event.key.toLowerCase(),
	]

	return parts.join("+")
}

export const isEditableElement = (target: HTMLElement): boolean => {
	return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA"
}

// ============================================================================
// State Management Functions
// ============================================================================

const createInitialState = (): KeyboardShortcutState => ({
	isListening: false,
	shortcuts: new Map(),
})

const addShortcut = (
	state: KeyboardShortcutState,
	key: string,
	handler: () => void,
): KeyboardShortcutState => ({
	...state,
	shortcuts: new Map([...state.shortcuts, [key, handler]]),
})

const removeShortcut = (state: KeyboardShortcutState, key: string): KeyboardShortcutState => ({
	...state,
	shortcuts: new Map([...state.shortcuts].filter(([k]) => k !== key)),
})

const setListening = (
	state: KeyboardShortcutState,
	isListening: boolean,
): KeyboardShortcutState => ({
	...state,
	isListening,
})

// ============================================================================
// Keyboard Shortcut Manager (Functional)
// ============================================================================

const createKeyboardShortcutManager = (): KeyboardShortcutHandler => {
	let state = createInitialState()

	const handleKeyDown = (event: KeyboardEvent): void => {
		const target = event.target as HTMLElement

		if (isEditableElement(target)) {
			if (!isSaveShortcut(event)) {
				return
			}
		}

		const shortcutKey = getShortcutKey(event)
		const handler = state.shortcuts.get(shortcutKey)

		if (handler) {
			event.preventDefault()
			handler()
		}
	}

	const registerShortcut = (key: string, handler: () => void): void => {
		state = addShortcut(state, key, handler)

		if (!state.isListening) {
			window.addEventListener("keydown", handleKeyDown)
			state = setListening(state, true)
		}
	}

	const unregisterShortcut = (key: string): void => {
		state = removeShortcut(state, key)

		if (state.shortcuts.size === 0 && state.isListening) {
			window.removeEventListener("keydown", handleKeyDown)
			state = setListening(state, false)
		}
	}

	return {
		registerShortcut,
		unregisterShortcut,
	}
}

export const keyboardShortcutManager = createKeyboardShortcutManager()
