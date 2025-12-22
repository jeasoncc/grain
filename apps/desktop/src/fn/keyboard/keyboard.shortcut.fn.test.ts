/**
 * @file keyboard.shortcut.fn.test.ts
 * @description 键盘快捷键纯函数测试
 */

import { describe, expect, it } from "vitest";
import {
	getShortcutKey,
	isEditableElement,
	isSaveShortcut,
} from "./keyboard.shortcut.fn";

// ============================================================================
// Mock KeyboardEvent
// ============================================================================

const createKeyboardEvent = (
	key: string,
	options: {
		ctrlKey?: boolean;
		metaKey?: boolean;
		shiftKey?: boolean;
		altKey?: boolean;
	} = {},
): KeyboardEvent => {
	return {
		key,
		ctrlKey: options.ctrlKey ?? false,
		metaKey: options.metaKey ?? false,
		shiftKey: options.shiftKey ?? false,
		altKey: options.altKey ?? false,
	} as KeyboardEvent;
};

// ============================================================================
// Mock HTMLElement
// ============================================================================

const createMockElement = (
	tagName: string,
	isContentEditable = false,
): HTMLElement => {
	return {
		tagName,
		isContentEditable,
	} as HTMLElement;
};

// ============================================================================
// isSaveShortcut Tests
// ============================================================================

describe("isSaveShortcut", () => {
	it("should return true for Ctrl+S", () => {
		const event = createKeyboardEvent("s", { ctrlKey: true });
		expect(isSaveShortcut(event)).toBe(true);
	});

	it("should return true for Ctrl+S (uppercase)", () => {
		const event = createKeyboardEvent("S", { ctrlKey: true });
		expect(isSaveShortcut(event)).toBe(true);
	});

	it("should return true for Meta+S (Mac)", () => {
		const event = createKeyboardEvent("s", { metaKey: true });
		expect(isSaveShortcut(event)).toBe(true);
	});

	it("should return true for Meta+S (Mac, uppercase)", () => {
		const event = createKeyboardEvent("S", { metaKey: true });
		expect(isSaveShortcut(event)).toBe(true);
	});

	it("should return false for S without modifier", () => {
		const event = createKeyboardEvent("s");
		expect(isSaveShortcut(event)).toBe(false);
	});

	it("should return false for Ctrl+other key", () => {
		const event = createKeyboardEvent("a", { ctrlKey: true });
		expect(isSaveShortcut(event)).toBe(false);
	});

	it("should return false for Shift+S", () => {
		const event = createKeyboardEvent("s", { shiftKey: true });
		expect(isSaveShortcut(event)).toBe(false);
	});

	it("should return false for Alt+S", () => {
		const event = createKeyboardEvent("s", { altKey: true });
		expect(isSaveShortcut(event)).toBe(false);
	});
});

// ============================================================================
// getShortcutKey Tests
// ============================================================================

describe("getShortcutKey", () => {
	it("should return key only for simple key press", () => {
		const event = createKeyboardEvent("a");
		expect(getShortcutKey(event)).toBe("a");
	});

	it("should return ctrl+key for Ctrl modifier", () => {
		const event = createKeyboardEvent("s", { ctrlKey: true });
		expect(getShortcutKey(event)).toBe("ctrl+s");
	});

	it("should return meta+key for Meta modifier", () => {
		const event = createKeyboardEvent("s", { metaKey: true });
		expect(getShortcutKey(event)).toBe("meta+s");
	});

	it("should return shift+key for Shift modifier", () => {
		const event = createKeyboardEvent("f", { shiftKey: true });
		expect(getShortcutKey(event)).toBe("shift+f");
	});

	it("should return alt+key for Alt modifier", () => {
		const event = createKeyboardEvent("x", { altKey: true });
		expect(getShortcutKey(event)).toBe("alt+x");
	});

	it("should handle multiple modifiers in correct order", () => {
		const event = createKeyboardEvent("s", {
			ctrlKey: true,
			shiftKey: true,
		});
		expect(getShortcutKey(event)).toBe("ctrl+shift+s");
	});

	it("should handle all modifiers", () => {
		const event = createKeyboardEvent("a", {
			ctrlKey: true,
			metaKey: true,
			shiftKey: true,
			altKey: true,
		});
		expect(getShortcutKey(event)).toBe("ctrl+meta+shift+alt+a");
	});

	it("should lowercase the key", () => {
		const event = createKeyboardEvent("S", { ctrlKey: true });
		expect(getShortcutKey(event)).toBe("ctrl+s");
	});

	it("should handle special keys", () => {
		const event = createKeyboardEvent("Enter", { ctrlKey: true });
		expect(getShortcutKey(event)).toBe("ctrl+enter");
	});

	it("should handle function keys", () => {
		const event = createKeyboardEvent("F1");
		expect(getShortcutKey(event)).toBe("f1");
	});
});

// ============================================================================
// isEditableElement Tests
// ============================================================================

describe("isEditableElement", () => {
	it("should return true for INPUT element", () => {
		const element = createMockElement("INPUT");
		expect(isEditableElement(element)).toBe(true);
	});

	it("should return true for TEXTAREA element", () => {
		const element = createMockElement("TEXTAREA");
		expect(isEditableElement(element)).toBe(true);
	});

	it("should return true for contentEditable element", () => {
		const element = createMockElement("DIV", true);
		expect(isEditableElement(element)).toBe(true);
	});

	it("should return false for regular DIV", () => {
		const element = createMockElement("DIV");
		expect(isEditableElement(element)).toBe(false);
	});

	it("should return false for BUTTON element", () => {
		const element = createMockElement("BUTTON");
		expect(isEditableElement(element)).toBe(false);
	});

	it("should return false for SPAN element", () => {
		const element = createMockElement("SPAN");
		expect(isEditableElement(element)).toBe(false);
	});

	it("should return false for A element", () => {
		const element = createMockElement("A");
		expect(isEditableElement(element)).toBe(false);
	});
});
