import { guardOrgRuntimeCommit } from "@/pipes/editor/org-runtime-commit.pipe"
import type { OrgRuntimeCommitContext } from "@/types/editor/org-runtime-owner.interface"
import { createOrgBufferRuntime } from "@/flows/org-editor-runtime"
import type { OrgTextEdit } from "@/pipes/org/org-text.pipe"
import type { OrgBufferKey, OrgBufferRuntime } from "./org-buffer-runtime.types"
import { rawSourceBatch } from "./org-buffer-runtime.helpers"

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
	let command: {
		readonly runtime: OrgBufferRuntime
		readonly expected: string
		readonly next: string
		readonly isCurrentOwner: () => boolean
	} | null = null
	const identity = (key: OrgBufferKey) => JSON.stringify([key.workspaceSessionId, key.bufferId])
	const get = (key: OrgBufferKey) => runtimes.get(identity(key))
	const create = (key: OrgBufferKey, source: string, ports: OrgWorkspaceRuntimePorts) => {
		const existing = get(key)
		if (existing) return existing
		const runtime = createOrgBufferRuntime({
			key,
			source,
			canCommit: (previous, next, originWindowId, operation) => {
				const context = ports.readCommitContext(key, previous, next, originWindowId)
				return (
					guardOrgRuntimeCommit({
						...context,
						originWindowId,
						authorizedCommand:
							operation === "command" &&
							command &&
							command.runtime === runtime &&
							get(key) === runtime &&
							!runtime.closed &&
							command.isCurrentOwner()
								? { bufferId: key.bufferId, expected: command.expected, next: command.next }
								: undefined,
						authorizedInstallation:
							operation === "installation" &&
							installation &&
							identity(installation.key) === identity(key)
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
		if (installation || command) return false
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
	/** One synchronous command permit, tied to the live runtime lease and exact raw batch. */
	const runCommand = (
		key: OrgBufferKey,
		expected: string,
		edits: readonly OrgTextEdit[],
		isCurrentOwner: () => boolean,
		apply: (runtime: OrgBufferRuntime) => boolean,
	): boolean => {
		if (installation || command) return false
		const runtime = get(key)
		if (
			!runtime ||
			runtime.closed ||
			runtime.source !== expected ||
			!isCurrentOwner() ||
			get(key) !== runtime
		)
			return false
		const { nextSource: next } = rawSourceBatch(expected, edits)
		command = { runtime, expected, next, isCurrentOwner }
		try {
			return apply(runtime)
		} finally {
			command = null
		}
	}
	const applyCommandEdit = (
		key: OrgBufferKey,
		expected: string,
		edit: OrgTextEdit,
		isCurrentOwner: () => boolean,
	) =>
		runCommand(key, expected, [edit], isCurrentOwner, (runtime) =>
			runtime.applyCommandEdit(expected, edit),
		)
	const applyCommandEdits = (
		key: OrgBufferKey,
		expected: string,
		edits: readonly OrgTextEdit[],
		isCurrentOwner: () => boolean,
	) =>
		runCommand(key, expected, edits, isCurrentOwner, (runtime) =>
			runtime.applyCommandEdits(expected, edits),
		)
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
	return {
		get,
		create,
		install,
		updateSource,
		applyCommandEdit,
		applyCommandEdits,
		activate,
		retire,
		close,
	}
}
