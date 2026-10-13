import { isolateHistory } from "@codemirror/commands"
import type { OrgTextEdit } from "@/pipes/org/org-text.pipe"
import { OrgBufferRuntimeError } from "./org-buffer-runtime.types"
import {
	Annotation,
	type ChangeSpec,
	type Annotation as CMAnnotation,
	type EditorSelection,
	StateEffect,
	Text,
	Transaction,
} from "@codemirror/state"

/** Match the established Org editor parser: split ONLY the chosen separator.
 * Other newline bytes are literal text, not normalized. */
export const orgSourceLineSeparator = (source: string): string =>
	source.includes("\r\n") ? "\r\n" : source.includes("\r") ? "\r" : "\n"
export const orgSourceText = (source: string, separator = orgSourceLineSeparator(source)): Text =>
	Text.of(source.split(separator))

/** A structural line break is NOT a literal LF stored within a CRLF/CR line.
 * Comparing toString() would conflate them and silently lose mixed-EOL edits. */
function* textUnits(doc: Text, direction: 1 | -1): Generator<number> {
	const iterator = doc.iter(direction)
	for (iterator.next(); !iterator.done; iterator.next()) {
		if (iterator.lineBreak) {
			yield -1
		} else if (direction === 1) {
			for (let i = 0; i < iterator.value.length; i++) {
				yield iterator.value.charCodeAt(i)
			}
		} else {
			for (let i = iterator.value.length - 1; i >= 0; i--) {
				yield iterator.value.charCodeAt(i)
			}
		}
	}
}
export function minimalTextChange(previous: Text, next: Text): ChangeSpec {
	let from = 0,
		endA = previous.length,
		endB = next.length
	const forwardA = textUnits(previous, 1),
		forwardB = textUnits(next, 1)
	while (from < endA && from < endB && forwardA.next().value === forwardB.next().value) {
		from++
	}
	const backwardA = textUnits(previous, -1),
		backwardB = textUnits(next, -1)
	while (endA > from && endB > from && backwardA.next().value === backwardB.next().value) {
		endA--
		endB--
	}
	return { from, insert: next.slice(from, endB), to: endA }
}
/** Validate before constructing transactions. All ranges address the original raw source. */
export function rawSourceBatch(source: string, edits: readonly Pick<OrgTextEdit, "from" | "to" | "insert">[]) {
	if (!Array.isArray(edits)) {
		throw new OrgBufferRuntimeError(
			"invalid-edit",
			"Command batch must be an array of raw-source edits",
		)
	}
	const separator = orgSourceLineSeparator(source)
	const validOffset = (position: number) =>
		Number.isInteger(position) &&
		position >= 0 &&
		position <= source.length &&
		!(source[position - 1] === "\r" && source[position] === "\n")
	let end = 0,
		previousFrom = -1
	const pieces: string[] = []
	for (const edit of edits) {
		if (
			!edit ||
			!validOffset(edit.from) ||
			!validOffset(edit.to) ||
			edit.to < edit.from ||
			edit.from < end ||
			edit.from <= previousFrom ||
			typeof edit.insert !== "string"
		) {
			throw new OrgBufferRuntimeError(
				"invalid-edit",
				"Command batch must use sorted, nonoverlapping raw-source ranges",
			)
		}
		pieces.push(source.slice(end, edit.from), edit.insert)
		end = edit.to
		previousFrom = edit.from
	}
	pieces.push(source.slice(end))
	const nextSource = pieces.join("")
	if (orgSourceLineSeparator(nextSource) !== separator) {
		throw new OrgBufferRuntimeError(
			"invalid-edit",
			"Command edits must preserve the source separator",
		)
	}
	// Edits are sorted: scan the CRLF coordinate mapping once instead of
	// copying and regex-scanning a growing source prefix for every endpoint.
	let scanned = 0, breaks = 0
	const offset = (position: number) => {
		if (separator.length !== 2) return position
		while (scanned < position) {
			if (source.charCodeAt(scanned) === 13 && source.charCodeAt(scanned + 1) === 10) {
				breaks++
				scanned += 2
			} else {
				scanned++
			}
		}
		return position - breaks
	}
	return {
		nextSource,
		changes: edits
			.filter((edit) => source.slice(edit.from, edit.to) !== edit.insert)
			.map((edit) => ({
				from: offset(edit.from),
				to: offset(edit.to),
				insert: orgSourceText(edit.insert, separator),
			})),
	}
}

export interface OriginSelection {
	readonly windowId: string
	readonly selection: EditorSelection
}
export const originWindow = Annotation.define<string>()
/** Semantic editor operation, not permission to commit or to bypass window effects. */
export const orgSemanticHistory = Annotation.define<{
	readonly selection: EditorSelection
	readonly group: string
	/** Provisional native composition; end collapses it into one canonical event. */
	readonly composition?: "update" | "end"
}>()
export const restoreOriginSelection = StateEffect.define<OriginSelection>({
	map: (value, mapping) => ({ ...value, selection: value.selection.map(mapping) }),
})
export function transactionTraits(tr: Transaction): CMAnnotation<unknown>[] {
	const result: CMAnnotation<unknown>[] = [Transaction.time.of(tr.annotation(Transaction.time)!)]
	const userEvent = tr.annotation(Transaction.userEvent)
	const add = tr.annotation(Transaction.addToHistory)
	const isolate = tr.annotation(isolateHistory)
	const semantic = tr.annotation(orgSemanticHistory)
	if (semantic !== undefined) result.push(orgSemanticHistory.of(semantic))
	if (userEvent !== undefined) {
		result.push(Transaction.userEvent.of(userEvent))
	}
	if (add !== undefined) {
		result.push(Transaction.addToHistory.of(add))
	}
	if (isolate !== undefined) {
		result.push(isolateHistory.of(isolate))
	}
	return result
}
