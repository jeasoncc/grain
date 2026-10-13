import type { EditorState } from "@codemirror/state"
import type { OrgRemarkMark } from "@/pipes/org/org-remark.types"
import type { OrgBufferRuntime } from "./org-buffer-runtime.types"

export interface OrgRemarkTrackedMark extends OrgRemarkMark {
	/** Retained until sidecar synchronization removes its remark properties. */
	readonly collapsed: boolean
}
export interface OrgRemarkSnapshot {
	readonly source: string
	readonly revision: number
	readonly marks: readonly OrgRemarkTrackedMark[]
	readonly needsReload: boolean
	readonly dirty: boolean
	/** Monotonic publication token, including installs and net-zero source batches. */
	readonly version: number
}
export interface OrgRemarkTracker {
	readonly closed: boolean
	/** False for stale, ambiguous, or invalid installations; the old snapshot is untouched. */
	install(expectedSource: string, expectedRevision: number, marks: readonly OrgRemarkMark[]): boolean
	/** ACK known live anchors without reinterpreting the creation-time excerpt or losing pending collapsed marks. */
	reconcile(expected: OrgRemarkSnapshot, marks: readonly OrgRemarkTrackedMark[], dirty: boolean): boolean
	getSnapshot(): OrgRemarkSnapshot
	read(id: string): OrgRemarkTrackedMark | undefined
	subscribe(listener: (snapshot: OrgRemarkSnapshot) => void): () => void
	close(): void
}

/** Raw UTF-16 offsets and canonical CM offsets differ only at structural separators. */
export function orgRemarkRawOffset(state: EditorState, position: number): number {
	return position + (state.doc.lineAt(position).number - 1) * (state.lineBreak.length - 1)
}
export function orgRemarkEditorOffset(state: EditorState, position: number): number {
	if (state.lineBreak.length === 1) return position
	let low = 1,
		high = state.doc.lines
	while (low < high) {
		const middle = Math.ceil((low + high) / 2)
		const from = state.doc.line(middle).from + (middle - 1) * (state.lineBreak.length - 1)
		if (from <= position) low = middle
		else high = middle - 1
	}
	return position - (low - 1) * (state.lineBreak.length - 1)
}

const supportedSource = (source: string): boolean =>
	!source.includes("\r") ||
	(source.includes("\r\n") && !/\r(?!\n)|(?<!\r)\n/.test(source))
const validOffset = (source: string, offset: number): boolean => {
	if (!Number.isInteger(offset) || offset < 0 || offset > source.length) return false
	if (source[offset - 1] === "\r" && source[offset] === "\n") return false
	const before = source.charCodeAt(offset - 1),
		after = source.charCodeAt(offset)
	return !(before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff)
}
const trackers = new WeakMap<OrgBufferRuntime, OrgRemarkTracker>()

/** One overlay reservoir per canonical runtime, independent of attached windows and disk IO. */
export function createOrgRemarkTracker(runtime: OrgBufferRuntime): OrgRemarkTracker {
	const existing = trackers.get(runtime)
	if (existing && !existing.closed) return existing
	let closed = false
	let snapshot: OrgRemarkSnapshot = Object.freeze({
		dirty: false,
		marks: Object.freeze([]),
		needsReload: true,
		revision: runtime.revision,
		source: runtime.source,
		version: 0,
	})
	const listeners = new Set<(snapshot: OrgRemarkSnapshot) => void>()
	const publish = (next: Omit<OrgRemarkSnapshot, "version">) => {
		const published = Object.freeze({ ...next, version: snapshot.version + 1 })
		snapshot = published
		for (const listener of [...listeners]) {
			if (listeners.has(listener) && !closed && !runtime.closed) listener(published)
		}
	}
	const unsubscribe = runtime.subscribeCommits((receipt) => {
		if (closed) return
		if (
			receipt.operation === "installation" ||
			snapshot.needsReload ||
			snapshot.source !== receipt.previousSource ||
			!supportedSource(receipt.source)
		) {
			publish({
				dirty: false,
				marks: Object.freeze([]),
				needsReload: true,
				revision: receipt.revision,
				source: receipt.source,
			})
			return
		}
		let marks = snapshot.marks,
			dirty = snapshot.dirty
		for (const transaction of receipt.transactions) {
			if (!transaction.docChanged) continue
			// The installed line hook follows the FIRST leading LF, even in a multiline paste.
			const lineInsertions = marks.some((mark) => mark.kind === "line") ? new Map<number, number>() : null
			if (lineInsertions) {
				transaction.changes.iterChanges((from, to, nextFrom, _nextTo, inserted) => {
					if (from === to && inserted.lines > 1 && inserted.line(1).length === 0) {
						lineInsertions.set(from, nextFrom + 1)
					}
				})
			}
			marks = Object.freeze(marks.map((mark) => {
				const start = orgRemarkEditorOffset(transaction.startState, mark.from)
				let from = transaction.changes.mapPos(start, 1)
				let to = mark.kind === "line" || mark.collapsed
					? from
					: transaction.changes.mapPos(orgRemarkEditorOffset(transaction.startState, mark.to), -1)
				const collapsed = mark.collapsed || (mark.kind === "range" && to <= from)
				if (mark.kind === "line") {
					from = transaction.state.doc.lineAt(lineInsertions?.get(start) ?? from).from
				}
				if (mark.kind === "line" || collapsed) to = from
				const line = transaction.state.doc.lineAt(from).number
				from = orgRemarkRawOffset(transaction.state, from)
				to = orgRemarkRawOffset(transaction.state, to)
				if (from === mark.from && to === mark.to && line === mark.line && collapsed === mark.collapsed) {
					return mark
				}
				dirty = true
				return Object.freeze({ ...mark, collapsed, from, line, to })
			}))
		}
		publish({ dirty, marks, needsReload: false, revision: receipt.revision, source: receipt.source })
	})
	const publishMarks = (marks: readonly OrgRemarkMark[], dirty: boolean, preserveCollapsed: boolean): boolean => {
		const source = runtime.source
		const ids = new Set<string>()
		for (const mark of marks) {
			const collapsed = preserveCollapsed && !!mark && (mark as OrgRemarkTrackedMark).collapsed === true
			if (
				!mark || typeof mark.id !== "string" || !mark.id || ids.has(mark.id) ||
				typeof mark.label !== "string" || typeof mark.originalText !== "string" ||
				!validOffset(source, mark.from) || !validOffset(source, mark.to) ||
				(mark.kind !== "range" && mark.kind !== "line") ||
				(preserveCollapsed && typeof (mark as OrgRemarkTrackedMark).collapsed !== "boolean") ||
				(mark.kind === "range" ? mark.to < mark.from || (collapsed ? mark.to !== mark.from : mark.to === mark.from) : mark.to !== mark.from || collapsed)
			) return false
			const position = orgRemarkEditorOffset(runtime.state, mark.from)
			const line = runtime.state.doc.lineAt(position)
			if (line.number !== mark.line || (mark.kind === "line" && line.from !== position)) return false
			ids.add(mark.id)
		}
		publish({
			dirty,
			marks: Object.freeze(marks.map((mark) => Object.freeze({ ...mark, collapsed: preserveCollapsed && (mark as OrgRemarkTrackedMark).collapsed }))),
			needsReload: false,
			revision: runtime.revision,
			source,
		})
		return true
	}
	const tracker: OrgRemarkTracker = {
		get closed() { return closed || runtime.closed },
		install(source, revision, marks) {
			if (closed || runtime.closed || source !== runtime.source || revision !== runtime.revision || !supportedSource(source)) return false
			return publishMarks(marks, false, false)
		},
		reconcile(expected, marks, dirty) {
			if (closed || runtime.closed || expected !== snapshot || expected.source !== runtime.source ||
				expected.revision !== runtime.revision || !supportedSource(expected.source)) return false
			return publishMarks(marks, dirty, true)
		},
		getSnapshot: () => snapshot,
		read: (id) => snapshot.marks.find((mark) => mark.id === id),
		subscribe(listener) {
			if (closed || runtime.closed) return () => {}
			listeners.add(listener)
			return () => { listeners.delete(listener) }
		},
		close() {
			if (closed) return
			closed = true
			if (trackers.get(runtime) === tracker) trackers.delete(runtime)
			unsubscribe()
			listeners.clear()
		},
	}
	trackers.set(runtime, tracker)
	return tracker
}
