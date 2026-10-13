import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { StrictMode, useEffect } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ConfirmProvider, useConfirm } from "./confirm"

const options = {
	cancelText: "Keep draft",
	confirmText: "Discard draft",
	description: "The unsaved draft will be lost.",
	title: "Discard draft?",
}

afterEach(() => {
	cleanup()
	vi.useRealTimers()
})

describe("ConfirmProvider decisions", () => {
	it.each(["cancel", "escape", "close", "backdrop"])(
		"resolves %s dismissal false exactly once instead of abandoning the caller",
		async (dismissal) => {
			if (dismissal === "backdrop") {
				vi.useFakeTimers()
			}
			const controller = new AbortController()
			const { result, unmount } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider })
			let decision!: Promise<boolean>
			act(() => { decision = result.current({ ...options, signal: controller.signal }) })
			const settled = vi.fn()
			void decision.then(settled)
			await act(async () => { await Promise.resolve() })
			expect(settled).not.toHaveBeenCalled()
			if (dismissal === "cancel") {
				fireEvent.click(screen.getByRole("button", { name: options.cancelText }))
			} else if (dismissal === "escape") {
				fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
			} else if (dismissal === "close") {
				fireEvent.click(screen.getByRole("button", { name: "Close" }))
			} else {
				act(() => vi.runOnlyPendingTimers())
				const backdrop = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]')
				if (!backdrop) {
					throw new Error("Expected the real dialog backdrop")
				}
				fireEvent(backdrop, new MouseEvent("pointerdown", { bubbles: true, button: 0 }))
				fireEvent.click(backdrop)
				act(() => vi.runOnlyPendingTimers())
			}
			await expect(decision).resolves.toBe(false)
			expect(screen.queryByRole("dialog")).toBeNull()
			act(() => controller.abort())
			unmount()
			await Promise.resolve()
			expect(settled).toHaveBeenCalledExactlyOnceWith(false)
		},
	)

	it("accepts only an explicit active decision and detaches its cancellation from later requests", async () => {
		const controller = new AbortController()
		const { result, unmount } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider })
		let accepted!: Promise<boolean>
		act(() => { accepted = result.current({ ...options, signal: controller.signal }) })
		const settled = vi.fn()
		void accepted.then(settled)
		fireEvent.click(screen.getByRole("button", { name: options.confirmText }))
		await expect(accepted).resolves.toBe(true)
		expect(screen.queryByRole("dialog")).toBeNull()

		let next!: Promise<boolean>
		act(() => { next = result.current({ ...options, title: "Discard another draft?" }) })
		const nextSettled = vi.fn()
		void next.then(nextSettled)
		act(() => controller.abort())
		await act(async () => { await Promise.resolve() })
		expect(nextSettled).not.toHaveBeenCalled()
		expect(screen.getByRole("dialog", { name: "Discard another draft?" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: options.cancelText }))
		await expect(next).resolves.toBe(false)
		unmount()
		expect(settled).toHaveBeenCalledExactlyOnceWith(true)
	})

	it("fails closed for an already aborted signal without consuming the next decision", async () => {
		const controller = new AbortController()
		controller.abort()
		const { result } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider })
		await expect(result.current({ ...options, signal: controller.signal })).resolves.toBe(false)
		expect(screen.queryByRole("dialog")).toBeNull()
		let next!: Promise<boolean>
		act(() => { next = result.current(options) })
		fireEvent.click(screen.getByRole("button", { name: options.confirmText }))
		await expect(next).resolves.toBe(true)
	})

	it("aborts an open decision and makes its old accept control inert for a fresh request", async () => {
		const controller = new AbortController()
		const { result } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider })
		let retired!: Promise<boolean>
		act(() => { retired = result.current({ ...options, signal: controller.signal }) })
		const staleAccept = screen.getByRole("button", { name: options.confirmText })
		act(() => controller.abort())
		await expect(retired).resolves.toBe(false)
		expect(screen.queryByRole("dialog")).toBeNull()

		let current!: Promise<boolean>
		act(() => { current = result.current({ ...options, title: "Current draft?" }) })
		const settled = vi.fn()
		void current.then(settled)
		fireEvent.click(staleAccept)
		await act(async () => { await Promise.resolve() })
		expect(settled).not.toHaveBeenCalled()
		expect(screen.getByRole("dialog", { name: "Current draft?" })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: options.cancelText }))
		await expect(current).resolves.toBe(false)
	})

	it("resolves provider retirement false and refuses calls retained after unmount", async () => {
		const controller = new AbortController()
		const { result, unmount } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider })
		const confirm = result.current
		let pending!: Promise<boolean>
		act(() => { pending = confirm({ ...options, signal: controller.signal }) })
		const settled = vi.fn()
		void pending.then(settled)
		unmount()
		await expect(pending).resolves.toBe(false)
		controller.abort()
		await expect(confirm(options)).resolves.toBe(false)
		expect(settled).toHaveBeenCalledExactlyOnceWith(false)
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	it("rejects a simultaneous request without replacing or orphaning the first dialog", async () => {
		const { result } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider })
		let first!: Promise<boolean>
		let second!: Promise<boolean>
		act(() => {
			first = result.current(options)
			second = result.current({ ...options, title: "Do not replace the first draft" })
		})
		const settled = vi.fn()
		void first.then(settled)
		await expect(second).resolves.toBe(false)
		expect(settled).not.toHaveBeenCalled()
		expect(screen.getByRole("dialog", { name: options.title })).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: options.confirmText }))
		await expect(first).resolves.toBe(true)
		expect(settled).toHaveBeenCalledExactlyOnceWith(true)
		expect(screen.queryByRole("dialog")).toBeNull()
	})

	it.each(["cancel", "escape"] as const)("returns %s to the surviving input without changing its exact selection", async (dismissal) => {
		let confirm!: ReturnType<typeof useConfirm>
		function Source() {
			confirm = useConfirm()
			return <section role="dialog" aria-label="Source scratch">
				<input aria-label="Source input" defaultValue="literal 中文 source" />
			</section>
		}
		render(<Source />, { wrapper: ConfirmProvider })
		const origin = screen.getByRole<HTMLInputElement>("textbox", { name: "Source input" })
		act(() => {
			origin.focus()
			origin.setSelectionRange(2, 9, "backward")
		})
		let decision!: Promise<boolean>
		act(() => { decision = confirm(options) })
		if (dismissal === "cancel") fireEvent.click(screen.getByRole("button", { name: options.cancelText }))
		else fireEvent.keyDown(screen.getByRole("dialog", { name: options.title }), { key: "Escape" })
		await expect(decision).resolves.toBe(false)
		await waitFor(() => expect(origin).toHaveFocus())
		expect(origin.selectionStart).toBe(2)
		expect(origin.selectionEnd).toBe(9)
		expect(origin.selectionDirection).toBe("backward")
		expect(origin.value).toBe("literal 中文 source")
	})

	it("does not reclaim focus after the requesting scope aborts and another input takes over", async () => {
		vi.useFakeTimers()
		let confirm!: ReturnType<typeof useConfirm>
		function Source() {
			confirm = useConfirm()
			return <><input aria-label="Retired input" /><input aria-label="New input" /></>
		}
		render(<Source />, { wrapper: ConfirmProvider })
		const origin = screen.getByRole<HTMLInputElement>("textbox", { name: "Retired input" })
		const next = screen.getByRole<HTMLInputElement>("textbox", { name: "New input" })
		act(() => origin.focus())
		const scope = new AbortController()
		let decision!: Promise<boolean>
		act(() => { decision = confirm({ ...options, signal: scope.signal }) })
		await act(async () => {
			scope.abort()
			await decision
		})
		act(() => next.focus())
		await act(async () => { await vi.runOnlyPendingTimersAsync() })
		expect(next).toHaveFocus()
		expect(origin).not.toHaveFocus()
	})

	it("cancels a retired StrictMode effect without disabling its replacement decision", async () => {
		const settled = vi.fn()
		function RequestOnMount() {
			const confirm = useConfirm()
			useEffect(() => {
				void confirm(options).then(settled)
			}, [confirm])
			return null
		}
		render(
			<StrictMode>
				<ConfirmProvider>
					<RequestOnMount />
				</ConfirmProvider>
			</StrictMode>,
		)
		await act(async () => { await Promise.resolve() })
		expect(settled).toHaveBeenCalledExactlyOnceWith(false)
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: options.confirmText }))
		await act(async () => { await Promise.resolve() })
		expect(settled.mock.calls).toEqual([[false], [true]])
	})
})
