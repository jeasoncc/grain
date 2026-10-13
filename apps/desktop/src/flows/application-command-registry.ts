export type ApplicationCommandResult = Readonly<{
	kind: "success" | "rejected" | "cancelled"
	message?: string
}>

export interface ApplicationCommandDescriptor {
	readonly id: string
	readonly label: string
	readonly shortcut?: string
	readonly group?: string
	readonly getDisabledReason: () => string | null
	readonly capture: () => (() => ApplicationCommandResult | Promise<ApplicationCommandResult>) | ApplicationCommandResult
}

export interface ApplicationCommandRegistration {
	readonly owner: object
	readonly token: object
}

export interface ApplicationCommandSnapshot {
	readonly commands: readonly ApplicationCommandDescriptor[]
	readonly result: ApplicationCommandResult | null
	readonly busy: boolean
}

export type ApplicationResultPublisher = (result: ApplicationCommandResult) => boolean

export interface ApplicationCommandRegistry {
	getSnapshot: () => ApplicationCommandSnapshot
	subscribe: (listener: () => void) => () => void
	register: (owner: object, descriptors: readonly ApplicationCommandDescriptor[]) => ApplicationCommandRegistration
	update: (registration: ApplicationCommandRegistration, descriptors: readonly ApplicationCommandDescriptor[]) => void
	unregister: (registration: ApplicationCommandRegistration) => void
	clearResult: () => void
	publishResult: (result: ApplicationCommandResult) => void
	beginResult: (registration: ApplicationCommandRegistration) => ApplicationResultPublisher | null
	detach: () => void
	attach: () => void
	execute: (id: string, beforeRun?: () => void) => Promise<ApplicationCommandResult>
}

/** Registration identity is a lifetime, not an ID-based permission or a source revision. */
export function createApplicationCommandRegistry(): ApplicationCommandRegistry {
	const registrations = new Map<ApplicationCommandRegistration, readonly ApplicationCommandDescriptor[]>()
	const lifetimes = new Map<ApplicationCommandRegistration, Map<string, object>>()
	const listeners = new Set<() => void>()
	const executing = new Set<object>()
	const handoffs = new Map<number, { ticket: number; registration: ApplicationCommandRegistration }>()
	let invokingCommand: number | null = null
	let snapshot: ApplicationCommandSnapshot = { commands: [], result: null, busy: false }
	let publication = 0
	let attached = true
	let pending = 0
	const publish = (result = snapshot.result) => {
		snapshot = Object.freeze({ commands: [...registrations.values()].flat(), result, busy: pending > 0 })
		for (const listener of [...listeners]) {
			try { listener() } catch { /* Observation cannot roll back a command publication. */ }
		}
	}
	const find = (id: string) => {
		// The most recently mounted live scope shadows an application command with the same ID.
		for (const [registration, descriptors] of [...registrations].reverse()) {
			const descriptor = descriptors.find((entry) => entry.id === id)
			const lifetime = lifetimes.get(registration)?.get(id)
			if (descriptor && lifetime) return { registration, descriptor, lifetime }
		}
		return null
	}
	const owns = (registration: ApplicationCommandRegistration, descriptor: ApplicationCommandDescriptor, lifetime: object) =>
		attached && lifetimes.get(registration)?.get(descriptor.id) === lifetime &&
		find(descriptor.id)?.registration === registration
	const settle = (registration: ApplicationCommandRegistration, descriptor: ApplicationCommandDescriptor, lifetime: object, ticket: number, result: ApplicationCommandResult) => {
		if (!owns(registration, descriptor, lifetime)) return { kind: "cancelled" } as const
		if (ticket !== publication) {
			const handoff = handoffs.get(ticket)
			if (!handoff || handoff.ticket !== publication || !registrations.has(handoff.registration)) return { kind: "cancelled" } as const
			// An accepted command hands echo ownership to its synchronously started producer.
			if (result.kind === "success") return result
			++publication
		}
		publish(result)
		return result
	}
	return {
		getSnapshot: () => snapshot,
		subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
		register: (owner: object, descriptors: readonly ApplicationCommandDescriptor[]) => {
			const registration = Object.freeze({ owner, token: {} })
			registrations.set(registration, descriptors)
			lifetimes.set(registration, new Map(descriptors.map((entry) => [entry.id, {}])))
			publish()
			return registration
		},
		update: (registration: ApplicationCommandRegistration, descriptors: readonly ApplicationCommandDescriptor[]) => {
			if (!registrations.has(registration) || registrations.get(registration) === descriptors) return
			const previous = lifetimes.get(registration)
			lifetimes.set(registration, new Map(descriptors.map((entry) => [entry.id, previous?.get(entry.id) ?? {}])))
			registrations.set(registration, descriptors)
			publish()
		},
		unregister: (registration: ApplicationCommandRegistration) => {
			lifetimes.delete(registration)
			if (registrations.delete(registration)) publish()
		},
		clearResult: () => { ++publication; publish(null) },
		publishResult: (result: ApplicationCommandResult) => { ++publication; publish(result) },
		beginResult: (registration: ApplicationCommandRegistration): ApplicationResultPublisher | null => {
			if (!attached || !registrations.has(registration)) return null
			const ticket = ++publication
			if (invokingCommand !== null) handoffs.set(invokingCommand, { ticket, registration })
			publish(null)
			return (result) => {
				if (!attached || !registrations.has(registration) || ticket !== publication) return false
				publish(result)
				return true
			}
		},
		detach: () => { attached = false; ++publication; registrations.clear(); lifetimes.clear(); publish(null) },
		attach: () => { attached = true },
		execute: async (id: string, beforeRun: () => void = () => {}) : Promise<ApplicationCommandResult> => {
			const selected = find(id)
			if (!attached || !selected) return { kind: "rejected", message: "This command is no longer available." }
			const { registration, descriptor, lifetime } = selected
			if (executing.has(lifetime)) return { kind: "rejected", message: "This command is still finishing." }
			// Reserve admission before prerequisite/capture observers can reenter this lifetime.
			executing.add(lifetime)
			const ticket = ++publication
			let started = false
			try {
				const disabled = descriptor.getDisabledReason()
				if (disabled) return settle(registration, descriptor, lifetime, ticket, { kind: "rejected", message: disabled })
				if (!owns(registration, descriptor, lifetime) || ticket !== publication) return { kind: "cancelled" }
				const captured = descriptor.capture()
				if (!owns(registration, descriptor, lifetime) || ticket !== publication) return { kind: "cancelled" }
				if (typeof captured !== "function") return settle(registration, descriptor, lifetime, ticket, captured)
				beforeRun()
				if (!owns(registration, descriptor, lifetime) || ticket !== publication) return { kind: "cancelled" }
				const reason = find(id)?.descriptor.getDisabledReason()
				if (reason) return settle(registration, descriptor, lifetime, ticket, { kind: "rejected", message: reason })
				started = true
				++pending
				publish(null)
				if (!owns(registration, descriptor, lifetime) || ticket !== publication) return { kind: "cancelled" }
				// A started commit drains even when its registration or publication is retired.
				const previousInvocation = invokingCommand
				let outcome: ApplicationCommandResult | Promise<ApplicationCommandResult>
				invokingCommand = ticket
				try { outcome = captured() } finally { invokingCommand = previousInvocation }
				const result = await outcome
				return settle(registration, descriptor, lifetime, ticket, result)
			} catch (error) {
				return settle(registration, descriptor, lifetime, ticket, { kind: "rejected", message: error instanceof Error ? error.message : String(error) })
			} finally {
				handoffs.delete(ticket)
				executing.delete(lifetime)
				if (started) { --pending; publish() }
			}
		},
	}
}
