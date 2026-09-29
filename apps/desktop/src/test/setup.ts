/**
 * @file setup.ts
 * @description Shared browser shims for deterministic jsdom tests.
 */

import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

class TestStorage implements Storage {
	readonly #values = new Map<string, string>()

	get length() {
		return this.#values.size
	}

	clear() {
		this.#values.clear()
	}

	getItem(key: string) {
		return this.#values.get(key) ?? null
	}

	key(index: number) {
		return [...this.#values.keys()][index] ?? null
	}

	removeItem(key: string) {
		this.#values.delete(key)
	}

	setItem(key: string, value: string) {
		this.#values.set(key, String(value))
	}
}

const localStorage = new TestStorage()
Object.defineProperty(globalThis, "localStorage", {
	configurable: true,
	value: localStorage,
	writable: true,
})
Object.defineProperty(window, "localStorage", {
	configurable: true,
	value: localStorage,
	writable: true,
})

Object.defineProperty(window, "matchMedia", {
	configurable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		addEventListener: vi.fn(),
		addListener: vi.fn(),
		dispatchEvent: vi.fn(),
		matches: false,
		media: query,
		onchange: null,
		removeEventListener: vi.fn(),
		removeListener: vi.fn(),
	})),
	writable: true,
})

class TestResizeObserver implements ResizeObserver {
	disconnect = vi.fn()
	observe = vi.fn()
	unobserve = vi.fn()
}

Object.defineProperty(globalThis, "ResizeObserver", {
	configurable: true,
	value: TestResizeObserver,
	writable: true,
})

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
	configurable: true,
	value: vi.fn(),
	writable: true,
})
