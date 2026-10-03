import { guardOrgRuntimeCommit } from "@/pipes/editor/org-runtime-commit.pipe"
import type { OrgRuntimeCommitContext } from "@/types/editor/org-runtime-owner.interface"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgBufferKey, OrgBufferRuntime } from "./org-buffer-runtime.types"

export interface OrgWorkspaceRuntimePorts {
	/** Bound by Root to the grant/session captured at creation. */
	readonly readCommitContext: (
		key: OrgBufferKey,
		previous: string,
		next: string,
		originWindowId: string | null,
	) => OrgRuntimeCommitContext
	readonly commitSource: (key: OrgBufferKey, source: string) => void
	/** Root must prove the captured grant and key are still current, including parked keys. */
	readonly emitFailure: (key: OrgBufferKey, error: Error) => void
}

export interface OrgWorkspaceRuntimeActivationPorts {
	readonly prepareSource: (source: string) => void
	readonly setActiveRuntime: (runtime: OrgBufferRuntime | null) => void
}

/** Owns runtime leases and synchronous installation authority, never source mirrors or business state. */
export const createOrgWorkspaceRuntimeRegistry = () => {
	const runtimes = new Map<string, OrgBufferRuntime>()
	let installation: {
		readonly key: OrgBufferKey
		readonly expected: string
		readonly next: string
	} | null = null
	const identity = (key: OrgBufferKey) => JSON.stringify([key.workspaceSessionId, key.bufferId])
	const get = (key: OrgBufferKey) => runtimes.get(identity(key))
	const create = (key: OrgBufferKey, source: string, ports: OrgWorkspaceRuntimePorts) => {
		const existing = get(key)
		if (existing) return existing
		const runtime = createOrgBufferRuntime({
			key,
			source,
			canCommit: (previous, next, originWindowId) => {
				const context = ports.readCommitContext(key, previous, next, originWindowId)
				return (
					guardOrgRuntimeCommit({
						...context,
						authorizedInstallation:
							installation && identity(installation.key) === identity(key)
								? {
										bufferId: key.bufferId,
										expected: installation.expected,
										next: installation.next,
									}
								: undefined,
					}).kind === "accepted"
				)
			},
			onCommit: ({ source }) => ports.commitSource(key, source),
			onError: (error) => ports.emitFailure(key, error),
		})
		runtimes.set(identity(key), runtime)
		return runtime
	}
	const install = (key: OrgBufferKey, source: string): boolean => {
		if (installation) return false
		const runtime = get(key)
		if (!runtime) return false
		installation = { key: runtime.key, expected: runtime.source, next: source }
		try {
			return runtime.applyControllerSource(installation.expected, source)
		} finally {
			installation = null
		}
	}
	/** Legacy Root edits retain no-history semantics, but cannot borrow stale owner authority. */
	const updateSource = (
		key: OrgBufferKey,
		expected: string,
		source: string,
		isCurrentOwner: () => boolean,
	): boolean => {
		if (!isCurrentOwner() || get(key)?.source !== expected) return false
		return install(key, source)
	}
	const activate = (
		key: OrgBufferKey,
		source: string,
		ports: OrgWorkspaceRuntimePorts,
		activation: OrgWorkspaceRuntimeActivationPorts,
	) => {
		let runtime = get(key)
		if (!runtime) {
			runtime = create(key, source, ports)
			ports.commitSource(key, source)
		} else {
			activation.prepareSource(runtime.source)
			try {
				if (!install(key, source)) ports.commitSource(key, runtime.source)
			} catch (failure) {
				ports.commitSource(key, runtime.source)
				ports.emitFailure(
					key,
					failure instanceof Error ? failure : new Error("Cannot install Org source"),
				)
			}
		}
		activation.setActiveRuntime(runtime)
	}
	const retire = (key: OrgBufferKey) => {
		get(key)?.close()
		runtimes.delete(identity(key))
	}
	const close = () => {
		for (const runtime of runtimes.values()) runtime.close()
		runtimes.clear()
	}
	return { get, create, install, updateSource, activate, retire, close }
}
