import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MAX_ORG_PREFIX_TIMEOUT_MS } from "@/flows/org-command/org-prefix-keymap"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import { OrgWhichKey } from "./org-which-key.view.fn"

const makePrefix = (overrides: Partial<OrgPrefixSession> = {}): OrgPrefixSession => ({
	id: 1,
	label: "C-c",
	expiresAt: Date.now() + 2000,
	bindings: [
		{ keyLabel: "C-t", label: "TODO", commandId: "todo" },
		{ keyLabel: "C-l", label: "Insert link", commandId: "link" },
	],
	...overrides,
})
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const panel = () => screen.queryByRole("region", { name: "Which-Key" })

describe("Org Which-Key", () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
	})
	afterEach(() => {
		cleanup()
		vi.useRealTimers()
	})

	it("waits 350ms then displays passive prefix bindings in normal flow", () => {
		const { container } = render(<OrgWhichKey prefix={makePrefix()} />)
		expect(panel()).toBeNull()
		advance(349)
		expect(panel()).toBeNull()
		advance(1)
		expect(panel()).toHaveTextContent("C-c")
		expect(panel()).toHaveTextContent("C-tTODO")
		expect(panel()).toHaveTextContent("C-lInsert link")
		expect(container.querySelector("dl")).toHaveClass("grid")
		expect(
			container.querySelector("button, input, [role=listbox], [tabindex], [autofocus]"),
		).toBeNull()
		expect(screen.queryByRole("dialog")).toBeNull()
		expect(panel()?.className).not.toMatch(/absolute|fixed/)
	})

	it("supports a configurable delay", () => {
		render(<OrgWhichKey prefix={makePrefix()} delayMs={100} />)
		advance(99)
		expect(panel()).toBeNull()
		advance(1)
		expect(panel()).not.toBeNull()
	})

	it("cancels an old pending reveal when replaced", () => {
		const { rerender } = render(<OrgWhichKey prefix={makePrefix()} />)
		advance(200)
		rerender(<OrgWhichKey prefix={makePrefix({ id: 2, label: "C-x" })} />)
		advance(150)
		expect(panel()).toBeNull()
		advance(200)
		expect(panel()).toHaveTextContent("C-x")
		expect(panel()).not.toHaveTextContent("C-c")
	})

	it("immediately hides visible help on replacement or removal", () => {
		const { rerender } = render(<OrgWhichKey prefix={makePrefix()} />)
		advance(350)
		expect(panel()).not.toBeNull()
		rerender(<OrgWhichKey prefix={makePrefix({ id: 2 })} />)
		expect(panel()).toBeNull()
		advance(350)
		expect(panel()).not.toBeNull()
		rerender(<OrgWhichKey prefix={null} />)
		expect(panel()).toBeNull()
		expect(vi.getTimerCount()).toBe(0)
		advance(3000)
		expect(panel()).toBeNull()
	})

	it("keeps nullable-expiry help visible until replacement or cancellation", () => {
		const { rerender } = render(<OrgWhichKey prefix={makePrefix({ expiresAt: null })} />)
		advance(349)
		expect(panel()).toBeNull()
		advance(1)
		expect(panel()).toHaveTextContent("C-c")
		advance(60_000)
		expect(panel()).toHaveTextContent("C-c")
		expect(vi.getTimerCount()).toBe(0)

		rerender(<OrgWhichKey prefix={makePrefix({ id: 2, label: "C-x", expiresAt: null })} />)
		expect(panel()).toBeNull()
		advance(350)
		expect(panel()).toHaveTextContent("C-x")
		expect(panel()).not.toHaveTextContent("C-c")
		advance(60_000)
		expect(panel()).toHaveTextContent("C-x")
		rerender(<OrgWhichKey prefix={null} />)
		expect(panel()).toBeNull()
		expect(vi.getTimerCount()).toBe(0)
		advance(60_000)
		expect(panel()).toBeNull()
	})

	it.each([0, 100, 350])("never reveals a prefix expiring after %ims", (lifetime) => {
		render(<OrgWhichKey prefix={makePrefix({ expiresAt: Date.now() + lifetime })} />)
		advance(350)
		expect(panel()).toBeNull()
		advance(1000)
		expect(panel()).toBeNull()
	})

	it("hides at the expiry boundary without requiring a caller rerender", () => {
		render(<OrgWhichKey prefix={makePrefix({ expiresAt: Date.now() + 500 })} />)
		advance(350)
		expect(panel()).not.toBeNull()
		advance(149)
		expect(panel()).not.toBeNull()
		advance(1)
		expect(panel()).toBeNull()
	})

	it("chunks externally supplied expiry beyond the timer limit without hiding early", () => {
		render(
			<OrgWhichKey
				prefix={makePrefix({ expiresAt: Date.now() + MAX_ORG_PREFIX_TIMEOUT_MS + 1000 })}
				delayMs={0}
			/>,
		)
		advance(1)
		expect(panel()).toHaveTextContent("C-c")
		advance(MAX_ORG_PREFIX_TIMEOUT_MS - 1)
		expect(panel()).toHaveTextContent("C-c")
		expect(vi.getTimerCount()).toBe(1)
		advance(999)
		expect(panel()).toHaveTextContent("C-c")
		advance(1)
		expect(panel()).toBeNull()
		expect(vi.getTimerCount()).toBe(0)
	})

	it.each([
		NaN,
		Infinity,
		-Infinity,
	])("uses the default delay for nonfinite delay %s", (delayMs) => {
		render(<OrgWhichKey prefix={makePrefix({ expiresAt: null })} delayMs={delayMs} />)
		advance(349)
		expect(panel()).toBeNull()
		advance(1)
		expect(panel()).not.toBeNull()
	})

	it("clamps overflow reveal delay to the timer limit rather than revealing immediately", () => {
		render(
			<OrgWhichKey
				prefix={makePrefix({ expiresAt: null })}
				delayMs={MAX_ORG_PREFIX_TIMEOUT_MS + 1}
			/>,
		)
		advance(1)
		expect(panel()).toBeNull()
		advance(MAX_ORG_PREFIX_TIMEOUT_MS - 2)
		expect(panel()).toBeNull()
		advance(1)
		expect(panel()).not.toBeNull()
	})

	it("clamps negative reveal delay to zero", () => {
		render(<OrgWhichKey prefix={makePrefix({ expiresAt: null })} delayMs={-1} />)
		advance(0)
		expect(panel()).not.toBeNull()
	})

	it("checks wall-clock expiry again when a delayed callback runs", () => {
		render(<OrgWhichKey prefix={makePrefix()} />)
		vi.setSystemTime(Date.now() + 3000)
		advance(350)
		expect(panel()).toBeNull()
	})

	it("keeps same-session timers and displays refreshed bindings", () => {
		const prefix = makePrefix({ expiresAt: Date.now() + 1000 })
		const { rerender } = render(<OrgWhichKey prefix={prefix} />)
		advance(200)
		const refreshed = {
			...prefix,
			bindings: [{ keyLabel: "t", label: "New TODO", commandId: "todo" as const }],
		}
		rerender(<OrgWhichKey prefix={refreshed} />)
		advance(150)
		expect(panel()).toHaveTextContent("New TODO")
		rerender(<OrgWhichKey prefix={{ ...refreshed, label: "Updated prefix" }} />)
		expect(panel()).toHaveTextContent("Updated prefix")
		advance(650)
		expect(panel()).toBeNull()
	})

	it.each([100, 350])("cleans all timers on unmount at %ims", (elapsed) => {
		const { unmount } = render(<OrgWhichKey prefix={makePrefix()} />)
		advance(elapsed)
		unmount()
		expect(vi.getTimerCount()).toBe(0)
		advance(3000)
		expect(panel()).toBeNull()
	})

	it("never moves editor focus when appearing, replacing, expiring or unmounting", () => {
		const editor = document.createElement("textarea")
		document.body.append(editor)
		editor.focus()
		const { rerender, unmount } = render(<OrgWhichKey prefix={makePrefix()} />)
		expect(editor).toHaveFocus()
		advance(350)
		expect(panel()).not.toBeNull()
		expect(editor).toHaveFocus()
		rerender(<OrgWhichKey prefix={makePrefix({ id: 2 })} />)
		expect(panel()).toBeNull()
		expect(editor).toHaveFocus()
		advance(350)
		expect(panel()).not.toBeNull()
		expect(editor).toHaveFocus()
		advance(1650)
		expect(panel()).toBeNull()
		expect(editor).toHaveFocus()
		unmount()
		expect(editor).toHaveFocus()
		editor.remove()
	})
})
