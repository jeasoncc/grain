import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import type { OrgExecutionOutputPage, OrgExecutionService, OrgExternalExecutionRequest, OrgExternalExecutionResult } from "@/io/execution/org-execution.types"
import { ORG_BABEL_EMACS_WRAPPER, parseOrgBabelFrame, planOrgBabelResults, selectOrgBabelInvocation, selectOrgTableExecution, type OrgExecutionSourceKind } from "@/pipes/org/org-babel.pipe"
import type { OrgTextEditBatch } from "@/pipes/org/org-text.pipe"

export interface OrgBabelCapturedSource {
	readonly executionKind: "babel" | "table"
	readonly workspaceRoot: string
	readonly capabilityToken: string
	/** Absolute source path, captured under the existing grant; never grants authority itself. */
	readonly path: string
	readonly source: string
	readonly cursor: number
	readonly isCurrent: () => boolean
	readonly validateDisk: () => Promise<boolean>
	readonly applyResults: (expectedSource: string, batch: OrgTextEditBatch) => boolean | Promise<boolean>
	readonly origin: ApplicationToolOrigin
}
export interface OrgBabelExecutionState {
	readonly enabled: boolean
	readonly initialized: boolean
	readonly pending: boolean
	readonly closed: boolean
	readonly used: boolean
	readonly applied: boolean
	readonly status: string
	readonly request: OrgExternalExecutionRequest | null
	readonly result: OrgExternalExecutionResult | null
	readonly batch: OrgTextEditBatch | null
	readonly revision: number
}
export interface OrgBabelExecution {
	readonly id: string
	readonly sourceKind: OrgExecutionSourceKind | null
	readonly source: OrgBabelCapturedSource
	readonly getSnapshot: () => OrgBabelExecutionState
	readonly subscribe: (listener: () => void) => () => void
	readonly initialize: () => Promise<void>
	readonly setEnabled: (enabled: boolean) => Promise<void>
	readonly configure: (program: string, environment: Readonly<Record<string, string>>) => boolean
	readonly runOnce: (expectedRequest?: OrgExternalExecutionRequest) => Promise<void>
	readonly apply: () => Promise<boolean>
	readonly readPage: (stream: "stdout" | "stderr", offset: string) => Promise<OrgExecutionOutputPage>
	readonly close: () => Promise<boolean>
	/** Revoke new execution/application and drain accepted work without releasing retained output. */
	readonly retire: () => Promise<void>
	/** Explicit approved discard releases the receipt after accepted work drains. */
	readonly dispose: () => Promise<void>
}
const message = (error: unknown) => error instanceof Error ? error.message : String(error)
const absolute = (path: string) => path.startsWith("/") && !path.includes("\u0000")
const byteCount = (value: string): bigint => {
	if (!/^(?:0|[1-9][0-9]*)$/.test(value)) throw new Error("Invalid native byte count.")
	return BigInt(value)
}
const MAX_FRAME_BYTES = 16 * 1024 * 1024

/** One captured intent, one accepted execute, no retry, no body/history owner. */
export function createOrgBabelExecution(captured: OrgBabelCapturedSource, service: OrgExecutionService, nonce: string = crypto.randomUUID()): OrgBabelExecution {
	const source = Object.freeze({ ...captured })
	const selection = source.executionKind === "table" ? selectOrgTableExecution(source.source, source.cursor) : selectOrgBabelInvocation(source.source, source.cursor)
	const invocation = selection.kind === "unavailable" ? null : selection
	let state: OrgBabelExecutionState = { enabled: false, initialized: false, pending: false, closed: false, used: false, applied: false, status: selection.kind === "unavailable" ? selection.message : "Select an installed GNU Emacs interpreter and explicitly enable execution for this native session.", request: null, result: null, batch: null, revision: 0 }
	const listeners = new Set<() => void>()
	const publish = (patch: Partial<OrgBabelExecutionState>) => {
		state = { ...state, ...patch, revision: state.revision + 1 }
		for (const listener of listeners) listener()
	}
	let operation: Promise<unknown> | null = null
	let disposing = false
	let retired = false
	let retirement: Promise<void> | null = null
	let releaseOperation: Promise<void> | null = null
	let disposal: Promise<void> | null = null
	let initializing: Promise<void> | null = null
	let enableOperation: Promise<void> | null = null
	let enableGeneration = 0
	const live = () => !retired && !disposing && !state.closed && source.isCurrent() && source.origin.isLive()
	const guardedPage = async (stream: "stdout" | "stderr", offset: string): Promise<OrgExecutionOutputPage> => {
		const result = state.result
		if (state.closed || !result?.executionId) throw new Error("No retained output receipt.")
		const total = byteCount(stream === "stdout" ? result.stdoutBytes : result.stderrBytes)
		const start = byteCount(offset)
		if (start > total) throw new Error("Output offset exceeds receipt.")
		const page = await service.readOutput({ executionId: result.executionId, stream, offset, limit: 65536 })
		if (page.bytes.length > 65536 || page.bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255) || byteCount(page.nextOffset) !== start + BigInt(page.bytes.length) || byteCount(page.nextOffset) > total || page.eof !== (byteCount(page.nextOffset) === total) || (!page.eof && page.bytes.length === 0)) throw new Error("Malformed native output page.")
		return page
	}
	const release = async () => {
		if (!state.result?.executionId) return
		if (!releaseOperation) releaseOperation = service.releaseOutput(state.result.executionId)
		await releaseOperation
	}
	const owned = async <T>(work: () => Promise<T>): Promise<T> => {
		publish({ pending: true })
		const running = Promise.resolve().then(work)
		operation = running
		try { return await running } finally { if (operation === running) operation = null; publish({ pending: enableOperation !== null }) }
	}
	return {
		id: nonce,
		sourceKind: invocation?.kind ?? null,
		source,
		getSnapshot: () => state,
		subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
		initialize: () => {
			if (!live()) return Promise.resolve()
			if (initializing) return initializing
			const generation = enableGeneration
			initializing = service.getEnabled().then((enabled) => { if (live() && generation === enableGeneration) publish({ enabled, initialized: true }) }, (error) => { if (live() && generation === enableGeneration) publish({ initialized: true, status: message(error) }) })
			return initializing
		},
		setEnabled: async (enabled) => {
			if ((enabled && state.pending) || enableOperation || !live()) return
			const generation = ++enableGeneration
			if (!enabled) publish({ enabled: false, status: "Revoking native execution. Already accepted work must drain; no new run is accepted." })
			const change = async () => {
				try {
					await service.setEnabled(enabled)
					if (generation === enableGeneration) publish({ enabled, initialized: true, status: enabled ? "Native session enabled. Every run still requires full-OS native consent." : "Native session disabled. Already accepted work still drains; its receipt remains copyable." })
				} catch (error) { publish({ status: message(error) }) }
			}
			// Revocation must remain available during an accepted execute, without
			// replacing its owned operation or prematurely clearing its pending fence.
			const changing = state.pending ? Promise.resolve().then(change) : owned(change)
			enableOperation = changing
			try { await changing } finally {
				if (enableOperation === changing) enableOperation = null
				publish({ pending: operation !== null })
			}
		},
		configure: (program, environment) => {
			if (state.pending || state.used || !live() || !invocation) return false
			if (!absolute(program) || !absolute(source.workspaceRoot) || !absolute(source.path) || !source.capabilityToken || Object.entries(environment).some(([key, value]) => !key || key.includes("=") || key.includes("\u0000") || typeof value !== "string" || value.includes("\u0000"))) {
				publish({ request: null, status: "Choose an absolute GNU Emacs executable and a complete string-valued environment without NUL bytes." }); return false
			}
			const root = source.workspaceRoot.replace(/\/+$/, "")
			const relativePath = source.path.startsWith(`${root}/`) ? source.path.slice(root.length + 1) : ""
			if (!relativePath || relativePath.includes("//") || /(?:^|\/)\.\.?(?:\/|$)/.test(relativePath)) {
				publish({ request: null, status: "The captured source path is not a relative file under the retained workspace." }); return false
			}
			let position = 0
			for (let offset = 0; offset < invocation.range.from; offset++, position++) {
				const code = source.source.charCodeAt(offset)
				if (code === 13 && source.source.charCodeAt(offset + 1) === 10) offset++
				else if (code >= 0xd800 && code <= 0xdbff && source.source.charCodeAt(offset + 1) >= 0xdc00 && source.source.charCodeAt(offset + 1) <= 0xdfff) offset++
			}
			let selectionEnd = position
			for (let offset = invocation.range.from; offset < invocation.range.to; offset++, selectionEnd++) {
				const code = source.source.charCodeAt(offset)
				if (code === 13 && source.source.charCodeAt(offset + 1) === 10) offset++
				else if (code >= 0xd800 && code <= 0xdbff && source.source.charCodeAt(offset + 1) >= 0xdc00 && source.source.charCodeAt(offset + 1) <= 0xdfff) offset++
			}
			const request: OrgExternalExecutionRequest = Object.freeze({ workspaceRoot: source.workspaceRoot, capabilityToken: source.capabilityToken, program, argv: Object.freeze(["--batch", "-Q", "--eval", ORG_BABEL_EMACS_WRAPPER]), environment: Object.freeze({ ...environment }), stdin: JSON.stringify({ source: source.source, position, selectionEnd, sourceKind: invocation.kind, path: source.path, relativePath, nonce }) })
			publish({ request, status: "Ready for one disclosed run. Code and arbitrary headers execute unsandboxed with full OS privileges." })
			return true
		},
		runOnce: async (expectedRequest) => {
			if (state.pending || state.used || !state.initialized || !state.enabled || !state.request || (expectedRequest && expectedRequest !== state.request) || !invocation || !live()) return
			const request = state.request
			const generation = enableGeneration
			publish({ used: true, status: "Checking native session; an accepted execution cannot be cancelled and must drain." })
			await owned(async () => {
				try {
					const enabled = await service.getEnabled()
					if (generation !== enableGeneration || !enabled || !live()) { publish({ status: "Run rejected: native execution is disabled or captured source retired." }); return }
					publish({ enabled })
					const result = await service.execute(request)
					publish({ result, status: "Execution drained. Output remains copyable until this tool closes." })
					if (result.outcome !== "completed" || result.exitCode !== 0 || result.signal !== null || result.error !== null || !result.executionId) { publish({ status: `No application: ${result.outcome}; exit ${result.exitCode ?? "none"}; ${result.error ?? "cancelled or abnormal execution"}. Output retained.` }); return }
					if (byteCount(result.stdoutBytes) > BigInt(MAX_FRAME_BYTES)) throw new Error("Result frame exceeds 16 MiB; output retained and available in byte pages.")
					const bytes = new Uint8Array(Number(byteCount(result.stdoutBytes)))
					let offset = "0"
					while (true) {
						const page = await guardedPage("stdout", offset)
						bytes.set(page.bytes, Number(byteCount(offset)))
						offset = page.nextOffset
						if (page.eof) break
					}
					const frame = parseOrgBabelFrame(bytes, nonce)
					const stderrDecoder = new TextDecoder("utf-8", { fatal: true })
					let stderrOffset = "0"
					while (true) {
						const page = await guardedPage("stderr", stderrOffset)
						stderrDecoder.decode(new Uint8Array(page.bytes), { stream: !page.eof })
						stderrOffset = page.nextOffset
						if (page.eof) break
					}
					if (frame.kind === "no-results") { publish({ status: "GNU Org produced no insertable results (for example :eval never or :results silent/none). Output retained." }); return }
					publish({ batch: planOrgBabelResults(source.source, invocation.range, frame, source.cursor, invocation.kind), status: live() ? "GNU result edit validated. Review the exact removal and live Org insertion, then explicitly Apply results; the disk baseline will be rechecked." : "Source retired. Output is copyable; these results cannot be applied." })
				} catch (error) { publish({ batch: null, status: `No application: ${message(error)} Output retained when a receipt exists.` }) }
			})
		},
		apply: async () => {
			if (state.pending || state.applied || !state.batch || !live()) return false
			const batch = state.batch
			return owned(async () => {
				try {
					if (!live() || !await source.validateDisk() || !live()) { publish({ status: "Apply rejected: captured source/window/grant or the disk baseline changed. Output retained." }); return false }
					const applied = await source.applyResults(source.source, batch)
					publish({ applied, status: applied ? "Results applied once to the captured source. Save remains a separate action." : "Canonical source rejected the captured result edit. Output retained." })
					return applied
				} catch (error) { publish({ status: `Apply rejected: ${message(error)} Output retained.` }); return false }
			})
		},
		readPage: async (stream, offset) => {
			if (state.pending || disposing) throw new Error("Owned work is pending or this output tool is closing.")
			return owned(() => guardedPage(stream, offset))
		},
		close: async () => {
			if (state.pending) return false
			if (state.closed) return true
			try { await owned(release); publish({ closed: true }); return true }
			catch (error) { publish({ status: `Output close failed: ${message(error)} Receipt retained.` }); return false }
		},
		retire: () => {
			retired = true
			if (!retirement) retirement = Promise.allSettled([operation, initializing, enableOperation]).then(() => undefined)
			return retirement
		},
		dispose: () => {
			if (disposal) return disposal
			disposing = true
			disposal = (async () => {
				if (operation) await operation.catch(() => undefined)
				if (enableOperation) await enableOperation.catch(() => undefined)
				await release()
				publish({ closed: true })
			})()
			return disposal
		},
	}
}
