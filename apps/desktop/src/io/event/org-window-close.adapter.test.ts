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
const deferred = <T>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((done) => {
		resolve = done
	})
	return { promise, resolve }
}
let stop: (() => void) | undefined
let state: OrgWindowCloseState
let handler: (event: { preventDefault: () => void }) => void
let remove: ReturnType<typeof vi.fn<() => void>>
const confirmDiscard = vi.fn()
const onBlocked = vi.fn()
const onError = vi.fn()
const onReady = vi.fn()
const register = () => {
	stop = registerOrgWindowClose({
		confirmDiscard,
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
	state = { hasDirtyBuffers: false, isBusy: false }
	remove = vi.fn()
	native.isTauri.mockReturnValue(true)
	native.getCurrentWindow.mockReturnValue(native)
	native.destroy.mockResolvedValue(undefined)
	native.onCloseRequested.mockImplementation((callback) => {
		handler = callback
		return Promise.resolve(remove)
	})
	confirmDiscard.mockReturnValue(false)
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
		const pending = deferred<() => void>()
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
	it("protects aggregate dirty buffers even when the active buffer is clean; cancel retains them", () => {
		register()
		state = { hasDirtyBuffers: true, isBusy: false }
		expect(close().preventDefault).toHaveBeenCalledOnce()
		expect(confirmDiscard).toHaveBeenCalledOnce()
		expect(native.destroy).not.toHaveBeenCalled()
		expect(state.hasDirtyBuffers).toBe(true)
	})
	it.each([false, true])("blocks busy work without asking to discard (dirty=%s)", (dirty) => {
		state = { hasDirtyBuffers: dirty, isBusy: true }
		register()
		expect(close().preventDefault).toHaveBeenCalledOnce()
		expect(onBlocked).toHaveBeenCalledOnce()
		expect(confirmDiscard).not.toHaveBeenCalled()
		expect(native.destroy).not.toHaveBeenCalled()
	})
	it("prevents first then destroys on explicit confirmation; duplicate pending close stays blocked", async () => {
		state = { hasDirtyBuffers: true, isBusy: false }
		const pending = deferred<void>()
		native.destroy.mockReturnValue(pending.promise)
		register()
		const preventDefault = vi.fn()
		confirmDiscard.mockImplementation(() => {
			expect(preventDefault).toHaveBeenCalledOnce()
			return true
		})
		handler({ preventDefault })
		expect(close().preventDefault).toHaveBeenCalledOnce()
		expect(confirmDiscard).toHaveBeenCalledOnce()
		expect(native.destroy).toHaveBeenCalledOnce()
		pending.resolve()
		await flush()
	})
	it("reports destruction failures without issuing another close", async () => {
		state = { hasDirtyBuffers: true, isBusy: false }
		confirmDiscard.mockReturnValue(true)
		const failure = new Error("permission denied")
		native.destroy.mockRejectedValue(failure)
		register()
		close()
		await flush()
		expect(onError).toHaveBeenCalledWith(failure)
		expect(native.destroy).toHaveBeenCalledOnce()
	})
	it.each([
		"busy",
		"clean",
		"async",
		"unmount",
	])("does not blindly destroy after %s decision changes", (change) => {
		state = { hasDirtyBuffers: true, isBusy: false }
		register()
		confirmDiscard.mockImplementation(() => {
			if (change === "busy") {
				state = { ...state, isBusy: true }
			}
			if (change === "clean") {
				state = { ...state, hasDirtyBuffers: false }
			}
			if (change === "unmount") {
				stop?.()
			}
			return change === "async" ? Promise.resolve(true) : true
		})
		expect(close().preventDefault).toHaveBeenCalledOnce()
		expect(native.destroy).not.toHaveBeenCalled()
	})
	it("cleans a late registration after unmount and makes stale callbacks inert", async () => {
		const pending = deferred<() => void>()
		native.onCloseRequested.mockImplementation((callback) => {
			handler = callback
			return pending.promise
		})
		register()
		stop?.()
		state = { hasDirtyBuffers: true, isBusy: true }
		expect(close().preventDefault).not.toHaveBeenCalled()
		pending.resolve(remove)
		await flush()
		expect(remove).toHaveBeenCalledOnce()
		expect(onBlocked).not.toHaveBeenCalled()
		expect(onReady).not.toHaveBeenCalled()
	})
	it("retires duplicate pending listeners without allowing old cleanup to retire the new one", async () => {
		const pending = deferred<() => void>()
		native.onCloseRequested.mockImplementationOnce((callback) => {
			handler = callback
			return pending.promise
		})
		const firstStop = register()
		const oldHandler = handler
		register()
		firstStop()
		state = { hasDirtyBuffers: true, isBusy: true }
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
