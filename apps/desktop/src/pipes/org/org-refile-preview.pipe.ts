import * as E from "fp-ts/Either"
import type { OrgBehaviorConfiguration } from "./org-behavior-configuration.pipe"
import { buildOrgSparseTreePlan, parseOrgSparseTreeQuery, type OrgSparseTreeNativeContext } from "./org-sparse-tree.pipe"
import { orgRefileTargetCandidates, planOrgRefileInsertion, type OrgRefileTargetCandidate, type OrgRefileTargetSnapshot } from "./org-refile-target.pipe"
import { planOrgRefilePayload, type OrgRefileLoggingIntent } from "./org-subtree-refile.pipe"
import { planOrgSameFileRefile } from "./org-same-file-refile.pipe"
import type { OrgTextEditBatch } from "./org-text.pipe"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"

/** One parser and one canonical target snapshot serve both Sparse Tree and Refile rules. */
export const configuredOrgRefileTargetCandidates = (
	snapshot: OrgRefileTargetSnapshot,
	configuration: OrgBehaviorConfiguration,
	movedRange?: { readonly from: number; readonly to: number },
	context?: { readonly calendar: { readonly today: string; readonly now?: string }; readonly nativeContext: OrgSparseTreeNativeContext },
): readonly OrgRefileTargetCandidate[] => {
	const { refile } = configuration
	if (refile.files !== null && !refile.files.includes(snapshot.relativePath)) return Object.freeze([])
	let matches: ReadonlySet<number> | null = null
	if (refile.match !== null) {
		const match = refile.match.trim()
		const query = parseOrgSparseTreeQuery(match.startsWith("match:") ? match : `match:${match}`, configuration.inheritance)
		// Validation guarantees parsing; any broken runtime override still fails closed.
		if (!query) return Object.freeze([])
		if (!context) throw new Error("Configured Refile matching requires captured calendar and native Source context.")
		matches = new Set(buildOrgSparseTreePlan(snapshot.source, query, configuration.inheritance, context.calendar, context.nativeContext).matchedHeadingStarts)
	}
	return Object.freeze(orgRefileTargetCandidates(snapshot, refile.includeRoot).filter((candidate) =>
		candidate.kind === "root" ||
		(refile.maxDepth === null || candidate.target.level <= refile.maxDepth) &&
		(matches === null || matches.has(candidate.target.from)) &&
		(!movedRange || candidate.target.from < movedRange.from || candidate.target.from >= movedRange.to),
	))
}

export type OrgRefilePreviewPlan =
	| { readonly kind: "rejected"; readonly message: string }
	| { readonly kind: "local"; readonly batch: OrgTextEditBatch; readonly unchanged: boolean; readonly preview: NonNullable<OrgMinibufferSession["preview"]> }
	| { readonly kind: "transfer"; readonly target: OrgRefileTargetSnapshot; readonly candidate: OrgRefileTargetCandidate; readonly preview: NonNullable<OrgMinibufferSession["preview"]> }

/** Derived from existing source planners. Confirmation owns frozen exact source/target identities. */
export const planOrgRefilePreview = (
	source: { readonly relativePath: string; readonly content: string; readonly cursor: number },
	target: OrgRefileTargetSnapshot,
	candidate: OrgRefileTargetCandidate,
	logging?: OrgRefileLoggingIntent,
): OrgRefilePreviewPlan => {
	const payload = planOrgRefilePayload(source.content, source.cursor, logging)
	if (payload.kind === "rejected") return payload
	if (payload.kind === "needs-note") return { kind: "rejected", message: "Collect the required Refile note before reviewing the payload." }
	const moved = payload.moved
	if (candidate.kind === "heading" && !target.headings.includes(candidate.target))
		return { kind: "rejected", message: "Target selection does not belong to the exact source snapshot." }
	Object.freeze(source)
	Object.freeze(target)
	Object.freeze(target.headings)
	for (const entry of target.headings) Object.freeze(entry)
	Object.freeze(candidate)
	const heading = candidate.kind === "heading" ? candidate.target : undefined
	const title = `${source.relativePath} → ${target.relativePath}: ${candidate.label}`
	if (source.relativePath === target.relativePath) {
		if (target.source !== source.content) return { kind: "rejected", message: "The local target source changed. Reopen refile." }
		const plan = planOrgSameFileRefile(source.content, source.cursor, target.source, heading, logging)
		if (plan.kind === "rejected") return plan
		const insertion = plan.batch.changes.find((change) => change.insert.length > 0)
		const batch = Object.freeze({ ...plan.batch,
			changes: Object.freeze(plan.batch.changes.map((change) => Object.freeze({ ...change }))),
			...(plan.batch.requiredVisibleRanges ? { requiredVisibleRanges: Object.freeze(plan.batch.requiredVisibleRanges.map((range) => Object.freeze({ ...range }))) } : {}),
		})
		return Object.freeze({ kind: "local", batch, unchanged: plan.kind === "no-change", preview: Object.freeze({ title, source: insertion?.insert ?? moved.text, detail: plan.kind === "no-change" ? "Already in place; confirmation leaves Source unchanged." : `Remove Source [${moved.from}, ${moved.to}); insert the exact payload at original UTF-16 offset ${insertion!.from}.` }) })
	}
	const insertion = planOrgRefileInsertion(target.source, payload.payload, heading)
	if (E.isLeft(insertion)) return { kind: "rejected", message: insertion.left.message }
	return Object.freeze({ kind: "transfer", target, candidate, preview: Object.freeze({ title, source: insertion.right.boundaryPayload, detail: `Remove Source [${moved.from}, ${moved.to}); insert the exact payload at target UTF-16 offset ${insertion.right.insertionOffset}, revision ${target.revision}.` }) })
}
