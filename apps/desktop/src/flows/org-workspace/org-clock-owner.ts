import { undoDepth } from "@codemirror/commands"
import type { OrgBufferRuntime, OrgBufferCommitReceipt } from "@/flows/org-editor-runtime/org-buffer-runtime.types"
import type { OrgCapturedSourceTransform } from "@/views/org-editor/org-editor.types"
import { parseOrgClocks, planOrgClockEdit, reportOrgClockTotals, type OrgActiveClock, type OrgClockContext, type OrgClockOperation, type OrgClockReport } from "@/pipes/org/org-clock.pipe"
import type { OrgAgendaEntry } from "@/pipes/org/org-agenda.pipe"
import type { OrgAgendaActionOutcome, OrgAgendaCommand } from "@/types/org/org-agenda-command.types"
import type { OrgTextEdit, OrgTextEditBatch } from "@/pipes/org/org-text.pipe"
import { formatOrgLocalTimestamp } from "@/pipes/org/org-todo-logging.pipe"
import { readOrgSparseClockContext } from "@/io/api/org-clock-context.api"
import type { OrgSparseClockContext } from "@/pipes/org/org-sparse-special-properties.pipe"

export type OrgClockCommand = OrgClockOperation | "clock-report"
export type OrgClockOutcome =
	| { readonly kind: "success" | "rejected"; readonly message?: string }
	| { readonly kind: "report"; readonly report: OrgClockReport; readonly runningMinutes: number | null }
export interface OrgClockOwnerPorts {
	readonly scope: object | null
	readonly rootPath: string | null
	readonly isCurrent: () => boolean
	readonly buffers: () => readonly { readonly relativePath: string; readonly runtime: OrgBufferRuntime }[]
	readonly available: (relativePath: string) => boolean
	readonly commit: (runtime: OrgBufferRuntime, source: string, edits: readonly OrgTextEdit[], guard: () => boolean) => boolean
	readonly agenda: (entry: OrgAgendaEntry, command: OrgAgendaCommand, signal: AbortSignal | undefined, isCurrent: () => boolean) => Promise<OrgAgendaActionOutcome>
}
export interface OrgCapturedSparseClock {
	readonly includeClockingTask: true
	readonly activeClock: OrgSparseClockContext["activeClock"]
	readonly isCurrent: () => boolean
}
export interface OrgClockOwner {
	readonly configure: (ports: OrgClockOwnerPorts) => void
	readonly captureSource: (operation: OrgClockCommand, transform: OrgCapturedSourceTransform, runtime: OrgBufferRuntime, isCurrent: () => boolean) => (() => Promise<OrgClockOutcome>) | null
	readonly executeAgenda: (entry: OrgAgendaEntry, operation: OrgClockCommand, isCurrent: () => boolean, signal?: AbortSignal) => Promise<OrgClockOutcome>
	readonly captureSparseContext: (source: string, fileName: string | null) => (clock: OrgSparseClockContext) => OrgSparseClockContext
	readonly captureSparseClock: (source: string, fileName: string | null) => OrgCapturedSparseClock
}
interface KnownClock { readonly row: OrgActiveClock; readonly epoch: number }
interface RuntimeClock {
	active: KnownClock | null
	readonly history: Map<number, KnownClock | null>
	readonly unsubscribe: () => void
}

/** Root owns epoch identities only. Every row, heading, edit and report is read
 * from the canonical runtime, never from a timer or a retained writable body. */
export function createOrgClockOwner(): OrgClockOwner {
	let ports: OrgClockOwnerPorts | null = null
	let scope: object | null = null
	let pending = false
	const records = new Map<OrgBufferRuntime, RuntimeClock>()
	const reconcile = (runtime: OrgBufferRuntime, receipt: OrgBufferCommitReceipt) => {
		const record = records.get(runtime)
		if (!record) return
		const history = receipt.transactions.some(transaction => transaction.isUserEvent("undo") || transaction.isUserEvent("redo"))
		const depth = undoDepth(runtime.state)
		if (!history) {
			const beforeDepth = receipt.transactions.length ? undoDepth(receipt.transactions[0].startState) : depth
			if (depth < beforeDepth) {
				// Canonical history pruned its oldest events while adding this one.
				// Shift only epoch metadata; never retain another Source body.
				const removed = beforeDepth + 1 - depth
				const retained = [...record.history].filter(([key]) => key >= removed)
				record.history.clear()
				for (const [key, value] of retained) record.history.set(key - removed, value)
			}
			for (const key of record.history.keys()) if (key > depth) record.history.delete(key)
		}
		const restored = history && record.history.has(depth)
		if (restored) record.active = record.history.get(depth) ?? null
		// Unknown clocks have no epoch to reconcile. Still record null after
		// pruning/branching, and restore Undo/Redo metadata before taking this path.
		if (!record.active) {
			record.history.set(depth, null)
			return
		}
		const parsed = parseOrgClocks(runtime.source)
		const row = parsed.kind === "snapshot" ? parsed.active : null
		if (!restored && row && row.start === record.active.row.start) {
			// Map the row through real canonical change sets, including net-zero
			// replacements. Equal text alone cannot preserve a live epoch identity.
			let mapped = record.active.row.from, breakTo = record.active.row.breakTo
			let untouched = true
			for (const transaction of receipt.transactions) {
				let delta = 0
				transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
					const separator = transaction.startState.lineBreak
					const from = fromA + (transaction.startState.doc.lineAt(fromA).number - 1) * (separator.length - 1)
					const to = toA + (transaction.startState.doc.lineAt(toA).number - 1) * (separator.length - 1)
					if (from < breakTo && (to > mapped || from === to && from > mapped)) untouched = false
					if (to <= mapped) delta += inserted.length + (inserted.lines - 1) * (separator.length - 1) - (to - from)
				})
				mapped += delta
				breakTo += delta
			}
			record.active = untouched && row.from === mapped ? { row, epoch: record.active.epoch } : null
		} else if (!restored) record.active = null
		if (!row || record.active?.row.start !== row.start || record.active.row.from !== row.from) record.active = null
		else record.active = { row, epoch: record.active.epoch }
		record.history.set(depth, record.active)
	}
	const watch = (runtime: OrgBufferRuntime) => {
		let record = records.get(runtime)
		if (!record) {
			record = { active: null, history: new Map([[undoDepth(runtime.state), null]]), unsubscribe: runtime.subscribeCommits(receipt => reconcile(runtime, receipt)) }
			records.set(runtime, record)
		}
		return record
	}
	const configure = (next: OrgClockOwnerPorts) => {
		if (scope !== next.scope) {
			for (const record of records.values()) record.unsubscribe()
			records.clear()
			scope = next.scope
		}
		ports = next
		const live = new Set(next.buffers().map(buffer => buffer.runtime))
		for (const [runtime, record] of records) if (runtime.closed || !live.has(runtime)) { record.unsubscribe(); records.delete(runtime) }
		for (const runtime of live) watch(runtime)
	}
	const active = (captured: OrgClockOwnerPorts) => {
		const rows: { relativePath: string; runtime: OrgBufferRuntime; row: OrgActiveClock }[] = []
		for (const buffer of captured.buffers()) {
			if (buffer.runtime.closed) continue
			const parsed = parseOrgClocks(buffer.runtime.source)
			if (parsed.kind === "rejected") throw new Error(`Cannot identify the canonical Clock owner in ${buffer.relativePath}: ${parsed.message}`)
			if (parsed.active) rows.push({ ...buffer, row: parsed.active })
		}
		return rows
	}
	const elapsed = (known: KnownClock, clock: OrgSparseClockContext): number => {
		const minutes = Math.floor((clock.nowEpochMs - known.epoch) / 60000)
		if (clock.nowEpochMs < known.epoch || !Number.isSafeInteger(minutes))
			throw new Error("Native time precedes the known Clock start or exceeds exact minute precision; cancel explicitly rather than invent a duration.")
		return minutes
	}
	const context = (runtime: OrgBufferRuntime | null, source: string, clock: OrgSparseClockContext, includeElapsed = true): OrgClockContext => {
		const parsed = parseOrgClocks(source)
		const row = parsed.kind === "snapshot" ? parsed.active : null
		const known = runtime ? watch(runtime).active : null
		return { stamp: formatOrgLocalTimestamp(new Date(clock.nowEpochMs)),
			...(row ? { expectedActiveClock: { from: row.from, start: row.start } } : {}),
			...(includeElapsed && row && known && known.row.from === row.from && known.row.start === row.start
				? { elapsedMinutes: elapsed(known, clock) } : {}) }
	}
	const remember = (runtime: OrgBufferRuntime, epoch: number) => {
		const parsed = parseOrgClocks(runtime.source)
		if (parsed.kind !== "snapshot") return
		const record = watch(runtime)
		record.active = parsed.active ? { row: parsed.active, epoch } : null
		record.history.set(undoDepth(runtime.state), record.active)
	}
	const identifyPlannedStart = (runtime: OrgBufferRuntime, source: string, batch: OrgTextEditBatch, epoch: number) => {
		watch(runtime)
		const revision = runtime.revision
		// Identify the accepted canonical transaction before native projections
		// publish. A later ACK must not assign this epoch to a replaced open row.
		return runtime.subscribeCommits(receipt => {
			if (receipt.previousSource !== source || runtime.revision !== revision + 1) return
			const transactions = receipt.transactions.filter(transaction => transaction.docChanged)
			if (transactions.length !== 1) return
			const transaction = transactions[0]
			let index = 0, exact = true
			transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
				const expected = batch.changes[index++]
				const separator = transaction.startState.lineBreak
				if (!expected || expected.from !== transaction.startState.doc.sliceString(0, fromA, separator).length ||
					expected.to !== transaction.startState.doc.sliceString(0, toA, separator).length ||
					expected.insert !== inserted.sliceString(0, inserted.length, separator)) exact = false
			})
			if (exact && index === batch.changes.length) remember(runtime, epoch)
		})
	}
	const closeOther = (captured: OrgClockOwnerPorts, target: OrgBufferRuntime | null, clock: OrgSparseClockContext, current: () => boolean): boolean => {
		const live = active(captured)
		if (live.length > 1) return false
		const previous = live[0]
		if (!previous || previous.runtime === target) return true
		const source = previous.runtime.source, revision = previous.runtime.revision
		const guard = () => current() && !previous.runtime.closed && previous.runtime.revision === revision && previous.runtime.source === source && captured.available(previous.relativePath)
		const plan = planOrgClockEdit(source, previous.row.headingFrom, "clock-out", context(previous.runtime, source, clock))
		return plan.kind === "unchanged" || plan.kind === "edit" && guard() && captured.commit(previous.runtime, source, plan.batch.changes.map(change => ({ ...change, cursor: plan.batch.cursor })), guard)
	}
	const report = (source: string, runtime: OrgBufferRuntime | null, clock: OrgSparseClockContext): OrgClockOutcome => {
		const result = reportOrgClockTotals(source)
		if (result.kind === "rejected") return result
		const known = runtime ? watch(runtime).active : null
		return { kind: "report", report: result, runningMinutes: known && result.active?.from === known.row.from && result.active.start === known.row.start
			? elapsed(known, clock) : null }
	}
	const captureSource = (operation: OrgClockCommand, transform: OrgCapturedSourceTransform, runtime: OrgBufferRuntime, isCurrent: () => boolean) => {
		const captured = ports
		if (!captured?.scope || !captured.isCurrent() || !isCurrent() || operation !== "clock-report" && transform.snapshot.readOnly || transform.snapshot.content !== runtime.source) return null
		const current = () => ports?.scope === captured.scope && captured.isCurrent() && isCurrent() && transform.isCurrent() && !runtime.closed
		return async (): Promise<OrgClockOutcome> => {
			if (pending || !current() || !captured.available(transform.snapshot.relativePath)) return { kind: "rejected", message: "The captured Clock Source changed or is busy." }
			pending = true
			let previousClosed = false
			try {
				const clock = await readOrgSparseClockContext([])
				if (!current()) return { kind: "rejected", message: "The Clock origin retired during the native time read." }
				if (operation === "clock-report") return report(transform.snapshot.content, runtime, clock)
				const selected = operation === "cancel-clock" ? parseOrgClocks(runtime.source) : null
				const live = operation === "cancel-clock" && selected?.kind === "snapshot" && selected.active
					? [{ runtime, relativePath: transform.snapshot.relativePath, row: selected.active }] : active(captured)
				if (live.length > 1) return { kind: "rejected", message: "Multiple canonical open clocks are ambiguous; explicitly cancel in one of their Source buffers." }
				// Out/cancel follow the root-owned clock even after switching buffers.
				const target = operation !== "clock-in" && live[0] ? live[0].runtime : runtime
				const path = operation !== "clock-in" && live[0] ? live[0].relativePath : transform.snapshot.relativePath
				const source = target.source, revision = target.revision
				const plan = planOrgClockEdit(source, target === runtime ? transform.snapshot.cursor : live[0].row.headingFrom, operation,
					context(target, source, clock, operation !== "cancel-clock"))
				if (plan.kind === "rejected") return plan
				if (plan.kind === "unchanged") return { kind: "success", message: "Clock unchanged." }
				const switched = operation === "clock-in" && live.length === 1 && live[0].runtime !== runtime
				if (switched && !closeOther(captured, runtime, clock, current)) return { kind: "rejected", message: "The previous canonical Clock could not be closed; no new Clock started." }
				previousClosed = switched
				const guard = () => current() && target.source === source && target.revision === revision && captured.available(path)
				const stopObserving = operation === "clock-in" ? identifyPlannedStart(target, source, plan.batch, clock.nowEpochMs) : null
				let applied: boolean
				try {
					applied = target === runtime
						? guard() && await transform.apply(plan.batch, "preserve")
						: guard() && captured.commit(target, source, plan.batch.changes.map(change => ({ ...change, cursor: plan.batch.cursor })), guard)
				} finally { stopObserving?.() }
				if (!applied) return { kind: "rejected", message: switched ? "The previous Clock was closed, but the captured new Source refused its Clock-in. Undo the previous buffer to reopen it." : "The canonical Clock edit was refused; Source was retained." }
				return { kind: "success", message: operation === "clock-in" ? "Clock started." : operation === "clock-out" ? "Clock stopped." : "Clock cancelled." }
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				return { kind: "rejected", message: previousClosed ? `The previous Clock was closed; the new Clock did not finish: ${message}` : message }
			}
			finally { pending = false }
		}
	}
	const executeAgenda = async (entry: OrgAgendaEntry, operation: OrgClockCommand, isCurrent: () => boolean, signal?: AbortSignal): Promise<OrgClockOutcome> => {
		const captured = ports
		const current = () => !!captured && ports?.scope === captured.scope && captured.isCurrent() && isCurrent() && !signal?.aborted
		if (!captured?.scope || !current() || pending) return { kind: "rejected", message: "The captured Agenda Clock origin changed or is busy." }
		pending = true
		let previousClosed = false
		try {
			const clock = await readOrgSparseClockContext([], signal)
			if (!current()) return { kind: "rejected", message: "The Agenda Clock origin retired during the native time read." }
			// Prove the selected target before closing a different live owner.
			// The effect flow repeats this proof at its final canonical commit.
			const inspected = await captured.agenda(entry, { kind: "clock-report" }, signal, current)
			if (inspected.kind !== "report" || !current()) return { kind: "rejected", message: "The selected Agenda Clock target changed." }
			const buffer = captured.buffers().find(buffer => buffer.relativePath === entry.relativePath)
			if (operation === "clock-report") {
				const known = buffer ? watch(buffer.runtime).active : null
				return { kind: "report", report: inspected.report, runningMinutes: known &&
					inspected.report.active?.from === known.row.from && inspected.report.active.start === known.row.start
					? elapsed(known, clock) : null }
			}
			const live = operation === "cancel-clock" && inspected.report.active ? [] : active(captured)
			if (live.length > 1) return { kind: "rejected", message: "Multiple canonical open clocks are ambiguous; explicitly cancel in one of their Source buffers." }
			const switched = operation === "clock-in" && live.length === 1 && live[0].relativePath !== entry.relativePath
			if (operation === "clock-in" && !closeOther(captured, buffer?.runtime ?? null, clock, current)) return { kind: "rejected", message: "The previous Clock could not be closed; no new Clock started." }
			previousClosed = switched
			if (operation !== "clock-in" && live[0] && live[0].relativePath !== entry.relativePath) {
				const previous = live[0], source = previous.runtime.source, revision = previous.runtime.revision
				const plan = planOrgClockEdit(source, previous.row.headingFrom, operation, context(previous.runtime, source, clock, operation !== "cancel-clock"))
				const guard = () => current() && captured.available(previous.relativePath) && previous.runtime.source === source && previous.runtime.revision === revision
				if (plan.kind === "rejected") return plan
				return plan.kind === "unchanged" || plan.kind === "edit" && guard() && captured.commit(previous.runtime, source, plan.batch.changes.map(change => ({ ...change, cursor: plan.batch.cursor })), guard)
					? { kind: "success", message: operation === "clock-out" ? "Clock stopped." : "Clock cancelled." }
					: { kind: "rejected", message: "The canonical Clock owner changed." }
			}
			const clockContext = context(buffer?.runtime ?? null, buffer?.runtime.source ?? "", clock, operation !== "cancel-clock")
			const preview = operation === "clock-in" && buffer && entry.origin?.heading
				? planOrgClockEdit(buffer.runtime.source, entry.origin.heading.from, operation, clockContext) : null
			const stopObserving = preview?.kind === "edit" && buffer
				? identifyPlannedStart(buffer.runtime, buffer.runtime.source, preview.batch, clock.nowEpochMs) : null
			let result: OrgAgendaActionOutcome
			try {
				result = await captured.agenda(entry, { kind: operation, clockContext }, signal, current)
			} finally { stopObserving?.() }
			if (result.kind === "confirmed" && operation === "clock-in" && !buffer) {
				const installed = captured.buffers().find(buffer => buffer.relativePath === entry.relativePath)
				// Fresh disk promotion committed its first canonical history event.
				// A later edit before acknowledgement cannot borrow its start epoch.
				if (installed?.runtime.revision === 1) remember(installed.runtime, clock.nowEpochMs)
			}
			return result.kind === "confirmed" || result.kind === "unchanged" ? { kind: "success", message: "Agenda Clock applied." }
				: { kind: "rejected", message: `${previousClosed ? "The previous Clock was closed; the new Agenda Clock did not finish. " : ""}${"message" in result ? result.message ?? "The Agenda Clock origin changed." : "The Agenda Clock operation was refused."}` }
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			return { kind: "rejected", message: previousClosed ? `The previous Clock was closed; the new Agenda Clock did not finish: ${message}` : message }
		}
		finally { pending = false }
	}
	const captureSparseClock = (source: string, fileName: string | null): OrgCapturedSparseClock => {
		const captured = ports
		const rootPath = captured?.rootPath?.replace(/[\\/]+$/, "")
		const buffer = captured?.buffers().find(buffer => fileName === `${rootPath}/${buffer.relativePath}`)
		const known = buffer && buffer.runtime.source === source ? watch(buffer.runtime).active : null
		const revision = buffer?.runtime.revision
		const parsed = parseOrgClocks(source)
		const row = parsed.kind === "snapshot" ? parsed.active : null
		const activeClock = known && row && row.from === known.row.from && row.start === known.row.start
			? Object.freeze({ headingStart: row.headingFrom, startedAtEpochMs: known.epoch }) : null
		return Object.freeze({ includeClockingTask: true, activeClock,
			isCurrent: () => {
				if (!captured?.isCurrent() || ports?.scope !== captured.scope) return false
				const currentBuffer = ports.buffers().find(candidate => fileName === `${rootPath}/${candidate.relativePath}`)
				// A disk snapshot cannot outlive promotion to a live overlay, and a
				// retained Source runtime cannot rejoin after removal/replacement.
				return buffer ? currentBuffer?.runtime === buffer.runtime && !buffer.runtime.closed &&
					buffer.runtime.revision === revision && buffer.runtime.source === source &&
					records.get(buffer.runtime)?.active === known : !currentBuffer
			},
		})
	}
	const captureSparseContext = (source: string, fileName: string | null) => {
		const captured = captureSparseClock(source, fileName)
		return (clock: OrgSparseClockContext): OrgSparseClockContext => {
			if (!captured.isCurrent()) throw new Error("The captured canonical Clock context changed during the native read.")
			return Object.freeze({ ...clock, includeClockingTask: captured.includeClockingTask, activeClock: captured.activeClock })
		}
	}
	return { configure, captureSource, executeAgenda, captureSparseContext, captureSparseClock }
}
