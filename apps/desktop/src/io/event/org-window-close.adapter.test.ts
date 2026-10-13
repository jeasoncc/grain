import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type OrgWindowCloseState, registerOrgWindowClose } from "./org-window-close.adapter"

const native = vi.hoisted(() => ({
	destroy: vi.fn(),
	getCurrentWindow: vi.fn(),
	isTauri: vi.fn(),
	onCloseRequested: vi.fn(),
}))
vi.mock("@tauri-apps/api/core", () => ({ isTauri: native.isTauri }))
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: native.getCurrentWindow }))

const flush = async () => {
	await Promise.resolve()
	await Promise.resolve()
	await Promise.resolve()
}
let stop: (() => void) | undefined
let state: OrgWindowCloseState
let editGeneration: number
let scopeGeneration: number
let handler: (event: { preventDefault: () => void }) => void
let remove: ReturnType<typeof vi.fn<() => void>>
const confirmDiscard = vi.fn<(signal: AbortSignal) => Promise<boolean>>()
const captureDiscard = vi.fn<() => () => boolean>()
const closeViewOnly = vi.fn<(signal: AbortSignal) => Promise<boolean>>()
const onBlocked = vi.fn()
const onError = vi.fn()
const onReady = vi.fn()
const register = () => {
	stop = registerOrgWindowClose({
		captureDiscard,
		confirmDiscard,
		closeViewOnly,
		getState: () => state,
		onBlocked,
		onError,
		onReady,
	})
	return stop
}
const close = () => {
	const event = { preventDefault: vi.fn() }
	handler(event)
	return event
}

beforeEach(() => {
	vi.resetAllMocks()
	state = { hasDirtyBuffers: false, isBusy: false, hasOtherWindows: false }
	editGeneration = 0
	scopeGeneration = 0
	remove = vi.fn()
	native.isTauri.mockReturnValue(true)
	native.getCurrentWindow.mockReturnValue(native)
	native.destroy.mockResolvedValue(undefined)
	native.onCloseRequested.mockImplementation((callback) => {
		handler = callback
		return Promise.resolve(remove)
	})
	confirmDiscard.mockResolvedValue(false)
	closeViewOnly.mockResolvedValue(false)
	captureDiscard.mockImplementation(() => {
		const edit = editGeneration
		const scope = scopeGeneration
		return () => edit === editGeneration && scope === scopeGeneration
	})
})
afterEach(() => {
	stop?.()
	stop = undefined
})

describe("Org native window close boundary", () => {
	it("does not register in a browser", () => {
		native.isTauri.mockReturnValue(false)
		register()
		expect(native.getCurrentWindow).not.toHaveBeenCalled()
		expect(native.onCloseRequested).not.toHaveBeenCalled()
		expect(onReady).toHaveBeenCalledOnce()
	})
	it("signals readiness only once delayed native registration succeeds", async () => {
		const pending = Promise.withResolvers<() => void>()
		native.onCloseRequested.mockReturnValue(pending.promise)
		register()
		expect(onReady).not.toHaveBeenCalled()
		pending.resolve(remove)
		await flush()
		expect(onReady).toHaveBeenCalledOnce()
	})
	it("never signals readiness when native registration throws", () => {
		const failure = new Error("registration threw")
		native.onCloseRequested.mockImplementation(() => {
			throw failure
		})
		register()
		expect(onError).toHaveBeenCalledWith(failure)
		expect(onReady).not.toHaveBeenCalled()
	})
	it("allows a clean idle close without confirming or destroying", () => {
		register()
		expect(close().preventDefault).not.toHaveBeenCalled()
		expect(confirmDiscard).not.toHaveBeenCalled()
		expect(native.destroy).not.toHaveBeenCalled()
	})
	it.each([false, true])("keeps the canonical owner alive when a child handles a main close during busy=%s", async (busy) => {
		state = { hasDirtyBuffers: true, isBusy: busy, hasOtherWindows: true }
		closeViewOnly.mockResolvedValue(true)
		register()
		expect(close().preventDefault).toHaveBeenCalledOnce()
		await flush()
		expect(native.destroy).not.toHaveBeenCalled()
		expect(confirmDiscard).not.toHaveBeenCalled()
		expect(state.hasDirtyBuffers).toBe(true)
	})
	it("does not destroy main while a child creation is still unresolved", async () => {
		state = { hasDirtyBuffers: false, isBusy: false, hasOtherWindows: true }
		register()
		expect(close().preventDefault).toHaveBeenCalledOnce()
		await flush()
		expect(native.destroy).not.toHaveBeenCalled()
		expect(confirmDiscard).not.toHaveBeenCalled()
		expect(onBlocked).toHaveBeenCalledOnce()
	})
	it.each([false, true])("waits for an async dirty-close decision before honoring %s", async (accepted) => {
		const decision = Promise.withResolvers<boolean>()
		confirmDiscard.mockReturnValue(decision.promise)
		register()
		state = { hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }
		expect(close().preventDefault).toHaveBeenCalledOnce()
		await flush()
		expect(confirmDiscard).toHaveBeenCalledOnce()
		expect(native.destroy).not.toHaveBeenCalled()
		expect(state.hasDirtyBuffers).toBe(true)
		decision.resolve(accepted)
		await flush()
		if (accepted) {
			expect(native.destroy).toHaveBeenCalledOnce()
		} else {
			expect(native.destroy).not.toHaveBeenCalled()
			expect(state.hasDirtyBuffers).toBe(true)
		}
	})
	it.each([false, true])("blocks busy work without asking to discard (dirty=%s)", (dirty) => {
		state = { hasDirtyBuffers: dirty, isBusy: true, hasOtherWindows: false }
		register()
		expect(close().preventDefault).toHaveBeenCalledOnce()
		expect(onBlocked).toHaveBeenCalledOnce()
		expect(confirmDiscard).not.toHaveBeenCalled()
		expect(native.destroy).not.toHaveBeenCalled()
	})
	it("prevents before prompting and singleflights duplicate closes through decision and destruction", async () => {
		state = { hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }
		const decision = Promise.withResolvers<boolean>()
		const destruction = Promise.withResolvers<void>()
		native.destroy.mockReturnValue(destruction.promise)
		const preventDefault = vi.fn()
		confirmDiscard.mockImplementation(() => {
			expect(preventDefault).toHaveBeenCalledOnce()
			return decision.promise
		})
		register()
		handler({ preventDefault })
		expect(close().preventDefault).toHaveBeenCalledOnce()
		expect(confirmDiscard).toHaveBeenCalledOnce()
		expect(captureDiscard).toHaveBeenCalledOnce()
		expect(native.destroy).not.toHaveBeenCalled()
		decision.resolve(true)
		await flush()
		expect(native.destroy).toHaveBeenCalledOnce()
		expect(close().preventDefault).toHaveBeenCalledOnce()
		expect(confirmDiscard).toHaveBeenCalledOnce()
		expect(native.destroy).toHaveBeenCalledOnce()
		destruction.resolve()
		await flush()
	})
	it("reports destruction failure and permits a later explicit close attempt", async () => {
		state = { hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }
		confirmDiscard.mockResolvedValue(true)
		const failure = new Error("permission denied")
		native.destroy.mockRejectedValueOnce(failure)
		register()
		close()
		await flush()
		expect(onError).toHaveBeenCalledWith(failure)
		expect(native.destroy).toHaveBeenCalledOnce()
		close()
		await flush()
		expect(confirmDiscard).toHaveBeenCalledTimes(2)
		expect(native.destroy).toHaveBeenCalledTimes(2)
	})
	it("drains a rejected confirmation without destroying or automatically retrying", async () => {
		state = { hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }
		const failure = new Error("dialog retired")
		confirmDiscard.mockRejectedValueOnce(failure)
		register()
		close()
		await flush()
		expect(onError).toHaveBeenCalledWith(failure)
		expect(native.destroy).not.toHaveBeenCalled()
		expect(confirmDiscard).toHaveBeenCalledOnce()
		confirmDiscard.mockResolvedValue(true)
		close()
		await flush()
		expect(native.destroy).toHaveBeenCalledOnce()
	})
	it.each(["busy", "clean", "edit", "edit ABA", "scope", "scope ABA"])(
		"preserves buffers when %s changes while the decision is unresolved",
		async (change) => {
			state = { hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }
			const decision = Promise.withResolvers<boolean>()
			confirmDiscard.mockReturnValue(decision.promise)
			register()
			expect(close().preventDefault).toHaveBeenCalledOnce()
			if (change === "busy") {
				state = { ...state, isBusy: true }
			} else if (change === "clean") {
				state = { ...state, hasDirtyBuffers: false }
			} else if (change.startsWith("edit")) {
				editGeneration += change === "edit ABA" ? 2 : 1
			} else {
				scopeGeneration += change === "scope ABA" ? 2 : 1
			}
			decision.resolve(true)
			await flush()
			expect(native.destroy).not.toHaveBeenCalled()
			expect(onBlocked).toHaveBeenCalledTimes(change === "busy" ? 1 : 0)
			expect(confirmDiscard).toHaveBeenCalledOnce()
			if (change !== "clean") {
				expect(state.hasDirtyBuffers).toBe(true)
			}
		},
	)
	it("snapshots dirty state even when the caller exposes live getters", async () => {
		let dirty = true
		state = { get hasDirtyBuffers() { return dirty }, isBusy: false, hasOtherWindows: false }
		const decision = Promise.withResolvers<boolean>()
		confirmDiscard.mockReturnValue(decision.promise)
		register()
		close()
		dirty = false
		decision.resolve(true)
		await flush()
		expect(native.destroy).not.toHaveBeenCalled()
	})
	it.each(["stop", "replacement"])(
		"aborts confirmation on %s and ignores its late acceptance and callbacks",
		async (retirement) => {
			state = { hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }
			const decision = Promise.withResolvers<boolean>()
			confirmDiscard.mockReturnValueOnce(decision.promise)
			const firstStop = register()
			await flush()
			const oldHandler = handler
			close()
			const signal = confirmDiscard.mock.calls[0][0]
			expect(signal.aborted).toBe(false)
			if (retirement === "stop") {
				firstStop()
			} else {
				register()
				firstStop()
			}
			expect(signal.aborted).toBe(true)
			const staleEvent = { preventDefault: vi.fn() }
			oldHandler(staleEvent)
			expect(staleEvent.preventDefault).not.toHaveBeenCalled()
			decision.resolve(true)
			await flush()
			expect(native.destroy).not.toHaveBeenCalled()
			expect(confirmDiscard).toHaveBeenCalledOnce()
			if (retirement === "replacement") {
				confirmDiscard.mockResolvedValue(true)
				expect(close().preventDefault).toHaveBeenCalledOnce()
				await flush()
				expect(native.destroy).toHaveBeenCalledOnce()
			}
		},
	)
	it("suppresses late decision and destruction errors after retirement", async () => {
		state = { hasDirtyBuffers: true, isBusy: false, hasOtherWindows: false }
		const decision = Promise.withResolvers<boolean>()
		confirmDiscard.mockReturnValueOnce(decision.promise)
		register()
		close()
		stop?.()
		decision.reject(new Error("late dialog rejection"))
		await flush()
		expect(onError).not.toHaveBeenCalled()
		expect(native.destroy).not.toHaveBeenCalled()

		const destruction = Promise.withResolvers<void>()
		confirmDiscard.mockResolvedValue(true)
		native.destroy.mockReturnValueOnce(destruction.promise)
		register()
		close()
		await flush()
		expect(native.destroy).toHaveBeenCalledOnce()
		stop?.()
		destruction.reject(new Error("late destruction rejection"))
		await flush()
		expect(onError).not.toHaveBeenCalled()
	})
	it("cleans a late registration after unmount and makes stale callbacks inert", async () => {
		const pending = Promise.withResolvers<() => void>()
		native.onCloseRequested.mockImplementation((callback) => {
			handler = callback
			return pending.promise
		})
		register()
		stop?.()
		state = { hasDirtyBuffers: true, isBusy: true, hasOtherWindows: false }
		expect(close().preventDefault).not.toHaveBeenCalled()
		pending.resolve(remove)
		await flush()
		expect(remove).toHaveBeenCalledOnce()
		expect(onBlocked).not.toHaveBeenCalled()
		expect(onReady).not.toHaveBeenCalled()
	})
	it("retires duplicate pending listeners without allowing old cleanup to retire the new one", async () => {
		const pending = Promise.withResolvers<() => void>()
		native.onCloseRequested.mockImplementationOnce((callback) => {
			handler = callback
			return pending.promise
		})
		const firstStop = register()
		const oldHandler = handler
		register()
		firstStop()
		state = { hasDirtyBuffers: true, isBusy: true, hasOtherWindows: false }
		const staleEvent = { preventDefault: vi.fn() }
		oldHandler(staleEvent)
		expect(staleEvent.preventDefault).not.toHaveBeenCalled()
		expect(close().preventDefault).toHaveBeenCalledOnce()
		const oldRemove = vi.fn()
		pending.resolve(oldRemove)
		await flush()
		expect(oldRemove).toHaveBeenCalledOnce()
		expect(remove).not.toHaveBeenCalled()
		// Only the replacement registration, never the retired one, becomes ready.
		expect(onReady).toHaveBeenCalledOnce()
	})
	it("reports registration failures only while mounted", async () => {
		const failure = new Error("listener failed")
		native.onCloseRequested.mockRejectedValue(failure)
		register()
		await flush()
		expect(onError).toHaveBeenCalledWith(failure)
		expect(onReady).not.toHaveBeenCalled()
		onError.mockClear()
		register()
		stop?.()
		await flush()
		expect(onError).not.toHaveBeenCalled()
		expect(onReady).not.toHaveBeenCalled()
	})
})
