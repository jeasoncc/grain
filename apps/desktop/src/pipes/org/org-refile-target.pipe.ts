import * as E from "fp-ts/Either"
import { appendOrgSubtree, detectOrgNewline, extractOrgSubtreeAt } from "./org-subtree-refile.pipe"
import { orgBlockRanges, orgDrawerRanges, structuralOrgSourceLines } from "./org-text.pipe"

export interface OrgRefileHeadingTarget {
	readonly from: number
	/** Complete source heading line, including stars and whitespace, excluding its terminator. */
	readonly heading: string
	readonly level: number
	readonly outlinePath: string
	readonly lineNumber: number
}

export interface OrgRefileTargetSnapshot {
	readonly relativePath: string
	readonly revision: string
	readonly headings: readonly OrgRefileHeadingTarget[]
}

export const RootCandidateLabel = "(file root)"
export type OrgRefileTargetCandidate =
	| { readonly id: "root"; readonly label: typeof RootCandidateLabel; readonly kind: "root" }
	| {
			readonly id: string
			readonly label: string
			readonly kind: "heading"
			readonly target: OrgRefileHeadingTarget
	  }

interface Line {
	readonly from: number
	readonly text: string
	readonly lineNumber: number
}

const linesOf = (source: string): readonly Line[] => {
	const lines: Line[] = []
	const breaks = /\r\n|\r|\n/g
	let from = 0
	let lineNumber = 1
	for (let match = breaks.exec(source); match; match = breaks.exec(source)) {
		lines.push({ from, text: source.slice(from, match.index), lineNumber: lineNumber++ })
		from = match.index + match[0].length
	}
	if (from < source.length) lines.push({ from, text: source.slice(from), lineNumber })
	return lines
}

/** UTF-16 source offsets; unknown block types are protected by the shared raw block scanner. */
export const enumerateOrgRefileHeadings = (source: string): readonly OrgRefileHeadingTarget[] => {
	const eligible = new Set(structuralOrgSourceLines(source).map((line) => line.from))
	const parents: { level: number; title: string }[] = []
	const headings: OrgRefileHeadingTarget[] = []
	for (const line of linesOf(source)) {
		if (!eligible.has(line.from)) continue
		const match = /^(\*+)[ \t]+(.*)$/.exec(line.text)
		if (!match) continue
		const level = match[1].length
		while (parents.length && parents[parents.length - 1].level >= level) parents.pop()
		parents.push({ level, title: match[2] })
		headings.push(
			Object.freeze({
				from: line.from,
				heading: line.text,
				level,
				outlinePath: parents.map((parent) => parent.title).join(" / "),
				lineNumber: line.lineNumber,
			}),
		)
	}
	return Object.freeze(headings)
}

/** Path and revision are caller-owned DTO metadata, not read or computed here. */
export const createOrgRefileTargetSnapshot = (
	relativePath: string,
	revision: string,
	source: string,
): OrgRefileTargetSnapshot =>
	Object.freeze({ relativePath, revision, headings: enumerateOrgRefileHeadings(source) })

export const orgRefileTargetCandidates = (
	snapshot: OrgRefileTargetSnapshot,
	includeRoot = false,
): readonly OrgRefileTargetCandidate[] =>
	Object.freeze([
		...(includeRoot
			? [Object.freeze({ id: "root" as const, kind: "root" as const, label: RootCandidateLabel })]
			: []),
		...snapshot.headings.map((target) =>
			Object.freeze({
				id: `heading:${target.from}`,
				kind: "heading" as const,
				label: `${target.outlinePath} [line ${target.lineNumber}]`,
				target,
			}),
		),
	])

export interface OrgRefileTargetValidationError {
	readonly type: "ORG_REFILE_TARGET_VALIDATION_ERROR"
	readonly message: string
}
export interface OrgRefileInsertionPlan {
	/** Original target-source insertion coordinate and complete boundary payload. */
	readonly insertionOffset: number
	readonly boundaryPayload: string
	readonly content: string
	/** Releveled source only; boundary separators are not part of this string. */
	readonly insertedSource: string
	/** Half-open range of insertedSource in content, excluding boundary separators. */
	readonly from: number
	readonly to: number
}
const invalid = (message: string) =>
	E.left<OrgRefileTargetValidationError, OrgRefileInsertionPlan>({
		type: "ORG_REFILE_TARGET_VALIDATION_ERROR",
		message,
	})

/**
 * Pure insertion after the selected target's descendants, before its next peer.
 * The flow must compare the snapshot revision to its fresh read before calling this function.
 * No AST serialization, trimming, title interpretation, or revision/IO side effects occur here.
 */
export const planOrgRefileInsertion = (
	targetSource: string,
	subtreeSource: string,
	targetHeading?: Pick<OrgRefileHeadingTarget, "from" | "heading">,
): E.Either<OrgRefileTargetValidationError, OrgRefileInsertionPlan> => {
	const incoming = enumerateOrgRefileHeadings(subtreeSource)
	const root = incoming[0]
	if (!root || root.from !== 0) return invalid("Incoming source must start with a real heading.")
	if (orgBlockRanges(subtreeSource).some((block) => !block.closed))
		return invalid("Incoming source has an unclosed block.")
	if (orgDrawerRanges(subtreeSource).some((drawer) => !drawer.closed))
		return invalid("Incoming source has an unclosed drawer.")
	if (incoming.slice(1).some((heading) => heading.level <= root.level))
		return invalid("Incoming source must contain exactly one subtree.")

	if (orgDrawerRanges(targetSource).some((drawer) => !drawer.closed))
		return invalid("Target source has an unclosed drawer.")

	let at = targetSource.length
	let delta = 0
	if (targetHeading !== undefined) {
		if (
			!Number.isSafeInteger(targetHeading.from) ||
			targetHeading.from < 0 ||
			targetHeading.from >= targetSource.length
		)
			return invalid("Target offset is outside the source.")
		const target = enumerateOrgRefileHeadings(targetSource).find(
			(heading) => heading.from === targetHeading.from,
		)
		if (!target || target.heading !== targetHeading.heading)
			return invalid("Target heading no longer matches the exact source line.")
		const subtree = extractOrgSubtreeAt(targetSource, target.from)
		if (!subtree) return invalid("Target is not a real heading.")
		at = subtree.to
		delta = target.level + 1 - root.level
	}
	if (orgBlockRanges(targetSource).some((block) => !block.closed && block.from <= at))
		return invalid("Insertion point may be inside an unclosed target block.")

	let insertedSource = subtreeSource
	if (targetHeading !== undefined) {
		let from = 0
		const chunks: string[] = []
		for (const heading of incoming) {
			const level = heading.level + delta
			if (!Number.isSafeInteger(level) || level < 1)
				return invalid("Releveled heading level is invalid.")
			try {
				chunks.push(subtreeSource.slice(from, heading.from), "*".repeat(level))
			} catch {
				return invalid("Releveled heading exceeds string capacity.")
			}
			from = heading.from + heading.level
		}
		chunks.push(subtreeSource.slice(from))
		insertedSource = chunks.join("")
	}
	const prefix = targetSource.slice(0, at)
	const suffix = targetSource.slice(at)
	const joined = appendOrgSubtree(prefix, insertedSource)
	const from = joined.length - insertedSource.length
	const separator = suffix && !/[\r\n]$/.test(joined) ? detectOrgNewline(targetSource) : ""
	return E.right({
		insertionOffset: at,
		boundaryPayload: joined.slice(at) + separator,
		content: joined + separator + suffix,
		insertedSource,
		from,
		to: from + insertedSource.length,
	})
}
