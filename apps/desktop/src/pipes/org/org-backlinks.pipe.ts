import { scanOrgNodeSource } from "./org-node-source.pipe"
import { scanOrgBracketLinks } from "./org-link-syntax.pipe"

export type OrgLinkTargetKind = "file" | "id" | "custom-id"
export type OrgHeadingIdentifierKind = "id" | "custom-id"

export interface OrgHeadingIdentifier {
	readonly kind: OrgHeadingIdentifierKind
	readonly value: string
	readonly heading: string
	readonly line: number
}

/** A link extracted from Org source. Lines are one-based; columns are zero-based. */
export interface OrgLinkReference {
	readonly relativePath: string
	readonly line: number
	readonly column: number
	readonly sourceHeading: string | null
	readonly sourceTitle: string | null
	readonly label: string
	readonly targetKind: OrgLinkTargetKind
	readonly targetRelativePath: string | null
	readonly targetValue: string | null
}

export interface OrgLinkIndex {
	readonly title: string | null
	readonly identifiers: readonly OrgHeadingIdentifier[]
	readonly links: readonly OrgLinkReference[]
}

const PROTOCOL = /^[a-z][a-z0-9+.-]*:/i


/**
 * Resolves a file-link path below the workspace root. Absolute paths, protocols,
 * backslashes, traversal above the root, and non-lowercase `.org` suffixes are rejected.
 */
export const resolveOrgLinkPath = (baseDocument: string, target: string): string | null => {
	const path = target.split("::", 1)[0]
	if (
		!path ||
		path.startsWith("/") ||
		path.includes("\\") ||
		!path.endsWith(".org") ||
		PROTOCOL.test(path)
	) {
		return null
	}
	const resolved = baseDocument.split("/").slice(0, -1)
	for (const segment of path.split("/")) {
		if (!segment || segment === ".") {
			continue
		}
		if (segment === "..") {
			if (resolved.length === 0) {
				return null
			}
			resolved.pop()
			continue
		}
		resolved.push(segment)
	}
	return resolved.join("/")
}

export type ParsedOrgLinkTarget =
	| {
			readonly kind: "file"
			readonly relativePath: string
			readonly value: string | null
	  }
	| {
			readonly kind: "id"
			readonly relativePath: null
			readonly value: string
	  }
	| {
			readonly kind: "custom-id"
			readonly relativePath: string
			readonly value: string
	  }

/** Parses one supported Org target using the same path and anchor semantics as backlinks. */
export const parseOrgLinkTarget = (
	sourcePath: string,
	target: string,
): ParsedOrgLinkTarget | null => {
	if (/^id:/i.test(target)) {
		const value = target.slice(3)
		return value ? { kind: "id", relativePath: null, value } : null
	}
	if (target.startsWith("#")) {
		const value = target.slice(1)
		return value ? { kind: "custom-id", relativePath: sourcePath, value } : null
	}

	const fileTarget = target.startsWith("file:") ? target.slice(5) : target
	const relativePath = resolveOrgLinkPath(sourcePath, fileTarget)
	if (!relativePath) {
		return null
	}
	const separator = fileTarget.indexOf("::")
	const search = separator === -1 ? null : fileTarget.slice(separator + 2)
	if (search?.startsWith("#") && search.length > 1) {
		return { kind: "custom-id", relativePath, value: search.slice(1) }
	}
	return { kind: "file", relativePath, value: search || null }
}

/** Parses file/heading IDs and links using the same lexical boundary as node discovery. */
export const parseOrgLinkIndex = (relativePath: string, source: string): OrgLinkIndex => {
	const rows = scanOrgNodeSource(source)
	const title = rows.find((row) => row.visible && row.heading === null && /^\s*#\+title:/i.test(row.text))?.text.match(/^\s*#\+title:\s*(.*?)\s*$/i)?.[1] ?? null
	const identifiers: OrgHeadingIdentifier[] = []
	const links: OrgLinkReference[] = []
	for (const row of rows) {
		if (row.property?.value && (row.property.name === "ID" || row.property.name === "CUSTOM_ID")) {
			identifiers.push({
				heading: row.heading ?? title ?? relativePath,
				kind: row.property.name === "ID" ? "id" : "custom-id",
				line: row.heading === null ? 1 : row.headingLine,
				value: row.property.value,
			})
		}
	}
	const starts = [0]
	for (const match of source.matchAll(/\r\n|\r|\n/g)) starts.push(match.index + match[0].length)
	let sourceLine = 0
	while (sourceLine < rows.length) {
		if (!rows[sourceLine].visible) { sourceLine++; continue }
		const begin = sourceLine
		let end = begin + 1
		while (end < rows.length && rows[end].visible) end++
		const offset = starts[begin]
		// An unterminated example in an ignored block must not consume a later real link.
		const visibleSource = source.slice(offset, starts[end] ?? source.length)
		for (const match of scanOrgBracketLinks(visibleSource)) {
			const from = offset + match.from
			while (sourceLine + 1 < end && starts[sourceLine + 1] <= from) sourceLine++
			const target = parseOrgLinkTarget(relativePath, match.target)
			if (!target) continue
			links.push({
				column: from - starts[sourceLine],
				label: match.description ?? match.target,
				line: sourceLine + 1,
				relativePath,
				sourceHeading: rows[sourceLine].heading,
				sourceTitle: title,
				targetKind: target.kind,
				targetRelativePath: target.relativePath,
				targetValue: target.value,
			})
		}
		sourceLine = end
	}
	return { identifiers, links, title }
}

export const parseOrgLinks = (relativePath: string, source: string): readonly OrgLinkReference[] =>
	parseOrgLinkIndex(relativePath, source).links

export const parseOrgHeadingIdentifiers = (source: string): readonly OrgHeadingIdentifier[] =>
	parseOrgLinkIndex("index.org", source).identifiers
