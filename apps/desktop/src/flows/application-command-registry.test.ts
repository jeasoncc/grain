import { describe, expect, it, vi } from "vitest"
import { createApplicationCommandRegistry, type ApplicationCommandDescriptor, type ApplicationCommandResult, type ApplicationResultPublisher } from "./application-command-registry"

const descriptor = (id: string, capture: ApplicationCommandDescriptor["capture"]): ApplicationCommandDescriptor => ({ id, label: id, getDisabledReason: () => null, capture })

describe("application command lifetime boundary", () => {
	it("captures before dismissal and refuses a retired origin without invoking its commit", async () => {
		const registry = createApplicationCommandRegistry()
		const commit = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		const capture = vi.fn(() => commit)
		const owner = registry.register({}, [descriptor("save", capture)])
		const result = await registry.execute("save", () => { expect(capture).toHaveBeenCalledOnce(); registry.unregister(owner) })
		expect(result.kind).toBe("cancelled")
		expect(commit).not.toHaveBeenCalled()
	})
	it("rejects command removal/re-registration ABA within the same owner", async () => {
		const registry = createApplicationCommandRegistry()
		const commit = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		const entry = descriptor("save", () => commit)
		const owner = registry.register({}, [entry])
		expect((await registry.execute("save", () => { registry.update(owner, []); registry.update(owner, [entry]) })).kind).toBe("cancelled")
		expect(commit).not.toHaveBeenCalled()
	})
	it("does not execute stale capture when capture synchronously retires the registration", async () => {
		const registry = createApplicationCommandRegistry()
		const commit = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		const entry = descriptor("edit", () => { registry.unregister(owner); return commit })
		const owner = registry.register({}, [entry])
		expect((await registry.execute("edit")).kind).toBe("cancelled")
		expect(commit).not.toHaveBeenCalled()
	})
	it("rechecks actual prerequisites after dismissal", async () => {
		const registry = createApplicationCommandRegistry()
		let reason: string | null = null
		const commit = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		registry.register({}, [{ ...descriptor("write", () => commit), getDisabledReason: () => reason }])
		expect(await registry.execute("write", () => { reason = "Origin became read-only" })).toEqual({ kind: "rejected", message: "Origin became read-only" })
		expect(commit).not.toHaveBeenCalled()
	})
	it("admits one exact command lifetime before capture and dismissal observers can reenter", async () => {
		const registry = createApplicationCommandRegistry()
		const commit = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		const denied: Promise<ApplicationCommandResult>[] = []
		registry.register({}, [descriptor("edit", () => {
			denied.push(registry.execute("edit"))
			return commit
		})])
		const result = await registry.execute("edit", () => { denied.push(registry.execute("edit")) })
		expect(result).toEqual({ kind: "success" })
		expect(await Promise.all(denied)).toEqual([
			{ kind: "rejected", message: "This command is still finishing." },
			{ kind: "rejected", message: "This command is still finishing." },
		])
		expect(commit).toHaveBeenCalledOnce()
	})
	it("drains a started commit despite retirement and refuses its stale echo", async () => {
		const registry = createApplicationCommandRegistry()
		const drain = Promise.withResolvers<ApplicationCommandResult>()
		const committed = vi.fn(() => drain.promise)
		const owner = registry.register({}, [descriptor("write", () => committed)])
		const pending = registry.execute("write")
		registry.unregister(owner)
		registry.publishResult({ kind: "success", message: "New context" })
		drain.resolve({ kind: "success", message: "Old write" })
		expect(await pending).toEqual({ kind: "cancelled" })
		expect(committed).toHaveBeenCalledOnce()
		expect(registry.getSnapshot().result?.message).toBe("New context")
	})
	it("keeps settlement ownership when an owned edit refreshes its prerequisites", async () => {
		const registry = createApplicationCommandRegistry()
		const drain = Promise.withResolvers<ApplicationCommandResult>()
		const entry = descriptor("write", () => () => drain.promise)
		const owner = registry.register({}, [entry])
		const pending = registry.execute("write")
		registry.update(owner, [{ ...entry, getDisabledReason: () => "No unsaved changes" }])
		drain.resolve({ kind: "success", message: "Saved" })
		expect(await pending).toEqual({ kind: "success", message: "Saved" })
		expect(registry.getSnapshot().result?.message).toBe("Saved")
	})
	it("allows independent commands while a commit drains and publishes only the newest result", async () => {
		const registry = createApplicationCommandRegistry()
		const drain = Promise.withResolvers<ApplicationCommandResult>()
		const first = vi.fn(() => drain.promise)
		const second = vi.fn((): ApplicationCommandResult => ({ kind: "success", message: "Opened settings" }))
		registry.register({}, [descriptor("save", () => first), descriptor("settings", () => second)])
		const saving = registry.execute("save")
		expect((await registry.execute("save")).kind).toBe("rejected")
		expect((await registry.execute("settings")).kind).toBe("success")
		drain.resolve({ kind: "success", message: "Saved old context" })
		expect((await saving).kind).toBe("cancelled")
		expect(first).toHaveBeenCalledOnce()
		expect(second).toHaveBeenCalledOnce()
		expect(registry.getSnapshot().result?.message).toBe("Opened settings")
	})
	it("uses the live scoped registration and never executes a shadowed origin", async () => {
		const registry = createApplicationCommandRegistry()
		const first = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		const second = vi.fn((): ApplicationCommandResult => ({ kind: "success" }))
		registry.register({}, [descriptor("save", () => first)])
		await registry.execute("save", () => { registry.register({}, [descriptor("save", () => second)]) })
		expect(first).not.toHaveBeenCalled()
		await registry.execute("save")
		expect(second).toHaveBeenCalledOnce()
	})
	it("does not let a late no-parameter tool result replace a newer command", async () => {
		const registry = createApplicationCommandRegistry()
		const tool = registry.register({}, [])
		const report = registry.beginResult(tool)!
		registry.register({}, [descriptor("settings", () => () => ({ kind: "success", message: "Settings opened" }))])
		await registry.execute("settings")
		expect(report({ kind: "success", message: "Late TODO result" })).toBe(false)
		expect(registry.getSnapshot().result?.message).toBe("Settings opened")
	})
	it("retires exact result producer lifetimes even when the same owner object is mounted again", () => {
		const registry = createApplicationCommandRegistry()
		const owner = {}
		const retired = registry.register(owner, [])
		const report = registry.beginResult(retired)!
		registry.unregister(retired)
		const current = registry.register(owner, [])
		expect(report({ kind: "success", message: "Old result" })).toBe(false)
		expect(registry.beginResult(current)!({ kind: "rejected", message: "Current rejection" })).toBe(true)
		expect(registry.getSnapshot().result).toEqual({ kind: "rejected", message: "Current rejection" })
	})
	it("accepts a synchronous command-to-producer handoff without clobbering the producer echo", async () => {
		const registry = createApplicationCommandRegistry()
		const producer = registry.register({}, [])
		let report: ApplicationResultPublisher | null = null
		registry.register({}, [descriptor("remark", () => () => {
			report = registry.beginResult(producer)
			report!({ kind: "success", message: "Reading remarks" })
			return { kind: "success" }
		})])
		expect(await registry.execute("remark")).toEqual({ kind: "success" })
		expect(registry.getSnapshot().result?.message).toBe("Reading remarks")
		expect(report!({ kind: "success", message: "Remarks ready" })).toBe(true)
		expect(registry.getSnapshot().result?.message).toBe("Remarks ready")
	})
	it("retires both parent settlement and handed-off producer when a newer command starts", async () => {
		const registry = createApplicationCommandRegistry()
		const producer = registry.register({}, [])
		const pending = Promise.withResolvers<ApplicationCommandResult>()
		let report: ApplicationResultPublisher | null = null
		registry.register({}, [
			descriptor("remark", () => () => { report = registry.beginResult(producer); return pending.promise }),
			descriptor("settings", () => () => ({ kind: "success", message: "Settings opened" })),
		])
		const old = registry.execute("remark")
		await registry.execute("settings")
		pending.resolve({ kind: "success" })
		expect(await old).toEqual({ kind: "cancelled" })
		expect(report!({ kind: "success", message: "Late remarks" })).toBe(false)
		expect(registry.getSnapshot().result?.message).toBe("Settings opened")
	})
	it("reports a failed parent command and retires its producer publication", async () => {
		const registry = createApplicationCommandRegistry()
		const producer = registry.register({}, [])
		let report: ApplicationResultPublisher | null = null
		registry.register({}, [descriptor("remark", () => () => {
			report = registry.beginResult(producer)
			return { kind: "rejected", message: "Could not launch remark tool" }
		})])
		expect((await registry.execute("remark")).kind).toBe("rejected")
		expect(registry.getSnapshot().result?.message).toBe("Could not launch remark tool")
		expect(report!({ kind: "success", message: "Late producer" })).toBe(false)
	})
})
