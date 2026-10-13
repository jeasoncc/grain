import * as E from "fp-ts/Either"
import {
	enumerateOrgRefileHeadings,
	planOrgRefileInsertion,
	type OrgRefileHeadingTarget,
} from "./org-refile-target.pipe"
import { planOrgRefilePayload, removeOrgSubtree, type OrgRefileLoggingIntent } from "./org-subtree-refile.pipe"
import type { OrgTextEditBatch } from "./org-text.pipe"

export type OrgSameFileRefilePlan =
	| { readonly kind: "edit"; readonly batch: OrgTextEditBatch }
	| { readonly kind: "no-change"; readonly batch: OrgTextEditBatch }
	| { readonly kind: "rejected"; readonly message: string }

/** Origin-qualified offsets are validated before removal, then mapped into the remainder. */
export const planOrgSameFileRefile = (
	source: string,
	cursor: number,
	expectedSource: string,
	target?: Pick<OrgRefileHeadingTarget, "from" | "heading">,
	logging?: OrgRefileLoggingIntent,
): OrgSameFileRefilePlan => {
	const reject = (message: string): OrgSameFileRefilePlan => ({ kind: "rejected", message })
	if (source !== expectedSource) return reject("The source changed. Cancel and reopen refile.")
	const payload = planOrgRefilePayload(source, cursor, logging)
	if (payload.kind === "rejected") return payload
	if (payload.kind === "needs-note") return reject("Collect the required Refile note before planning the move.")
	const moved = payload.moved
	if (target) {
		const heading = enumerateOrgRefileHeadings(source).find((entry) => entry.from === target.from)
		if (!heading || heading.heading !== target.heading) return reject("The target heading changed.")
		if (target.from >= moved.from && target.from < moved.to)
			return reject("Cannot refile a subtree under itself or its descendants.")
	}
	const remainder = removeOrgSubtree(source, moved)
	const mapped = target
		? {
				...target,
				from: target.from >= moved.to ? target.from - (moved.to - moved.from) : target.from,
			}
		: undefined
	const insertion = planOrgRefileInsertion(remainder, payload.payload, mapped)
	if (E.isLeft(insertion)) return reject(insertion.left.message)
	if (insertion.right.content === source)
		return {
			kind: "no-change",
			batch: {
				changes: [],
				cursor,
				requiredVisibleRanges: [
					{ from: moved.from, to: moved.to },
					...(target ? [{ from: target.from, to: target.from + target.heading.length }] : []),
				],
			},
		}
	const at = insertion.right.insertionOffset
	// Resolve the insertion against original bytes, never via a string diff.
	const originalAt = at >= moved.from ? at + moved.to - moved.from : at
	let from = originalAt
	let insert = insertion.right.boundaryPayload
	// Own the complete visible line terminator before a peer. This allows the
	// sparse guard to verify a bytes-preserving boundary without trusting a doc install.
	if (originalAt < source.length && originalAt > 0) {
		const terminator = source.slice(0, originalAt).match(/(?:\r\n|\r|\n)$/)?.[0]
		if (
			terminator &&
			originalAt - terminator.length >= 0 &&
			!(originalAt - terminator.length < moved.to && originalAt > moved.from)
		) {
			from -= terminator.length
			insert = terminator + insert
		}
	}
	const changes = [
		{ from: moved.from, to: moved.to, insert: "" },
		{ from, to: originalAt, insert },
	].sort((a, b) => a.from - b.from)
	if (changes[0].to > changes[1].from) return reject("Move ranges overlap.")
	return {
		kind: "edit",
		batch: {
			changes,
			cursor: insertion.right.from,
			requiredVisibleRanges: target
				? [{ from: target.from, to: target.from + target.heading.length }]
				: [],
		},
	}
}
