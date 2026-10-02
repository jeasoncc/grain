import { act, renderHook } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { OrgWindowCloseOptions } from "@/io/event/org-window-close.adapter"
import {
	ORG_WINDOW_CLOSE_BUSY_MESSAGE,
	ORG_WINDOW_CLOSE_DISCARD_MESSAGE,
	useOrgWindowClose,
} from "./use-org-window-close"

const native = vi.hoisted(() => ({ isTauri: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({ isTauri: native.isTauri }))
const adapter = vi.hoisted(() => ({ register: vi.fn(), stop: vi.fn() }))
vi.mock("@/io/event/org-window-close.adapter", () => ({ registerOrgWindowClose: adapter.register }))
beforeEach(() => {
	native.isTauri.mockReturnValue(true)
	adapter.register.mockReturnValue(adapter.stop)
})
afterEach(() => {
	vi.restoreAllMocks()
	vi.clearAllMocks()
})

describe("useOrgWindowClose", () => {
	it("keeps native editing unready until registration signals readiness", () => {
		const { result, unmount } = renderHook(() =>
			useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false }, vi.fn()),
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
			useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false }, onMessage),
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
			useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false }, vi.fn()),
		)
		expect(result.current).toBe(true)
		unmount()
	})
	it("ignores a late readiness callback after unmount", () => {
		const { result, unmount } = renderHook(() =>
			useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false }, vi.fn()),
		)
		const options = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		unmount()
		act(() => options.onReady())
		expect(result.current).toBe(false)
		expect(adapter.stop).toHaveBeenCalledOnce()
	})
	it("ignores readiness from a retired effect lifecycle", () => {
		const { result, unmount } = renderHook(
			() => useOrgWindowClose({ hasDirtyBuffers: false, isBusy: false }, vi.fn()),
			{ wrapper: StrictMode },
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
	it("uses latest aggregate state and inline message callback without re-registering; cleans on unmount", () => {
		adapter.register.mockReturnValue(adapter.stop)
		const originalMessage = vi.fn()
		const nextMessage = vi.fn()
		const { rerender, unmount } = renderHook(
			({ state, onMessage }) => useOrgWindowClose(state, onMessage),
			{
				initialProps: {
					onMessage: originalMessage,
					state: { hasDirtyBuffers: false, isBusy: false },
				},
			},
		)
		const options = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		rerender({ onMessage: nextMessage, state: { hasDirtyBuffers: true, isBusy: true } })
		expect(options.getState()).toEqual({ hasDirtyBuffers: true, isBusy: true })
		act(() => options.onBlocked())
		expect(nextMessage).toHaveBeenCalledWith(ORG_WINDOW_CLOSE_BUSY_MESSAGE)
		expect(originalMessage).not.toHaveBeenCalled()
		expect(adapter.register).toHaveBeenCalledOnce()
		unmount()
		expect(adapter.stop).toHaveBeenCalledOnce()
	})
	it("uses synchronous explicit discard confirmation and reports errors inline", () => {
		adapter.register.mockReturnValue(adapter.stop)
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
		const onMessage = vi.fn()
		const { unmount } = renderHook(() =>
			useOrgWindowClose({ hasDirtyBuffers: true, isBusy: false }, onMessage),
		)
		const options = adapter.register.mock.calls[0][0] as OrgWindowCloseOptions
		expect(options.confirmDiscard()).toBe(false)
		expect(confirm).toHaveBeenCalledWith(ORG_WINDOW_CLOSE_DISCARD_MESSAGE)
		act(() => options.onError(new Error("destroy failed")))
		expect(onMessage).toHaveBeenCalledWith(expect.stringContaining("destroy failed"))
		unmount()
	})
})
