import { structuralOrgSourceLines } from "./org-text.pipe"
import { planOrgOperationLogging, type OrgLoggingNoteRequest } from "./org-todo-logging.pipe"
import type { OrgLoggingPolicyOptions } from "./org-logging-policy.pipe"

/** A reviewed logging intent, never arbitrary replacement text or a new write capability. */
export interface OrgRefileLoggingIntent {
	readonly expectedSourceContent: string
	readonly stamp: string
	readonly note?: string
	readonly options: OrgLoggingPolicyOptions
}

export type OrgRefilePayloadPlan =
	| { readonly kind: "ready"; readonly moved: OrgSubtreeExtraction; readonly payload: string }
	| { readonly kind: "needs-note"; readonly request: OrgLoggingNoteRequest }
	| { readonly kind: "rejected"; readonly message: string }

/** Recompute authorized log ranges against the exact frozen source before copying anything. */
export const planOrgRefilePayload = (
	source: string, cursor: number, logging?: OrgRefileLoggingIntent,
): OrgRefilePayloadPlan => {
	const moved = extractOrgSubtreeAt(source, cursor)
	if (!moved) return { kind: "rejected", message: "Place the cursor on a real heading line." }
	if (!logging) return { kind: "ready", moved, payload: moved.text }
	if (logging.expectedSourceContent !== source)
		return { kind: "rejected", message: "The logging source changed. Cancel and reopen Refile." }
	const plan = planOrgOperationLogging(source, moved.from, logging.stamp, { kind: "refile" }, logging.note, logging.options)
	if (plan.kind === "rejected") return { kind: "rejected", message: `Cannot log Refile: ${plan.reason}` }
	if (plan.kind === "needs-note") return plan
	let payload = moved.text
	if (plan.kind === "edit") {
		for (const edit of [...plan.edits].sort((a, b) => b.from - a.from)) {
			if (edit.from < moved.from || edit.to > moved.to || edit.to < edit.from)
				return { kind: "rejected", message: "Refile logging escaped the selected subtree." }
			payload = payload.slice(0, edit.from - moved.from) + edit.insert + payload.slice(edit.to - moved.from)
		}
	}
	return { kind: "ready", moved, payload }
}

export type OrgNewline = "\n" | "\r\n" | "\r"

/** An exact source range containing one Org heading and its complete subtree. */
export interface OrgSubtreeExtraction {
	readonly from: number
	readonly to: number
	readonly text: string
	/** The complete heading line, excluding its line ending. */
	readonly heading: string
}

interface OrgLine {
	readonly from: number
	readonly contentTo: number
	readonly to: number
}

interface OrgHeadingLine extends OrgLine {
	readonly level: number
}

const orgLines = (source: string): readonly OrgLine[] => {
	const lines: OrgLine[] = []
	let from = 0

	while (from < source.length) {
		let contentTo = from
		while (contentTo < source.length && source[contentTo] !== "\r" && source[contentTo] !== "\n") {
			contentTo += 1
		}
		let to = contentTo
		if (source[to] === "\r" && source[to + 1] === "\n") {
			to += 2
		} else if (source[to] === "\r" || source[to] === "\n") {
			to += 1
		}
		lines.push({ contentTo, from, to })
		from = to
	}

	return lines
}

const headingLine = (source: string, line: OrgLine): OrgHeadingLine | null => {
	const match = /^(\*+)[ \t]+/.exec(source.slice(line.from, line.contentTo))
	return match ? { ...line, level: match[1].length } : null
}

/**
 * Extracts the complete subtree whose heading line contains `cursor`.
 * A cursor in the body of a subtree deliberately does not select that subtree.
 */
export const extractOrgSubtreeAt = (
	source: string,
	cursor: number,
): OrgSubtreeExtraction | null => {
	if (!Number.isInteger(cursor) || cursor < 0 || cursor > source.length) {
		return null
	}
	// Availability checks run on every input publication. Reject a non-heading
	// locally before allocating whole-source lines and structural exclusion sets.
	let from = cursor
	if (source[from] === "\n" && from > 0 && source[from - 1] === "\r") from -= 1
	while (from > 0 && source[from - 1] !== "\r" && source[from - 1] !== "\n") {
		from -= 1
	}
	let prefixTo = from
	while (source[prefixTo] === "*") prefixTo += 1
	if (
		prefixTo === from ||
		(source[prefixTo] !== " " && source[prefixTo] !== "\t")
	) {
		return null
	}

	const lines = orgLines(source)
	const lineIndex = lines.findIndex(
		(line) =>
			cursor >= line.from &&
			(cursor < line.to || (line.to === line.contentTo && cursor === line.contentTo)),
	)
	if (lineIndex === -1) {
		return null
	}
	const eligible = new Set(structuralOrgSourceLines(source).map((line) => line.from))
	const inBlock = (from: number) => !eligible.has(from)
	if (inBlock(lines[lineIndex].from)) return null
	const selected = headingLine(source, lines[lineIndex])
	if (!selected) {
		return null
	}

	let to = source.length
	for (const line of lines.slice(lineIndex + 1)) {
		if (inBlock(line.from)) continue
		const heading = headingLine(source, line)
		if (heading && heading.level <= selected.level) {
			to = heading.from
			break
		}
	}

	return {
		from: selected.from,
		heading: source.slice(selected.from, selected.contentTo),
		text: source.slice(selected.from, to),
		to,
	}
}

/** Removes exactly the supplied half-open subtree range, without normalizing surrounding text. */
export const removeOrgSubtree = (
	source: string,
	range: Pick<OrgSubtreeExtraction, "from" | "to">,
): string => {
	if (
		!Number.isInteger(range.from) ||
		!Number.isInteger(range.to) ||
		range.from < 0 ||
		range.to < range.from ||
		range.to > source.length
	) {
		throw new RangeError("Org subtree range is outside the source.")
	}
	return `${source.slice(0, range.from)}${source.slice(range.to)}`
}

/** Returns the first line-ending sequence in the source, falling back to LF. */
export const detectOrgNewline = (source: string): OrgNewline => {
	const match = /\r\n|\r|\n/.exec(source)
	return (match?.[0] as OrgNewline | undefined) ?? "\n"
}

/**
 * Appends an exact subtree string, adding one line separator only when the two
 * non-empty strings do not already have one at their boundary.
 */
export const appendOrgSubtree = (target: string, subtreeText: string): string => {
	if (!target || !subtreeText) {
		return `${target}${subtreeText}`
	}
	const needsSeparator = !/[\r\n]$/.test(target) && !/^[\r\n]/.test(subtreeText)
	return `${target}${needsSeparator ? detectOrgNewline(target) : ""}${subtreeText}`
}

const PATH_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i

/** Whether a path is a portable, relative document path with an exact lowercase `.org` suffix. */
export const isSafeRelativeOrgPath = (relativePath: string): boolean => {
	if (
		!relativePath ||
		relativePath !== relativePath.trim() ||
		relativePath.startsWith("/") ||
		relativePath.includes("\\") ||
		relativePath.includes("\0") ||
		PATH_PROTOCOL.test(relativePath) ||
		!relativePath.endsWith(".org")
	) {
		return false
	}
	const segments = relativePath.split("/")
	return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
}

/** Derives the sibling `<stem>_archive.org` path for a safe relative `.org` path. */
export const deriveOrgArchivePath = (relativePath: string): string | null => {
	if (!isSafeRelativeOrgPath(relativePath)) {
		return null
	}
	const segments = relativePath.split("/")
	const fileName = segments.at(-1) ?? ""
	const stem = fileName.slice(0, -".org".length)
	if (!stem) {
		return null
	}
	segments[segments.length - 1] = `${stem}_archive.org`
	return segments.join("/")
}
