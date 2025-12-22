/**
 * Keyboard Domain
 *
 * @deprecated 请使用 @/fn/keyboard 代替
 * Provides keyboard shortcut management.
 */

// 重新导出新位置的模块以保持向后兼容
export {
	type KeyboardShortcutHandler,
	keyboardShortcutManager,
} from "@/fn/keyboard";
