import { act, fireEvent, renderHook, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgWindowCloseOptions } from "@/io/event/org-window-close.adapter"
import { ConfirmProvider } from "@/views/ui/confirm"
import { useOrgWindowClose } from "./use-org-window-close"

const native = vi.hoisted(() => ({ isTauri: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({ isTauri: native.isTauri }))
const adapter = vi.hoisted(() => ({ register: vi.fn(), stop: vi.fn() }))
vi.mock("@/io/event/org-window-close.adapter", () => ({ registerOrgWindowClose: adapter.register }))
const captureDiscard = vi.fn<OrgWindowCloseOptions["captureDiscard"]>()
const closeViewOnly = vi.fn<OrgWindowCloseOptions["closeViewOnly"]>()
beforeEach(() => {
	native.isTauri.mockReturnValue(true)
	adapter.register.mockReturnValue(adapter.stop)
	captureDiscard.mockReturnValue(() => true)
	closeViewOnly.mockResolvedValue(false)
})
afterEach(() => {
	vi.restoreAllMocks()
	vi.clearAllMocks()
})

describe("useOrgWindowClose", () => {
	it("keeps native editing unready until registration signals readiness", () => {
		const { result, unmount } = renderHook(() =>
			useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false, hasOtherWindows: false }, vi.fn(), captureDiscard, closeViewOnly),
			{ wrapper: ConfirmProvider },
		)
		expect(result.current).toBe(false)
		const options = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		act(() => options.onReady())
		expect(result.current).toBe(true)
		unmount()
	})
	it("remains unready after registration fails", () => {
		const onMessage = vi.fn()
		const { result, unmount } = renderHook(() =>
			useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false, hasOtherWindows: false }, onMessage, captureDiscard, closeViewOnly),
			{ wrapper: ConfirmProvider },
		)
		const options = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		act(() => options.onError(new Error("listener failed")))
		expect(result.current).toBe(false)
		expect(onMessage).toHaveBeenCalledWith(expect.stringContaining("listener failed"))
		unmount()
	})
	it("is ready on the initial browser render", () => {
		native.isTauri.mockReturnValue(false)
		const { result, unmount } = renderHook(() =>
			useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false, hasOtherWindows: false }, vi.fn(), captureDiscard, closeViewOnly),
			{ wrapper: ConfirmProvider },
		)
		expect(result.current).toBe(true)
		unmount()
	})
	it("ignores a late readiness callback after unmount", () => {
		const { result, unmount } = renderHook(() =>
			useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false, hasOtherWindows: false }, vi.fn(), captureDiscard, closeViewOnly),
			{ wrapper: ConfirmProvider },
		)
		const options = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		unmount()
		act(() => options.onReady())
		expect(result.current).toBe(false)
		expect(adapter.stop).toHaveBeenCalledOnce()
	})
	it("ignores readiness from a retired effect lifecycle", () => {
		const { result, unmount } = renderHook(
			() => useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false, hasOtherWindows: false }, vi.fn(), captureDiscard, closeViewOnly),
			{ wrapper: ConfirmProvider, reactStrictMode: true },
		)
		expect(adapter.register).toHaveBeenCalledTimes(2)
		const retired = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		const current = adapter.register.mock.calls[1][0] as OrgWindowCloseOptions
		act(() => retired.onReady())
		expect(result.current).toBe(false)
		act(() => current.onReady())
		expect(result.current).toBe(true)
		unmount()
	})
	it.each([false, true])("awaits the actual application dialog before returning %s", async (accepted) => {
		const { unmount } = renderHook(
			() => useOrgWindowClose({ hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }, vi.fn(), captureDiscard, closeViewOnly),
			{ wrapper: ConfirmProvider },
		)
		const options = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		const controller = new AbortController()
		let decision!: Promise<boolean>
		act(() => {
			decision = options.confirmDiscard(controller.signal)
		})
		const settled = vi.fn()
		void decision.then(settled)
		await act(async () => { await Promise.resolve() })
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		expect(settled).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole("button", {
			name: accepted ? "Discard and close" : "Keep editing",
		}))
		await expect(decision).resolves.toBe(accepted)
		expect(screen.queryByRole("dialog")).toBeNull()
		unmount()
	})
	it("dismisses the real dialog when the native registration cancels its signal", async () => {
		const { unmount } = renderHook(
			() => useOrgWindowClose({ hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }, vi.fn(), captureDiscard, closeViewOnly),
			{ wrapper: ConfirmProvider },
		)
		const options = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		const controller = new AbortController()
		let decision!: Promise<boolean>
		act(() => { decision = options.confirmDiscard(controller.signal) })
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		act(() => controller.abort())
		await expect(decision).resolves.toBe(false)
		expect(screen.queryByRole("dialog")).toBeNull()
		unmount()
	})
	it("reports close failures inline without changing native readiness", () => {
		const onMessage = vi.fn()
		const { result, unmount } = renderHook(
			() => useOrgWindowClose({ hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }, onMessage, captureDiscard, closeViewOnly),
			{ wrapper: ConfirmProvider },
		)
		const options = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		act(() => options.onReady())
		act(() => options.onError(new Error("destroy failed")))
		expect(onMessage).toHaveBeenCalledWith(expect.stringContaining("destroy failed"))
		expect(result.current).toBe(true)
		unmount()
	})
})
