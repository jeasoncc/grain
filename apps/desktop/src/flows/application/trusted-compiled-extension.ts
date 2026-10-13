import type { ApplicationCommandDescriptor, ApplicationCommandRegistration, ApplicationCommandRegistry, ApplicationCommandResult } from "@/flows/application-command-registry"
import type { ApplicationToolDescriptor, ApplicationToolLease, ApplicationToolRegistry, ApplicationToolWindow } from "./application-tool-registry"
import { registerOrgInputCommandMetadata } from "@/flows/org-command/org-input-command-metadata"
import type { OrgCapturedSourceTransform, OrgSourceSnapshot } from "@/views/org-editor/org-editor.types"
import type { OrgWindowEffectContributor } from "@/flows/org-editor-runtime/org-window-effects"
import type { Compartment, Extension, StateEffect } from "@codemirror/state"
import type { OrgTextEditBatch } from "@/pipes/org/org-text.pipe"

export interface CompiledExtensionCommandHandle { readonly token: object }
export interface CompiledExtensionToolHandle { readonly token: object }
export interface CompiledExtensionRead { readonly cancel: () => void; readonly done: Promise<boolean> }
export type CompiledExtensionToolWindow = Readonly<Omit<ApplicationToolWindow, "lease"> & { readonly revoked: boolean }>
export interface TrustedCompiledExtension {
	readonly isLive: () => boolean
	readonly registerCommands: (descriptors: readonly ApplicationCommandDescriptor[]) => CompiledExtensionCommandHandle | null
	readonly updateCommands: (handle: CompiledExtensionCommandHandle, descriptors: readonly ApplicationCommandDescriptor[]) => boolean
	readonly publish: (handle: CompiledExtensionCommandHandle) => ((result: ApplicationCommandResult) => boolean) | null
	readonly registerTool: (descriptor: ApplicationToolDescriptor) => CompiledExtensionToolHandle | null
	readonly updateTool: (handle: CompiledExtensionToolHandle, descriptor: ApplicationToolDescriptor) => boolean
	readonly openTool: (handle: CompiledExtensionToolHandle) => boolean
	readonly closeTool: (handle: CompiledExtensionToolHandle) => Promise<boolean>
	readonly getToolWindow: (handle: CompiledExtensionToolHandle) => CompiledExtensionToolWindow | null
	readonly subscribeTools: (notify: () => void) => () => void
	readonly bindToolHost: (handle: CompiledExtensionToolHandle, host: HTMLElement | null, windowId: number | null) => boolean
	readonly read: <T>(read: (signal: AbortSignal) => Promise<T>, publish: (value: T) => void) => CompiledExtensionRead
	readonly subscribe: (subscribe: (notify: () => void) => () => void, notify: () => void) => () => void
	readonly captureSource: () => OrgCapturedSourceTransform | null
	readonly readSource: () => OrgSourceSnapshot | null
	readonly ownEffects: (contributor: OrgWindowEffectContributor) => OrgWindowEffectContributor | null
	readonly accept: <T>(run: () => T | Promise<T>) => Promise<T>
	/** Revoke producer callbacks and drain accepted IO; retain its body/receipts until tool discard. */
	readonly ownProducer: (retire: () => void | Promise<void>) => boolean
	readonly unload: () => Promise<boolean>
}
const effectOwners = new WeakMap<OrgWindowEffectContributor, object>()

/** Trusted, compiled executable code only. This is ownership/revocation, NOT a sandbox.
 * Host ports stay private; no grant, shared registry or mutable runtime is returned. */
export function createTrustedCompiledExtension(ports: {
	readonly commands: ApplicationCommandRegistry
	readonly tools?: ApplicationToolRegistry
	readonly captureSource?: () => OrgCapturedSourceTransform | null
}): TrustedCompiledExtension {
	const owner = Object.freeze({})
	let live = true
	let unloaded: Promise<boolean> | null = null
	const commands = new Map<CompiledExtensionCommandHandle, { registration: ApplicationCommandRegistration; metadataOwner: object; unregisterMetadata: () => void }>()
	const tools = new Map<CompiledExtensionToolHandle, { readonly lease: ApplicationToolLease; descriptor: ApplicationToolDescriptor }>()
	const toolWindows = new WeakMap<ApplicationToolWindow, { readonly revoked: boolean; readonly snapshot: CompiledExtensionToolWindow }>()
	const readers = new Set<AbortController>()
	const cleanup = new Set<() => void>()
	const toolSubscriptions = new Set<{ readonly notify: () => void; readonly unsubscribe: () => void }>()
	const notifyTools = () => {
		for (const subscription of [...toolSubscriptions]) {
			try { subscription.notify() } catch { /* A revoked UI observer cannot restore authority. */ }
		}
	}
	const effects = new Set<OrgWindowEffectContributor>()
	const accepted = new Set<Promise<unknown>>()
	const producers = new Set<() => void | Promise<void>>()
	let observeRetainedTools: (() => void) | null = null
	let drained = false
	const retireClosedTools = () => {
		if (live || !drained) return
		// Registry notifications are read-only. Retire in the following microtask.
		void Promise.resolve().then(async () => {
			for (const [handle, entry] of tools) {
				const window = ports.tools?.getSnapshot().find((window) => window.lease === entry.lease)
				if (window?.open || window?.closing || window?.state.pending) continue
				if (tools.get(handle) !== entry) continue
				tools.delete(handle)
				await ports.tools?.retire(entry.lease)
			}
			notifyTools()
			if (!tools.size) {
				observeRetainedTools?.()
				observeRetainedTools = null
				for (const subscription of toolSubscriptions) subscription.unsubscribe()
				toolSubscriptions.clear()
			}
		})
	}
	const accept = <T>(run: () => T | Promise<T>): Promise<T> => {
		if (!live) return Promise.reject(new Error("Compiled extension retired"))
		// Install the drain before invoking trusted code, which may synchronously unload.
		const { promise, resolve, reject } = Promise.withResolvers<T>()
		accepted.add(promise)
		promise.then(() => accepted.delete(promise), () => accepted.delete(promise))
		try { resolve(run()) } catch (error) { reject(error) }
		return promise
	}
	const wrapCommands = (descriptors: readonly ApplicationCommandDescriptor[]) => descriptors.map((descriptor): ApplicationCommandDescriptor => ({
		...descriptor,
		getDisabledReason: () => live ? descriptor.getDisabledReason() : "Compiled extension retired",
		capture: () => {
			if (!live) return { kind: "cancelled" }
			const captured = descriptor.capture()
			if (!live) return { kind: "cancelled" }
			if (typeof captured !== "function") return captured
			return async (): Promise<ApplicationCommandResult> => {
				if (!live) return { kind: "cancelled" }
				const result = await accept(captured)
				return live ? result : { kind: "cancelled" }
			}
		},
	}))
	const wrapTool = (descriptor: ApplicationToolDescriptor): ApplicationToolDescriptor => ({
		...descriptor,
		state: live ? descriptor.state : { ...descriptor.state, readOnly: true },
		onOpen: () => live ? descriptor.onOpen?.() : false,
	})
	return {
		isLive: () => live,
		registerCommands(descriptors: readonly ApplicationCommandDescriptor[]): CompiledExtensionCommandHandle | null {
			if (!live) return null
			const handle = Object.freeze({ token: {} })
			const metadataOwner = {}
			const registration = ports.commands.register(owner, wrapCommands(descriptors))
			if (!live) { ports.commands.unregister(registration); return null }
			const unregisterMetadata = registerOrgInputCommandMetadata(metadataOwner, descriptors)
			if (!live) { ports.commands.unregister(registration); unregisterMetadata(); return null }
			commands.set(handle, { registration, metadataOwner, unregisterMetadata })
			return handle
		},
		updateCommands(handle: CompiledExtensionCommandHandle, descriptors: readonly ApplicationCommandDescriptor[]): boolean {
			const entry = commands.get(handle)
			if (!live || !entry) return false
			ports.commands.update(entry.registration, wrapCommands(descriptors))
			if (!live || commands.get(handle) !== entry) return false
			entry.unregisterMetadata()
			if (!live || commands.get(handle) !== entry) return false
			entry.unregisterMetadata = registerOrgInputCommandMetadata(entry.metadataOwner, descriptors)
			if (!live) { entry.unregisterMetadata(); return false }
			return true
		},
		publish(handle: CompiledExtensionCommandHandle): ((result: ApplicationCommandResult) => boolean) | null {
			const entry = commands.get(handle)
			const publish = live && entry ? ports.commands.beginResult(entry.registration) : null
			return publish ? (result) => live && publish(result) : null
		},
		registerTool(descriptor: ApplicationToolDescriptor): CompiledExtensionToolHandle | null {
			if (!live || !ports.tools) return null
			const lease = ports.tools.createLease(owner, descriptor.id)
			const handle = Object.freeze({ token: {} })
			tools.set(handle, { lease, descriptor })
			if (!ports.tools.register(lease, wrapTool(descriptor))) { tools.delete(handle); return null }
			return live ? handle : null
		},
		updateTool(handle: CompiledExtensionToolHandle, descriptor: ApplicationToolDescriptor): boolean {
			const entry = tools.get(handle)
			if (!live || !entry || descriptor.id !== entry.lease.id) return false
			entry.descriptor = descriptor
			return Boolean(ports.tools?.update(entry.lease, wrapTool(descriptor)))
		},
		openTool(handle: CompiledExtensionToolHandle): boolean {
			const lease = tools.get(handle)?.lease
			return Boolean(live && lease && ports.tools?.open(lease))
		},
		closeTool(handle: CompiledExtensionToolHandle): Promise<boolean> {
			const lease = tools.get(handle)?.lease
			return lease && ports.tools ? ports.tools.close(lease) : Promise.resolve(false)
		},
		getToolWindow(handle: CompiledExtensionToolHandle): CompiledExtensionToolWindow | null {
			const lease = tools.get(handle)?.lease
			const window = lease ? ports.tools?.getSnapshot().find((entry) => entry.lease === lease) : null
			if (!window) return null
			const cached = toolWindows.get(window)
			if (cached?.revoked === !live) return cached.snapshot
			const { lease: _lease, ...visible } = window
			const snapshot = Object.freeze({ ...visible, revoked: !live,
				state: live ? visible.state : Object.freeze({ ...visible.state, readOnly: true }) })
			toolWindows.set(window, { revoked: !live, snapshot })
			return snapshot
		},
		subscribeTools(notify: () => void): () => void {
			if (!ports.tools || !live && tools.size === 0) return () => {}
			const unsubscribe = ports.tools.subscribe(notify)
			if (!live && tools.size === 0) { unsubscribe(); return () => {} }
			const subscription = { notify, unsubscribe }
			toolSubscriptions.add(subscription)
			return () => { if (toolSubscriptions.delete(subscription)) unsubscribe() }
		},
		bindToolHost(handle: CompiledExtensionToolHandle, host: HTMLElement | null, windowId: number | null): boolean {
			const lease = tools.get(handle)?.lease
			const window = live && lease ? ports.tools?.getSnapshot().find((entry) => entry.lease === lease) : null
			if (!window || window.windowId !== windowId || !ports.tools || !lease) return false
			ports.tools.bindHost(lease, host, windowId)
			return true
		},
		/** Reader cancellation is logical; it never claims an issued native RPC was cancelled. */
		read<T>(read: (signal: AbortSignal) => Promise<T>, publish: (value: T) => void): CompiledExtensionRead {
			const abort = new AbortController()
			if (!live) abort.abort()
			else readers.add(abort)
			const done = Promise.resolve().then(async () => {
				if (abort.signal.aborted) return false
				try {
					const value = await read(abort.signal)
					if (!live || abort.signal.aborted) return false
					publish(value)
					return true
				} catch (error) {
					if (!live || abort.signal.aborted) return false
					throw error
				} finally { readers.delete(abort) }
			})
			return Object.freeze({ cancel: () => { abort.abort(); readers.delete(abort) }, done })
		},
		subscribe(subscribe: (notify: () => void) => () => void, notify: () => void): () => void {
			if (!live) return () => {}
			const unsubscribe = subscribe(() => { if (live) notify() })
			if (!live) { unsubscribe(); return () => {} }
			cleanup.add(unsubscribe)
			return () => { if (cleanup.delete(unsubscribe)) unsubscribe() }
		},
		captureSource(): OrgCapturedSourceTransform | null {
			if (!live) return null
			const captured = ports.captureSource?.()
			if (!captured) return null
			return Object.freeze({ snapshot: captured.snapshot,
				isCurrent: () => live && captured.isCurrent(),
				apply: async (batch: OrgTextEditBatch, selection?: "preserve" | "cursor") => {
					if (!live || !captured.isCurrent()) return false
					// Revocation fences new work/publication, not an already accepted canonical outcome.
					return accept(() => captured.apply(batch, selection))
				},
			})
		},
		/** Read-only snapshot is detached immutable data, never a live buffer handle. */
		readSource(): OrgSourceSnapshot | null {
			return live ? ports.captureSource?.()?.snapshot ?? null : null
		},
		ownEffects(contributor: OrgWindowEffectContributor): OrgWindowEffectContributor | null {
			if (!live || (effectOwners.has(contributor) && effectOwners.get(contributor) !== owner)) return null
			effectOwners.set(contributor, owner)
			effects.add(contributor)
			const handle: OrgWindowEffectContributor = Object.freeze({
				localEffect: <T>(effect: StateEffect<T>): StateEffect<T> => { if (!live) throw new Error("Compiled extension retired"); return contributor.localEffect(effect) },
				reconfigure: (compartment: Compartment, content: Extension) => { if (!live) throw new Error("Compiled extension retired"); return contributor.reconfigure(compartment, content) },
				revoke: () => { contributor.revoke(); effects.delete(contributor) },
			})
			effectOwners.set(handle, owner)
			return handle
		},
		/** Real producer IO is accepted synchronously and always drains on unload. */
		accept,
		ownProducer(retire: () => void | Promise<void>): boolean {
			if (!live) return false
			producers.add(retire)
			return true
		},
		/** Revokes first. Refused dirty closes retain their tool/draft and permit a later close/unload retry. */
		unload(): Promise<boolean> {
			if (unloaded) return unloaded
			const { promise, resolve } = Promise.withResolvers<boolean>()
			unloaded = promise
			live = false
			for (const entry of tools.values()) ports.tools?.update(entry.lease, wrapTool(entry.descriptor))
			if (tools.size && !observeRetainedTools) observeRetainedTools = ports.tools?.subscribe(retireClosedTools) ?? null
			// Revocation keeps refused dirty tools visible and copyable, without commit authority.
			notifyTools()
			let revoked = true
			const revoke = (callback: () => void) => {
				try { callback() } catch { revoked = false }
			}
			for (const entry of commands.values()) {
				revoke(() => ports.commands.unregister(entry.registration))
				revoke(entry.unregisterMetadata)
			}
			commands.clear()
			for (const abort of readers) revoke(() => abort.abort())
			readers.clear()
			for (const unsubscribe of cleanup) revoke(unsubscribe)
			cleanup.clear()
			for (const contributor of effects) revoke(contributor.revoke)
			effects.clear()
			// Producers revoke their own callbacks synchronously, then return their real IO drain.
			const drains: Promise<void>[] = []
			let producerFailed = false
			for (const retire of producers) {
				try { drains.push(Promise.resolve(retire())) }
				catch { revoked = false; producerFailed = true }
			}
			const disposal = Promise.allSettled(drains)
			void Promise.resolve().then(async () => {
				while (accepted.size) await Promise.allSettled([...accepted])
				const disposed = await disposal
				producers.clear()
				drained = true
				producerFailed ||= disposed.some((result) => result.status === "rejected")
				// Accepted work can create a receipt after its producer has unmounted.
				// Read its final producer state before asking to discard, and release the drain lock.
				for (const entry of tools.values()) {
					const state = entry.descriptor.state
					entry.descriptor = { ...entry.descriptor, state: { ...state, dirty: state.dirty || producerFailed, pending: false, readOnly: true } }
					ports.tools?.update(entry.lease, wrapTool(entry.descriptor))
				}
				// A failed drain has an unknown outcome, not permission to discard or retry it.
				if (producerFailed) return false
				for (const [handle, { lease }] of tools) {
					const window = ports.tools?.getSnapshot().find((entry) => entry.lease === lease)
					if (window?.open && window.state.dirty && !(await ports.tools!.close(lease))) return false
					await ports.tools?.retire(lease)
					tools.delete(handle)
				}
				notifyTools()
				for (const subscription of toolSubscriptions) subscription.unsubscribe()
				toolSubscriptions.clear()
				observeRetainedTools?.()
				observeRetainedTools = null
				return revoked
			}).then((result) => {
				if (!result) unloaded = null
				resolve(result)
			}, () => { unloaded = null; resolve(false) })
			return promise
		},
	}
}

