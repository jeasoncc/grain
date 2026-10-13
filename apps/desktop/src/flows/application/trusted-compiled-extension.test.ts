import { EditorState, StateEffect, StateField, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { describe, expect, it } from "vitest"
import { createApplicationCommandRegistry } from "@/flows/application-command-registry"
import { getOrgInputCommandMetadata } from "@/flows/org-command/org-input-command-metadata"
import { createOrgBufferRuntime, type OrgBufferWindowHandle } from "@/flows/org-editor-runtime"
import { createOrgWindowEffectRegistry } from "@/flows/org-editor-runtime/org-window-effects"
import { createApplicationToolRegistry } from "./application-tool-registry"
import { createTrustedCompiledExtension } from "./trusted-compiled-extension"

const descriptor = { id: "compiled.draft", label: "Compiled draft", layout: "side" as const,
	state: { dirty: true, pending: false, fence: 1 }, active: true, requestClose: async () => true }

describe("trusted compiled extension owner lifetime", () => {
	it("captures before dismissal, singleflights and drains an accepted command without late publication", async () => {
		const registry = createApplicationCommandRegistry()
		const owner = createTrustedCompiledExtension({ commands: registry })
		const work = Promise.withResolvers<void>()
		const order: string[] = []
		const handle = owner.registerCommands([{ id: "compiled.accept", label: "Accept real work", getDisabledReason: () => null,
			capture: () => { order.push("capture"); return async () => { order.push("started"); await work.promise; order.push("settled"); return { kind: "success", message: "late success" } } } }])!
		const capturedPublish = owner.publish(handle)!
		const running = registry.execute("compiled.accept", () => { order.push("dismiss") })
		expect(order).toEqual(["capture", "dismiss", "started"])
		expect((await registry.execute("compiled.accept")).kind).toBe("rejected")
		let finished = false
		const unload = owner.unload().then((result) => { finished = result; return result })
		await Promise.resolve()
		expect(finished).toBe(false)
		expect(owner.registerCommands([])).toBeNull()
		expect(capturedPublish({ kind: "success", message: "retired callback" })).toBe(false)
		expect(getOrgInputCommandMetadata().some((command) => command.id === "compiled.accept")).toBe(false)
		work.resolve()
		expect(await unload).toBe(true)
		expect((await running).kind).toBe("cancelled")
		expect(order).toEqual(["capture", "dismiss", "started", "settled"])
		expect(registry.getSnapshot().result?.message).not.toBe("late success")
	})

	it("logically aborts candidate readers and retires captured subscription callbacks", async () => {
		const owner = createTrustedCompiledExtension({ commands: createApplicationCommandRegistry() })
		const pending = Promise.withResolvers<string>()
		const values: string[] = []
		let notify: () => void = () => { throw new Error("not subscribed") }
		let detached = false
		owner.subscribe((callback) => { notify = callback; return () => { detached = true } }, () => values.push("notification"))
		const read = owner.read(async (signal) => { await pending.promise; expect(signal.aborted).toBe(true); return "stale candidate" }, (value) => values.push(value))
		await Promise.resolve()
		read.cancel()
		await owner.unload()
		notify()
		pending.resolve("candidate")
		expect(await read.done).toBe(false)
		expect(values).toEqual([])
		expect(detached).toBe(true)
		const retired = owner.read(async () => "must not publish", (value) => values.push(value))
		expect(await retired.done).toBe(false)
	})

	it("rejects wrong-owner tools and preserves a dirty draft/source when unload consent is refused", async () => {
		let consent = false
		let draft = "unpublished draft"
		const tools = createApplicationToolRegistry(async () => consent)
		const commands = createApplicationCommandRegistry()
		const first = createTrustedCompiledExtension({ commands, tools })
		const second = createTrustedCompiledExtension({ commands, tools })
		const handle = first.registerTool({ ...descriptor, dispose: () => { draft = "" } })!
		expect(second.updateTool(handle, { ...descriptor, state: { ...descriptor.state, dirty: false } })).toBe(false)
		expect(second.openTool(handle)).toBe(false)
		expect(await second.closeTool(handle)).toBe(false)
		expect(await first.unload()).toBe(false)
		expect(draft).toBe("unpublished draft")
		expect(tools.getSnapshot()[0].open).toBe(true)
		expect(first.openTool(handle)).toBe(false)
		consent = true
		expect(await first.unload()).toBe(true)
		expect(draft).toBe("")
		expect(tools.getSnapshot()).toEqual([])
		await second.unload()
	})

	it("retires an approved old retained close without closing or granting access to a replacement with the same id", async () => {
		let consent = false
		const tools = createApplicationToolRegistry(async () => consent)
		const commands = createApplicationCommandRegistry()
		const old = createTrustedCompiledExtension({ commands, tools })
		let oldDiscarded = false
		const oldHandle = old.registerTool({ ...descriptor, dispose: () => { oldDiscarded = true } })!
		expect(await old.unload()).toBe(false)
		expect(tools.getSnapshot()[0].state.readOnly).toBe(true)
		const replacement = createTrustedCompiledExtension({ commands, tools })
		const newHandle = replacement.registerTool(descriptor)!
		const newWindow = replacement.getToolWindow(newHandle)!.windowId
		expect(old.getToolWindow(oldHandle)!.windowId).not.toBe(newWindow)
		expect(replacement.getToolWindow(oldHandle)).toBeNull()
		expect(old.updateTool(newHandle, descriptor)).toBe(false)
		expect(old.openTool(newHandle)).toBe(false)
		expect(await replacement.closeTool(oldHandle)).toBe(false)
		expect(await old.closeTool(oldHandle)).toBe(false)
		expect(oldDiscarded).toBe(false)
		consent = true
		expect(await old.closeTool(oldHandle)).toBe(true)
		await Promise.resolve()
		expect(oldDiscarded).toBe(true)
		expect(old.getToolWindow(oldHandle)).toBeNull()
		expect(replacement.getToolWindow(newHandle)!.windowId).toBe(newWindow)
		expect(replacement.getToolWindow(newHandle)!.state.readOnly).not.toBe(true)
		expect(tools.getSnapshot()).toHaveLength(1)
		await replacement.unload()
	})

	it("drains real accepted effects and a producer before resolving unload", async () => {
		const owner = createTrustedCompiledExtension({ commands: createApplicationCommandRegistry() })
		const io = Promise.withResolvers<void>()
		const producer = Promise.withResolvers<void>()
		const writes: string[] = []
		const effect = owner.accept(async () => { await io.promise; writes.push("accepted external IO settled") })
		owner.ownProducer(() => producer.promise)
		let finished = false
		const unloading = owner.unload().then((result) => { finished = result })
		await expect(owner.accept(() => writes.push("new work"))).rejects.toThrow("retired")
		io.resolve()
		await effect
		await Promise.resolve()
		expect(finished).toBe(false)
		expect(writes).toEqual(["accepted external IO settled"])
		producer.resolve()
		await unloading
		expect(finished).toBe(true)
	})

	it("does not dispose a closed tool before its accepted effect drains when another owner publishes", async () => {
		const io = Promise.withResolvers<void>()
		const events: string[] = []
		const tools = createApplicationToolRegistry(async () => true)
		const commands = createApplicationCommandRegistry()
		const owner = createTrustedCompiledExtension({ commands, tools })
		owner.registerTool({ ...descriptor, active: false, state: { dirty: false, pending: false, fence: 1 },
			dispose: () => { events.push("disposed") } })
		const work = owner.accept(async () => { await io.promise; events.push("accepted effect settled") })
		const unloading = owner.unload()
		const other = createTrustedCompiledExtension({ commands, tools })
		other.registerTool({ ...descriptor, id: "other.result", state: { dirty: false, pending: false, fence: 1 } })
		await Promise.resolve()
		await Promise.resolve()
		expect(events).toEqual([])
		io.resolve()
		await work
		expect(await unloading).toBe(true)
		expect(events).toEqual(["accepted effect settled", "disposed"])
		await other.unload()
	})

	it("drains a newly accepted output before offering its final dirty readonly body for discard", async () => {
		const io = Promise.withResolvers<void>()
		const offered = Promise.withResolvers<void>()
		const approval = Promise.withResolvers<boolean>()
		let pending = true, receipt = false, disposed = false
		const tools = createApplicationToolRegistry(async () => { offered.resolve(); return approval.promise })
		const owner = createTrustedCompiledExtension({ commands: createApplicationCommandRegistry(), tools })
		const handle = owner.registerTool({ id: "compiled.arriving-output", label: "Arriving output", layout: "bottom", active: true,
			get state() { return { dirty: receipt, pending, fence: receipt ? 2 : 1 } },
			requestClose: () => true, dispose: () => { disposed = true } })!
		const work = owner.accept(async () => { await io.promise; receipt = true; pending = false })
		const unloading = owner.unload()
		expect(owner.getToolWindow(handle)!.state.readOnly).toBe(true)
		expect(owner.getToolWindow(handle)!.state.pending).toBe(true)
		expect(await owner.closeTool(handle)).toBe(false)
		io.resolve()
		await work
		await offered.promise
		expect(owner.getToolWindow(handle)!.state.dirty).toBe(true)
		expect(owner.getToolWindow(handle)!.state.pending).toBe(false)
		approval.resolve(false)
		expect(await unloading).toBe(false)
		expect(disposed).toBe(false)
		expect(owner.getToolWindow(handle)!.open).toBe(true)
	})

	it("keeps a failed producer drain's unknown body readonly and discardable without retrying that retirement", async () => {
		let consent = false, attempts = 0
		let body = "unknown native outcome\nunpublished output"
		const tools = createApplicationToolRegistry(async () => consent)
		const owner = createTrustedCompiledExtension({ commands: createApplicationCommandRegistry(), tools })
		const handle = owner.registerTool({ ...descriptor, state: { dirty: false, pending: true, fence: 1 },
			dispose: () => { body = "" } })!
		owner.ownProducer(async () => { attempts++; throw new Error("Native producer drain failed") })
		expect(await owner.unload()).toBe(false)
		expect(owner.getToolWindow(handle)!.state).toMatchObject({ dirty: true, pending: false, readOnly: true })
		expect(await owner.closeTool(handle)).toBe(false)
		expect(body).toBe("unknown native outcome\nunpublished output")
		consent = true
		expect(await owner.closeTool(handle)).toBe(true)
		expect(body).toBe("")
		expect(await owner.unload()).toBe(true)
		expect(attempts).toBe(1)
	})

	it("revokes contributed issued effects in a surviving runtime without revoking another owner/window", async () => {
		const local = StateEffect.define<string>()
		const field = StateField.define<string>({ create: () => "initial", update: (value, transaction) => {
			for (const effect of transaction.effects) if (effect.is(local)) value = effect.value
			return value
		} })
		const registry = createOrgWindowEffectRegistry([], [local])
		const peerRegistry = createOrgWindowEffectRegistry([], [local])
		const commands = createApplicationCommandRegistry()
		const first = createTrustedCompiledExtension({ commands })
		const second = createTrustedCompiledExtension({ commands })
		const raw = registry.createContributor([local])
		const contribution = first.ownEffects(raw)!
		expect(second.ownEffects(raw)).toBeNull()
		expect(second.ownEffects(contribution)).toBeNull()
		const other = second.ownEffects(registry.createContributor([local]))!
		const issued = contribution.localEffect(local.of("first"))
		const surviving = other.localEffect(local.of("second"))
		expect(() => other.localEffect(issued)).toThrow("already-owned")
		const runtime = createOrgBufferRuntime({ source: "unknown #+SYNTAX: 😀\r\n", key: { bufferId: "compiled", workspaceSessionId: "test" }, canCommit: () => true, onCommit: () => {} })
		let handle: OrgBufferWindowHandle
		const view = new EditorView({ parent: document.body, state: EditorState.create({ doc: runtime.state.doc, extensions: [runtime.historyFreeSourceExtensions, field] }),
			dispatchTransactions: (transactions) => handle.dispatchTransactions(transactions) })
		handle = runtime.attachWindow({ view, windowId: "compiled", knownReconfigure: registry.knownEffect })
		try {
			view.dispatch({ effects: issued, annotations: Transaction.addToHistory.of(false) })
			expect(view.state.field(field)).toBe("first")
			await first.unload()
			expect(() => view.dispatch({ effects: issued })).toThrow("Unregistered window effect")
			expect(() => other.localEffect(issued)).toThrow("already-owned")
			expect(() => contribution.localEffect(local.of("retired"))).toThrow("retired")
			expect(peerRegistry.knownEffect(surviving)).toBe(false)
			view.dispatch({ effects: surviving })
			expect(view.state.field(field)).toBe("second")
			expect(runtime.source).toBe("unknown #+SYNTAX: 😀\r\n")
			expect(runtime.closed).toBe(false)
		} finally { await second.unload(); handle.detach(); view.destroy(); runtime.close() }
	})
})
