import { describe, expect, it, vi } from "vitest"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import {
	canCancelParameter,
	createParameterSession,
	ownsParameter,
	type ParameterPhase,
	type ParameterSnapshot,
} from "./parameter-session"

const phases: ParameterPhase[] = ["prepare", "collect", "read", "commit", "settle", "retired"]
const deferred = <T = void>() => {
	let resolve!: (value: T | PromiseLike<T>) => void
	let reject!: (reason: unknown) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}
const candidateSession = (overrides: Partial<OrgMinibufferSession> = {}): OrgMinibufferSession => ({
	id: 1,
	prompt: "Parameter: ",
	initialInput: "",
	candidates: ["one", "two"],
	onAccept: () => ({ ok: true }),
	onCancel: () => {},
	...overrides,
})
const start = (controller: ReturnType<typeof createParameterSession>) => {
	const lease = controller.begin()
	expect(lease).not.toBeNull()
	return lease!
}

describe("parameter lifecycle laws", () => {
	it("allocates nonaliasing monotonic view identities across independent scoped hosts", () => {
		const first = createParameterSession()
		const second = createParameterSession()
		const one = start(first)
		const two = start(second)
		expect(two.id).toBeGreaterThan(one.id)
		expect(first.current(two)).toBe(false)
		expect(second.current(one)).toBe(false)
		expect(first.cancel(two)).toBe(false)
		expect(second.current(two)).toBe(true)
	})

	it.each(phases)("has explicit cancellation and identity ownership rules for %s", (phase) => {
		const lease = Object.freeze({ id: 1 })
		const snapshot: ParameterSnapshot = { lease, phase, session: null }
		expect(canCancelParameter(phase)).toBe(["prepare", "collect", "read"].includes(phase))
		expect(ownsParameter(snapshot, lease)).toBe(phase !== "retired")
		expect(ownsParameter(snapshot, { id: lease.id })).toBe(false)
		expect(ownsParameter({ ...snapshot, lease: null }, lease)).toBe(false)
	})

	it.each([
		"prepare",
		"collect",
		"read",
	] as const)("cancels an owned %s, but not a stale or forged lease", (phase) => {
		const controller = createParameterSession()
		const old = start(controller)
		const lease = controller.begin(old)!
		if (phase === "collect") controller.publishSession(lease, candidateSession())
		const read = phase === "read" ? controller.beginRead(lease) : null
		const snapshot = controller.getSnapshot()
		expect(snapshot.phase).toBe(phase)
		for (const foreign of [old, { id: lease.id }]) {
			expect(controller.cancel(foreign)).toBe(false)
			expect(controller.retire(foreign)).toBe(false)
			expect(controller.getSnapshot()).toBe(snapshot)
		}
		expect(controller.cancel(lease)).toBe(true)
		expect(read?.signal.aborted ?? true).toBe(true)
		expect(controller.getSnapshot()).toEqual({ lease: null, phase: "retired", session: null })
		expect(controller.current(lease)).toBe(false)
		expect(controller.cancel(lease)).toBe(false)
		expect(controller.busy()).toBe(false)
	})

	it("rejects detached operations until attach and never revives retired ownership", () => {
		const controller = createParameterSession()
		const initial = controller.getSnapshot()
		expect(initial).toEqual({ lease: null, phase: "retired", session: null })
		expect(controller.getSnapshot()).toBe(initial)
		expect(controller.isAttached()).toBe(true)
		const lease = start(controller)
		controller.detach()
		expect(controller.isAttached()).toBe(false)
		expect(controller.begin()).toBeNull()
		expect(controller.current(lease)).toBe(false)
		expect(controller.publishSession(lease, candidateSession())).toBe(false)
		expect(controller.beginRead(lease)).toBeNull()
		expect(controller.beginCommit(lease)).toBe(false)
		expect(controller.cancel(lease)).toBe(false)
		expect(controller.retire(lease)).toBe(false)
		controller.attach()
		expect(controller.begin(lease)).toBeNull()
		const next = start(controller)
		expect(next.id).toBeGreaterThan(lease.id)
		expect(Object.isFrozen(next)).toBe(true)
	})
})

describe("parameter publication", () => {
	it("owns an immutable candidate copy, preserves getters and holds stable snapshots between publications", () => {
		const controller = createParameterSession()
		const listener = vi.fn()
		const unsubscribe = controller.subscribe(listener)
		const initial = controller.getSnapshot()
		const lease = start(controller)
		const prepared = controller.getSnapshot()
		const candidates = ["one", "two"]
		let cancellable = true
		const source: OrgMinibufferSession = {
			...candidateSession({ candidates }),
			get cancelWhileAccepting() {
				return cancellable
			},
		}
		expect(controller.publishSession(lease, source)).toBe(true)
		const collected = controller.getSnapshot()
		expect(listener).toHaveBeenCalledTimes(2)
		expect(collected).not.toBe(prepared)
		expect(collected.session).not.toBe(source)
		expect(collected.session?.candidates).not.toBe(candidates)
		candidates.push("three")
		expect(collected.session?.candidates).toEqual(["one", "two"])
		expect(Object.isFrozen(collected)).toBe(true)
		expect(Object.isFrozen(collected.session)).toBe(true)
		expect(Object.isFrozen(collected.session?.candidates)).toBe(true)
		expect(collected.session?.onAccept).toBe(source.onAccept)
		expect(collected.session?.onCancel).toBe(source.onCancel)
		expect(collected.session?.cancelWhileAccepting).toBe(true)
		cancellable = false
		expect(collected.session?.cancelWhileAccepting).toBe(false)
		expect(controller.getSnapshot()).toBe(collected)
		expect(initial.phase).toBe("retired")
		expect(prepared.phase).toBe("prepare")
		expect(prepared.session).toBeNull()
		const abort = controller.beginRead(lease)!
		const reading = controller.getSnapshot()
		controller.endRead(lease, abort)
		expect(controller.getSnapshot()).toBe(reading)
		expect(collected.phase).toBe("collect")
		unsubscribe()
		unsubscribe()
		controller.cancel(lease)
		expect(listener).toHaveBeenCalledTimes(3)
	})

	it("isolates throwing observers and blocks all reentrant lifecycle callbacks during publication", () => {
		const controller = createParameterSession()
		const callback = vi.fn()
		const origin = vi.fn(() => true)
		const seen: ParameterSnapshot[] = []
		const reentrantChecks: boolean[] = []
		controller.subscribe(() => {
			throw new Error("observer")
		})
		controller.subscribe(() => {
			const snapshot = controller.getSnapshot()
			seen.push(snapshot)
			const lease = snapshot.lease ?? { id: -1 }
			reentrantChecks.push(
				controller.begin() === null,
				controller.begin(lease) === null,
				controller.publishSession(lease, candidateSession()) === false,
				controller.accept(lease, origin, true, callback) === null,
				controller.beginRead(lease) === null,
				controller.beginCommit(lease) === false,
				controller.cancel(lease) === false,
				controller.retire(lease) === false,
			)
			const attached = controller.isAttached()
			controller.detach()
			controller.attach()
			reentrantChecks.push(
				controller.isAttached() === attached,
				controller.getSnapshot() === snapshot,
			)
		})
		// Assert outside observers, whose thrown assertions would also be isolated.
		const results: unknown[] = []
		controller.subscribe(() => {
			const lease = controller.getSnapshot().lease ?? { id: -1 }
			results.push(
				controller.begin(),
				controller.publishSession(lease, candidateSession()),
				controller.accept(lease, origin, false, callback),
				controller.beginRead(lease),
				controller.beginCommit(lease),
				controller.cancel(lease),
				controller.retire(lease),
			)
		})
		const lease = start(controller)
		expect(controller.publishSession(lease, candidateSession())).toBe(true)
		expect(controller.cancel(lease)).toBe(true)
		expect(seen.map((snapshot) => snapshot.phase)).toEqual(["prepare", "collect", "retired"])
		expect(results).toEqual(
			Array.from({ length: 3 }, () => [null, false, null, null, false, false, false]).flat(),
		)
		expect(reentrantChecks).toEqual(Array(30).fill(true))
		expect(callback).not.toHaveBeenCalled()
		expect(origin).not.toHaveBeenCalled()
		controller.detach()
		expect(controller.isAttached()).toBe(false)
		controller.attach()
		expect(controller.isAttached()).toBe(true)
		expect(start(controller).id).toBeGreaterThan(lease.id)
		expect(reentrantChecks.every(Boolean)).toBe(true)
	})

	it("uses a subscriber copy for each notification", () => {
		const controller = createParameterSession()
		const calls: string[] = []
		const late = () => {
			calls.push("late")
		}
		let unsubscribeSecond = () => {}
		controller.subscribe(() => {
			calls.push("first")
			unsubscribeSecond()
			controller.subscribe(late)
		})
		unsubscribeSecond = controller.subscribe(() => {
			calls.push("second")
		})
		const lease = start(controller)
		expect(calls).toEqual(["first", "second"])
		controller.publishSession(lease, candidateSession())
		expect(calls).toEqual(["first", "second", "first", "late"])
	})
})

describe("parameter acceptance and effect ownership", () => {
	it.each([false, true])("singleflights concurrent duplicates (locked=%s)", async (locked) => {
		const controller = createParameterSession()
		const lease = start(controller)
		controller.publishSession(lease, candidateSession())
		const pending = deferred<number>()
		const callback = vi.fn(() => pending.promise)
		const origin = vi.fn(() => true)
		const result = controller.accept(lease, origin, locked, callback)
		expect(controller.busy()).toBe(true)
		expect(controller.accept(lease, origin, locked, callback)).toBeNull()
		expect(controller.begin()).toBeNull()
		expect(callback).toHaveBeenCalledTimes(1)
		expect(origin).toHaveBeenCalledTimes(1)
		pending.resolve(42)
		await expect(result).resolves.toBe(42)
		expect(controller.busy()).toBe(false)
		expect(
			controller.accept(
				lease,
				() => true,
				locked,
				() => 7,
			),
		).toBe(7)
	})

	it("checks lease and origin before calling the accept callback", () => {
		const controller = createParameterSession()
		const lease = start(controller)
		const callback = vi.fn()
		const origin = vi.fn(() => true)
		expect(controller.accept({ id: lease.id }, origin, false, callback)).toBeNull()
		expect(origin).not.toHaveBeenCalled()
		expect(controller.accept(lease, () => false, false, callback)).toBeNull()
		expect(callback).not.toHaveBeenCalled()
		expect(controller.busy()).toBe(false)
	})

	it.each([
		false,
		true,
	])("releases synchronous throws and rejected callbacks (locked=%s)", async (locked) => {
		const controller = createParameterSession()
		const lease = start(controller)
		const error = new Error("callback failed")
		expect(() =>
			controller.accept(
				lease,
				() => true,
				locked,
				() => {
					throw error
				},
			),
		).toThrow(error)
		expect(controller.busy()).toBe(false)
		expect(controller.getSnapshot().phase).toBe("collect")
		const pending = deferred()
		const result = controller.accept(
			lease,
			() => true,
			locked,
			() => pending.promise,
		)
		pending.reject(error)
		await expect(result).rejects.toBe(error)
		expect(controller.busy()).toBe(false)
		expect(
			controller.accept(
				lease,
				() => true,
				locked,
				() => "retry",
			),
		).toBe("retry")
	})

	it("advances an unlocked read and ignores old callbacks and finally without releasing the new read", async () => {
		const controller = createParameterSession()
		const old = start(controller)
		const pendingOld = deferred()
		let oldRead!: AbortController
		const oldResult = controller.accept(
			old,
			() => true,
			false,
			() => {
				oldRead = controller.beginRead(old)!
				return pendingOld.promise.finally(() => controller.endRead(old, oldRead))
			},
		)
		const next = controller.begin(old)!
		expect(next).not.toBeNull()
		expect(oldRead.signal.aborted).toBe(true)
		controller.publishSession(next, candidateSession())
		const pendingNew = deferred()
		const newRead = controller.beginRead(next)!
		// Advancing keeps the old acceptance singleflight until its callback drains.
		expect(
			controller.accept(
				next,
				() => true,
				false,
				() => pendingNew.promise,
			),
		).toBeNull()
		const snapshot = controller.getSnapshot()
		const staleCallback = vi.fn()
		expect(controller.accept(old, () => true, false, staleCallback)).toBeNull()
		expect(controller.publishSession(old, candidateSession())).toBe(false)
		expect(controller.beginRead(old)).toBeNull()
		expect(controller.beginCommit(old)).toBe(false)
		expect(controller.cancel(old)).toBe(false)
		expect(controller.retire(old)).toBe(false)
		expect(controller.begin(old)).toBeNull()
		pendingOld.resolve()
		await oldResult
		expect(staleCallback).not.toHaveBeenCalled()
		expect(controller.getSnapshot()).toBe(snapshot)
		expect(controller.busy()).toBe(true)
		expect(newRead.signal.aborted).toBe(false)
		const newResult = controller.accept(
			next,
			() => true,
			false,
			() => pendingNew.promise,
		)
		controller.endRead(old, oldRead)
		expect(controller.accept(next, () => true, false, staleCallback)).toBeNull()
		pendingNew.resolve()
		await newResult
		expect(controller.busy()).toBe(true)
		controller.endRead(next, newRead)
		expect(controller.busy()).toBe(false)
	})

	it.each([
		"retire",
		"begin",
		"beginRead",
		"detach",
	] as const)("fences synchronous abort listeners during %s", (action) => {
		const controller = createParameterSession()
		const old = start(controller)
		const abort = controller.beginRead(old)!
		const business = vi.fn()
		const attempts: unknown[] = []
		abort.signal.addEventListener("abort", () => {
			attempts.push(
				controller.cancel(old),
				controller.retire(old),
				controller.begin(old),
				controller.begin(),
				controller.beginRead(old),
				controller.beginCommit(old),
				controller.publishSession(old, candidateSession()),
				controller.accept(old, () => true, false, business),
			)
			controller.detach()
			controller.attach()
		})
		if (action === "retire") controller.retire(old)
		else if (action === "begin") controller.begin(old)
		else if (action === "beginRead") controller.beginRead(old)
		else controller.detach()
		expect(attempts).toEqual([false, false, null, null, null, false, false, null])
		expect(business).not.toHaveBeenCalled()
		controller.attach()
		const next =
			controller.getSnapshot().lease === old
				? controller.begin(old)!
				: (controller.getSnapshot().lease ?? start(controller))
		const replacement = controller.beginRead(next)!
		const snapshot = controller.getSnapshot()
		controller.endRead(old, abort)
		expect(controller.retire(old)).toBe(false)
		expect(controller.cancel(old)).toBe(false)
		expect(controller.accept(old, () => true, false, business)).toBeNull()
		expect(controller.getSnapshot()).toBe(snapshot)
		expect(replacement.signal.aborted).toBe(false)
		expect(controller.busy()).toBe(true)
		expect(business).not.toHaveBeenCalled()
	})

	it("old read cleanup cannot clear a replacement read on the same or advanced lease", () => {
		const controller = createParameterSession()
		const lease = start(controller)
		const oldRead = controller.beginRead(lease)!
		const replacement = controller.beginRead(lease)!
		expect(oldRead.signal.aborted).toBe(true)
		controller.endRead(lease, oldRead)
		expect(controller.busy()).toBe(true)
		const next = controller.begin(lease)!
		expect(replacement.signal.aborted).toBe(true)
		const nextRead = controller.beginRead(next)!
		controller.endRead(lease, replacement)
		controller.endRead(next, replacement)
		expect(controller.busy()).toBe(true)
		expect(nextRead.signal.aborted).toBe(false)
		controller.endRead(next, nextRead)
		expect(controller.busy()).toBe(false)
	})

	it("detaches an unlocked read immediately and old cleanup cannot clear new read or acceptance", async () => {
		const controller = createParameterSession()
		const old = start(controller)
		const oldRead = controller.beginRead(old)!
		const pendingOld = deferred()
		const oldResult = controller.accept(
			old,
			() => true,
			false,
			() => pendingOld.promise.finally(() => controller.endRead(old, oldRead)),
		)
		controller.detach()
		expect(oldRead.signal.aborted).toBe(true)
		expect(controller.busy()).toBe(false)
		controller.attach()
		const next = start(controller)
		const nextRead = controller.beginRead(next)!
		const pendingNew = deferred()
		const newResult = controller.accept(
			next,
			() => true,
			false,
			() => pendingNew.promise,
		)
		const snapshot = controller.getSnapshot()
		pendingOld.resolve()
		await oldResult
		expect(controller.getSnapshot()).toBe(snapshot)
		expect(controller.busy()).toBe(true)
		expect(nextRead.signal.aborted).toBe(false)
		pendingNew.resolve()
		await newResult
		expect(controller.busy()).toBe(true)
		controller.endRead(next, nextRead)
		expect(controller.busy()).toBe(false)
	})

	it.each([
		"detach",
		"retire",
	] as const)("a started commit drains its lock after %s before allowing a new session", async (action) => {
		const controller = createParameterSession()
		const old = start(controller)
		const pending = deferred()
		const result = controller.accept(
			old,
			() => true,
			false,
			() => {
				expect(controller.beginCommit(old)).toBe(true)
				return pending.promise
			},
		)
		expect(controller.getSnapshot().phase).toBe("commit")
		expect(controller.cancel(old)).toBe(false)
		expect(controller.beginRead(old)).toBeNull()
		expect(controller.begin(old)).toBeNull()
		if (action === "detach") {
			controller.detach()
			controller.attach()
		} else expect(controller.retire(old)).toBe(true)
		const retired = controller.getSnapshot()
		expect(controller.current(old)).toBe(false)
		expect(controller.busy()).toBe(true)
		expect(controller.begin()).toBeNull()
		expect(controller.beginCommit(old)).toBe(false)
		pending.resolve()
		await result
		expect(controller.getSnapshot()).toBe(retired)
		expect(controller.busy()).toBe(false)
		const next = start(controller)
		const newPending = deferred()
		const newResult = controller.accept(
			next,
			() => true,
			true,
			() => newPending.promise,
		)
		await result
		expect(controller.busy()).toBe(true)
		expect(controller.current(next)).toBe(true)
		expect(controller.begin()).toBeNull()
		newPending.resolve()
		await newResult
		expect(controller.busy()).toBe(false)
	})

	it.each([
		"collect",
		"read",
	] as const)("cancels unlocked acceptance in %s and its old finally cannot release a new write", async (phase) => {
		const controller = createParameterSession()
		const old = start(controller)
		controller.publishSession(old, candidateSession())
		const abort = phase === "read" ? controller.beginRead(old)! : null
		const oldPending = deferred()
		const oldResult = controller.accept(
			old,
			() => true,
			false,
			() => oldPending.promise,
		)
		expect(controller.cancel(old)).toBe(true)
		expect(abort?.signal.aborted ?? true).toBe(true)
		expect(controller.busy()).toBe(false)
		const next = start(controller)
		const newPending = deferred()
		const newResult = controller.accept(
			next,
			() => true,
			true,
			() => {
				expect(controller.beginCommit(next)).toBe(true)
				return newPending.promise
			},
		)
		const snapshot = controller.getSnapshot()
		oldPending.resolve()
		await oldResult
		expect(controller.getSnapshot()).toBe(snapshot)
		expect(controller.busy()).toBe(true)
		expect(controller.begin()).toBeNull()
		expect(controller.cancel(next)).toBe(false)
		newPending.resolve()
		await newResult
		expect(controller.busy()).toBe(false)
	})

	it("locked acceptance prevents cancellation even before commit publication", async () => {
		const controller = createParameterSession()
		const lease = start(controller)
		controller.publishSession(lease, candidateSession())
		const pending = deferred()
		const result = controller.accept(
			lease,
			() => true,
			true,
			() => pending.promise,
		)
		expect(controller.getSnapshot().phase).toBe("collect")
		expect(controller.cancel(lease)).toBe(false)
		expect(controller.beginRead(lease)).toBeNull()
		expect(controller.begin(lease)).toBeNull()
		pending.resolve()
		await result
		expect(controller.cancel(lease)).toBe(true)
	})

	it("observer failure cannot interrupt a started write or release its lock", async () => {
		const controller = createParameterSession()
		const lease = start(controller)
		const phasesSeen: ParameterPhase[] = []
		controller.subscribe(() => {
			throw new Error("observer failed")
		})
		controller.subscribe(() => {
			phasesSeen.push(controller.getSnapshot().phase)
		})
		const pending = deferred<string>()
		const write = vi.fn(() => pending.promise)
		const result = controller.accept(
			lease,
			() => true,
			false,
			() => {
				expect(controller.beginCommit(lease)).toBe(true)
				return write()
			},
		)
		expect(write).toHaveBeenCalledTimes(1)
		expect(phasesSeen).toEqual(["commit"])
		expect(controller.busy()).toBe(true)
		expect(controller.cancel(lease)).toBe(false)
		expect(controller.begin()).toBeNull()
		expect(controller.accept(lease, () => true, false, write)).toBeNull()
		pending.resolve("written")
		await expect(result).resolves.toBe("written")
		expect(phasesSeen).toEqual(["commit", "settle", "collect"])
		expect(controller.busy()).toBe(false)
		expect(controller.cancel(lease)).toBe(true)
	})
})
